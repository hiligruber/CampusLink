import { useState } from "react";
import { Clock, Users, Map, CalendarPlus, Ban, MoreHorizontal, MapPin, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RideRow, getDisplayStatus, joinRide, cancelRide } from "@/lib/rides-api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import RouteMap from "@/components/RouteMap";
import DriverLocationSharer from "@/components/DriverLocationSharer";
import JoinRideDialog from "@/components/JoinRideDialog";
import { useLang } from "@/contexts/LanguageContext";
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

interface RideCardProps {
  ride: RideRow;
  index: number;
  driverAvatarUrl?: string | null;
}

// Deterministic gradient per driver name
const gradients = [
  "from-emerald-600 to-green-500",
  "from-lime-600 to-emerald-500",
  "from-green-700 to-teal-500",
  "from-teal-600 to-emerald-400",
  "from-emerald-500 to-green-400",
  "from-green-600 to-lime-500",
];

const RideCard = ({ ride, index, driverAvatarUrl }: RideCardProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t, lang } = useLang();
  const [showMap, setShowMap] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const departureDate = new Date(ride.departure_time);
  const locale = lang === "EN" ? "en-US" : "he-IL";
  const timeStr = departureDate.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const dateStr = departureDate.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });

  const isOwnRide = user?.id === ride.driver_id;
  const display = getDisplayStatus(ride);
  const isInactive = display !== "active";
  const isFull = ride.available_seats === 0;
  const driverName = ride.driver_name || "סטודנט";
  const driverInitial = driverName.charAt(0).toUpperCase();
  const grad = gradients[(driverName.charCodeAt(0) || 0) % gradients.length];

  const postedAgo = (() => {
    const created = new Date((ride as any).created_at || ride.departure_time).getTime();
    const m = Math.floor((Date.now() - created) / 60000);
    if (m < 1) return t("now");
    if (m < 60) return `${m} ${t("min")}`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ${t("hr")}`;
    return `${Math.floor(h / 24)} ${t("day")}`;
  })();

  const handleAddToCalendar = () => {
    const start = departureDate;
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const url = new URL("https://calendar.google.com/calendar/render");
    url.searchParams.set("action", "TEMPLATE");
    url.searchParams.set("text", `Ride: ${ride.origin} → ${ride.destination}`);
    url.searchParams.set("dates", `${fmt(start)}/${fmt(end)}`);
    url.searchParams.set("details", `Driver: ${driverName}\nSeats: ${ride.available_seats}/${ride.total_seats}`);
    url.searchParams.set("location", ride.origin);
    window.open(url.toString(), "_blank");
  };

  const handleJoinSubmit = async (pickupLocation: string, pickupCoords?: { lat: number | null; lng: number | null }) => {
    if (!user) return;
    setJoining(true);
    try {
      await joinRide(ride.id, user.id, pickupLocation, pickupCoords);
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success(`הבקשה נשלחה ל${driverName}`, {
        description: `איסוף: ${pickupLocation}`,
      });
      setJoinOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to join ride");
    } finally {
      setJoining(false);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelRide(ride.id);
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      toast.success("הנסיעה בוטלה");
    } catch (e: any) {
      toast.error(e?.message || "ביטול הנסיעה נכשל");
    } finally {
      setConfirmCancel(false);
    }
  };

  const statusBadge =
    display === "cancelled" ? (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">{t("cancelled")}</span>
    ) : display === "completed" ? (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t("passed")}</span>
    ) : isFull ? (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warning/15 text-warning">{t("full")}</span>
    ) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`relative bg-card/80 backdrop-blur-xl rounded-3xl border border-border/70 shadow-card overflow-hidden hover:-translate-y-0.5 hover:shadow-pop transition-all duration-200 ${
        display === "completed" ? "opacity-80 stamp-ended grayscale-[40%]" : ""
      } ${display === "cancelled" ? "opacity-60" : ""}`}
    >
      {/* Author header — warm tint */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 bg-gradient-to-br from-primary/[0.04] via-transparent to-primary/[0.06]">
        <div className="avatar-ring">
          <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-base overflow-hidden`}>
            {driverAvatarUrl ? (
              <img src={driverAvatarUrl} alt={driverName} className="w-full h-full object-cover" />
            ) : (
              driverInitial
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-sm truncate">{driverName}</p>
            {isOwnRide && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">{t("you")}</span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{t("posted_a_ride")} · {postedAgo}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {statusBadge}
          <button className="text-muted-foreground hover:text-foreground p-1">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Origin → Destination flow */}
      <div className="px-4 pb-3">
        <div className="bg-secondary/40 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center pt-1">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" strokeWidth={2.5} />
              </div>
              <div className="my-1 h-7 border-r-2 border-dashed border-border" />
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Flag className="w-4 h-4 text-primary" strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{t("origin")}</p>
                <p className="text-sm font-bold text-foreground truncate">{ride.origin}</p>
              </div>
              <div className="mt-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{t("destination")}</p>
                <p className="text-sm font-bold text-foreground truncate">{ride.destination}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Meta chips */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
            <Clock className="w-3 h-3" />
            {dateStr} · {timeStr}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
            <Users className="w-3 h-3" />
            {ride.available_seats}/{ride.total_seats} {t("seats")}
          </span>
        </div>

        {ride.notes && (
          <p className="text-sm text-foreground/80 mt-3 leading-relaxed">{ride.notes}</p>
        )}
      </div>

      {/* Action bar */}
      <div className="px-3 pb-3 pt-1 flex items-center gap-1.5 border-t border-border/60">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 gap-1.5 rounded-xl text-xs font-semibold h-9"
          onClick={() => setShowMap(!showMap)}
        >
          <Map className="w-4 h-4" />
          {t("map")}
        </Button>
        {!isInactive && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 gap-1.5 rounded-xl text-xs font-semibold h-9"
            onClick={handleAddToCalendar}
          >
            <CalendarPlus className="w-4 h-4" />
            {t("calendar")}
          </Button>
        )}
        {isOwnRide ? (
          display === "active" && (
            <>
              <DriverLocationSharer
                rideId={ride.id}
                driverId={ride.driver_id}
                phase={(ride.ride_phase ?? "scheduled") as any}
              />
              {(ride.ride_phase ?? "scheduled") === "scheduled" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 rounded-xl text-xs font-semibold h-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setConfirmCancel(true)}
                >
                  <Ban className="w-4 h-4" />
                  {t("cancel")}
                </Button>
              )}
            </>
          )
        ) : (
          <Button
            size="sm"
            onClick={() => setJoinOpen(true)}
            disabled={isFull || isInactive}
            className="flex-[2] rounded-xl text-xs font-bold h-9 shadow-pop bg-gradient-to-r from-primary to-accent hover:opacity-95 border-0"
          >
            {isInactive ? t("closed") : isFull ? t("full") : t("request_join")}
          </Button>
        )}
      </div>

      <JoinRideDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        rideOrigin={ride.origin}
        rideDestination={ride.destination}
        driverName={driverName}
        submitting={joining}
        onConfirm={handleJoinSubmit}
      />

      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <RouteMap origin={ride.origin} destination={ride.destination} height="180px" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancel_ride_q")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cancel_ride_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("back")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="rounded-xl bg-destructive hover:bg-destructive/90">
              {t("cancel_ride")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default RideCard;
