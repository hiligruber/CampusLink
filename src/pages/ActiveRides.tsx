import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import DriverLiveTracker from "@/components/DriverLiveTracker";
import DriverLocationSharer from "@/components/DriverLocationSharer";
import RideChat from "@/components/RideChat";
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
} from "lucide-react";
import { motion } from "framer-motion";
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
  bookingId?: string;
}

const phaseMeta: Record<RidePhase, { label: string; cls: string }> = {
  scheduled: { label: "מתוכננת", cls: "bg-secondary text-secondary-foreground" },
  en_route: { label: "בדרך אליך", cls: "bg-accent/15 text-accent" },
  picked_up: { label: "אספו את הנוסעים", cls: "bg-primary/15 text-primary" },
  in_progress: { label: "בנסיעה", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  completed: { label: "הסתיימה", cls: "bg-muted text-muted-foreground" },
};

const phaseRank: Record<RidePhase, number> = {
  en_route: 0,
  picked_up: 1,
  in_progress: 2,
  scheduled: 3,
  completed: 4,
};

const ActiveRides = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [chat, setChat] = useState<{ rideId: string; userId: string; name: string } | null>(null);

  // Realtime invalidation
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

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["active-rides", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ActiveRideItem[]> => {
      // 1. Rides I drive
      const { data: myRides } = await supabase
        .from("rides")
        .select("*")
        .eq("driver_id", user!.id)
        .eq("status", "active")
        .neq("ride_phase", "completed");

      // 2. Bookings where I'm an accepted passenger
      const { data: myBookings } = await supabase
        .from("bookings")
        .select("id, ride_id, pickup_location, status")
        .eq("passenger_id", user!.id)
        .eq("status", "accepted");

      const passengerRideIds = (myBookings ?? []).map((b) => b.ride_id);
      const { data: passengerRides } = passengerRideIds.length
        ? await supabase
            .from("rides")
            .select("*")
            .in("id", passengerRideIds)
            .eq("status", "active")
            .neq("ride_phase", "completed")
        : { data: [] as any[] };

      const driverIds = [
        ...new Set([
          ...(myRides ?? []).map((r) => r.driver_id),
          ...(passengerRides ?? []).map((r: any) => r.driver_id),
        ]),
      ];
      const { data: profiles } = driverIds.length
        ? await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url")
            .in("user_id", driverIds)
        : { data: [] as any[] };

      // Get all accepted passenger names for driver's rides (first one shown)
      const myRideIds = (myRides ?? []).map((r) => r.id);
      const { data: ridePassengers } = myRideIds.length
        ? await supabase
            .from("bookings")
            .select("ride_id, passenger_id, pickup_location, id")
            .in("ride_id", myRideIds)
            .eq("status", "accepted")
        : { data: [] as any[] };

      const passengerIds = [...new Set((ridePassengers ?? []).map((b: any) => b.passenger_id))];
      const { data: passengerProfiles } = passengerIds.length
        ? await supabase
            .from("profiles")
            .select("user_id, full_name, avatar_url")
            .in("user_id", passengerIds)
        : { data: [] as any[] };

      const items: ActiveRideItem[] = [];

      // Driver items
      for (const r of myRides ?? []) {
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
          driverName: r.driver_name || driverProf?.full_name || "את/ה",
          driverAvatar: driverProf?.avatar_url ?? null,
          passengerId: firstPassenger?.passenger_id,
          passengerName: passProf?.full_name,
          passengerAvatar: passProf?.avatar_url ?? null,
          pickupLocation: firstPassenger?.pickup_location,
          bookingId: firstPassenger?.id,
        });
      }

      // Passenger items
      for (const r of passengerRides ?? []) {
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
          driverName: r.driver_name || driverProf?.full_name || "נהג",
          driverAvatar: driverProf?.avatar_url ?? null,
          pickupLocation: myB?.pickup_location,
          bookingId: myB?.id,
        });
      }

      items.sort((a, b) => {
        const r = phaseRank[a.phase] - phaseRank[b.phase];
        if (r !== 0) return r;
        return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
      });
      return items;
    },
  });

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      <AppHeader title="פעילות" subtitle={`${items.length} נסיעות פעילות`} />
      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="max-w-2xl mx-auto px-4 py-4 space-y-3"
      >
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Activity className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" strokeWidth={1.5} />
            <p className="text-lg font-bold mb-1">אין לך נסיעות פעילות</p>
            <p className="text-sm text-muted-foreground mb-5">
              ברגע שתפרסם נסיעה או תצטרף לאחת — היא תופיע כאן
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => navigate("/search")} className="gap-1.5">
                <Search className="w-4 h-4" /> חפש נסיעה
              </Button>
              <Button variant="outline" onClick={() => navigate("/post")} className="gap-1.5">
                <Car className="w-4 h-4" /> פרסם נסיעה
              </Button>
            </div>
          </div>
        ) : (
          items.map((it) => {
            const isExpanded = expanded === it.rideId + it.role;
            const d = new Date(it.departureTime);
            const meta = phaseMeta[it.phase];
            const otherUserId = it.role === "passenger" ? it.driverId : it.passengerId;
            const otherUserName = it.role === "passenger" ? it.driverName : it.passengerName ?? "נוסע";
            return (
              <div
                key={it.rideId + it.role}
                className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          it.role === "driver"
                            ? "bg-gradient-to-r from-primary to-accent text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {it.role === "driver" ? "את/ה הנהג" : "את/ה נוסע"}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
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
                          איסוף שלך
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
                      נהג: <span className="font-semibold text-foreground">{it.driverName}</span>
                    </span>
                  </div>

                  {/* Primary CTA */}
                  <div className="flex gap-2 pt-1">
                    {it.role === "driver" ? (
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5 rounded-xl text-xs font-bold h-10"
                        variant={isExpanded ? "secondary" : "default"}
                        onClick={() => setExpanded(isExpanded ? null : it.rideId + it.role)}
                      >
                        <Car className="w-3.5 h-3.5" />
                        {isExpanded ? "הסתר ניהול" : "נהל נסיעה"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5 rounded-xl text-xs font-bold h-10"
                        variant={isExpanded ? "secondary" : "default"}
                        onClick={() => setExpanded(isExpanded ? null : it.rideId + it.role)}
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        {isExpanded ? "הסתר מעקב" : "עקוב אחר הנהג"}
                      </Button>
                    )}
                    {otherUserId && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 rounded-xl text-xs font-bold h-10"
                        onClick={() =>
                          setChat({ rideId: it.rideId, userId: otherUserId, name: otherUserName })
                        }
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        הודעה
                      </Button>
                    )}
                  </div>

                  {isExpanded && it.role === "driver" && (
                    <div className="pt-2 border-t border-border space-y-3">
                      <DriverLocationSharer
                        rideId={it.rideId}
                        driverId={it.driverId}
                        phase={it.phase}
                      />
                      <DriverLiveTracker
                        rideId={it.rideId}
                        destination={it.destination}
                        phase={it.phase}
                        pickupLocation={it.pickupLocation}
                        driverName={it.driverName}
                      />
                    </div>
                  )}

                  {isExpanded && it.role === "passenger" && (
                    <div className="pt-2 border-t border-border">
                      <DriverLiveTracker
                        rideId={it.rideId}
                        destination={it.destination}
                        phase={it.phase}
                        pickupLocation={it.pickupLocation}
                        driverName={it.driverName}
                      />
                    </div>

                  )}
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
      <BottomNav />
    </div>
  );
};

export default ActiveRides;
