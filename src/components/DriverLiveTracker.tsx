import { useEffect, useState, useRef } from "react";
import { GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Navigation, Clock } from "lucide-react";

interface Props {
  rideId: string;
  destination: string;
  height?: string;
  phase?: "scheduled" | "en_route" | "picked_up" | "in_progress" | "completed";
  pickupLocation?: string | null;
}

interface LocationRow {
  ride_id: string;
  lat: number;
  lng: number;
  heading: number | null;
  updated_at: string;
}

const mapContainerStyle = { width: "100%", borderRadius: "1rem" };
const defaultCenter = { lat: 32.0853, lng: 34.7818 };

export default function DriverLiveTracker({ rideId, destination, height = "260px", phase = "scheduled", pickupLocation }: Props) {
  const [location, setLocation] = useState<LocationRow | null>(null);
  const [eta, setEta] = useState<{ duration: string; distance: string } | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const lastEtaCalcRef = useRef(0);

  // Initial fetch + realtime subscription
  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase
        .from("driver_locations")
        .select("*")
        .eq("ride_id", rideId)
        .maybeSingle();
      if (active) {
        setLocation((data as LocationRow) ?? null);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`driver-loc-${rideId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_locations", filter: `ride_id=eq.${rideId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setLocation(null);
            setEta(null);
            setDirections(null);
          } else {
            setLocation(payload.new as LocationRow);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [rideId]);

  // Reset throttle when phase changes (so we recompute toward new target)
  useEffect(() => {
    lastEtaCalcRef.current = 0;
  }, [phase]);

  // Recalculate ETA when location updates (throttled to once per 15s)
  useEffect(() => {
    if (!location || typeof google === "undefined") return;
    const target = phase === "en_route" && pickupLocation ? pickupLocation : destination;
    if (!target) return;
    const now = Date.now();
    if (now - lastEtaCalcRef.current < 15000) return;
    lastEtaCalcRef.current = now;

    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin: { lat: location.lat, lng: location.lng },
        destination: target,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          setDirections(result);
          const leg = result.routes[0]?.legs[0];
          if (leg) {
            setEta({
              duration: leg.duration?.text ?? "",
              distance: leg.distance?.text ?? "",
            });
          }
        }
      }
    );
  }, [location, destination, pickupLocation, phase]);

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
      <div className="bg-secondary/40 rounded-xl p-4 text-center">
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
      <GoogleMap
        mapContainerStyle={{ ...mapContainerStyle, height }}
        center={{ lat: location.lat, lng: location.lng }}
        zoom={14}
        options={{ disableDefaultUI: true, zoomControl: true }}
      >
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{ suppressMarkers: true, polylineOptions: { strokeColor: "#0d8a5c", strokeWeight: 5 } }}
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
    </div>
  );
}
