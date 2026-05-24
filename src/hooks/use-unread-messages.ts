import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUnreadMessages(rideId: string | undefined, otherUserId: string | undefined) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user || !rideId || !otherUserId) return;
    let active = true;

    const load = async () => {
      const { count: c } = await supabase
        .from("ride_messages")
        .select("id", { count: "exact", head: true })
        .eq("ride_id", rideId)
        .eq("sender_id", otherUserId)
        .eq("recipient_id", user.id)
        .eq("read", false);
      if (active) setCount(c ?? 0);
    };
    load();

    const channel = supabase
      .channel(`unread-${rideId}-${otherUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ride_messages", filter: `ride_id=eq.${rideId}` },
        () => load(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user, rideId, otherUserId]);

  return count;
}
