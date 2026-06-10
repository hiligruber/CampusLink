import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, ChevronDown, ChevronUp, Mail } from "lucide-react";
import { toast } from "sonner";

const CAT_KEYS = ["technical", "report_user", "account", "appeal", "other"] as const;
const STATUS_KEYS = ["open", "in_progress", "resolved"] as const;
const STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  in_progress: "bg-primary/15 text-primary",
  resolved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

const AdminSupportSection = () => {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const [catFilter, setCatFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const catLabel = (k: string) => t(`cat_${k}` as any);
  const statusLabel = (k: string) => t(`st_${k}` as any);
  const locale = lang === "EN" ? "en-US" : "he-IL";

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["admin-tickets", catFilter, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("support_tickets")
        .select("id, subject, category, status, user_id, created_at, updated_at")
        .order("updated_at", { ascending: false });
      if (catFilter !== "all") q = q.eq("category", catFilter as any);
      if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
      const { data, error } = await q;
      if (error) throw error;
      const ids = Array.from(new Set((data ?? []).map((tk) => tk.user_id)));
      let profMap: Record<string, any> = {};
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, verification_status")
          .in("user_id", ids);
        (profs ?? []).forEach((p: any) => { profMap[p.user_id] = p; });
      }
      return (data ?? []).map((tk) => ({ ...tk, profile: profMap[tk.user_id] as any }));
    },
  });

  const { data: msgs = [] } = useQuery({
    queryKey: ["admin-ticket-msgs", openId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", openId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!openId,
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("support_tickets").update({ status: status as any }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("toast_updated"));
    qc.invalidateQueries({ queryKey: ["admin-tickets"] });
  };

  const sendReply = async (ticketId: string) => {
    if (!reply.trim() || !user) return;
    setSending(true);
    try {
      const { error } = await supabase.from("support_messages").insert({
        ticket_id: ticketId, sender_id: user.id, body: reply.trim(), is_admin: true,
      });
      if (error) throw error;
      await supabase.from("support_tickets").update({ status: "in_progress" as any }).eq("id", ticketId).eq("status", "open");
      setReply("");
      qc.invalidateQueries({ queryKey: ["admin-ticket-msgs", ticketId] });
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const unblockUser = async (userId: string, ticketId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ verification_status: "approved", rejection_reason: null, verified_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (error) return toast.error(error.message);
    await updateStatus(ticketId, "resolved");
    toast.success(t("toast_user_unblocked"));
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-primary" />
        <h2 className="font-bold">{t("support_admin_title")}</h2>
      </div>

      <div className="flex gap-2">
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_categories")}</SelectItem>
            {CAT_KEYS.map((k) => <SelectItem key={k} value={k}>{catLabel(k)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_statuses")}</SelectItem>
            {STATUS_KEYS.map((k) => <SelectItem key={k} value={k}>{statusLabel(k)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
      ) : tickets.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">{t("no_matching_tickets")}</p>
      ) : (
        <div className="space-y-2">
          {tickets.map((tk: any) => {
            const isOpen = openId === tk.id;
            const isBlocked = tk.profile?.verification_status === "rejected";
            return (
              <div key={tk.id} className="rounded-xl border border-border overflow-hidden">
                <button onClick={() => setOpenId(isOpen ? null : tk.id)}
                  className="w-full text-start p-3 bg-secondary/30 hover:bg-secondary/50 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{tk.subject}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {catLabel(tk.category)} · {tk.profile?.full_name || t("no_name")} · {tk.profile?.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${STATUS_STYLE[tk.status]}`}>
                        {statusLabel(tk.status)}
                      </span>
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="p-3 space-y-3 bg-background">
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {msgs.map((m: any) => (
                        <div key={m.id} className={`flex ${m.is_admin ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                            m.is_admin ? "bg-gradient-to-r from-primary to-accent text-white" : "bg-card border border-border"
                          }`}>
                            <p className="whitespace-pre-wrap">{m.body}</p>
                            <p className={`text-[10px] mt-1 ${m.is_admin ? "text-white/70" : "text-muted-foreground"}`}>
                              {m.is_admin ? t("sender_support") : t("sender_user")} · {new Date(m.created_at).toLocaleString(locale)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Textarea value={reply} onChange={(e) => setReply(e.target.value)}
                        rows={2} placeholder={t("reply_ph")} className="text-sm" />
                      <Button onClick={() => sendReply(tk.id)} disabled={sending || !reply.trim()}
                        size="icon" className="rounded-full shrink-0 bg-gradient-to-r from-primary to-accent">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Select value={tk.status} onValueChange={(v) => updateStatus(tk.id, v)}>
                        <SelectTrigger className="h-9 text-xs flex-1 min-w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_KEYS.map((k) => <SelectItem key={k} value={k}>{statusLabel(k)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {tk.category === "appeal" && isBlocked && (
                        <Button size="sm" variant="outline" onClick={() => unblockUser(tk.user_id, tk.id)}>
                          {t("unblock_and_approve")}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminSupportSection;
