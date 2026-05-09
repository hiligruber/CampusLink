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

  // Sort: active upcoming first (by date asc), then completed/cancelled (recent first)
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

  return (
    <div className="min-h-screen pb-28">
      <AppHeader title="CampusLink" />
      <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : sorted.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-1 animate-fade-in">
              <h2 className="font-display text-2xl font-bold leading-tight">
                <span className="text-gradient-primary">{activeCount}</span>{" "}
                <span className="text-foreground">נסיעות פעילות</span>
              </h2>
              <span className="text-2xl animate-float">🚗</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">בדרך לקמפוס · עדכון בזמן אמת</p>
            {sorted.map((ride, i) => (
              <RideCard key={ride.id} ride={ride} index={i} />
            ))}
          </>
        ) : (
          <div className="text-center py-20 animate-fade-in">
            <div className="text-6xl mb-4 animate-float">🛣️</div>
            <p className="font-display text-xl font-bold text-foreground">אין נסיעות עדיין</p>
            <p className="text-sm text-muted-foreground mt-2">היי הראשון/ה לפרסם נסיעה לקמפוס ✨</p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Index;
