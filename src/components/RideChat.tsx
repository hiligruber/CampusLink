import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface Message {
  id: string;
  ride_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read: boolean;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rideId: string;
  otherUserId: string;
  otherUserName: string;
}

export default function RideChat({ open, onOpenChange, rideId, otherUserId, otherUserName }: Props) {
  const { user } = useAuth();
  const { t, lang, dir } = useLang();
  const PRESETS = [t("chat_preset_1"), t("chat_preset_2"), t("chat_preset_3"), t("chat_preset_4"), t("chat_preset_5")];
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !user) return;
    let active = true;
    setLoading(true);

    const load = async () => {
      const { data } = await supabase
        .from("ride_messages")
        .select("*")
        .eq("ride_id", rideId)
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      if (!active) return;
      setMessages((data ?? []) as Message[]);
      setLoading(false);
      // mark incoming as read
      await supabase
        .from("ride_messages")
        .update({ read: true })
        .eq("ride_id", rideId)
        .eq("sender_id", otherUserId)
        .eq("recipient_id", user.id)
        .eq("read", false);
    };
    load();

    const channel = supabase
      .channel(`chat-${rideId}-${user.id}-${otherUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ride_messages", filter: `ride_id=eq.${rideId}` },
        (payload) => {
          const m = payload.new as Message;
          const inThread =
            (m.sender_id === user.id && m.recipient_id === otherUserId) ||
            (m.sender_id === otherUserId && m.recipient_id === user.id);
          if (!inThread) return;
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
          if (m.recipient_id === user.id) {
            supabase.from("ride_messages").update({ read: true }).eq("id", m.id).then();
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [open, user, rideId, otherUserId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (body: string) => {
    if (!user || !body.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from("ride_messages").insert({
        ride_id: rideId,
        sender_id: user.id,
        recipient_id: otherUserId,
        body: body.trim(),
      });
      if (error) throw error;
      setText("");
    } catch (e: any) {
      toast.error(e?.message || "שליחה נכשלה");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden" dir="rtl">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="text-base">צ'אט עם {otherUserName}</DialogTitle>
        </DialogHeader>

        <div ref={scrollRef} className="h-[55vh] overflow-y-auto px-4 py-3 space-y-2 bg-secondary/20">
          {loading ? (
            <div className="flex justify-center pt-10">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground pt-10">
              עדיין אין הודעות. שלחו את הראשונה ✨
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      mine
                        ? "bg-primary text-primary-foreground rounded-bl-2xl rounded-br-md"
                        : "bg-card text-foreground rounded-br-2xl rounded-bl-md border border-border"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`text-[10px] mt-0.5 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-border bg-background">
          <div className="px-3 pt-2 pb-1 flex gap-1.5 overflow-x-auto scrollbar-none">
            {PRESETS.map((p) => (
              <button
                key={p}
                disabled={sending}
                onClick={() => send(p)}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/70 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
            className="flex gap-2 px-3 py-2"
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="כתוב הודעה…"
              disabled={sending}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={sending || !text.trim()}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
