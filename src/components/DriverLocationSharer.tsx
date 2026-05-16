import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Radio, RadioTower, Square } from "lucide-react";

interface Props {
  rideId: string;
  driverId: string;
}

/**
 * Button shown to the driver. While active, watches the device GPS
 * and upserts the position into driver_locations every few seconds.
 */
export default function DriverLocationSharer({ rideId, driverId }: Props) {
  const { user } = useAuth();
  const [sharing, setSharing] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);

  const isDriver = user?.id === driverId;

  // Check if we already have an active row (resume state on mount)
  useEffect(() => {
    if (!isDriver) return;
    let active = true;
    supabase
      .from("driver_locations")
      .select("ride_id")
      .eq("ride_id", rideId)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setSharing(true);
      });
    return () => {
      active = false;
    };
  }, [rideId, isDriver]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  if (!isDriver) return null;

  const start = () => {
    if (!("geolocation" in navigator)) {
      toast.error("הדפדפן לא תומך במיקום");
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        // throttle to every 4s
        if (now - lastSentRef.current < 4000) return;
        lastSentRef.current = now;
        const { latitude, longitude, heading } = pos.coords;
        await supabase.from("driver_locations").upsert(
          {
            ride_id: rideId,
            driver_id: driverId,
            lat: latitude,
            lng: longitude,
            heading: heading ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "ride_id" }
        );
      },
      (err) => {
        toast.error("לא ניתן לקרוא מיקום: " + err.message);
        stop();
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
    setSharing(true);
    toast.success("שיתוף המיקום פעיל — הנוסעים רואים אותך בזמן אמת");
  };

  const stop = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    await supabase.from("driver_locations").delete().eq("ride_id", rideId);
    setSharing(false);
    toast.info("שיתוף המיקום הופסק");
  };

  return sharing ? (
    <Button
      onClick={stop}
      size="sm"
      variant="outline"
      className="gap-1.5 rounded-xl text-xs font-bold h-9 border-destructive/40 text-destructive hover:bg-destructive/10"
    >
      <Square className="w-3.5 h-3.5 fill-current" />
      עצור שיתוף
      <span className="ml-1 w-2 h-2 rounded-full bg-destructive animate-pulse" />
    </Button>
  ) : (
    <Button
      onClick={start}
      size="sm"
      className="gap-1.5 rounded-xl text-xs font-bold h-9 bg-gradient-to-r from-primary to-accent border-0"
    >
      <RadioTower className="w-3.5 h-3.5" />
      התחל נסיעה
    </Button>
  );
}
