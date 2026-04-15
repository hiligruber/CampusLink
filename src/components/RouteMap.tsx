import { useState, useEffect, useCallback } from "react";
import { GoogleMap, DirectionsRenderer } from "@react-google-maps/api";

interface RouteMapProps {
  origin: string;
  destination: string;
  height?: string;
}

const mapContainerStyle = { width: "100%", borderRadius: "1rem" };
const defaultCenter = { lat: 32.0853, lng: 34.7818 }; // Tel Aviv

export default function RouteMap({ origin, destination, height = "200px" }: RouteMapProps) {
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [duration, setDuration] = useState("");

  const fetchRoute = useCallback(() => {
    if (!origin || !destination) {
      setDirections(null);
      return;
    }
    const service = new google.maps.DirectionsService();
    service.route(
      { origin, destination, travelMode: google.maps.TravelMode.DRIVING },
      (result, status) => {
        if (status === "OK" && result) {
          setDirections(result);
          setDuration(result.routes[0]?.legs[0]?.duration?.text || "");
        }
      }
    );
  }, [origin, destination]);

  useEffect(() => {
    const timeout = setTimeout(fetchRoute, 600);
    return () => clearTimeout(timeout);
  }, [fetchRoute]);

  return (
    <div className="space-y-2">
      <GoogleMap
        mapContainerStyle={{ ...mapContainerStyle, height }}
        center={defaultCenter}
        zoom={10}
        options={{ disableDefaultUI: true, zoomControl: true }}
      >
        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>
      {duration && (
        <p className="text-xs text-muted-foreground text-center">
          🚗 Estimated drive: <span className="font-medium text-foreground">{duration}</span>
        </p>
      )}
    </div>
  );
}
