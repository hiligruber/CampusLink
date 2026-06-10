import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SharingStatus = "idle" | "requesting" | "active" | "denied" | "unavailable" | "error";

interface ActiveRide {
  id: string;
  ride_phase: string;
}

interface Ctx {
  status: SharingStatus;
  lastFix: number | null;
  error: string | null;
  activeRideIds: string[];
  retry: () => void;
  captureOnceAndUpsert: (rideId: string) => Promise<boolean>;
}

const LocationSharingContext = createContext<Ctx | null>(null);

const ACTIVE_PHASES = ["en_route", "picked_up", "in_progress"];

export function LocationSharingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeRides, setActiveRides] = useState<ActiveRide[]>([]);
  const [status, setStatus] = useState<SharingStatus>("idle");
  const [lastFix, setLastFix] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);
  const activeRidesRef = useRef<ActiveRide[]>([]);
  const [retryNonce, setRetryNonce] = useState(0);

  activeRidesRef.current = activeRides;

  // Load + subscribe to driver's active rides
  useEffect(() => {
    if (!user) {
      setActiveRides([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("rides")
        .select("id, ride_phase")
        .eq("driver_id", user.id)
        .in("ride_phase", ACTIVE_PHASES);
      if (!cancelled) setActiveRides((data as ActiveRide[]) ?? []);
    };
    load();

    const channel = supabase
      .channel(`location-sharing-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rides", filter: `driver_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const upsertAll = useCallback(async (lat: number, lng: number, heading: number | null) => {
    if (!user) return;
    const rides = activeRidesRef.current;
    if (rides.length === 0) return;
    const rows = rides.map((r) => ({
      ride_id: r.id,
      driver_id: user.id,
      lat,
      lng,
      heading,
      updated_at: new Date().toISOString(),
    }));
    await supabase.from("driver_locations").upsert(rows, { onConflict: "ride_id" });
  }, [user]);

  const startWatcher = useCallback(() => {
    if (watchIdRef.current !== null) return;
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      setError("הדפדפן לא תומך במיקום");
      return;
    }
    setStatus("requesting");
    setError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        setStatus("active");
        setLastFix(now);
        if (now - lastSentRef.current < 4000) return;
        lastSentRef.current = now;
        const { latitude, longitude, heading } = pos.coords;
        upsertAll(latitude, longitude, heading ?? null);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
          setError("גישה למיקום נדחתה");
        } else {
          setStatus("error");
          setError(err.message);
        }
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
    );
  }, [upsertAll]);

  // Manage watcher — start the live watcher whenever the driver has an
  // active ride (en_route / picked_up / in_progress). watchPosition itself
  // will trigger the browser permission prompt once if needed; if the user
  // already accepted the one-shot prompt from captureOnceAndUpsert, the
  // watcher reuses that permission and streams updates without re-prompting.
  // We only short-circuit when permission is explicitly "denied".
  useEffect(() => {
    const shouldWatch = activeRides.length > 0;
    if (!shouldWatch) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setStatus("idle");
      setError(null);
      return;
    }
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      setError("הדפדפן לא תומך במיקום");
      return;
    }

    let cancelled = false;
    let permResult: any = null;

    const maybeStart = async () => {
      try {
        if ("permissions" in navigator && (navigator as any).permissions?.query) {
          permResult = await (navigator as any).permissions.query({ name: "geolocation" });
          if (cancelled) return;
          if (permResult.state === "denied") {
            setStatus("denied");
            setError("גישה למיקום נדחתה");
            return;
          }
          // "granted" OR "prompt" — start the watcher. If permission is
          // "prompt", watchPosition itself triggers the browser prompt.
          startWatcher();
          permResult.onchange = () => {
            if (permResult.state === "granted") startWatcher();
            else if (permResult.state === "denied") {
              if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
              }
              setStatus("denied");
            }
          };
        } else {
          startWatcher();
        }
      } catch {
        startWatcher();
      }
    };
    maybeStart();

    return () => {
      cancelled = true;
      if (permResult) permResult.onchange = null;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [activeRides, startWatcher, retryNonce]);

  const retry = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setRetryNonce((n) => n + 1);
  }, []);

  const captureOnceAndUpsert = useCallback(async (rideId: string): Promise<boolean> => {
    if (!user) return false;
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return false;
    }

    const tryGetPosition = (opts: PositionOptions): Promise<GeolocationPosition | GeolocationPositionError> =>
      new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          (err) => resolve(err as unknown as GeolocationPositionError),
          opts,
        );
      });

    // First try: fast, high-accuracy fix.
    let result = await tryGetPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
    // Fallback: relax accuracy & accept older cached fixes (helps desktops without GPS / weak signal).
    if (!("coords" in result)) {
      const err = result as GeolocationPositionError;
      if (err.code === err.PERMISSION_DENIED) {
        setStatus("denied");
        setError("גישה למיקום נדחתה");
        return false;
      }
      result = await tryGetPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 });
    }
    if (!("coords" in result)) {
      const err = result as GeolocationPositionError;
      setStatus("error");
      setError(err.message || "Location unavailable");
      return false;
    }

    const { latitude, longitude, heading } = result.coords;
    const { error: upErr } = await supabase.from("driver_locations").upsert(
      {
        ride_id: rideId,
        driver_id: user.id,
        lat: latitude,
        lng: longitude,
        heading: heading ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "ride_id" },
    );
    if (upErr) {
      setStatus("error");
      setError(upErr.message);
      return false;
    }
    setLastFix(Date.now());
    setStatus("active");
    // Permission has just been granted via the prompt — start the live
    // watcher immediately so passengers see continuous updates instead of
    // a single frozen pin.
    startWatcher();
    return true;
  }, [user, startWatcher]);

  return (
    <LocationSharingContext.Provider
      value={{
        status,
        lastFix,
        error,
        activeRideIds: activeRides.map((r) => r.id),
        retry,
        captureOnceAndUpsert,
      }}
    >
      {children}
    </LocationSharingContext.Provider>
  );
}

export function useLocationSharing() {
  const ctx = useContext(LocationSharingContext);
  if (!ctx) throw new Error("useLocationSharing must be used inside LocationSharingProvider");
  return ctx;
}
