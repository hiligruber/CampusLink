import { useQuery } from "@tanstack/react-query";
import { fetchRides, getDisplayStatus } from "@/lib/rides-api";
import RideCard from "@/components/RideCard";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { data: rides, isLoading } = useQuery({
    queryKey: ["rides"],
    queryFn: fetchRides,
  });

  const sorted = [...(rides ?? [])].sort((a, b) => {
    const sa = getDisplayStatus(a);
    const sb = getDisplayStatus(b);
    const aActive = sa === "active" ? 0 : 1;
    const bActive = sb === "active" ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    if (aActive === 0) return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime();
    return new Date(b.departure_time).getTime() - new Date(a.departure_time).getTime();
  });
  const activeCount = sorted.filter((r) => getDisplayStatus(r) === "active").length;
  const today = new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader title="Campus" subtitle={today} />

      <main className="max-w-2xl mx-auto px-5 py-6">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-foreground" strokeWidth={1.5} />
          </div>
        ) : sorted.length > 0 ? (
          <>
            {/* Masthead stat */}
            <div className="border-b-2 rule pb-5 mb-6 flex items-end justify-between">
              <div>
                <p className="eyebrow mb-2">today's edition</p>
                <p className="font-display font-light text-5xl leading-none text-foreground">
                  {activeCount}
                  <span className="text-accent">.</span>
                </p>
                <p className="text-sm font-serif italic text-muted-foreground mt-2">
                  {activeCount === 1 ? "נסיעה פעילה" : "נסיעות פעילות"} בקמפוס
                </p>
              </div>
              <p className="text-[10px] eyebrow text-right">
                live<br />feed
              </p>
            </div>

            {sorted.map((ride, i) => (
              <RideCard key={ride.id} ride={ride} index={i} />
            ))}
          </>
        ) : (
          <div className="text-center py-24 border-y-2 rule">
            <p className="eyebrow mb-3">silence on the road</p>
            <p className="font-display font-light text-3xl text-foreground mb-2">אין נסיעות עדיין</p>
            <p className="text-sm font-serif italic text-muted-foreground">היי הראשון לפרסם נסיעה</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
