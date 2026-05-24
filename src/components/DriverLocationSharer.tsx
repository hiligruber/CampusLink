import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Car, Navigation as NavIcon, CheckCircle2, Radio } from "lucide-react";
import { setRidePhase, type RidePhase } from "@/lib/rides-api";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  rideId: string;
  driverId: string;
  phase: RidePhase;
}

/**
 * Driver-only three-phase controller:
 *  scheduled  → "בדרך אליך" (start sharing location)
 *  en_route   → "התחל נסיעה"
 *  in_progress→ "סיים נסיעה" (stop sharing)
 *  completed  → nothing
 */
export default function DriverLocationSharer({ rideId, driverId, phase }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);
  const [busy, setBusy] = useState(false);

  const isDriver = user?.id === driverId;
  const sharingActive = phase === "en_route" || phase === "in_progress";

  // Start/stop geolocation watcher based on phase
  useEffect(() => {
    if (!isDriver) return;
    if (sharingActive && watchIdRef.current === null) {
      if (!("geolocation" in navigator)) {
        toast.error("הדפדפן לא תומך במיקום");
        return;
      }
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const now = Date.now();
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
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
      );
    }
    if (!sharingActive && watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    return () => {
      if (watchIdRef.current !== null && !sharingActive) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isDriver, sharingActive, rideId, driverId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  if (!isDriver) return null;
  if (phase === "completed") return null;

  const advance = async (next: RidePhase, successMsg: string) => {
    setBusy(true);
    try {
      await setRidePhase(rideId, next);
      if (next === "completed") {
        await supabase.from("driver_locations").delete().eq("ride_id", rideId);
      }
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      toast.success(successMsg);
    } catch (e: any) {
      toast.error(e?.message || "פעולה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {sharingActive && (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-destructive/10 text-destructive">
          <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
          המיקום שלך משותף
        </span>
      )}

      {phase === "scheduled" && (
        <Button
          onClick={() => advance("en_route", "הנוסעים יודעים שאתה בדרך")}
          disabled={busy}
          size="sm"
          className="gap-1.5 rounded-xl text-xs font-bold h-9 bg-gradient-to-r from-primary to-accent border-0"
        >
          <Car className="w-3.5 h-3.5" />
          בדרך אליך
        </Button>
      )}

      {phase === "en_route" && (
        <Button
          onClick={() => advance("in_progress", "הנסיעה התחילה")}
          disabled={busy}
          size="sm"
          className="gap-1.5 rounded-xl text-xs font-bold h-9 bg-gradient-to-r from-primary to-accent border-0"
        >
          <NavIcon className="w-3.5 h-3.5" />
          התחל נסיעה
        </Button>
      )}

      {phase === "in_progress" && (
        <Button
          onClick={() => advance("completed", "הנסיעה הסתיימה")}
          disabled={busy}
          size="sm"
          variant="outline"
          className="gap-1.5 rounded-xl text-xs font-bold h-9 border-primary/40 text-primary hover:bg-primary/10"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          סיים נסיעה
        </Button>
      )}
    </div>
  );
}
