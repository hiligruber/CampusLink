import { supabase } from "@/integrations/supabase/client";

export interface RideRow {
  id: string;
  driver_id: string;
  driver_name: string;
  origin: string;
  destination: string;
  departure_time: string;
  total_seats: number;
  available_seats: number;
  notes: string | null;
  status: "active" | "cancelled";
  created_at: string;
}

export type RideDisplayStatus = "active" | "cancelled" | "completed";

export const getDisplayStatus = (r: RideRow): RideDisplayStatus => {
  if (r.status === "cancelled") return "cancelled";
  if (new Date(r.departure_time).getTime() < Date.now()) return "completed";
  return "active";
};

export async function fetchRides(): Promise<RideRow[]> {
  const { data, error } = await supabase
    .from("rides")
    .select("*")
    .order("departure_time", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RideRow[];
}

export async function postRide(input: {
  driver_id: string;
  driver_name: string;
  origin: string;
  destination: string;
  departure_time: string; // ISO
  total_seats: number;
  notes?: string;
}) {
  const { error } = await supabase.from("rides").insert({
    driver_id: input.driver_id,
    driver_name: input.driver_name,
    origin: input.origin,
    destination: input.destination,
    departure_time: input.departure_time,
    total_seats: input.total_seats,
    available_seats: input.total_seats,
    notes: input.notes ?? null,
  });
  if (error) throw error;
}

export async function cancelRide(rideId: string) {
  const { error } = await supabase
    .from("rides")
    .update({ status: "cancelled" })
    .eq("id", rideId);
  if (error) throw error;
}

export async function joinRide(rideId: string, passengerId: string) {
  const { error } = await supabase.from("bookings").insert({
    ride_id: rideId,
    passenger_id: passengerId,
    status: "pending",
  });
  if (error) throw error;
}
