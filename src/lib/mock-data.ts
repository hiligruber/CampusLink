export interface Ride {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_rating: number;
  origin: string;
  destination: string;
  departure_time: string;
  total_seats: number;
  available_seats: number;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  institution_id: string;
  rating: number;
  avatar_url?: string;
}

export interface Booking {
  id: string;
  ride_id: string;
  passenger_id: string;
  status: "pending" | "confirmed";
}

export const mockUser: User = {
  id: "u1",
  full_name: "Noa Cohen",
  email: "noa.cohen@mta.ac.il",
  institution_id: "MTA-2024-1234",
  rating: 4.7,
};

export const mockRides: Ride[] = [
  {
    id: "r1",
    driver_id: "u2",
    driver_name: "Yoav Levi",
    driver_rating: 4.9,
    origin: "Tel Aviv - Dizengoff Center",
    destination: "MTA College",
    departure_time: "2026-04-11T08:30:00",
    total_seats: 4,
    available_seats: 2,
  },
  {
    id: "r2",
    driver_id: "u3",
    driver_name: "Shira Ben-David",
    driver_rating: 4.5,
    origin: "Ramat Gan - Diamond Exchange",
    destination: "MTA College",
    departure_time: "2026-04-11T09:00:00",
    total_seats: 3,
    available_seats: 1,
  },
  {
    id: "r3",
    driver_id: "u4",
    driver_name: "Omer Tal",
    driver_rating: 4.8,
    origin: "Herzliya - Train Station",
    destination: "MTA College",
    departure_time: "2026-04-11T07:45:00",
    total_seats: 4,
    available_seats: 3,
  },
  {
    id: "r4",
    driver_id: "u5",
    driver_name: "Maya Azoulay",
    driver_rating: 4.6,
    origin: "Petah Tikva - Central",
    destination: "MTA College",
    departure_time: "2026-04-12T08:00:00",
    total_seats: 3,
    available_seats: 2,
  },
  {
    id: "r5",
    driver_id: "u6",
    driver_name: "Eitan Rosen",
    driver_rating: 4.3,
    origin: "Rishon LeZion - HaRishonim",
    destination: "MTA College",
    departure_time: "2026-04-12T10:00:00",
    total_seats: 4,
    available_seats: 4,
  },
];
