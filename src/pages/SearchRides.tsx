import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { mockRides } from "@/lib/mock-data";
import RideCard from "@/components/RideCard";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Search } from "lucide-react";

const SearchRides = () => {
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const filtered = useMemo(() => {
    return mockRides.filter((r) => {
      const matchesQuery =
        !query ||
        r.origin.toLowerCase().includes(query.toLowerCase()) ||
        r.destination.toLowerCase().includes(query.toLowerCase());
      const matchesDate =
        !dateFilter || r.departure_time.startsWith(dateFilter);
      return matchesQuery && matchesDate;
    });
  }, [query, dateFilter]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Search Rides" />
      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by location..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Input
            type="date"
            className="w-36"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        <p className="text-sm text-muted-foreground">
          {filtered.length} ride{filtered.length !== 1 ? "s" : ""} found
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No rides match your search.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((ride, i) => (
              <RideCard key={ride.id} ride={ride} index={i} />
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default SearchRides;
