import { Bell, Check, X, Inbox as InboxIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface NotificationBooking {
  id: string;
  status: string;
  created_at: string;
  passenger_id: string;
  ride_id: string;
  passenger_name?: string;
  origin?: string;
  destination?: string;
}

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
}

const AppHeader = ({ title = "Campus", subtitle }: AppHeaderProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("header-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        queryClient.invalidateQueries({ queryKey: ["header-notifications"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const { data: notifications = [] } = useQuery({
    queryKey: ["header-notifications", user?.id],
    queryFn: async (): Promise<NotificationBooking[]> => {
      if (!user) return [];
      const { data: rides } = await supabase
        .from("rides")
        .select("id, origin, destination")
        .eq("driver_id", user.id);
      const rideIds = (rides ?? []).map((r) => r.id);
      if (rideIds.length === 0) return [];
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, status, created_at, passenger_id, ride_id")
        .in("ride_id", rideIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);
      if (!bookings || bookings.length === 0) return [];
      const passengerIds = [...new Set(bookings.map((b) => b.passenger_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", passengerIds);
      return bookings.map((b) => {
        const ride = rides?.find((r) => r.id === b.ride_id);
        const profile = profiles?.find((p) => p.user_id === b.passenger_id);
        return {
          ...b,
          passenger_name: profile?.full_name || "סטודנט",
          origin: ride?.origin,
          destination: ride?.destination,
        };
      });
    },
    enabled: !!user,
  });

  const respond = async (bookingId: string, action: "accepted" | "rejected") => {
    try {
      const { error } = await supabase.from("bookings").update({ status: action }).eq("id", bookingId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["header-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success(action === "accepted" ? "הבקשה אושרה" : "הבקשה נדחתה");
    } catch (e: any) {
      toast.error(e?.message || "פעולה נכשלה");
    }
  };

  const count = notifications.length;
  const timeAgo = (iso: string) => {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return "עכשיו";
    if (m < 60) return `${m} ד׳`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ש׳`;
    return `${Math.floor(h / 24)} י׳`;
  };

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b rule">
      <div className="max-w-2xl mx-auto px-5 pt-4 pb-3 flex items-end justify-between">
        <div>
          <p className="eyebrow mb-1">vol. 01 · the campus journal</p>
          <h1 className="font-display text-3xl font-light text-foreground leading-none">
            {title}<span className="text-accent">.</span>
          </h1>
          {subtitle && <p className="text-xs text-muted-foreground mt-1.5 italic">{subtitle}</p>}
        </div>

        {user && (
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className="relative p-2 -m-2 text-foreground hover:text-accent transition-colors"
                aria-label="התראות"
              >
                <Bell className="w-5 h-5" strokeWidth={1.5} />
                <AnimatePresence>
                  {count > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center text-[10px] font-bold rounded-full bg-accent text-accent-foreground"
                    >
                      {count > 9 ? "9+" : count}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-[340px] p-0 rounded-none border-2 rule shadow-paper bg-card"
            >
              <div className="px-4 py-3 border-b rule flex items-center justify-between">
                <div>
                  <p className="eyebrow">notifications</p>
                  <h3 className="font-display text-lg leading-none mt-1">בקשות חדשות</h3>
                </div>
                {count > 0 && (
                  <span className="text-xs font-serif italic text-muted-foreground">{count} ממתינות</span>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {count === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <InboxIcon className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" strokeWidth={1} />
                    <p className="font-serif italic text-sm text-muted-foreground">השקט שלפני הסערה</p>
                    <p className="text-xs text-muted-foreground mt-1">אין בקשות חדשות כרגע</p>
                  </div>
                ) : (
                  notifications.map((n, i) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 ${i !== notifications.length - 1 ? "border-b border-border" : ""}`}
                    >
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <p className="text-sm">
                          <span className="font-semibold">{n.passenger_name}</span>
                          <span className="text-muted-foreground"> ביקש/ה להצטרף</span>
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(n.created_at)}</span>
                      </div>
                      {n.origin && (
                        <p className="text-xs font-serif italic text-muted-foreground mb-2 truncate">
                          {n.origin} ← {n.destination}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 h-8 rounded-none gap-1 text-xs"
                          onClick={() => respond(n.id, "accepted")}
                        >
                          <Check className="w-3.5 h-3.5" /> אישור
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 rounded-none gap-1 text-xs"
                          onClick={() => respond(n.id, "rejected")}
                        >
                          <X className="w-3.5 h-3.5" /> דחייה
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/bookings");
                }}
                className="w-full px-4 py-3 border-t-2 rule text-xs font-semibold uppercase tracking-widest hover:bg-secondary transition-colors"
              >
                צפייה בכל הבקשות →
              </button>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
