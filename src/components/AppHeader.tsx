import { Bell, Check, X, Inbox as InboxIcon, MapPin, CheckCheck, Settings as SettingsIcon } from "lucide-react";
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
import { useLang } from "@/contexts/LanguageContext";
import logo from "@/assets/campuslink-logo-new.png";
import InboxDropdown from "@/components/InboxDropdown";
import AvatarImage from "@/components/AvatarImage";

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  ride_id: string | null;
  booking_id: string | null;
  read: boolean;
  created_at: string;
}

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
}

const typeIcon = (type: string) => {
  if (type === "booking_received") return "🙋";
  if (type === "booking_accepted") return "🎉";
  if (type === "booking_rejected") return "❌";
  if (type === "booking_requested") return "📨";
  if (type === "ride_reminder") return "⏰";
  return "🔔";
};

const AppHeader = ({ subtitle }: AppHeaderProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { lang, toggle, t } = useLang();

  // Realtime: refresh when notifications change for this user
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["notifications", user.id] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const { data: profile } = useQuery({
    queryKey: ["header-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async (): Promise<NotificationRow[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!user || unreadCount === 0) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };

  const respond = async (bookingId: string, action: "accepted" | "rejected", notifId: string) => {
    try {
      const { error } = await supabase.from("bookings").update({ status: action }).eq("id", bookingId);
      if (error) throw error;
      await markRead(notifId);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success(action === "accepted" ? "הבקשה אושרה" : "הבקשה נדחתה");
    } catch (e: any) {
      toast.error(e?.message || "פעולה נכשלה");
    }
  };

  const timeAgo = (iso: string) => {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return t("now");
    if (m < 60) return `${m} ${t("min")}`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ${t("hr")}`;
    return `${Math.floor(h / 24)} ${t("day")}`;
  };

  const handleNotifClick = (n: NotificationRow) => {
    if (!n.read) markRead(n.id);
    setOpen(false);
    if (n.type === "booking_accepted" && n.ride_id) {
      navigate(`/bookings?track=${n.ride_id}`);
    } else if (n.ride_id) {
      navigate("/bookings");
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-xl border-b border-border">
      <div className="max-w-6xl mx-auto px-5 h-[68px] flex items-center justify-between gap-3">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 tap-scale"
          aria-label="CampusLink"
        >
          <img src={logo} alt="CampusLink" className="h-14 w-14 object-contain drop-shadow-[0_4px_18px_hsl(var(--primary)/0.35)]" />
          <span className="hidden sm:inline text-xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            CampusLink
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="h-9 px-2.5 rounded-full border border-border bg-card/70 hover:bg-secondary transition-colors text-[11px] font-bold tracking-wide flex items-center gap-1"
            aria-label="Toggle language"
          >
            <span className={lang === "EN" ? "text-primary" : "text-muted-foreground"}>EN</span>
            <span className="text-border">/</span>
            <span className={lang === "HE" ? "text-primary" : "text-muted-foreground"}>עב</span>
          </button>

          <button
            onClick={() => navigate("/settings")}
            className="w-9 h-9 rounded-full bg-card/70 hover:bg-secondary flex items-center justify-center border border-border tap-scale transition-colors"
            aria-label="Settings"
          >
            <SettingsIcon className="w-[18px] h-[18px] text-foreground" strokeWidth={2} />
          </button>

          {user && <InboxDropdown />}

          {user && (
            <DropdownMenu open={open} onOpenChange={setOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative w-9 h-9 rounded-full bg-secondary hover:bg-muted flex items-center justify-center tap-scale transition-colors"
                  aria-label="התראות"
                >
                  <Bell className="w-[18px] h-[18px] text-foreground" strokeWidth={2} />
                  <AnimatePresence>
                    {unreadCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center text-[10px] font-bold rounded-full bg-accent text-accent-foreground ring-2 ring-background"
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="w-[360px] p-0 rounded-2xl border-border shadow-card overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-secondary/40">
                  <h3 className="font-bold text-base">{t("notifications")}</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      {t("notif_mark_all_read")}
                    </button>
                  )}
                </div>
                <div className="max-h-[420px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <InboxIcon className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" strokeWidth={1.5} />
                      <p className="text-sm font-semibold">{t("notif_empty_title")}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("notif_empty_desc")}</p>
                    </div>
                  ) : (
                    notifications.map((n, i) => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 transition-colors ${!n.read ? "bg-primary/[0.04]" : ""} ${i !== notifications.length - 1 ? "border-b border-border" : ""}`}
                      >
                        <div
                          className="flex items-start gap-3 cursor-pointer"
                          onClick={() => handleNotifClick(n)}
                        >
                          <div className="text-xl leading-none mt-0.5">{typeIcon(n.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2 mb-0.5">
                              <p className="text-sm font-bold truncate">{n.title}</p>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {timeAgo(n.created_at)}
                              </span>
                            </div>
                            {n.body && (
                              <p className="text-xs text-muted-foreground leading-snug">{n.body}</p>
                            )}
                            {n.type === "booking_accepted" && n.ride_id && (
                              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                                <MapPin className="w-3 h-3" /> {t("follow_driver")}
                              </div>
                            )}
                          </div>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-accent mt-2 shrink-0" />
                          )}
                        </div>
                        {n.type === "booking_received" && n.booking_id && (
                          <div className="flex gap-2 pt-2 mt-2 border-t border-border/60">
                            <Button
                              size="sm"
                              className="flex-1 h-8 gap-1 text-xs rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                respond(n.booking_id!, "accepted", n.id);
                              }}
                            >
                              <Check className="w-3.5 h-3.5" /> {t("accept")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-8 gap-1 text-xs rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                respond(n.booking_id!, "rejected", n.id);
                              }}
                            >
                              <X className="w-3.5 h-3.5" /> {t("reject")}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/bookings");
                  }}
                  className="w-full px-4 py-3 border-t border-border text-sm font-semibold text-primary hover:bg-secondary transition-colors"
                >
                  {t("view_all_requests")}
                </button>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {user && (
            <button
              onClick={() => navigate("/profile")}
              className="w-9 h-9 rounded-full bg-secondary overflow-hidden ring-2 ring-background border border-border tap-scale flex items-center justify-center"
              aria-label="פרופיל"
            >
              <AvatarImage
                src={profile?.avatar_url}
                name={profile?.full_name}
                className="w-full h-full rounded-full text-xs"
                iconClassName="w-4 h-4"
              />
            </button>
          )}
        </div>
      </div>
      {subtitle && (
        <div className="max-w-6xl mx-auto px-5 pb-2 -mt-1">
          <p className="text-[12px] text-muted-foreground font-medium">{subtitle}</p>
        </div>
      )}
    </header>
  );
};

export default AppHeader;
