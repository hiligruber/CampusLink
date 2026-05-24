import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import { MapPin, Info } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rideOrigin: string;
  rideDestination: string;
  driverName: string;
  submitting?: boolean;
  onConfirm: (pickupLocation: string) => void;
}

export default function JoinRideDialog({
  open,
  onOpenChange,
  rideOrigin,
  rideDestination,
  driverName,
  submitting,
  onConfirm,
}: Props) {
  const [pickup, setPickup] = useState<string>(rideOrigin);

  const handleConfirm = () => {
    const final = (pickup || rideOrigin).trim();
    onConfirm(final);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">בקשה להצטרף לנסיעה</DialogTitle>
          <DialogDescription className="text-right">
            {rideOrigin} ← {rideDestination} · {driverName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs font-bold mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              נקודת איסוף
            </Label>
            <PlacesAutocomplete
              value={pickup}
              onChange={setPickup}
              placeholder="באיזו כתובת לאסוף אותך?"
            />
          </div>

          <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-secondary/40 rounded-xl p-2.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
            <span>
              ודאו שנקודת האיסוף קרובה למסלול של הנהג ({rideOrigin}). הנהג רואה את הנקודה לפני שהוא מאשר.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            ביטול
          </Button>
          <Button
            className="rounded-xl bg-gradient-to-r from-primary to-accent border-0"
            onClick={handleConfirm}
            disabled={submitting || !pickup.trim()}
          >
            שלח בקשה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
