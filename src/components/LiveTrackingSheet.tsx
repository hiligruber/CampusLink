import { useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { useDriverLiveLocation } from "@/hooks/use-driver-live-location";
import { useLang } from "@/contexts/LanguageContext";
import { X, Clock, MapPin, Locate, Loader2, AlertTriangle, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rideId: string;
  destination: string;
  pickupLocation?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
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
  pickupLat,
  pickupLng,
  phase = "scheduled",
  driverName,
}: Props) {
  const { t, dir } = useLang();
  const {
    location,
    loading,
    pickupLatLng,
    destinationLatLng,
    toPickup,
    toDestination,
    routeError,
  } = useDriverLiveLocation({ rideId, destination, pickupLocation, pickupLat, pickupLng, phase, enabled: open });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [followDriver, setFollowDriver] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!mapRef.current || !location) return;
    const anyRoute = toPickup?.directions || toDestination?.directions;
    if (anyRoute && !fittedRef.current) {
      const bounds = new google.maps.LatLngBounds();
      toPickup?.directions.routes[0]?.overview_path.forEach((p) => bounds.extend(p));
      toDestination?.directions.routes[0]?.overview_path.forEach((p) => bounds.extend(p));
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
  }, [location, toPickup, toDestination, followDriver, pickupLatLng, destinationLatLng]);

  useEffect(() => {
    if (!open) fittedRef.current = false;
  }, [open]);

  const phaseLabel =
    phase === "en_route"
      ? t("driver_on_way_to_pickup")
      : phase === "picked_up"
      ? t("phase_picked_passengers")
      : phase === "in_progress"
      ? t("phase_to_destination")
      : phase === "completed"
      ? t("phase_ride_finished")
      : t("phase_awaiting_start");

  const updatedSecAgo = location
    ? Math.floor((Date.now() - new Date(location.updated_at).getTime()) / 1000)
    : null;

  const showWaitingForRoute = location && !toPickup && !toDestination && !routeError;

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
          aria-label={t("live_aria_track")}
          dir={dir}
        >
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
                    position:
                      typeof google !== "undefined" ? google.maps.ControlPosition.LEFT_CENTER : undefined,
                  },
                  gestureHandling: "greedy",
                  clickableIcons: false,
                  styles: [
                    { featureType: "poi", stylers: [{ visibility: "off" }] },
                    { featureType: "transit", stylers: [{ visibility: "off" }] },
                  ],
                }}
              >
                {toPickup?.directions && (
                  <DirectionsRenderer
                    directions={toPickup.directions}
                    options={{
                      suppressMarkers: true,
                      preserveViewport: true,
                      polylineOptions: {
                        strokeColor: "hsl(var(--primary))",
                        strokeWeight: 6,
                        strokeOpacity: 0.95,
                      },
                    }}
                  />
                )}
                {toDestination?.directions && (
                  <DirectionsRenderer
                    directions={toDestination.directions}
                    options={{
                      suppressMarkers: true,
                      preserveViewport: true,
                      polylineOptions: {
                        strokeColor: "hsl(var(--accent))",
                        strokeWeight: 6,
                        strokeOpacity: 0.72,
                      },
                    }}
                  />
                )}
                <Marker
                  position={{ lat: location.lat, lng: location.lng }}
                  icon={carIcon(location.heading)}
                  title={t("live_marker_driver")}
                />
                {pickupLatLng && phase !== "in_progress" && phase !== "completed" && (
                  <Marker
                    position={pickupLatLng}
                    icon={pinIcon("#10b981", "A")}
                    title={`${t("live_marker_pickup")}: ${pickupLocation ?? ""}`}
                  />
                )}
                {destinationLatLng && (
                  <Marker
                    position={destinationLatLng}
                    icon={pinIcon("#ec4899", "B")}
                    title={`${t("live_marker_destination")}: ${destination}`}
                  />
                )}
              </GoogleMap>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary/40 gap-3">
                {loading ? (
                  <>
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">{t("live_loading_driver")}</p>
                  </>
                ) : (
                  <>
                    <Navigation className="w-10 h-10 text-muted-foreground/40" />
                    <p className="text-sm font-semibold">{t("live_no_location_title")}</p>
                    <p className="text-xs text-muted-foreground">{t("live_no_location_desc")}</p>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => onOpenChange(false)}
            aria-label={t("live_aria_close")}
            className="absolute top-4 end-4 z-10 w-11 h-11 rounded-full bg-background/95 backdrop-blur shadow-lg flex items-center justify-center hover:scale-105 transition border border-border"
          >
            <X className="w-5 h-5" />
          </button>

          {location && !followDriver && (
            <button
              onClick={() => {
                setFollowDriver(true);
                if (mapRef.current) mapRef.current.panTo({ lat: location.lat, lng: location.lng });
              }}
              aria-label={t("live_aria_center")}
              className="absolute bottom-[260px] start-4 z-10 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 transition"
            >
              <Locate className="w-5 h-5" />
            </button>
          )}

          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="absolute bottom-0 inset-x-0 z-10 bg-background/95 backdrop-blur-xl rounded-t-3xl shadow-2xl border-t border-border max-h-[50vh] overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? t("live_aria_expand") : t("live_aria_collapse")}
              className="w-full flex justify-center pt-2.5 pb-1.5 cursor-pointer"
            >
              <span className="w-12 h-1.5 rounded-full bg-muted-foreground/40" />
            </button>

            <div className="px-5 pb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "w-2.5 h-2.5 rounded-full shrink-0",
                    location ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40",
                  )}
                />
                <span className="text-sm font-bold truncate">{phaseLabel}</span>
              </div>
              {(toPickup?.eta || toDestination?.eta) && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary shrink-0">
                  <Clock className="w-3 h-3" />
                  {(toPickup?.eta ?? toDestination?.eta)!.duration}
                </span>
              )}
            </div>

            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  key="details"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-6 space-y-4">
                    {updatedSecAgo !== null && (
                      <p className="text-[11px] text-muted-foreground text-end">
                        {t("live_updated_ago")}{" "}
                        {updatedSecAgo < 60
                          ? t("live_seconds_ago", { s: String(updatedSecAgo) })
                          : t("live_about_minute_ago")}
                      </p>
                    )}

                    {routeError && (
                      <div className="bg-destructive/10 text-destructive rounded-2xl p-3 flex items-center gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        {t("route_error")}
                      </div>
                    )}

                    {showWaitingForRoute && !routeError && (
                      <div className="bg-secondary/60 rounded-2xl p-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("computing_eta")}
                      </div>
                    )}

                    {/* Two segments breakdown */}
                    {(toPickup?.eta || toDestination?.eta) && (
                      <div className="grid grid-cols-1 gap-2">
                        {toPickup?.eta && (
                          <div className="flex items-center gap-3 bg-primary/10 rounded-2xl p-3">
                            <span className="w-2.5 h-2.5 rounded-sm bg-primary shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                {t("eta_to_pickup")}
                              </p>
                              <p className="text-sm font-semibold truncate">{pickupLocation}</p>
                            </div>
                            <div className="text-end shrink-0">
                              <p className="text-lg font-black text-primary leading-tight">
                                {toPickup.eta.duration}
                              </p>
                              <p className="text-[11px] text-muted-foreground font-semibold">
                                {toPickup.eta.distance}
                              </p>
                            </div>
                          </div>
                        )}
                        {toDestination?.eta && (
                          <div className="flex items-center gap-3 bg-accent/10 rounded-2xl p-3">
                            <span className="w-2.5 h-2.5 rounded-sm bg-accent shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                {t("eta_to_destination")}
                              </p>
                              <p className="text-sm font-semibold truncate">{destination}</p>
                            </div>
                            <div className="text-end shrink-0">
                              <p className="text-lg font-black text-accent-foreground leading-tight">
                                {toDestination.eta.duration}
                              </p>
                              <p className="text-[11px] text-muted-foreground font-semibold">
                                {toDestination.eta.distance}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {driverName && (
                      <p className="text-center text-xs text-muted-foreground pt-1">
                        <MapPin className="w-3 h-3 inline -mt-0.5 me-1" />
                        {t("live_track_of", { name: driverName })}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
