import { useState } from "react";
import { MessageCircle, Inbox, User as UserIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { useMessageThreads, type MessageThread } from "@/hooks/use-message-threads";
import RideChat from "@/components/RideChat";

const timeAgo = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "עכשיו";
  if (m < 60) return `${m}ד׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}ש׳`;
  return `${Math.floor(h / 24)}י׳`;
};

export default function InboxDropdown() {
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState<MessageThread | null>(null);
  const { threads, loading, totalUnread } = useMessageThreads();

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className="relative w-9 h-9 rounded-full bg-secondary hover:bg-muted flex items-center justify-center tap-scale transition-colors"
            aria-label="הודעות"
          >
            <MessageCircle className="w-[18px] h-[18px] text-foreground" strokeWidth={2} />
            <AnimatePresence>
              {totalUnread > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground ring-2 ring-background"
                >
                  {totalUnread > 9 ? "9+" : totalUnread}
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
          <div className="px-4 py-3 border-b border-border bg-secondary/40">
            <h3 className="font-bold text-base">הודעות</h3>
            <p className="text-[11px] text-muted-foreground">מקובץ לפי נסיעה</p>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-10 text-center text-xs text-muted-foreground">טוען…</div>
            ) : threads.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Inbox className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" strokeWidth={1.5} />
                <p className="text-sm font-semibold">אין הודעות עדיין</p>
                <p className="text-xs text-muted-foreground mt-1">שיחות עם נהגים ונוסעים יופיעו כאן</p>
              </div>
            ) : (
              threads.map((t, i) => (
                <button
                  key={`${t.rideId}-${t.otherUserId}`}
                  onClick={() => {
                    setChat(t);
                    setOpen(false);
                  }}
                  className={`w-full text-right px-4 py-3 hover:bg-secondary/60 transition-colors flex items-start gap-3 ${
                    t.unreadCount > 0 ? "bg-primary/[0.04]" : ""
                  } ${i !== threads.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className="shrink-0 w-10 h-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center ring-2 ring-background">
                    {t.otherAvatar ? (
                      <img src={t.otherAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <p className="text-sm font-bold truncate">{t.otherUserName}</p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {timeAgo(t.lastMessageAt)}
                      </span>
                    </div>
                    {t.rideOrigin && (
                      <p className="text-[11px] text-primary font-semibold truncate">
                        {t.rideOrigin} ← {t.rideDestination}
                      </p>
                    )}
                    <p
                      className={`text-xs truncate ${
                        t.unreadCount > 0 ? "text-foreground font-semibold" : "text-muted-foreground"
                      }`}
                    >
                      {t.lastSenderIsMe ? "את/ה: " : ""}
                      {t.lastMessage}
                    </p>
                  </div>
                  {t.unreadCount > 0 && (
                    <span className="shrink-0 min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground mt-1">
                      {t.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {chat && (
        <RideChat
          open={!!chat}
          onOpenChange={(o) => !o && setChat(null)}
          rideId={chat.rideId}
          otherUserId={chat.otherUserId}
          otherUserName={chat.otherUserName}
        />
      )}
    </>
  );
}
