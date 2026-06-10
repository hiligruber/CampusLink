import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
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
  const { t } = useLang();
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
      toast.error(e?.message || t("generic_error"));
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
    await doAdvance("en_route", t("toast_passengers_notified"));
  };

  const continueWithoutLocation = async () => {
    setPendingDialog(false);
    await doAdvance("en_route", t("toast_started_no_loc"));
  };

  const renderStatusChip = () => {
    if (!sharingActive) return null;
    if (status === "active" && lastFix) {
      const secAgo = Math.floor((Date.now() - lastFix) / 1000);
      const timeLabel = secAgo < 60 ? `${secAgo}s` : "<1m";
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
          <MapPin className="w-3 h-3" />
          {t("gps_active")} · {timeLabel}
        </span>
      );
    }
    if (status === "requesting" || status === "idle") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          {t("gps_locating")}
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
          {status === "unavailable" ? t("gps_unsupported") : t("gps_no_fix")}
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
            {t("btn_on_the_way")}
          </Button>
        )}

        {phase === "en_route" && (
          <Button
            onClick={() => doAdvance("picked_up", t("toast_passengers_with_you"))}
            disabled={busy}
            size="sm"
            className="gap-1.5 rounded-xl text-xs font-bold h-9 bg-gradient-to-r from-primary to-accent border-0"
          >
            <Users className="w-3.5 h-3.5" />
            {t("btn_picked_up")}
          </Button>
        )}

        {phase === "picked_up" && (
          <Button
            onClick={() => doAdvance("in_progress", t("toast_ride_started"))}
            disabled={busy}
            size="sm"
            className="gap-1.5 rounded-xl text-xs font-bold h-9 bg-gradient-to-r from-primary to-accent border-0"
          >
            <NavIcon className="w-3.5 h-3.5" />
            {t("btn_start_ride")}
          </Button>
        )}

        {phase === "in_progress" && (
          <Button
            onClick={() => doAdvance("completed", t("toast_ride_finished"))}
            disabled={busy}
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-xl text-xs font-bold h-9 border-primary/40 text-primary hover:bg-primary/10"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t("btn_drop_off")}
          </Button>
        )}
      </div>

      <AlertDialog open={pendingDialog} onOpenChange={setPendingDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("loc_error_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("loc_error_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={continueWithoutLocation}>{t("loc_continue_without")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setPendingDialog(false); startRide(); }}>
              {t("retry")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
