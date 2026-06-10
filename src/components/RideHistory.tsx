import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Clock, Car, User, Star, CheckCircle2 } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import RideRatingDialog from "./RideRatingDialog";

type Phase = "scheduled" | "en_route" | "picked_up" | "in_progress" | "completed";

const phaseLabel = (p: Phase | undefined, status: string) => {
  if (status === "cancelled") return { text: "בוטלה", cls: "bg-destructive/10 text-destructive" };
  switch (p) {
    case "en_route":    return { text: "בדרך",   cls: "bg-warning/15 text-warning" };
    case "picked_up":   return { text: "נאספו",  cls: "bg-warning/15 text-warning" };
    case "in_progress": return { text: "בנסיעה", cls: "bg-primary/10 text-primary" };
    case "completed":   return { text: "הסתיימה", cls: "bg-muted text-muted-foreground" };
    default:            return { text: "מתוכננת", cls: "bg-secondary text-secondary-foreground" };
  }
};

interface RowProps {
  ride: any;
  canRate?: boolean;
  alreadyRated?: boolean;
  onRate?: () => void;
}

const RideRow = ({ ride, canRate, alreadyRated, onRate }: RowProps) => {
  const { t } = useLang();
  const d = new Date(ride.departure_time);
  const lbl = phaseLabel(ride.ride_phase, ride.status);
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          {ride.origin} ← {ride.destination}
        </p>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lbl.cls}`}>{lbl.text}</span>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {d.toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" })} ·{" "}
        {d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
      </p>
      {ride.driver_name && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <User className="w-3 h-3" />
          {ride.driver_name}
        </p>
      )}
      {canRate && (
        alreadyRated ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            {t("rating_submitted")}
          </span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={onRate}
            className="gap-1.5 rounded-xl text-xs h-9 border-warning/40 text-warning hover:bg-warning/10 hover:text-warning"
          >
            <Star className="w-3.5 h-3.5" />
            {t("rate_driver")}
          </Button>
        )
      )}
    </div>
  );
};

export default function RideHistory() {
  const { user } = useAuth();
  const { t } = useLang();
  const qc = useQueryClient();
  const [ratingTarget, setRatingTarget] = useState<{ rideId: string; rateeId: string; rateeName: string } | null>(null);

  const { data: asDriver, isLoading: l1 } = useQuery({
    queryKey: ["history", "driver", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .eq("driver_id", user!.id)
        .order("departure_time", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: asPassenger, isLoading: l2 } = useQuery({
    queryKey: ["history", "passenger", user?.id],
    queryFn: async () => {
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("ride_id, status")
        .eq("passenger_id", user!.id)
        .eq("status", "accepted");
      if (error) throw error;
      const ids = (bookings ?? []).map((b) => b.ride_id);
      if (ids.length === 0) return [];
      const { data: rides } = await supabase
        .from("rides")
        .select("*")
        .in("id", ids)
        .order("departure_time", { ascending: false });
      return rides ?? [];
    },
    enabled: !!user,
  });

  const { data: myRatings = [] } = useQuery({
    queryKey: ["my-ratings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("ride_ratings")
        .select("ride_id, ratee_id")
        .eq("rater_id", user!.id);
      return data ?? [];
    },
  });

  const hasRated = (rideId: string, rateeId: string) =>
    myRatings.some((r: any) => r.ride_id === rideId && r.ratee_id === rateeId);

  return (
    <div className="glass-card rounded-3xl p-5">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">
        <Car className="w-4 h-4 text-primary" />
        {t("my_rides")}
      </h3>
      <Tabs defaultValue="driver" className="w-full">
        <TabsList className="grid grid-cols-2 w-full mb-3">
          <TabsTrigger value="driver">{t("as_driver")}</TabsTrigger>
          <TabsTrigger value="passenger">{t("as_passenger")}</TabsTrigger>
        </TabsList>
        <TabsContent value="driver" className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {l1 ? (
            <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
          ) : !asDriver || asDriver.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">{t("no_rides_driver")}</p>
          ) : (
            asDriver.map((r: any) => <RideRow key={r.id} ride={r} />)
          )}
        </TabsContent>
        <TabsContent value="passenger" className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {l2 ? (
            <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
          ) : !asPassenger || asPassenger.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">{t("no_rides_passenger")}</p>
          ) : (
            asPassenger.map((r: any) => {
              const completed = r.ride_phase === "completed";
              return (
                <RideRow
                  key={r.id}
                  ride={r}
                  canRate={completed && !!r.driver_id && r.driver_id !== user?.id}
                  alreadyRated={hasRated(r.id, r.driver_id)}
                  onRate={() =>
                    setRatingTarget({
                      rideId: r.id,
                      rateeId: r.driver_id,
                      rateeName: r.driver_name || t("passenger_short"),
                    })
                  }
                />
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {ratingTarget && (
        <RideRatingDialog
          open={!!ratingTarget}
          onOpenChange={(o) => !o && setRatingTarget(null)}
          rideId={ratingTarget.rideId}
          rateeId={ratingTarget.rateeId}
          rateeName={ratingTarget.rateeName}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["my-ratings"] });
            setRatingTarget(null);
          }}
        />
      )}
    </div>
  );
}
