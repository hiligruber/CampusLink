import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRides, getDisplayStatus } from "@/lib/rides-api";
import RideCard from "@/components/RideCard";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Sparkles, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const Index = () => {
  const { t } = useLang();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const { data: rides, isLoading } = useQuery({
    queryKey: ["rides"],
    queryFn: fetchRides,
  });

  const driverIds = [...new Set((rides ?? []).map((r) => r.driver_id))];
  const { data: avatarMap = {} } = useQuery({
    queryKey: ["driver-avatars", driverIds.sort().join(",")],
    enabled: driverIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, avatar_url")
        .in("user_id", driverIds);
      const map: Record<string, string | null> = {};
      (data ?? []).forEach((p) => {
        map[p.user_id] = p.avatar_url;
      });
      return map;
    },
  });

  const sorted = useMemo(() => {
    const base = (rides ?? []).filter((r) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q || r.origin.toLowerCase().includes(q) || r.destination.toLowerCase().includes(q);
      const matchesDate = !dateFilter || r.departure_time.startsWith(dateFilter);
      return matchesQuery && matchesDate;
    });
    return [...base].sort((a, b) => {
      const sa = getDisplayStatus(a);
      const sb = getDisplayStatus(b);
      const aActive = sa === "active" ? 0 : 1;
      const bActive = sb === "active" ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      if (aActive === 0)
        return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime();
      return new Date(b.departure_time).getTime() - new Date(a.departure_time).getTime();
    });
  }, [rides, query, dateFilter]);

  const activeCount = sorted.filter((r) => getDisplayStatus(r) === "active").length;
  const isFiltering = !!query.trim() || !!dateFilter;

  return (
    <div className="min-h-screen pb-24">
      <AppHeader />

      <main className="max-w-6xl mx-auto px-5 lg:px-8 py-6 space-y-6">
        {/* Hero strip */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl border border-border/60 glass-card p-6 md:p-8"
        >
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-10 w-80 h-80 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-primary/10 text-primary mb-3">
                <Sparkles className="w-3 h-3" />
                {activeCount} {t("active_rides")}
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
                <span className="text-gradient">CampusLink</span> — נסיעות סטודנטים בקליק
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1.5 max-w-xl">
                גלה נסיעות פעילות, חבר/י לקהילה ופרסם/י טרמפ משלך — הכל במקום אחד.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => navigate("/post")}
              className="rounded-2xl h-12 gap-2 font-bold bg-gradient-to-br from-primary to-accent shadow-pop"
            >
              <Plus className="w-4 h-4" />
              פרסם נסיעה חדשה
            </Button>
          </div>
        </motion.section>

        {/* Inline search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי מוצא או יעד..."
              className="pr-9 h-12 rounded-2xl bg-card/80 backdrop-blur border-border/60"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Input
            type="date"
            className="sm:w-48 h-12 rounded-2xl bg-card/80 backdrop-blur border-border/60"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        {/* Rides grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : sorted.length > 0 ? (
          <>
            {isFiltering && (
              <p className="text-sm text-muted-foreground">
                {sorted.length} תוצאות
              </p>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sorted.map((ride, i) => (
                <RideCard
                  key={ride.id}
                  ride={ride}
                  index={i}
                  driverAvatarUrl={avatarMap[ride.driver_id] || null}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-24">
            <p className="text-lg font-bold mb-1">
              {isFiltering ? "לא נמצאו נסיעות תואמות" : t("no_rides_title")}
            </p>
            <p className="text-sm text-muted-foreground">
              {isFiltering ? "נסה/י לחפש מילים אחרות" : t("no_rides_desc")}
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
