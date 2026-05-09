import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function usePendingBookingsCount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("pending-bookings-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        queryClient.invalidateQueries({ queryKey: ["pending-bookings-count"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ["pending-bookings-count", user?.id],
    queryFn: async () => {
      const { data: rides } = await supabase
        .from("rides")
        .select("id")
        .eq("driver_id", user!.id);
      const rideIds = (rides ?? []).map((r) => r.id);
      if (rideIds.length === 0) return 0;
      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .in("ride_id", rideIds)
        .eq("status", "pending");
      return count ?? 0;
    },
    enabled: !!user,
  });
}
