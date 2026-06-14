import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchRides, getDisplayStatus, fetchMyBookings } from "@/lib/rides-api";
import RideCard from "@/components/RideCard";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Sparkles, Plus, MapPin } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const Index = () => {
  const { t } = useLang();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [showEnded, setShowEnded] = useState(false);

  const { data: rides, isLoading } = useQuery({
    queryKey: ["rides"],
    queryFn: fetchRides,
  });

  const { data: myBookings = [] } = useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: () => fetchMyBookings(user!.id),
    enabled: !!user,
  });

  // Refresh my bookings when any booking row changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("my-bookings-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `passenger_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["my-bookings"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const bookingByRide = useMemo(() => {
    const map: Record<string, (typeof myBookings)[number]> = {};
    myBookings.forEach((b) => {
      map[b.ride_id] = b;
    });
    return map;
  }, [myBookings]);


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
      const status = getDisplayStatus(r);
      // Search filter: only joinable rides by default (active + seats available)
      if (!showEnded && (status !== "active" || r.available_seats <= 0)) return false;
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
  }, [rides, query, dateFilter, showEnded]);

  const activeCount = (rides ?? []).filter(
    (r) => getDisplayStatus(r) === "active" && r.available_seats > 0
  ).length;
  const isFiltering = !!query.trim() || !!dateFilter;

  return (
    <div className="min-h-screen pb-24">
      <AppHeader />

      <main className="max-w-6xl mx-auto px-5 lg:px-8 py-6 space-y-6">
        {/* Hero strip — centered */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl border border-border/60 glass-card p-7 md:p-12 text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            className="absolute -top-28 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full bg-primary/25 blur-3xl pointer-events-none"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.6, delay: 0.2 }}
            className="absolute -bottom-24 -right-10 w-80 h-80 rounded-full bg-accent/20 blur-3xl pointer-events-none"
          />
          <div className="relative flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-primary/10 text-primary mb-4"
            >
              <Sparkles className="w-3 h-3" />
              {activeCount} {t("active_rides")}
            </motion.div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
              <span className="text-gradient">CampusLink</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mt-3 font-medium max-w-xl">
              {t("home_tagline")}
            </p>
          </div>
        </motion.section>

        {/* Inline search */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("search_placeholder")}
              className="pr-9 h-12 rounded-2xl bg-card/70 backdrop-blur border-border/60 focus-visible:ring-primary/40 transition-shadow"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Input
            type="date"
            className="sm:w-48 h-12 rounded-2xl bg-card/70 backdrop-blur border-border/60"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          <button
            onClick={() => setShowEnded((v) => !v)}
            className={cn(
              "h-12 px-4 rounded-2xl border text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]",
              showEnded
                ? "bg-muted text-foreground border-border"
                : "bg-card/70 text-muted-foreground border-border/60 hover:text-foreground"
            )}
          >
            {showEnded ? t("hide_ended") : t("show_all")}
          </button>
        </motion.div>

        {/* Rides grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : sorted.length > 0 ? (
          <>
            {isFiltering && (
              <p className="text-sm text-muted-foreground">
                {sorted.length} {t("results")}
              </p>
            )}
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
              }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            >
              {sorted.map((ride, i) => (
                <motion.div
                  key={ride.id}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
                  }}
                >
                  <RideCard
                    ride={ride}
                    index={i}
                    driverAvatarUrl={avatarMap[ride.driver_id] || null}
                  />
                </motion.div>
              ))}
            </motion.div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-center py-16 px-6 glass-card rounded-3xl border border-border/60"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-pop mb-4"
            >
              <MapPin className="w-8 h-8 text-white" strokeWidth={2.4} />
            </motion.div>
            <p className="text-xl font-extrabold mb-1.5">
              {isFiltering ? t("no_match_title") : t("no_rides_title")}
            </p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {isFiltering ? t("no_match_desc") : t("no_rides_desc")}
            </p>
            {!isFiltering && (
              <Button
                onClick={() => navigate("/post")}
                className="mt-5 gap-2 rounded-2xl h-12 px-6 shadow-pop"
              >
                <Plus className="w-4 h-4" />
                {t("post_ride")}
              </Button>
            )}
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
