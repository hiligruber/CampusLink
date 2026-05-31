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

interface Options {
  rideId: string;
  destination: string;
  pickupLocation?: string | null;
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

export function useDriverLiveLocation({
  rideId,
  destination,
  pickupLocation,
  phase = "scheduled",
  enabled = true,
}: Options) {
  const [location, setLocation] = useState<LiveLocation | null>(null);
  const [eta, setEta] = useState<EtaInfo | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickupLatLng, setPickupLatLng] = useState<LatLng | null>(null);
  const [destinationLatLng, setDestinationLatLng] = useState<LatLng | null>(null);
  const lastEtaCalcRef = useRef(0);

  // שימוש ב-ref כדי להחזיק את הערוץ בצורה בטוחה בין רינדורים
  const channelRef = useRef<RealtimeChannel | null>(null);

  // 1. הבאת המיקום הראשוני
  useEffect(() => {
    if (!enabled || !rideId) return;

    let active = true;
    setLoading(true);

    const fetchInitialLocation = async () => {
      try {
        const { data, error } = await supabase.from("driver_locations").select("*").eq("ride_id", rideId).maybeSingle();

        if (error) throw error;

        if (active) {
          setLocation((data as LiveLocation) ?? null);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching initial driver location:", err);
        if (active) setLoading(false);
      }
    };

    fetchInitialLocation();

    return () => {
      active = false;
    };
  }, [rideId, enabled]);

  // 2. ניהול ה-Realtime בצורה חסינת-קריסות (בעזרת useRef)
  useEffect(() => {
    if (!enabled || !rideId) {
      // אם הכלי כבוי, ננקה את הערוץ הקיים במידה וישנו
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // הגנה: אם כבר יש ערוץ קיים ב-Ref, ננקה אותו קודם כדי שלא יהיו כפילויות לעולם
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // יצירת הערוץ החדש
    const channel = supabase.channel(`driver-loc-${rideId}`);

    // הגדרת המאזין (קורה ב-100% לפני ה-subscribe)
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
          setEta(null);
          setDirections(null);
        } else {
          setLocation(payload.new as LiveLocation);
        }
      },
    );

    // שמירה ב-Ref וביצוע המנוי
    channelRef.current = channel;
    channel.subscribe();

    // פונקציית ניקוי רשמית של ה-Effect
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [rideId, enabled]);

  // Reset throttle when phase changes
  useEffect(() => {
    lastEtaCalcRef.current = 0;
  }, [phase]);

  // Geocode pickup
  useEffect(() => {
    let active = true;
    if (pickupLocation) {
      geocodeOnce(pickupLocation).then((ll) => {
        if (active) setPickupLatLng(ll);
      });
    } else {
      setPickupLatLng(null);
    }
    return () => {
      active = false;
    };
  }, [pickupLocation]);

  // Geocode destination
  useEffect(() => {
    let active = true;
    if (destination) {
      geocodeOnce(destination).then((ll) => {
        if (active) setDestinationLatLng(ll);
      });
    }
    return () => {
      active = false;
    };
  }, [destination]);

  // ETA Calculation
  useEffect(() => {
    if (!location || typeof google === "undefined") return;
    const target = phase === "en_route" && pickupLocation ? pickupLocation : destination;
    if (!target) return;
    const now = Date.now();
    if (now - lastEtaCalcRef.current < 15000) return;
    lastEtaCalcRef.current = now;

    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin: { lat: location.lat, lng: location.lng },
        destination: target,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          setDirections(result);
          const leg = result.routes[0]?.legs[0];
          if (leg) {
            setEta({
              duration: leg.duration?.text ?? "",
              distance: leg.distance?.text ?? "",
              durationSec: leg.duration?.value ?? 0,
              distanceMeters: leg.distance?.value ?? 0,
            });
          }
        }
      },
    );
  }, [location, destination, pickupLocation, phase]);

  return { location, eta, directions, loading, pickupLatLng, destinationLatLng };
}
