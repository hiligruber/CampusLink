import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import RideCard from "@/components/RideCard";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { data: rides, isLoading } = useQuery({
    queryKey: ["rides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*, profiles!rides_driver_id_fkey(full_name, rating)")
        .gte("departure_time", new Date().toISOString())
        .order("departure_time", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Available Rides" />
      <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : rides && rides.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground">
              {rides.length} ride{rides.length !== 1 ? "s" : ""} heading to campus
            </p>
            {rides.map((ride, i) => (
              <RideCard
                key={ride.id}
                ride={{
                  id: ride.id,
                  driver_id: ride.driver_id,
                  driver_name: (ride.profiles as any)?.full_name || "Unknown",
                  driver_rating: (ride.profiles as any)?.rating || 5.0,
                  origin: ride.origin,
                  destination: ride.destination,
                  departure_time: ride.departure_time,
                  total_seats: ride.total_seats,
                  available_seats: ride.available_seats,
                }}
                index={i}
              />
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
