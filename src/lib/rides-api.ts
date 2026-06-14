import { supabase } from "@/integrations/supabase/client";

export type RidePhase = "scheduled" | "en_route" | "picked_up" | "in_progress" | "completed";

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
  ride_phase?: RidePhase;
  started_at?: string | null;
  completed_at?: string | null;
}

export type RideDisplayStatus = "active" | "cancelled" | "completed";

export const getDisplayStatus = (r: RideRow): RideDisplayStatus => {
  if (r.status === "cancelled") return "cancelled";
  if (r.ride_phase === "completed") return "completed";
  if (new Date(r.departure_time).getTime() < Date.now() - 6 * 60 * 60 * 1000) return "completed";
  return "active";
};

/** Hide rides that ended more than 2 days ago. */
export const isRecentlyVisible = (r: RideRow): boolean => {
  const status = getDisplayStatus(r);
  if (status === "active") return true;
  const ref = r.completed_at
    ? new Date(r.completed_at).getTime()
    : new Date(r.departure_time).getTime();
  const ageMs = Date.now() - ref;
  return ageMs < 2 * 24 * 60 * 60 * 1000;
};

export async function fetchRides(): Promise<RideRow[]> {
  const { data, error } = await supabase
    .from("rides")
    .select("*")
    .order("departure_time", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as RideRow[]).filter(isRecentlyVisible);
}

export async function postRide(input: {
  driver_id: string;
  driver_name: string;
  origin: string;
  destination: string;
  departure_time: string;
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

export async function joinRide(
  rideId: string,
  passengerId: string,
  pickupLocation?: string,
  pickupCoords?: { lat: number | null; lng: number | null },
) {
  const { error } = await supabase.from("bookings").insert({
    ride_id: rideId,
    passenger_id: passengerId,
    status: "pending",
    pickup_location: pickupLocation ?? null,
    pickup_lat: pickupCoords?.lat ?? null,
    pickup_lng: pickupCoords?.lng ?? null,
  } as any);
  if (error) throw error;
}

export async function cancelBooking(bookingId: string) {
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);
  if (error) throw error;
}

export interface MyBooking {
  id: string;
  ride_id: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
}

export async function fetchMyBookings(userId: string): Promise<MyBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, ride_id, status")
    .eq("passenger_id", userId)
    .in("status", ["pending", "accepted"]);
  if (error) throw error;
  return (data ?? []) as MyBooking[];
}

export async function setRidePhase(rideId: string, phase: RidePhase) {
  const updates: Record<string, any> = { ride_phase: phase };
  if (phase === "in_progress") updates.started_at = new Date().toISOString();
  if (phase === "completed") updates.completed_at = new Date().toISOString();
  const { error } = await supabase
    .from("rides")
    .update(updates as any)
    .eq("id", rideId);
  if (error) throw error;
}
