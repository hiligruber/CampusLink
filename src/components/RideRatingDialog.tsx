import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rideId: string;
  rateeId: string;
  rateeName: string;
  onDone?: () => void;
}

export default function RideRatingDialog({ open, onOpenChange, rideId, rateeId, rateeName, onDone }: Props) {
  const { t } = useLang();
  const { user } = useAuth();
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user || stars === 0) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("ride_ratings").insert({
        ride_id: rideId,
        rater_id: user.id,
        ratee_id: rateeId,
        stars,
        comment: comment.trim() || null,
      } as any);
      if (error) throw error;
      toast.success(t("thanks_rating"));
      onOpenChange(false);
      onDone?.();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const skip = () => {
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold">{t("rate_ride_title")}</DialogTitle>
          <DialogDescription>
            {t("rate_with")} <span className="font-bold text-foreground">{rateeName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1.5 py-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setStars(s)}
              className="p-1 transition-transform hover:scale-110"
              aria-label={`${s} stars`}
            >
              <Star
                className={cn(
                  "w-10 h-10 transition-colors",
                  (hover || stars) >= s
                    ? "fill-warning text-warning"
                    : "text-muted-foreground/30"
                )}
              />
            </button>
          ))}
        </div>

        <Textarea
          placeholder={t("rating_comment_ph")}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="rounded-2xl min-h-[80px]"
        />

        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button variant="outline" onClick={skip} className="rounded-xl h-11">
            {t("skip")}
          </Button>
          <Button
            onClick={submit}
            disabled={stars === 0 || submitting}
            className="rounded-xl h-11 bg-gradient-to-r from-primary to-accent"
          >
            {t("submit_rating")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
