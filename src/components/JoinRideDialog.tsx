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
import { useLang } from "@/contexts/LanguageContext";


interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rideOrigin: string;
  rideDestination: string;
  driverName: string;
  submitting?: boolean;
  onConfirm: (pickupLocation: string, pickupCoords?: { lat: number | null; lng: number | null }) => void;
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
  const [pickupCoords, setPickupCoords] = useState<{ lat: number | null; lng: number | null } | undefined>();
  const { t, dir } = useLang();


  const handleConfirm = () => {
    const final = (pickup || rideOrigin).trim();
    onConfirm(final, pickupCoords);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md" dir={dir}>
        <DialogHeader>
          <DialogTitle className="text-start">{t("join_title")}</DialogTitle>
          <DialogDescription className="text-start">
            {rideOrigin} ← {rideDestination} · {driverName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs font-bold mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              {t("join_pickup_label")}
            </Label>
            <PlacesAutocomplete
              value={pickup}
              onChange={(value) => {
                setPickup(value);
                setPickupCoords(undefined);
              }}
              onPlaceSelect={(place) => setPickupCoords({ lat: place.lat, lng: place.lng })}
              placeholder={t("join_pickup_ph")}
            />
          </div>

          <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-secondary/40 rounded-xl p-2.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
            <span>{t("join_pickup_hint")}</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t("cancel")}
          </Button>
          <Button
            className="rounded-xl bg-gradient-to-r from-primary to-accent border-0"
            onClick={handleConfirm}
            disabled={submitting || !pickup.trim()}
          >
            {t("join_send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
