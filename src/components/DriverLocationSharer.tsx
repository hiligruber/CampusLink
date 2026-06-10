import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocationSharing } from "@/contexts/LocationSharingContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Car, Navigation as NavIcon, CheckCircle2, Users, Loader2, MapPinOff, MapPin } from "lucide-react";
import { setRidePhase, type RidePhase } from "@/lib/rides-api";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  rideId: string;
  driverId: string;
  phase: RidePhase;
  onCompleted?: () => void;
}

export default function DriverLocationSharer({ rideId, driverId, phase, onCompleted }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { status, lastFix, retry, captureOnceAndUpsert } = useLocationSharing();
  const [busy, setBusy] = useState(false);
  const [pendingDialog, setPendingDialog] = useState(false);

  const isDriver = user?.id === driverId;
  if (!isDriver) return null;
  if (phase === "completed") return null;

  const sharingActive = phase === "en_route" || phase === "picked_up" || phase === "in_progress";

  const doAdvance = async (next: RidePhase, successMsg: string) => {
    setBusy(true);
    try {
      await setRidePhase(rideId, next);
      if (next === "completed") {
        await supabase.from("driver_locations").delete().eq("ride_id", rideId);
      }
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      toast.success(successMsg);
      if (next === "completed") onCompleted?.();
    } catch (e: any) {
      toast.error(e?.message || "פעולה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const startRide = async () => {
    setBusy(true);
    const ok = await captureOnceAndUpsert(rideId);
    setBusy(false);
    if (!ok) {
      setPendingDialog(true);
      return;
    }
    await doAdvance("en_route", "הנוסעים יודעים שאתה בדרך");
  };

  const continueWithoutLocation = async () => {
    setPendingDialog(false);
    await doAdvance("en_route", "התחלת — אך המיקום לא משותף");
  };

  const renderStatusChip = () => {
    if (!sharingActive) return null;
    if (status === "active" && lastFix) {
      const secAgo = Math.floor((Date.now() - lastFix) / 1000);
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
          <MapPin className="w-3 h-3" />
          GPS פעיל · {secAgo < 60 ? `${secAgo}ש'` : "<1ד'"}
        </span>
      );
    }
    if (status === "requesting" || status === "idle") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          מאתר GPS…
        </span>
      );
    }
    if (status === "denied" || status === "error" || status === "unavailable") {
      return (
        <button
          type="button"
          onClick={retry}
          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition"
        >
          <MapPinOff className="w-3 h-3" />
          {status === "unavailable" ? "GPS לא נתמך" : "אין מיקום · נסה שוב"}
        </button>
      );
    }
    return null;
  };

  return (
    <>
      <div className="flex items-center gap-1.5 flex-wrap">
        {renderStatusChip()}

        {phase === "scheduled" && (
          <Button
            onClick={startRide}
            disabled={busy}
            size="sm"
            className="gap-1.5 rounded-xl text-xs font-bold h-9 bg-gradient-to-r from-primary to-accent border-0"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Car className="w-3.5 h-3.5" />}
            בדרך אליך
          </Button>
        )}

        {phase === "en_route" && (
          <Button
            onClick={() => doAdvance("picked_up", "מצויין — הנוסעים אצלך")}
            disabled={busy}
            size="sm"
            className="gap-1.5 rounded-xl text-xs font-bold h-9 bg-gradient-to-r from-primary to-accent border-0"
          >
            <Users className="w-3.5 h-3.5" />
            אספתי את הנוסעים
          </Button>
        )}

        {phase === "picked_up" && (
          <Button
            onClick={() => doAdvance("in_progress", "הנסיעה התחילה")}
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
            onClick={() => doAdvance("completed", "הנסיעה הסתיימה")}
            disabled={busy}
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-xl text-xs font-bold h-9 border-primary/40 text-primary hover:bg-primary/10"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            הורדתי את הנוסעים
          </Button>
        )}
      </div>

      <AlertDialog open={pendingDialog} onOpenChange={setPendingDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>לא הצלחנו לקרוא את המיקום שלך</AlertDialogTitle>
            <AlertDialogDescription>
              ייתכן שדחית את ההרשאה למיקום או שאין GPS זמין. אם תמשיך בלי מיקום, הנוסעים לא יראו אותך על המפה.
              מומלץ לאשר גישה למיקום בדפדפן ולנסות שוב.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={continueWithoutLocation}>המשך בלי מיקום</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setPendingDialog(false); startRide(); }}>
              נסה שוב
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
