import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVerificationStatus } from "@/hooks/use-verification";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, ChevronRight, LifeBuoy, Send, ArrowRight, LogOut } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const CATEGORY_LABEL: Record<string, string> = {
  technical: "בעיה טכנית",
  report_user: "דיווח על משתמש",
  account: "בעיית חשבון",
  appeal: "ערעור על חסימה",
  other: "אחר",
};

const STATUS_LABEL: Record<string, string> = {
  open: "פתוח",
  in_progress: "בטיפול",
  resolved: "נסגר",
};

const STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  in_progress: "bg-primary/15 text-primary",
  resolved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

const Support = () => {
  const { user, signOut } = useAuth();
  const { isVerified, isAdmin } = useVerificationStatus();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const restricted = !isVerified && !isAdmin;

  const [view, setView] = useState<"list" | "new" | "thread">("list");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<string>(restricted ? "appeal" : "technical");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["my-tickets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, subject, category, status, created_at, updated_at")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["ticket-msgs", activeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", activeId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!activeId,
  });

  const submit = async () => {
    if (!subject.trim() || !body.trim() || !user) return;
    setSending(true);
    try {
      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert({ user_id: user.id, subject: subject.trim(), category: category as any })
        .select()
        .single();
      if (error) throw error;
      const { error: mErr } = await supabase
        .from("support_messages")
        .insert({ ticket_id: ticket.id, sender_id: user.id, body: body.trim(), is_admin: false });
      if (mErr) throw mErr;
      toast.success("הבקשה נשלחה בהצלחה");
      setSubject(""); setBody("");
      qc.invalidateQueries({ queryKey: ["my-tickets"] });
      setView("list");
    } catch (e: any) {
      toast.error(e.message || "שגיאה בשליחה");
    } finally {
      setSending(false);
    }
  };

  const sendReply = async () => {
    if (!reply.trim() || !activeId || !user) return;
    setSending(true);
    try {
      const { error } = await supabase
        .from("support_messages")
        .insert({ ticket_id: activeId, sender_id: user.id, body: reply.trim(), is_admin: false });
      if (error) throw error;
      setReply("");
      qc.invalidateQueries({ queryKey: ["ticket-msgs", activeId] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const activeTicket = tickets.find((t) => t.id === activeId);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-24" dir="rtl">
      {restricted && (
        <>
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
        </>
      )}
      {!restricted && <AppHeader subtitle="תמיכה" />}

      <motion.main
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto px-4 py-6 relative z-10 space-y-4"
      >
        {restricted && (
          <div className="text-center space-y-2 pt-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent mx-auto flex items-center justify-center">
              <LifeBuoy className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold">תמיכה וערעורים</h1>
            <p className="text-sm text-muted-foreground">
              אתה יכול לפנות לצוות התמיכה או להגיש ערעור על חסימה.
            </p>
          </div>
        )}

        {view === "list" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">הפניות שלי</h2>
              <Button size="sm" className="rounded-full gap-1 bg-gradient-to-r from-primary to-accent"
                onClick={() => setView("new")}>
                <Plus className="w-4 h-4" /> פנייה חדשה
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : tickets.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground bg-card rounded-2xl border border-border p-8">
                עוד לא פתחת פניות. לחץ "פנייה חדשה" כדי להתחיל.
              </div>
            ) : (
              <div className="space-y-2">
                {tickets.map((t) => (
                  <button key={t.id}
                    onClick={() => { setActiveId(t.id); setView("thread"); }}
                    className="w-full text-right bg-card rounded-2xl border border-border p-4 hover:border-primary/40 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{t.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1">{CATEGORY_LABEL[t.category]}</p>
                      </div>
                      <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${STATUS_STYLE[t.status]}`}>
                        {STATUS_LABEL[t.status]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(t.updated_at).toLocaleString("he-IL")}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground rtl:rotate-180" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {view === "new" && (
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setView("list")} className="text-sm text-muted-foreground hover:text-foreground">
                <ArrowRight className="w-4 h-4 inline" /> חזרה
              </button>
            </div>
            <h2 className="text-lg font-bold">פנייה חדשה</h2>
            <div className="space-y-2">
              <label className="text-xs font-semibold">קטגוריה</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold">נושא</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120}
                placeholder="תיאור קצר" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold">הודעה</label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={2000}
                placeholder="ספר לנו מה קרה..." />
            </div>
            <Button onClick={submit} disabled={sending || !subject.trim() || !body.trim()}
              className="w-full rounded-full bg-gradient-to-r from-primary to-accent">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "שלח פנייה"}
            </Button>
          </div>
        )}

        {view === "thread" && activeTicket && (
          <div className="space-y-3">
            <button onClick={() => { setView("list"); setActiveId(null); }}
              className="text-sm text-muted-foreground hover:text-foreground">
              <ArrowRight className="w-4 h-4 inline" /> חזרה
            </button>
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-bold">{activeTicket.subject}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{CATEGORY_LABEL[activeTicket.category]}</p>
                </div>
                <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${STATUS_STYLE[activeTicket.status]}`}>
                  {STATUS_LABEL[activeTicket.status]}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {messages.map((m: any) => (
                <div key={m.id} className={`flex ${m.is_admin ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.is_admin
                      ? "bg-card border border-border"
                      : "bg-gradient-to-r from-primary to-accent text-white"
                  }`}>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className={`text-[10px] mt-1 ${m.is_admin ? "text-muted-foreground" : "text-white/70"}`}>
                      {m.is_admin ? "תמיכה" : "אתה"} · {new Date(m.created_at).toLocaleString("he-IL")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {activeTicket.status !== "resolved" && (
              <div className="flex gap-2 sticky bottom-20 bg-background/80 backdrop-blur p-2 rounded-2xl">
                <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="כתוב הודעה..." />
                <Button onClick={sendReply} disabled={sending || !reply.trim()} size="icon"
                  className="rounded-full bg-gradient-to-r from-primary to-accent shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {restricted && view === "list" && (
          <div className="pt-4 flex flex-col gap-2">
            <Button variant="outline" onClick={signOut} className="rounded-full">
              <LogOut className="w-4 h-4 ml-2" /> התנתק
            </Button>
            <Button variant="ghost" onClick={() => navigate("/verify")} className="text-xs">
              חזרה למסך האימות
            </Button>
          </div>
        )}
      </motion.main>
      {!restricted && <BottomNav />}
    </div>
  );
};

export default Support;
