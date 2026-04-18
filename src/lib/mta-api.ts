const MTA_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mta-proxy`;

export interface MtaRide {
  id: string;
  user_id: string;
  from_city: string;
  to_campus: string;
  ride_date: string;
  ride_time: string;
  seats: string;
  notes: string;
  created_at: string;
}

export async function fetchRides(): Promise<MtaRide[]> {
  const res = await fetch(`${MTA_BASE_URL}/get_rides.php`);
  if (!res.ok) throw new Error("Failed to fetch rides");
  return res.json();
}

export async function postRide(ride: {
  user_id: string;
  from_city: string;
  to_campus: string;
  ride_date: string;
  ride_time: string;
  seats: number;
  notes?: string;
}): Promise<void> {
  const res = await fetch(`${MTA_BASE_URL}/add_ride.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ride),
  });
  if (!res.ok) throw new Error("Failed to post ride");
}

export async function joinRide(rideId: string, userId: string): Promise<void> {
  const res = await fetch(`${MTA_BASE_URL}/join_ride.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ride_id: rideId, user_id: userId }),
  });
  if (!res.ok) throw new Error("Failed to join ride");
}

/** Convert MTA ride format to the app's Ride interface */
export function mtaRideToAppRide(r: MtaRide): import("@/lib/mock-data").Ride {
  return {
    id: r.id,
    driver_id: r.user_id,
    driver_name: "Student",
    driver_rating: 5.0,
    origin: r.from_city,
    destination: r.to_campus,
    departure_time: `${r.ride_date}T${r.ride_time}`,
    total_seats: parseInt(r.seats) || 1,
    available_seats: parseInt(r.seats) || 1,
  };
}
