import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MapPin, Clock, Car, User } from "lucide-react";

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

const RideRow = ({ ride }: { ride: any }) => {
  const d = new Date(ride.departure_time);
  const lbl = phaseLabel(ride.ride_phase, ride.status);
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-1.5">
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
    </div>
  );
};

export default function RideHistory() {
  const { user } = useAuth();

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

  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">
        <Car className="w-4 h-4 text-primary" />
        הנסיעות שלי
      </h3>
      <Tabs defaultValue="driver" className="w-full">
        <TabsList className="grid grid-cols-2 w-full mb-3">
          <TabsTrigger value="driver">כנהג</TabsTrigger>
          <TabsTrigger value="passenger">כנוסע</TabsTrigger>
        </TabsList>
        <TabsContent value="driver" className="space-y-2">
          {l1 ? (
            <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
          ) : !asDriver || asDriver.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">עוד לא פרסמת נסיעות.</p>
          ) : (
            asDriver.map((r: any) => <RideRow key={r.id} ride={r} />)
          )}
        </TabsContent>
        <TabsContent value="passenger" className="space-y-2">
          {l2 ? (
            <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
          ) : !asPassenger || asPassenger.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">עוד לא הצטרפת לנסיעות.</p>
          ) : (
            asPassenger.map((r: any) => <RideRow key={r.id} ride={r} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
