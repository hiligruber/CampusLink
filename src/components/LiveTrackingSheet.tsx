import { useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { useDriverLiveLocation } from "@/hooks/use-driver-live-location";
import { Button } from "@/components/ui/button";
import { X, Navigation, Clock, MapPin, Locate, ExternalLink, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rideId: string;
  destination: string;
  pickupLocation?: string | null;
  phase?: "scheduled" | "en_route" | "picked_up" | "in_progress" | "completed";
  driverName?: string;
}

const carIcon = (heading: number | null) => ({
  url:
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>
        <defs>
          <radialGradient id='g' cx='50%' cy='50%' r='50%'>
            <stop offset='0%' stop-color='#10b981' stop-opacity='0.4'/>
            <stop offset='100%' stop-color='#10b981' stop-opacity='0'/>
          </radialGradient>
        </defs>
        <circle cx='32' cy='32' r='30' fill='url(#g)'/>
        <g transform='rotate(${heading ?? 0} 32 32)'>
          <circle cx='32' cy='32' r='18' fill='#10b981' stroke='#ffffff' stroke-width='3'/>
          <path d='M32 18 L40 40 L32 35 L24 40 Z' fill='#ffffff'/>
        </g>
      </svg>
    `),
  scaledSize: typeof google !== "undefined" ? new google.maps.Size(64, 64) : undefined,
  anchor: typeof google !== "undefined" ? new google.maps.Point(32, 32) : undefined,
});

const pinIcon = (color: string, label: string) => ({
  url:
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg xmlns='http://www.w3.org/2000/svg' width='44' height='56' viewBox='0 0 44 56'>
        <path d='M22 2 C10 2 2 11 2 22 C2 36 22 54 22 54 C22 54 42 36 42 22 C42 11 34 2 22 2 Z'
              fill='${color}' stroke='#ffffff' stroke-width='3'/>
        <text x='22' y='28' font-size='16' text-anchor='middle' fill='#ffffff' font-weight='bold'>${label}</text>
      </svg>
    `),
  scaledSize: typeof google !== "undefined" ? new google.maps.Size(44, 56) : undefined,
  anchor: typeof google !== "undefined" ? new google.maps.Point(22, 56) : undefined,
});

export default function LiveTrackingSheet({
  open,
  onOpenChange,
  rideId,
  destination,
  pickupLocation,
  phase = "scheduled",
  driverName,
}: Props) {
  const { location, eta, directions, loading, pickupLatLng, destinationLatLng } = useDriverLiveLocation({
    rideId,
    destination,
    pickupLocation,
    phase,
    enabled: open,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [followDriver, setFollowDriver] = useState(true);
  const fittedRef = useRef(false);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Fit bounds once we have directions; afterwards just pan if followDriver
  useEffect(() => {
    if (!mapRef.current || !location) return;
    if (directions && !fittedRef.current) {
      const bounds = new google.maps.LatLngBounds();
      directions.routes[0]?.overview_path.forEach((p) => bounds.extend(p));
      bounds.extend({ lat: location.lat, lng: location.lng });
      if (pickupLatLng) bounds.extend(pickupLatLng);
      if (destinationLatLng) bounds.extend(destinationLatLng);
      mapRef.current.fitBounds(bounds, 80);
      fittedRef.current = true;
      return;
    }
    if (followDriver) {
      mapRef.current.panTo({ lat: location.lat, lng: location.lng });
    }
  }, [location, directions, followDriver, pickupLatLng, destinationLatLng]);

  // Reset fit when sheet reopens
  useEffect(() => {
    if (!open) fittedRef.current = false;
  }, [open]);

  const phaseLabel =
    phase === "en_route"
      ? "הנהג בדרך אליך"
      : phase === "picked_up"
      ? "אספת את הנוסעים"
      : phase === "in_progress"
      ? "בדרך ליעד"
      : phase === "completed"
      ? "הנסיעה הסתיימה"
      : "ממתין ליציאה";

  const navTarget = phase === "en_route" && pickupLocation ? pickupLocation : destination;
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(navTarget)}&navigate=yes`;
  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(navTarget)}`;

  const updatedSecAgo = location
    ? Math.floor((Date.now() - new Date(location.updated_at).getTime()) / 1000)
    : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-background"
          role="dialog"
          aria-modal="true"
          aria-label="מעקב חי אחרי הנהג"
        >
          {/* Map fills the screen */}
          <div className="absolute inset-0">
            {location ? (
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={{ lat: location.lat, lng: location.lng }}
                zoom={15}
                onLoad={(m) => {
                  mapRef.current = m;
                }}
                onDragStart={() => setFollowDriver(false)}
                options={{
                  disableDefaultUI: true,
                  zoomControl: true,
                  zoomControlOptions: {
                    position: typeof google !== "undefined" ? google.maps.ControlPosition.LEFT_CENTER : undefined,
                  },
                  gestureHandling: "greedy",
                  clickableIcons: false,
                  styles: [
                    { featureType: "poi", stylers: [{ visibility: "off" }] },
                    { featureType: "transit", stylers: [{ visibility: "off" }] },
                  ],
                }}
              >
                {directions && (
                  <DirectionsRenderer
                    directions={directions}
                    options={{
                      suppressMarkers: true,
                      polylineOptions: {
                        strokeColor: "hsl(var(--primary))",
                        strokeWeight: 6,
                        strokeOpacity: 0.95,
                      },
                    }}
                  />
                )}
                <Marker position={{ lat: location.lat, lng: location.lng }} icon={carIcon(location.heading)} title="הנהג" />
                {directions?.routes[0]?.legs[0]?.end_location && (
                  <Marker position={directions.routes[0].legs[0].end_location} icon={destinationIcon()} />
                )}
              </GoogleMap>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary/40 gap-3">
                {loading ? (
                  <>
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">טוען מיקום נהג…</p>
                  </>
                ) : (
                  <>
                    <Navigation className="w-10 h-10 text-muted-foreground/40" />
                    <p className="text-sm font-semibold">אין עדיין מיקום של הנהג</p>
                    <p className="text-xs text-muted-foreground">ברגע שהנהג ייצא לדרך זה יופיע כאן</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            aria-label="סגור מפה"
            className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full bg-background/95 backdrop-blur shadow-lg flex items-center justify-center hover:scale-105 transition border border-border"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Recenter button (only when user dragged away) */}
          {location && !followDriver && (
            <button
              onClick={() => {
                setFollowDriver(true);
                if (mapRef.current && location) mapRef.current.panTo({ lat: location.lat, lng: location.lng });
              }}
              aria-label="מרכז על הנהג"
              className="absolute bottom-[260px] left-4 z-10 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 transition"
            >
              <Locate className="w-5 h-5" />
            </button>
          )}

          {/* Bottom info sheet */}
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="absolute bottom-0 inset-x-0 z-10 bg-background/95 backdrop-blur-xl rounded-t-3xl shadow-2xl border-t border-border"
          >
            <div className="mx-auto w-12 h-1.5 rounded-full bg-muted-foreground/30 mt-2.5 mb-3" />
            <div className="px-5 pb-6 space-y-4">
              {/* Status row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    location ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"
                  )} />
                  <span className="text-sm font-bold">{phaseLabel}</span>
                </div>
                {updatedSecAgo !== null && (
                  <span className="text-[11px] text-muted-foreground">
                    עודכן {updatedSecAgo < 60 ? `לפני ${updatedSecAgo}ש'` : "לפני כדקה"}
                  </span>
                )}
              </div>

              {/* Big ETA */}
              {eta ? (
                <div className="flex items-end gap-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-4">
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {phase === "en_route" ? "מגיע אליך בעוד" : "ETA"}
                    </p>
                    <p className="text-3xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent leading-tight">
                      {eta.duration}
                    </p>
                  </div>
                  <div className="mr-auto text-right">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">מרחק</p>
                    <p className="text-lg font-bold">{eta.distance}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-secondary/60 rounded-2xl p-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  מחשב זמן הגעה…
                </div>
              )}

              {/* Route line */}
              <div className="space-y-2">
                {pickupLocation && phase !== "in_progress" && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="w-2.5 h-2.5 rounded-sm bg-primary shrink-0" />
                    <span className="font-semibold truncate">{pickupLocation}</span>
                    <span className="text-[10px] text-muted-foreground mr-auto">איסוף</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <span className="w-2.5 h-2.5 rounded-sm bg-accent shrink-0" />
                  <span className="font-semibold truncate">{destination}</span>
                  <span className="text-[10px] text-muted-foreground mr-auto">יעד</span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" className="rounded-xl h-11 font-bold gap-1.5">
                  <a href={wazeUrl} target="_blank" rel="noreferrer">
                    <Navigation className="w-4 h-4" />
                    פתח ב‑Waze
                  </a>
                </Button>
                <Button asChild className="rounded-xl h-11 font-bold gap-1.5 bg-gradient-to-r from-primary to-accent border-0">
                  <a href={gmapsUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    Google Maps
                  </a>
                </Button>
              </div>

              {driverName && (
                <p className="text-center text-xs text-muted-foreground pt-1">
                  <MapPin className="w-3 h-3 inline -mt-0.5 ml-1" />
                  מעקב חי אחרי <span className="font-bold text-foreground">{driverName}</span>
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
