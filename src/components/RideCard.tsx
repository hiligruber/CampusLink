import { useState } from "react";
import { Clock, Users, Map, CalendarPlus, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RideRow, getDisplayStatus, joinRide, cancelRide } from "@/lib/rides-api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import RouteMap from "@/components/RouteMap";
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
}

const RideCard = ({ ride, index }: RideCardProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showMap, setShowMap] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const departureDate = new Date(ride.departure_time);
  const timeStr = departureDate.toLocaleTimeString("en-IL", { hour: "2-digit", minute: "2-digit" });
  const dateStr = departureDate.toLocaleDateString("en-IL", { weekday: "short", month: "short", day: "numeric" });

  const isOwnRide = user?.id === ride.driver_id;
  const display = getDisplayStatus(ride);
  const isInactive = display !== "active";
  const isFull = ride.available_seats === 0;
  const driverInitial = (ride.driver_name || "?").charAt(0).toUpperCase();

  const handleAddToCalendar = () => {
    const start = departureDate;
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const url = new URL("https://calendar.google.com/calendar/render");
    url.searchParams.set("action", "TEMPLATE");
    url.searchParams.set("text", `🚗 Ride: ${ride.origin} → ${ride.destination}`);
    url.searchParams.set("dates", `${fmt(start)}/${fmt(end)}`);
    url.searchParams.set("details", `Driver: ${ride.driver_name}\nSeats: ${ride.available_seats}/${ride.total_seats}\nPosted via CampusLink`);
    url.searchParams.set("location", ride.origin);
    window.open(url.toString(), "_blank");
  };

  const handleJoin = async () => {
    if (!user) return;
    try {
      await joinRide(ride.id, user.id);
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      toast.success(`Request sent to ${ride.driver_name}!`, {
        description: `${ride.origin} → ${ride.destination}`,
      });
    } catch (e: any) {
      toast.error(e?.message || "Failed to join ride");
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
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">בוטלה</span>
    ) : display === "completed" ? (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">עברה</span>
    ) : isFull ? (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning">מלאה</span>
    ) : null;

  // Pick a vibrant gradient based on driver name (deterministic)
  const gradients = ["gradient-primary", "gradient-fun", "gradient-warm", "gradient-cool"];
  const grad = gradients[(ride.driver_name || "X").charCodeAt(0) % gradients.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      whileHover={{ y: -2 }}
      className={`relative bg-card rounded-3xl border border-border/60 p-4 shadow-soft hover:shadow-pop transition-all overflow-hidden ${
        isInactive ? "opacity-60 grayscale" : ""
      }`}
    >
      {!isInactive && (
        <div className={`absolute top-0 left-0 right-0 h-1 ${grad}`} />
      )}

      <div className="flex items-start gap-3 mb-3">
        <div className="flex flex-col items-center mt-1.5">
          <div className="w-3 h-3 rounded-full gradient-primary shadow-pop" />
          <div className="w-0.5 h-8 bg-gradient-to-b from-primary to-primary-glow/40" />
          <div className="w-3 h-3 rounded-full border-2 border-primary bg-card" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-foreground truncate">{ride.origin}</p>
            {statusBadge}
          </div>
          <div className="h-4" />
          <p className="text-sm font-bold text-foreground truncate">{ride.destination}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs mb-3">
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground font-semibold">
          <Clock className="w-3 h-3" />
          {dateStr} · {timeStr}
        </span>
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/20 text-accent-foreground font-semibold">
          <Users className="w-3 h-3" />
          {ride.available_seats}/{ride.total_seats}
        </span>
      </div>

      {ride.notes && <p className="text-xs text-muted-foreground mb-3 italic">"{ride.notes}"</p>}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-full ${grad} flex items-center justify-center text-sm font-bold text-white shadow-soft ring-2 ring-background`}>
            {driverInitial}
          </div>
          <p className="text-sm font-semibold text-foreground">{ride.driver_name || "Student"}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isInactive && (
            <Button size="icon" variant="ghost" className="rounded-full w-8 h-8" onClick={handleAddToCalendar} title="Add to Google Calendar">
              <CalendarPlus className="w-4 h-4" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="rounded-full w-8 h-8" onClick={() => setShowMap(!showMap)}>
            <Map className="w-4 h-4" />
          </Button>
          {isOwnRide ? (
            display === "active" ? (
              <Button
                size="sm"
                variant="destructive"
                className="rounded-full px-4 gap-1"
                onClick={() => setConfirmCancel(true)}
              >
                <Ban className="w-3.5 h-3.5" />
                בטל
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground px-2">הנסיעה שלך</span>
            )
          ) : (
            <Button
              size="sm"
              onClick={handleJoin}
              disabled={isFull || isInactive}
              className="rounded-full px-5"
            >
              {isInactive ? (display === "completed" ? "עברה" : "בוטלה") : isFull ? "Full" : "Join Ride"}
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mt-3"
          >
            <RouteMap origin={ride.origin} destination={ride.destination} height="160px" />
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>לבטל את הנסיעה?</AlertDialogTitle>
            <AlertDialogDescription>
              הנסיעה תסומן כמבוטלת ולא תופיע יותר כפעילה. כל ההזמנות הקיימות יישארו לתיעוד.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>חזרה</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive hover:bg-destructive/90">
              בטל נסיעה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default RideCard;
