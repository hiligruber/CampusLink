import { useState } from "react";
import { Clock, Users, Map, CalendarPlus, Ban, ArrowLeft } from "lucide-react";
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
  const dateStr = departureDate.toLocaleDateString("he-IL", { weekday: "long", month: "long", day: "numeric" });

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
    url.searchParams.set("text", `Ride: ${ride.origin} → ${ride.destination}`);
    url.searchParams.set("dates", `${fmt(start)}/${fmt(end)}`);
    url.searchParams.set("details", `Driver: ${ride.driver_name}\nSeats: ${ride.available_seats}/${ride.total_seats}\nPosted via Campus`);
    url.searchParams.set("location", ride.origin);
    window.open(url.toString(), "_blank");
  };

  const handleJoin = async () => {
    if (!user) return;
    try {
      await joinRide(ride.id, user.id);
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      toast.success(`הבקשה נשלחה ל${ride.driver_name}`, { description: `${ride.origin} → ${ride.destination}` });
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
    display === "cancelled" ? "בוטלה" : display === "completed" ? "עברה" : isFull ? "מלאה" : null;

  // Featured layout for first item
  const featured = index === 0 && !isInactive;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
      className={`group relative bg-card border-b rule pb-6 mb-6 last:border-b-0 ${
        isInactive ? "opacity-40" : ""
      }`}
    >
      {/* Eyebrow row */}
      <div className="flex items-center justify-between mb-3">
        <p className="eyebrow">
          {featured ? "featured · today" : `no. ${String(index + 1).padStart(2, "0")}`}
        </p>
        {statusBadge && (
          <span className="text-[10px] font-semibold uppercase tracking-widest text-accent">
            · {statusBadge} ·
          </span>
        )}
      </div>

      {/* Headline route — editorial */}
      <div className="mb-4">
        <h2 className={`font-display font-light text-foreground leading-[0.95] ${featured ? "text-4xl" : "text-2xl"}`}>
          {ride.origin}
        </h2>
        <div className="flex items-center gap-2 my-1.5 text-muted-foreground">
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span className="text-[10px] uppercase tracking-widest">to</span>
          <div className="flex-1 border-t rule" />
        </div>
        <h2 className={`font-display font-light text-foreground leading-[0.95] ${featured ? "text-4xl" : "text-2xl"}`}>
          {ride.destination}
        </h2>
      </div>

      {/* Meta line — magazine-style */}
      <div className="flex items-baseline gap-3 text-sm font-serif italic text-muted-foreground mb-4">
        <span className="flex items-baseline gap-1.5">
          <Clock className="w-3 h-3 self-center not-italic" strokeWidth={1.5} />
          {dateStr} · {timeStr}
        </span>
        <span className="text-border">/</span>
        <span className="flex items-baseline gap-1.5">
          <Users className="w-3 h-3 self-center not-italic" strokeWidth={1.5} />
          {ride.available_seats} מתוך {ride.total_seats}
        </span>
      </div>

      {ride.notes && (
        <blockquote className="border-r-2 border-accent pr-3 mb-4 text-sm font-serif italic text-foreground/80">
          "{ride.notes}"
        </blockquote>
      )}

      {/* Byline */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 rule bg-paper-warm flex items-center justify-center text-sm font-display font-semibold text-foreground">
            {driverInitial}
          </div>
          <div>
            <p className="eyebrow">by</p>
            <p className="text-sm font-semibold text-foreground leading-tight">{ride.driver_name || "סטודנט"}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!isInactive && (
            <Button size="icon" variant="ghost" className="rounded-none w-9 h-9" onClick={handleAddToCalendar} title="הוסף ליומן">
              <CalendarPlus className="w-4 h-4" strokeWidth={1.5} />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="rounded-none w-9 h-9" onClick={() => setShowMap(!showMap)}>
            <Map className="w-4 h-4" strokeWidth={1.5} />
          </Button>
          {isOwnRide ? (
            display === "active" ? (
              <Button
                size="sm"
                variant="outline"
                className="rounded-none border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground gap-1 uppercase text-[11px] tracking-widest"
                onClick={() => setConfirmCancel(true)}
              >
                <Ban className="w-3 h-3" /> בטל
              </Button>
            ) : (
              <span className="text-[10px] eyebrow px-2">שלך</span>
            )
          ) : (
            <Button
              size="sm"
              onClick={handleJoin}
              disabled={isFull || isInactive}
              className="rounded-none px-5 uppercase text-[11px] tracking-widest font-semibold"
            >
              {isInactive ? "סגור" : isFull ? "מלאה" : "הצטרף"}
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
            className="overflow-hidden mt-4"
          >
            <RouteMap origin={ride.origin} destination={ride.destination} height="180px" />
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent dir="rtl" className="rounded-none border-2 rule">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-light text-2xl">לבטל את הנסיעה?</AlertDialogTitle>
            <AlertDialogDescription className="font-serif italic">
              הנסיעה תסומן כמבוטלת ולא תופיע יותר כפעילה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">חזרה</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="rounded-none bg-destructive hover:bg-destructive/90">
              בטל נסיעה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.article>
  );
};

export default RideCard;
