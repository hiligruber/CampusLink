import { useState } from "react";
import { GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { Loader2, Navigation, Clock, Maximize2, AlertTriangle } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useDriverLiveLocation } from "@/hooks/use-driver-live-location";
import LiveTrackingSheet from "./LiveTrackingSheet";

interface Props {
  rideId: string;
  destination: string;
  height?: string;
  phase?: "scheduled" | "en_route" | "picked_up" | "in_progress" | "completed";
  pickupLocation?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  driverName?: string;
}

const mapContainerStyle = { width: "100%", borderRadius: "1.25rem" };

export default function DriverLiveTracker({
  rideId,
  destination,
  height = "260px",
  phase = "scheduled",
  pickupLocation,
  pickupLat,
  pickupLng,
  driverName,
}: Props) {
  const { t } = useLang();
  const [expanded, setExpanded] = useState(false);
  const {
    location,
    loading,
    pickupLatLng,
    destinationLatLng,
    toPickup,
    toDestination,
    routeError,
  } = useDriverLiveLocation({ rideId, destination, pickupLocation, pickupLat, pickupLng, phase });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        {t("live_loading_driver")}
      </div>
    );
  }

  if (!location) {
    const isActivePhase = phase === "en_route" || phase === "picked_up" || phase === "in_progress";
    const headline =
      phase === "completed"
        ? t("phase_ride_finished")
        : isActivePhase
        ? t("connecting_driver")
        : t("driver_not_started");
    const subline =
      phase === "completed"
        ? t("thanks_for_riding")
        : isActivePhase
        ? t("awaiting_first_fix")
        : t("driver_will_update");
    return (
      <div className="bg-secondary/40 rounded-2xl p-4 text-center">
        {isActivePhase ? (
          <Loader2 className="w-6 h-6 mx-auto text-primary/60 mb-2 animate-spin" />
        ) : (
          <Navigation className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
        )}
        <p className="text-sm font-semibold">{headline}</p>
        <p className="text-xs text-muted-foreground mt-1">{subline}</p>
      </div>
    );
  }

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

  const primaryEta = toPickup?.eta ?? toDestination?.eta ?? null;
  const updatedSecAgo = Math.floor((Date.now() - new Date(location.updated_at).getTime()) / 1000);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          {phaseLabel}
        </span>
        {primaryEta && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
            <Clock className="w-3 h-3" />
            {primaryEta.duration}
          </span>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded(true);
          }
        }}
        aria-label={t("aria_expand_map")}
        className="relative w-full block group rounded-[1.25rem] overflow-hidden ring-1 ring-border cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <GoogleMap
          mapContainerStyle={{ ...mapContainerStyle, height }}
          center={{ lat: location.lat, lng: location.lng }}
          zoom={14}
          options={{
            disableDefaultUI: true,
            gestureHandling: "none",
            keyboardShortcuts: false,
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
                  strokeWeight: 5,
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
                  strokeWeight: 5,
                  strokeOpacity: 0.72,
                },
              }}
            />
          )}

          {pickupLatLng && phase !== "in_progress" && phase !== "completed" && (
            <Marker
              position={pickupLatLng}
              icon={{
                url:
                  "data:image/svg+xml;charset=UTF-8," +
                  encodeURIComponent(`
                  <svg xmlns='http://www.w3.org/2000/svg' width='40' height='48' viewBox='0 0 40 48'>
                    <path d='M20 2 C9 2 2 10 2 19 C2 31 20 46 20 46 C20 46 38 31 38 19 C38 10 31 2 20 2 Z'
                          fill='#10b981' stroke='#ffffff' stroke-width='3'/>
                    <text x='20' y='25' font-size='16' text-anchor='middle' fill='#ffffff' font-weight='bold'>A</text>
                  </svg>
                `),
                scaledSize: new google.maps.Size(40, 48),
                anchor: new google.maps.Point(20, 48),
              }}
              title={`${t("live_marker_pickup")}: ${pickupLocation ?? ""}`}
            />
          )}

          {destinationLatLng && (
            <Marker
              position={destinationLatLng}
              icon={{
                url:
                  "data:image/svg+xml;charset=UTF-8," +
                  encodeURIComponent(`
                  <svg xmlns='http://www.w3.org/2000/svg' width='40' height='48' viewBox='0 0 40 48'>
                    <path d='M20 2 C9 2 2 10 2 19 C2 31 20 46 20 46 C20 46 38 31 38 19 C38 10 31 2 20 2 Z'
                          fill='#ec4899' stroke='#ffffff' stroke-width='3'/>
                    <text x='20' y='25' font-size='16' text-anchor='middle' fill='#ffffff' font-weight='bold'>B</text>
                  </svg>
                `),
                scaledSize: new google.maps.Size(40, 48),
                anchor: new google.maps.Point(20, 48),
              }}
              title={`${t("live_marker_destination")}: ${destination}`}
            />
          )}

          <Marker
            position={{ lat: location.lat, lng: location.lng }}
            icon={{
              url:
                "data:image/svg+xml;charset=UTF-8," +
                encodeURIComponent(`
                <svg xmlns='http://www.w3.org/2000/svg' width='52' height='52' viewBox='0 0 52 52'>
                  <circle cx='26' cy='26' r='22' fill='#10b981' stroke='#ffffff' stroke-width='3'/>
                  <text x='26' y='34' font-size='26' text-anchor='middle'>🚗</text>
                </svg>
              `),
              scaledSize: new google.maps.Size(52, 52),
              anchor: new google.maps.Point(26, 26),
            }}
            title={t("live_marker_driver")}
          />
        </GoogleMap>

        <div className="absolute top-2.5 start-2.5 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-background/95 backdrop-blur shadow-md text-[11px] font-bold border border-border group-hover:scale-105 transition pointer-events-none">
          <Maximize2 className="w-3 h-3" />
          {t("tap_to_expand")}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/40 to-transparent" />
      </div>

      {routeError && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 px-2.5 py-1.5 rounded-full">
          <AlertTriangle className="w-3 h-3" />
          {t("route_error")}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {toPickup?.eta && (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            <Clock className="w-3 h-3" />
            {t("eta_to_pickup")}: {toPickup.eta.duration}
          </span>
        )}
        {toDestination?.eta && (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-accent/15 text-accent-foreground">
            <Navigation className="w-3 h-3" />
            {t("eta_to_destination")}: {toDestination.eta.duration}
          </span>
        )}
        <span className="text-[11px] text-muted-foreground ms-auto flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {t("live_updated_ago")}{" "}
          {updatedSecAgo < 60
            ? t("live_seconds_ago", { s: String(updatedSecAgo) })
            : t("live_about_minute_ago")}
        </span>
      </div>

      <LiveTrackingSheet
        open={expanded}
        onOpenChange={setExpanded}
        rideId={rideId}
        destination={destination}
        pickupLocation={pickupLocation}
        pickupLat={pickupLat}
        pickupLng={pickupLng}
        phase={phase}
        driverName={driverName}
      />
    </div>
  );
}
