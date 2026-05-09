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
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Available Rides" />
      <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : sorted.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground">
              {activeCount} active ride{activeCount !== 1 ? "s" : ""} heading to campus
            </p>
            {sorted.map((ride, i) => (
              <RideCard key={ride.id} ride={ride} index={i} />
            ))}
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">No upcoming rides yet.</p>
            <p className="text-xs mt-1">Be the first to post one!</p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Index;
