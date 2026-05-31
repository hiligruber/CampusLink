import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

/**
 * Subscribes to driver_locations for a ride and computes a throttled ETA
 * using the Google Directions service. Shared between map preview & fullscreen sheet.
 */
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

  // 1. אפקט ייעודי להבאת המיקום הראשוני (Fetch Initial Data)
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

  // 2. אפקט נפרד ונקי לניהול ה-Realtime (בלי Async/Await שמפריע לסינכרוניזציה)
  useEffect(() => {
    if (!enabled || !rideId) return;

    // יצירת ערוץ ייחודי לחלוטין עבור ה-rideId הנוכחי
    const channel = supabase
      .channel(`driver-loc-${rideId}`)
      .on(
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
      )
      .subscribe();

    // ניקוי מוחלט של הערוץ ברגע שהקומפוננטה יורדת, או כש-enabled/rideId משתנים
    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId, enabled]);

  // Reset throttle when phase changes (target switches)
  useEffect(() => {
    lastEtaCalcRef.current = 0;
  }, [phase]);

  // Geocode pickup + destination once each (cached)
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
