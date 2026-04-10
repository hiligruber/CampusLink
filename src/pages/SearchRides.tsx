import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import RideCard from "@/components/RideCard";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Search, Loader2 } from "lucide-react";

const SearchRides = () => {
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

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

  const filtered = useMemo(() => {
    if (!rides) return [];
    return rides.filter((r) => {
      const matchesQuery =
        !query ||
        r.origin.toLowerCase().includes(query.toLowerCase()) ||
        r.destination.toLowerCase().includes(query.toLowerCase());
      const matchesDate =
        !dateFilter || r.departure_time.startsWith(dateFilter);
      return matchesQuery && matchesDate;
    });
  }, [query, dateFilter, rides]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Search Rides" />
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by location..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Input type="date" className="w-36" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{filtered.length} ride{filtered.length !== 1 ? "s" : ""} found</p>
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No rides match your search.</div>
            ) : (
              <div className="space-y-3">
                {filtered.map((ride, i) => (
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
              </div>
            )}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default SearchRides;
