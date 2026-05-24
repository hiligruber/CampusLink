import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MessageThread {
  rideId: string;
  otherUserId: string;
  otherUserName: string;
  otherAvatar: string | null;
  rideOrigin: string;
  rideDestination: string;
  lastMessage: string;
  lastMessageAt: string;
  lastSenderIsMe: boolean;
  unreadCount: number;
}

export function useMessageThreads() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const load = async () => {
      const { data: msgs } = await supabase
        .from("ride_messages")
        .select("*")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!active) return;
      const messages = msgs ?? [];

      // Group by ride + other user
      const map = new Map<string, any>();
      const rideIds = new Set<string>();
      const userIds = new Set<string>();

      for (const m of messages) {
        const otherId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
        const key = `${m.ride_id}|${otherId}`;
        rideIds.add(m.ride_id);
        userIds.add(otherId);
        if (!map.has(key)) {
          map.set(key, {
            rideId: m.ride_id,
            otherUserId: otherId,
            lastMessage: m.body,
            lastMessageAt: m.created_at,
            lastSenderIsMe: m.sender_id === user.id,
            unreadCount: 0,
          });
        }
        const entry = map.get(key);
        if (!m.read && m.recipient_id === user.id) entry.unreadCount += 1;
      }

      if (map.size === 0) {
        setThreads([]);
        setLoading(false);
        return;
      }

      const [{ data: rides }, { data: profiles }] = await Promise.all([
        supabase.from("rides").select("id, origin, destination").in("id", [...rideIds]),
        supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", [...userIds]),
      ]);

      if (!active) return;

      const result: MessageThread[] = [];
      map.forEach((v) => {
        const ride = rides?.find((r) => r.id === v.rideId);
        const prof = profiles?.find((p) => p.user_id === v.otherUserId);
        result.push({
          ...v,
          rideOrigin: ride?.origin ?? "",
          rideDestination: ride?.destination ?? "",
          otherUserName: prof?.full_name ?? "משתמש",
          otherAvatar: prof?.avatar_url ?? null,
        });
      });
      result.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      setThreads(result);
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`threads-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_messages" }, () => load())
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);
  return { threads, loading, totalUnread };
}
