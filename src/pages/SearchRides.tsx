import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { fetchRides, getDisplayStatus } from "@/lib/rides-api";
import RideCard from "@/components/RideCard";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Search, Loader2 } from "lucide-react";

const SearchRides = () => {
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const { data: rides, isLoading } = useQuery({
    queryKey: ["rides"],
    queryFn: fetchRides,
  });

  const filtered = useMemo(() => {
    return (rides ?? []).filter((r) => {
      const matchesQuery =
        !query ||
        r.origin.toLowerCase().includes(query.toLowerCase()) ||
        r.destination.toLowerCase().includes(query.toLowerCase());
      const matchesDate = !dateFilter || r.departure_time.startsWith(dateFilter);
      return matchesQuery && matchesDate;
    }).sort((a, b) => {
      const aActive = getDisplayStatus(a) === "active" ? 0 : 1;
      const bActive = getDisplayStatus(b) === "active" ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime();
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
                  <RideCard key={ride.id} ride={ride} index={i} />
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
