import { MapPin, Clock, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Ride } from "@/lib/mock-data";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

interface RideCardProps {
  ride: Ride;
  index: number;
}

const RideCard = ({ ride, index }: RideCardProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const departureDate = new Date(ride.departure_time);
  const timeStr = departureDate.toLocaleTimeString("en-IL", { hour: "2-digit", minute: "2-digit" });
  const dateStr = departureDate.toLocaleDateString("en-IL", { weekday: "short", month: "short", day: "numeric" });

  const isOwnRide = user?.id === ride.driver_id;

  const handleJoin = async () => {
    if (!user) return;
    const { error } = await supabase.from("bookings").insert({
      ride_id: ride.id,
      passenger_id: user.id,
    });
    if (error) {
      if (error.code === "23505") {
        toast.error("You already requested this ride");
      } else {
        toast.error("Failed to join ride");
      }
      return;
    }

    // Decrement available seats
    await supabase
      .from("rides")
      .update({ available_seats: ride.available_seats - 1 })
      .eq("id", ride.id);

    queryClient.invalidateQueries({ queryKey: ["rides"] });
    toast.success(`Request sent to ${ride.driver_name}!`, {
      description: `${ride.origin} → ${ride.destination}`,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      className="bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="flex flex-col items-center mt-1">
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <div className="w-0.5 h-8 bg-border" />
          <div className="w-2.5 h-2.5 rounded-full border-2 border-primary bg-card" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{ride.origin}</p>
          <div className="h-4" />
          <p className="text-sm font-semibold text-foreground truncate">{ride.destination}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-muted-foreground text-xs mb-3">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {dateStr} · {timeStr}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {ride.available_seats}/{ride.total_seats} seats
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-accent-foreground">
            {ride.driver_name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{ride.driver_name}</p>
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Star className="w-3 h-3 fill-warning text-warning" />
              {ride.driver_rating}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleJoin}
          disabled={ride.available_seats === 0 || isOwnRide}
          className="rounded-full px-5"
        >
          {isOwnRide ? "Your Ride" : ride.available_seats === 0 ? "Full" : "Join Ride"}
        </Button>
      </div>
    </motion.div>
  );
};

export default RideCard;
