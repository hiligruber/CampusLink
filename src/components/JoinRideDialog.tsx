import { useEffect, useRef, useState } from "react";
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
import { MapPin, Info, LocateFixed, Loader2 } from "lucide-react";
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
  const [pickup, setPickup] = useState<string>("");
  const [pickupCoords, setPickupCoords] = useState<{ lat: number | null; lng: number | null } | undefined>();
  const [locating, setLocating] = useState(false);
  const autoTriedRef = useRef(false);
  const { t, dir } = useLang();

  const useCurrentLocation = () => {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPickupCoords(ll);
        if (typeof google !== "undefined" && google.maps?.Geocoder) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: ll }, (results, status) => {
            const address = status === "OK" && results?.[0]?.formatted_address
              ? results[0].formatted_address
              : `${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}`;
            setPickup(address);
            setLocating(false);
          });
        } else {
          setPickup(`${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}`);
          setLocating(false);
        }
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  // Auto-detect current location when dialog opens (once)
  useEffect(() => {
    if (open && !autoTriedRef.current) {
      autoTriedRef.current = true;
      useCurrentLocation();
    }
    if (!open) {
      autoTriedRef.current = false;
      setPickup("");
      setPickupCoords(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleConfirm = () => {
    const final = (pickup || rideOrigin).trim();
    onConfirm(final, pickupCoords);
  };

  // Prevent Radix from closing the dialog when interacting with the Google Places dropdown
  const ignoreOutsidePac = (e: Event) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest?.(".pac-container")) e.preventDefault();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-3xl max-w-md"
        dir={dir}
        onPointerDownOutside={ignoreOutsidePac}
        onInteractOutside={ignoreOutsidePac}
      >
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
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locating}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-60"
            >
              {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
              {t("use_current_location")}
            </button>
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
