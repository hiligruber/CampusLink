import { useState } from "react";
import { GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { Loader2, Navigation, Clock, Maximize2 } from "lucide-react";
import { useDriverLiveLocation } from "@/hooks/use-driver-live-location";
import LiveTrackingSheet from "./LiveTrackingSheet";

interface Props {
  rideId: string;
  destination: string;
  height?: string;
  phase?: "scheduled" | "en_route" | "picked_up" | "in_progress" | "completed";
  pickupLocation?: string | null;
  driverName?: string;
}

const mapContainerStyle = { width: "100%", borderRadius: "1.25rem" };

export default function DriverLiveTracker({
  rideId,
  destination,
  height = "260px",
  phase = "scheduled",
  pickupLocation,
  driverName,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const { location, eta, directions, loading, pickupLatLng, destinationLatLng } = useDriverLiveLocation({
    rideId,
    destination,
    pickupLocation,
    phase,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        טוען מיקום נהג…
      </div>
    );
  }

  if (!location) {
    const isActivePhase = phase === "en_route" || phase === "picked_up" || phase === "in_progress";
    const headline =
      phase === "completed" ? "הנסיעה הסתיימה"
      : isActivePhase ? "מתחבר למיקום הנהג…"
      : "הנהג עדיין לא יצא לדרך";
    const subline =
      phase === "completed" ? "תודה שנסעת איתנו"
      : isActivePhase ? "הנהג בדרך — מחכים לפיקס GPS ראשון"
      : "ברגע שהנהג ילחץ \"בדרך אליך\" המיקום יעודכן כאן בזמן אמת";
    return (
      <div className="bg-secondary/40 rounded-2xl p-4 text-center">
        {isActivePhase
          ? <Loader2 className="w-6 h-6 mx-auto text-primary/60 mb-2 animate-spin" />
          : <Navigation className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />}
        <p className="text-sm font-semibold">{headline}</p>
        <p className="text-xs text-muted-foreground mt-1">{subline}</p>
      </div>
    );
  }

  const phaseLabel =
    phase === "en_route" ? (pickupLocation ? `הנהג בדרך אליך · ${pickupLocation}` : "הנהג בדרך אליך")
    : phase === "picked_up" ? "הנהג אסף את הנוסעים"
    : phase === "in_progress" ? "בנסיעה ליעד"
    : phase === "completed" ? "הסתיימה"
    : "ממתין ליציאה";

  const etaPrefix = phase === "en_route" ? "מגיע אליך בעוד" : "ETA";
  const updatedSecAgo = Math.floor((Date.now() - new Date(location.updated_at).getTime()) / 1000);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-bold">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          {phaseLabel}
        </span>
        {eta && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
            <Clock className="w-3 h-3" />
            {eta.duration}
          </span>
        )}
      </div>

      {/* Clickable map preview */}
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label="הרחב מפת מעקב"
        className="relative w-full block group rounded-[1.25rem] overflow-hidden ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary"
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
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: true,
                polylineOptions: { strokeColor: "hsl(var(--primary))", strokeWeight: 5, strokeOpacity: 0.9 },
              }}
            />
          )}
          <Marker
            position={{ lat: location.lat, lng: location.lng }}
            icon={{
              url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
                <svg xmlns='http://www.w3.org/2000/svg' width='52' height='52' viewBox='0 0 52 52'>
                  <circle cx='26' cy='26' r='22' fill='#10b981' stroke='#ffffff' stroke-width='3'/>
                  <text x='26' y='34' font-size='26' text-anchor='middle'>🚗</text>
                </svg>
              `),
              scaledSize: new google.maps.Size(52, 52),
              anchor: new google.maps.Point(26, 26),
            }}
            title="הנהג"
          />
        </GoogleMap>

        {/* Expand hint */}
        <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-background/95 backdrop-blur shadow-md text-[11px] font-bold border border-border group-hover:scale-105 transition">
          <Maximize2 className="w-3 h-3" />
          הקש להרחבה
        </div>

        {/* Subtle gradient to lift bottom chips */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/40 to-transparent" />
      </button>

      <div className="flex items-center gap-2 flex-wrap">
        {eta && (
          <>
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
              <Clock className="w-3 h-3" />
              {etaPrefix} {eta.duration}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
              <Navigation className="w-3 h-3" />
              {eta.distance}
            </span>
          </>
        )}
        <span className="text-[11px] text-muted-foreground ml-auto flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          עודכן {updatedSecAgo < 60 ? `לפני ${updatedSecAgo}ש'` : "לפני כדקה"}
        </span>
      </div>

      <LiveTrackingSheet
        open={expanded}
        onOpenChange={setExpanded}
        rideId={rideId}
        destination={destination}
        pickupLocation={pickupLocation}
        phase={phase}
        driverName={driverName}
      />
    </div>
  );
}
