import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import DriverLocationSharer from "@/components/DriverLocationSharer";
import DriverStopsWaze from "@/components/DriverStopsWaze";
import LiveTrackingSheet from "@/components/LiveTrackingSheet";
import RideChat from "@/components/RideChat";
import RideRatingDialog from "@/components/RideRatingDialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Navigation,
  MessageCircle,
  Clock,
  MapPin,
  Car,
  User as UserIcon,
  Search,
  Activity,
  Star,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLang } from "@/contexts/LanguageContext";
import type { RidePhase } from "@/lib/rides-api";

interface ActiveRideItem {
  rideId: string;
  role: "driver" | "passenger";
  origin: string;
  destination: string;
  departureTime: string;
  phase: RidePhase;
  driverId: string;
  driverName: string;
  driverAvatar: string | null;
  passengerId?: string;
  passengerName?: string;
  passengerAvatar?: string | null;
  pickupLocation?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  bookingId?: string;
}

// Lower rank = higher priority (top of list).
// Live phases first, then upcoming, then completed.
const phaseRank: Record<RidePhase, number> = {
  in_progress: 0,
  picked_up: 1,
  en_route: 2,
  scheduled: 3,
  completed: 4,
};

const ActiveRides = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, lang } = useLang();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusRideId = searchParams.get("ride");

  const [chat, setChat] = useState<{ rideId: string; userId: string; name: string } | null>(null);
  const [trackingRide, setTrackingRide] = useState<ActiveRideItem | null>(null);
  const [ratingTarget, setRatingTarget] = useState<{ rideId: string; rateeId: string; rateeName: string } | null>(null);
  const [handledRatings, setHandledRatings] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("active-rides-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "rides" }, () =>
        queryClient.invalidateQueries({ queryKey: ["active-rides"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () =>
        queryClient.invalidateQueries({ queryKey: ["active-rides"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, queryClient]);

  const phaseMeta = (p: RidePhase) => {
    switch (p) {
      case "en_route":    return { label: t("phase_en_route"),    cls: "bg-accent/15 text-accent" };
      case "picked_up":   return { label: t("phase_picked_up"),   cls: "bg-primary/15 text-primary" };
      case "in_progress": return { label: t("phase_in_progress"), cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" };
      case "completed":   return { label: t("phase_completed"),   cls: "bg-muted text-muted-foreground" };
      default:            return { label: t("phase_scheduled"),   cls: "bg-secondary text-secondary-foreground" };
    }
  };

  // Active + recently completed rides (so we can show rating prompts)
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["active-rides", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ActiveRideItem[]> => {
      const { data: myRides } = await supabase
        .from("rides")
        .select("*")
        .eq("driver_id", user!.id)
        .eq("status", "active");

      const { data: myBookings } = await supabase
        .from("bookings")
        .select("id, ride_id, pickup_location, pickup_lat, pickup_lng, status")
        .eq("passenger_id", user!.id)
        .eq("status", "accepted");

      const passengerRideIds = (myBookings ?? []).map((b) => b.ride_id);
      const { data: passengerRides } = passengerRideIds.length
        ? await supabase.from("rides").select("*").in("id", passengerRideIds).eq("status", "active")
        : { data: [] as any[] };

      const driverIds = [
        ...new Set([
          ...(myRides ?? []).map((r) => r.driver_id),
          ...(passengerRides ?? []).map((r: any) => r.driver_id),
        ]),
      ];
      const { data: profiles } = driverIds.length
        ? await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", driverIds)
        : { data: [] as any[] };

      const myRideIds = (myRides ?? []).map((r) => r.id);
      const { data: ridePassengers } = myRideIds.length
        ? await supabase
            .from("bookings")
            .select("ride_id, passenger_id, pickup_location, pickup_lat, pickup_lng, id")
            .in("ride_id", myRideIds)
            .eq("status", "accepted")
        : { data: [] as any[] };

      const passengerIds = [...new Set((ridePassengers ?? []).map((b: any) => b.passenger_id))];
      const { data: passengerProfiles } = passengerIds.length
        ? await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", passengerIds)
        : { data: [] as any[] };

      const items: ActiveRideItem[] = [];

      // A ride belongs on the Activity page only if it is upcoming or live.
      // Past rides (scheduled time has passed and not currently live) and
      // completed rides are filtered out — they live under "Past Rides" in
      // the user's profile.
      const LIVE_PHASES: RidePhase[] = ["en_route", "picked_up", "in_progress"];
      const isRelevant = (r: any) => {
        const phase = (r.ride_phase ?? "scheduled") as RidePhase;
        if (phase === "completed") return false;
        if (LIVE_PHASES.includes(phase)) return true;
        // scheduled — keep only if departure time is still in the future
        // (with a small 15-minute grace window so a just-passed slot doesn't
        // vanish before the driver hits "I'm on my way").
        const dep = new Date(r.departure_time).getTime();
        return dep > Date.now() - 15 * 60 * 1000;
      };

      for (const r of myRides ?? []) {
        if (!isRelevant(r)) continue;
        const driverProf = profiles?.find((p: any) => p.user_id === r.driver_id);
        const firstPassenger = (ridePassengers ?? []).find((b: any) => b.ride_id === r.id);
        const passProf = firstPassenger
          ? passengerProfiles?.find((p: any) => p.user_id === firstPassenger.passenger_id)
          : null;
        items.push({
          rideId: r.id,
          role: "driver",
          origin: r.origin,
          destination: r.destination,
          departureTime: r.departure_time,
          phase: (r.ride_phase ?? "scheduled") as RidePhase,
          driverId: r.driver_id,
          driverName: r.driver_name || driverProf?.full_name || (lang === "EN" ? "You" : "את/ה"),
          driverAvatar: driverProf?.avatar_url ?? null,
          passengerId: firstPassenger?.passenger_id,
          passengerName: passProf?.full_name,
          passengerAvatar: passProf?.avatar_url ?? null,
          pickupLocation: firstPassenger?.pickup_location,
          pickupLat: firstPassenger?.pickup_lat,
          pickupLng: firstPassenger?.pickup_lng,
          bookingId: firstPassenger?.id,
        });
      }

      for (const r of passengerRides ?? []) {
        if (!isRelevant(r)) continue;
        const driverProf = profiles?.find((p: any) => p.user_id === r.driver_id);
        const myB = (myBookings ?? []).find((b) => b.ride_id === r.id);
        items.push({
          rideId: r.id,
          role: "passenger",
          origin: r.origin,
          destination: r.destination,
          departureTime: r.departure_time,
          phase: (r.ride_phase ?? "scheduled") as RidePhase,
          driverId: r.driver_id,
          driverName: r.driver_name || driverProf?.full_name || (lang === "EN" ? "Driver" : "נהג"),
          driverAvatar: driverProf?.avatar_url ?? null,
          pickupLocation: myB?.pickup_location,
          pickupLat: myB?.pickup_lat,
          pickupLng: myB?.pickup_lng,
          bookingId: myB?.id,
        });
      }

      items.sort((a, b) => {
        const r = phaseRank[a.phase] - phaseRank[b.phase];
        if (r !== 0) return r;
        // Soonest first
        return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
      });
      return items;
    },
  });

  // Scroll focused ride (from notification deep link) into view
  useEffect(() => {
    if (!focusRideId || !items.length) return;
    const el = document.getElementById(`ride-${focusRideId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const timer = setTimeout(() => {
        setSearchParams({}, { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [focusRideId, items, setSearchParams]);

  // Rating dialog opens only after the driver explicitly completes the ride
  // (via DriverLocationSharer onComplete) or when the user clicks the rate
  // button on a completed ride card. No automatic popup on screen entry.


  return (
    <div className="min-h-screen pb-24">
      <AppHeader subtitle={`${items.length} ${t("active_rides")}`} />
      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-6xl mx-auto px-5 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {isLoading ? (
          <div className="lg:col-span-2 flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="lg:col-span-2 text-center py-20 glass-card rounded-3xl">
            <Activity className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" strokeWidth={1.5} />
            <p className="text-lg font-bold mb-1">{t("no_active_title")}</p>
            <p className="text-sm text-muted-foreground mb-5">{t("no_active_desc")}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => navigate("/")} className="gap-1.5">
                <Search className="w-4 h-4" /> {t("find_ride")}
              </Button>
              <Button variant="outline" onClick={() => navigate("/post")} className="gap-1.5">
                <Car className="w-4 h-4" /> {t("post_ride")}
              </Button>
            </div>
          </div>
        ) : (
          items.map((it) => {
            const d = new Date(it.departureTime);
            const meta = phaseMeta(it.phase);
            const otherUserId = it.role === "passenger" ? it.driverId : it.passengerId;
            const otherUserName = it.role === "passenger" ? it.driverName : it.passengerName ?? t("passenger_short");
            const isCompleted = it.phase === "completed";
            const isFocused = focusRideId === it.rideId;
            return (
              <div
                key={it.rideId + it.role}
                id={`ride-${it.rideId}`}
                className={`glass-card rounded-3xl overflow-hidden transition-all ${
                  isFocused ? "ring-2 ring-primary shadow-pop scale-[1.01]" : ""
                }`}
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          it.role === "driver"
                            ? "bg-gradient-to-r from-primary to-accent text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {it.role === "driver" ? t("you_driver") : t("you_passenger")}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {d.toLocaleTimeString(lang === "EN" ? "en-US" : "he-IL", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-sm bg-primary" />
                      <span className="font-semibold truncate">{it.origin}</span>
                    </div>
                    <div className="mr-[3px] border-r-2 border-dotted border-border h-3" />
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-sm bg-accent" />
                      <span className="font-semibold truncate">{it.destination}</span>
                    </div>
                  </div>

                  {it.role === "passenger" && it.pickupLocation && (
                    <div className="flex items-start gap-2 text-xs bg-primary/5 border border-primary/15 rounded-xl px-3 py-2">
                      <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-wide">
                          {t("pickup_yours")}
                        </p>
                        <p className="text-foreground font-semibold truncate">{it.pickupLocation}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-7 h-7 rounded-full bg-secondary overflow-hidden flex items-center justify-center">
                      {it.driverAvatar ? (
                        <img src={it.driverAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-muted-foreground">
                      {t("driver_short")}: <span className="font-semibold text-foreground">{it.driverName}</span>
                    </span>
                  </div>

                  {it.role === "driver" && !isCompleted && (
                    <div className="pt-2 border-t border-border">
                      <DriverLocationSharer
                        rideId={it.rideId}
                        driverId={it.driverId}
                        phase={it.phase}
                        onCompleted={() => {
                          if (otherUserId && otherUserName) {
                            setRatingTarget({ rideId: it.rideId, rateeId: otherUserId, rateeName: otherUserName });
                          }
                        }}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {!isCompleted ? (
                      <Button
                        size="sm"
                        className="gap-1.5 rounded-xl text-xs font-bold h-10 bg-gradient-to-r from-primary to-accent border-0 shadow-pop"
                        onClick={() => setTrackingRide(it)}
                      >
                        <Navigation className="w-4 h-4" />
                        {t("open_map")}
                      </Button>
                    ) : (
                      otherUserId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 rounded-xl text-xs font-bold h-10 border-warning/40 text-warning hover:bg-warning/10 hover:text-warning"
                          onClick={() =>
                            setRatingTarget({ rideId: it.rideId, rateeId: otherUserId!, rateeName: otherUserName })
                          }
                        >
                          <Star className="w-4 h-4" />
                          {t("rate_with")} {otherUserName}
                        </Button>
                      )
                    )}
                    {otherUserId && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 rounded-xl text-xs font-bold h-10"
                        onClick={() => setChat({ rideId: it.rideId, userId: otherUserId, name: otherUserName })}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        {t("send_message")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </motion.main>

      {chat && (
        <RideChat
          open={!!chat}
          onOpenChange={(o) => !o && setChat(null)}
          rideId={chat.rideId}
          otherUserId={chat.userId}
          otherUserName={chat.name}
        />
      )}

      {trackingRide && (
        <LiveTrackingSheet
          open={!!trackingRide}
          onOpenChange={(o) => !o && setTrackingRide(null)}
          rideId={trackingRide.rideId}
          destination={trackingRide.destination}
          pickupLocation={trackingRide.pickupLocation ?? undefined}
          pickupLat={trackingRide.pickupLat}
          pickupLng={trackingRide.pickupLng}
          phase={trackingRide.phase}
          driverName={trackingRide.driverName}
        />
      )}

      {ratingTarget && (
        <RideRatingDialog
          open={!!ratingTarget}
          onOpenChange={(o) => {
            if (!o) {
              const key = `${ratingTarget.rideId}:${ratingTarget.rateeId}`;
              setHandledRatings((prev) => new Set(prev).add(key));
              setRatingTarget(null);
            }
          }}
          rideId={ratingTarget.rideId}
          rateeId={ratingTarget.rateeId}
          rateeName={ratingTarget.rateeName}
          onDone={() => {
            const key = `${ratingTarget.rideId}:${ratingTarget.rateeId}`;
            setHandledRatings((prev) => new Set(prev).add(key));
            setRatingTarget(null);
            queryClient.invalidateQueries({ queryKey: ["my-ratings"] });
          }}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default ActiveRides;
