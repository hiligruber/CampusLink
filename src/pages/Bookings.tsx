import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import DriverLiveTracker from "@/components/DriverLiveTracker";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Check, X, Clock, MapPin, Users, Mail, Navigation, MessageCircle } from "lucide-react";
import RideChat from "@/components/RideChat";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

interface BookingWithDetails {
  id: string;
  status: string;
  created_at: string;
  passenger_id: string;
  ride_id: string;
  pickup_location?: string | null;
  ride: {
    id: string;
    origin: string;
    destination: string;
    departure_time: string;
    driver_id: string;
    driver_name: string;
    available_seats: number;
    total_seats: number;
    ride_phase?: string;
  } | null;
  passenger: {
    full_name: string;
    email?: string;
    avatar_url: string | null;
  } | null;
}

const statusLabel = (s: string) =>
  s === "accepted" ? "status_accepted" : s === "rejected" ? "status_rejected" : s === "cancelled" ? "status_cancelled" : "status_pending";

const statusClass = (s: string) =>
  s === "accepted"
    ? "bg-primary/10 text-primary"
    : s === "rejected" || s === "cancelled"
    ? "bg-destructive/10 text-destructive"
    : "bg-warning/10 text-warning";

const Bookings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [acting, setActing] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const trackRideId = searchParams.get("track");
  
  const [chatTarget, setChatTarget] = useState<{ rideId: string; userId: string; name: string } | null>(null);

  // Realtime: refresh on any booking change
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("bookings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Requests received as a driver
  const { data: incoming, isLoading: loadingIn } = useQuery({
    queryKey: ["bookings", "incoming", user?.id],
    queryFn: async (): Promise<BookingWithDetails[]> => {
      const { data: rides, error: rErr } = await supabase
        .from("rides")
        .select("id")
        .eq("driver_id", user!.id);
      if (rErr) throw rErr;
      const rideIds = (rides ?? []).map((r) => r.id);
      if (rideIds.length === 0) return [];
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("id, status, created_at, passenger_id, ride_id, pickup_location")
        .in("ride_id", rideIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const passengerIds = [...new Set(bookings.map((b) => b.passenger_id))];
      const [{ data: rideRows }, { data: profileRows }] = await Promise.all([
        supabase.from("rides").select("*").in("id", rideIds),
        passengerIds.length > 0
          ? supabase
              .from("profiles")
              .select("user_id, full_name, avatar_url")
              .in("user_id", passengerIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      return bookings.map((b) => ({
        ...b,
        ride: rideRows?.find((r: any) => r.id === b.ride_id) ?? null,
        passenger: profileRows?.find((p: any) => p.user_id === b.passenger_id) ?? null,
      }));
    },
    enabled: !!user,
  });

  // My own requests as a passenger
  const { data: outgoing, isLoading: loadingOut } = useQuery({
    queryKey: ["bookings", "outgoing", user?.id],
    queryFn: async (): Promise<BookingWithDetails[]> => {
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("id, status, created_at, passenger_id, ride_id, pickup_location")
        .eq("passenger_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rideIds = bookings.map((b) => b.ride_id);
      if (rideIds.length === 0) return bookings.map((b) => ({ ...b, ride: null, passenger: null }));
      const { data: rideRows } = await supabase.from("rides").select("*").in("id", rideIds);
      return bookings.map((b) => ({
        ...b,
        ride: rideRows?.find((r: any) => r.id === b.ride_id) ?? null,
        passenger: null,
      }));
    },
    enabled: !!user,
  });

  const respond = async (bookingId: string, action: "accepted" | "rejected") => {
    setActing(bookingId);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: action })
        .eq("id", bookingId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      toast.success(action === "accepted" ? t("toast_request_accepted") : t("toast_request_rejected"));
    } catch (e: any) {
      toast.error(e?.message || t("generic_error"));
    } finally {
      setActing(null);
    }
  };

  const renderRideInfo = (ride: BookingWithDetails["ride"]) => {
    if (!ride) return <p className="text-xs text-muted-foreground">פרטי נסיעה לא זמינים</p>;
    const d = new Date(ride.departure_time);
    return (
      <div className="space-y-1">
        <p className="text-sm font-semibold flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          {ride.origin} ← {ride.destination}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {d.toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" })} ·{" "}
          {d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {ride.available_seats}/{ride.total_seats} מקומות פנויים
        </p>
      </div>
    );
  };

  const ChatButton = ({ rideId, otherId, name, label }: { rideId: string; otherId: string; name: string; label: string }) => {
    const unread = useUnreadMessages(rideId, otherId);
    return (
      <Button
        size="sm"
        variant="outline"
        className="flex-1 gap-1.5 rounded-xl text-xs font-bold h-9 relative"
        onClick={() => setChatTarget({ rideId, userId: otherId, name })}
      >
        <MessageCircle className="w-3.5 h-3.5" />
        {label}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
            {unread}
          </span>
        )}
      </Button>
    );
  };


  return (
    <div className="min-h-screen bg-background pb-24" dir={dir}>
      <AppHeader title={t("bookings_title")} />
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-lg mx-auto px-4 py-4"
      >
        <Tabs defaultValue={trackRideId ? "outgoing" : "incoming"} className="w-full">
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="incoming">
              {t("tab_received")}
              {incoming && incoming.filter((b) => b.status === "pending").length > 0 && (
                <span className="ml-1 mr-1 inline-flex items-center justify-center text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground w-5 h-5">
                  {incoming.filter((b) => b.status === "pending").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="outgoing">הבקשות שלי</TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="space-y-3">
            {loadingIn ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : !incoming || incoming.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">
                עדיין אין בקשות. כשמישהו יבקש להצטרף לנסיעה שלך — היא תופיע כאן.
              </p>
            ) : (
              incoming.map((b) => (
                <div key={b.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {b.passenger?.avatar_url ? (
                        <img src={b.passenger.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {(b.passenger?.full_name || "?").charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold">{b.passenger?.full_name || t("student_fallback")}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusClass(b.status)}`}>
                      {statusLabel(b.status)}
                    </span>
                  </div>
                  {renderRideInfo(b.ride)}
                  {b.pickup_location && (
                    <div className="flex items-start gap-2 text-xs bg-primary/5 border border-primary/15 rounded-xl px-3 py-2">
                      <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-wide">איסוף</p>
                        <p className="text-foreground font-semibold">{b.pickup_location}</p>
                      </div>
                    </div>
                  )}
                  {b.status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 gap-1"
                        disabled={acting === b.id}
                        onClick={() => respond(b.id, "accepted")}
                      >
                        <Check className="w-4 h-4" />
                        אישור
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1 text-destructive hover:text-destructive"
                        disabled={acting === b.id}
                        onClick={() => respond(b.id, "rejected")}
                      >
                        <X className="w-4 h-4" />
                        דחייה
                      </Button>
                    </div>
                  )}
                  {b.status === "accepted" && b.passenger && (
                    <div className="flex gap-2 pt-1">
                      <ChatButton
                        rideId={b.ride_id}
                        otherId={b.passenger_id}
                        name={b.passenger.full_name || "נוסע"}
                        label={t("aria_msg_passenger")}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="space-y-3">
            {loadingOut ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : !outgoing || outgoing.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">
                {t("bookings_empty_mine")}
              </p>
            ) : (
              outgoing.map((b) => {
                const isAccepted = b.status === "accepted";
                
                return (
                  <div key={b.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{b.ride?.driver_name || t("driver_short")}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusClass(b.status)}`}>
                        {statusLabel(b.status)}
                      </span>
                    </div>
                    {renderRideInfo(b.ride)}
                    {isAccepted && b.ride && (
                      <>
                        <DriverLiveTracker
                          rideId={b.ride_id}
                          destination={b.ride.destination}
                          phase={(b.ride.ride_phase ?? "scheduled") as any}
                          pickupLocation={b.pickup_location}
                          driverName={b.ride.driver_name}
                        />
                        <ChatButton
                          rideId={b.ride_id}
                          otherId={b.ride.driver_id}
                          name={b.ride.driver_name || t("driver_short")}
                          label={t("aria_msg_driver")}
                        />
                      </>
                    )}

                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </motion.main>
      {chatTarget && (
        <RideChat
          open={!!chatTarget}
          onOpenChange={(o) => !o && setChatTarget(null)}
          rideId={chatTarget.rideId}
          otherUserId={chatTarget.userId}
          otherUserName={chatTarget.name}
        />
      )}
      <BottomNav />
    </div>
  );
};

export default Bookings;
