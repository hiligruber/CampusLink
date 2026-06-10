import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/contexts/LanguageContext";
import { Navigation2, MapPin } from "lucide-react";
import { openExternalUrl } from "@/lib/external-navigation";

interface Props {
  rideId: string;
  destination: string;
}

interface Stop {
  key: string;
  label: string;
  sub?: string;
  url: string;
}

const wazeUrl = (opts: { lat?: number | null; lng?: number | null; q?: string }) => {
  if (opts.lat != null && opts.lng != null) {
    return `https://www.waze.com/ul?ll=${opts.lat}%2C${opts.lng}&navigate=yes`;
  }
  return `https://www.waze.com/ul?q=${encodeURIComponent(opts.q ?? "")}&navigate=yes`;
};

export default function DriverStopsWaze({ rideId, destination }: Props) {
  const { t } = useLang();

  const { data: stops = [] } = useQuery<Stop[]>({
    queryKey: ["driver-stops", rideId],
    queryFn: async () => {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, passenger_id, pickup_location, pickup_lat, pickup_lng")
        .eq("ride_id", rideId)
        .eq("status", "accepted");

      const passengerIds = (bookings ?? []).map((b) => b.passenger_id);
      const { data: profiles } = passengerIds.length
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", passengerIds)
        : { data: [] as any[] };

      const pickups: Stop[] = (bookings ?? []).map((b: any, i) => {
        const name = profiles?.find((p: any) => p.user_id === b.passenger_id)?.full_name;
        return {
          key: `p-${b.id}`,
          label: `${String.fromCharCode(65 + i)}. ${name ?? t("passenger_short")}`,
          sub: b.pickup_location ?? undefined,
          url: wazeUrl({ lat: b.pickup_lat, lng: b.pickup_lng, q: b.pickup_location }),
        };
      });

      pickups.push({
        key: "dest",
        label: t("live_marker_destination"),
        sub: destination,
        url: wazeUrl({ q: destination }),
      });

      return pickups;
    },
  });

  if (!stops.length) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {t("navigate_stops")}
      </p>
      <div className="space-y-1.5">
        {stops.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => openExternalUrl(s.url)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/60 hover:bg-secondary transition text-start"
          >
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate">{s.label}</p>
              {s.sub && <p className="text-[11px] text-muted-foreground truncate">{s.sub}</p>}
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full bg-[#33ccff]/15 text-[#0aa] shrink-0">
              <Navigation2 className="w-3 h-3" />
              {t("open_in_waze")}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
