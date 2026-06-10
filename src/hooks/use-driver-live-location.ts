import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface LiveLocation {
  ride_id: string;
  lat: number;
  lng: number;
  heading: number | null;
  updated_at: string;
}

export interface EtaInfo {
  duration: string;
  distance: string;
  durationSec: number;
  distanceMeters: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteSegment {
  directions: google.maps.DirectionsResult;
  eta: EtaInfo;
}

interface Options {
  rideId: string;
  destination: string;
  pickupLocation?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  phase?: "scheduled" | "en_route" | "picked_up" | "in_progress" | "completed";
  enabled?: boolean;
}

const geocodeCache = new Map<string, LatLng>();

async function geocodeOnce(address: string): Promise<LatLng | null> {
  if (!address) return null;
  if (geocodeCache.has(address)) return geocodeCache.get(address)!;
  if (typeof google === "undefined") return null;
  return new Promise((resolve) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const loc = results[0].geometry.location;
        const ll = { lat: loc.lat(), lng: loc.lng() };
        geocodeCache.set(address, ll);
        resolve(ll);
      } else {
        resolve(null);
      }
    });
  });
}

function routePromise(
  origin: google.maps.LatLngLiteral | string,
  destination: google.maps.LatLngLiteral | string,
): Promise<RouteSegment | null> {
  return new Promise((resolve) => {
    if (typeof google === "undefined") return resolve(null);
    const service = new google.maps.DirectionsService();
    service.route(
      { origin, destination, travelMode: google.maps.TravelMode.DRIVING },
      (result, status) => {
        if (status !== "OK" || !result) return resolve(null);
        const leg = result.routes[0]?.legs[0];
        if (!leg) return resolve(null);
        resolve({
          directions: result,
          eta: {
            duration: leg.duration?.text ?? "",
            distance: leg.distance?.text ?? "",
            durationSec: leg.duration?.value ?? 0,
            distanceMeters: leg.distance?.value ?? 0,
          },
        });
      },
    );
  });
}

/**
 * Subscribes to driver_locations for a ride and computes route segments.
 * - When en_route: TWO segments (driver → pickup, pickup → destination).
 * - When picked_up/in_progress: ONE segment (driver → destination).
 */
export function useDriverLiveLocation({
  rideId,
  destination,
  pickupLocation,
  pickupLat,
  pickupLng,
  phase = "scheduled",
  enabled = true,
}: Options) {
  const [location, setLocation] = useState<LiveLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickupLatLng, setPickupLatLng] = useState<LatLng | null>(null);
  const [destinationLatLng, setDestinationLatLng] = useState<LatLng | null>(null);
  const [toPickup, setToPickup] = useState<RouteSegment | null>(null);
  const [toDestination, setToDestination] = useState<RouteSegment | null>(null);
  const [routeError, setRouteError] = useState(false);
  const lastEtaCalcRef = useRef(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const hookInstanceId = useRef(Math.random().toString(36).substring(7));

  // 1. Fetch initial driver location
  useEffect(() => {
    if (!enabled || !rideId) return;
    let active = true;
    setLoading(true);

    (async () => {
      try {
        const { data, error } = await supabase
          .from("driver_locations")
          .select("*")
          .eq("ride_id", rideId)
          .maybeSingle();
        if (error) throw error;
        if (active) {
          setLocation((data as LiveLocation) ?? null);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching initial driver location:", err);
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [rideId, enabled]);

  // 2. Realtime subscription
  useEffect(() => {
    if (!enabled || !rideId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `driver-loc-${rideId}-${hookInstanceId.current}`;
    const channel = supabase.channel(channelName);

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "driver_locations",
        filter: `ride_id=eq.${rideId}`,
      },
      (payload) => {
        if (payload.eventType === "DELETE") {
          setLocation(null);
          setToPickup(null);
          setToDestination(null);
        } else {
          setLocation(payload.new as LiveLocation);
        }
      },
    );

    channelRef.current = channel;
    channel.subscribe();

    return () => {
      if (channelRef.current) {
        const activeChannel = channelRef.current;
        activeChannel.unsubscribe().then(() => {
          supabase.removeChannel(activeChannel);
        });
        channelRef.current = null;
      }
    };
  }, [rideId, enabled]);

  // Reset throttle when phase changes
  useEffect(() => {
    lastEtaCalcRef.current = 0;
  }, [phase]);

  // Geocode pickup & destination
  useEffect(() => {
    let active = true;
    if (typeof pickupLat === "number" && typeof pickupLng === "number") {
      setPickupLatLng({ lat: pickupLat, lng: pickupLng });
    } else if (pickupLocation) {
      geocodeOnce(pickupLocation).then((ll) => active && setPickupLatLng(ll));
    } else {
      setPickupLatLng(null);
    }
    return () => {
      active = false;
    };
  }, [pickupLocation, pickupLat, pickupLng]);

  useEffect(() => {
    let active = true;
    if (destination) {
      geocodeOnce(destination).then((ll) => active && setDestinationLatLng(ll));
    }
    return () => {
      active = false;
    };
  }, [destination]);

  // Compute route segments
  useEffect(() => {
    if (!location || typeof google === "undefined") return;
    if (phase === "completed") return;

    const now = Date.now();
    if (now - lastEtaCalcRef.current < 8000) return;
    lastEtaCalcRef.current = now;

    let cancelled = false;
    (async () => {
      try {
        const origin = { lat: location.lat, lng: location.lng };
        const pickupTarget = pickupLatLng ?? (pickupLocation && pickupLocation.trim().length > 0 ? pickupLocation : null);
        const hasPickup = phase === "en_route" && !!pickupTarget;

        if (hasPickup) {
          // Compute both segments in parallel: driver→pickup and pickup→destination.
          const [seg1, seg2] = await Promise.all([
            routePromise(origin, pickupTarget as google.maps.LatLngLiteral | string),
            destination ? routePromise(pickupTarget as google.maps.LatLngLiteral | string, destination) : Promise.resolve(null),
          ]);
          if (cancelled) return;
          setToPickup(seg1);
          // If seg1 succeeded, use seg2 as-is (may be null if no destination).
          // If seg1 FAILED, fall back to a single driver→destination route so the
          // passenger still sees the driver moving toward them on the map.
          if (seg1) {
            setToDestination(seg2);
            setRouteError(false);
          } else if (destination) {
            const fallback = await routePromise(origin, destination);
            if (cancelled) return;
            setToDestination(fallback);
            setRouteError(!fallback);
          } else {
            setToDestination(null);
            setRouteError(true);
          }
        } else if (destination) {
          // picked_up / in_progress / scheduled — single driver→destination route.
          const seg = await routePromise(origin, destination);
          if (cancelled) return;
          setToPickup(null);
          setToDestination(seg);
          setRouteError(!seg);
        }
      } catch (err) {
        console.error("Route calculation error:", err);
        if (!cancelled) setRouteError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location, destination, pickupLocation, pickupLatLng, phase]);

  // Primary ETA (next segment) for backward compatibility
  const eta = toPickup?.eta ?? toDestination?.eta ?? null;
  const directions = toPickup?.directions ?? toDestination?.directions ?? null;

  return {
    location,
    loading,
    pickupLatLng,
    destinationLatLng,
    toPickup,
    toDestination,
    eta,
    directions,
    routeError,
  };
}
