import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { MapPin, Calendar, Clock, Users } from "lucide-react";
import { motion } from "framer-motion";

const PostRide = () => {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("MTA College");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [seats, setSeats] = useState("3");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !date || !time) {
      toast.error("Please fill in all required fields");
      return;
    }
    toast.success("Ride posted successfully!", {
      description: `${origin} → ${destination}`,
    });
    setOrigin("");
    setDate("");
    setTime("");
    setSeats("3");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Post a Ride" />
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-lg mx-auto px-4 py-6"
      >
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <p className="text-sm text-muted-foreground mb-5">
            Offer a ride to fellow students heading to campus.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="origin" className="flex items-center gap-1.5 text-sm font-medium">
                <MapPin className="w-3.5 h-3.5 text-primary" /> Origin
              </Label>
              <Input
                id="origin"
                placeholder="e.g. Tel Aviv - Dizengoff Center"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination" className="flex items-center gap-1.5 text-sm font-medium">
                <MapPin className="w-3.5 h-3.5 text-primary" /> Destination
              </Label>
              <Input
                id="destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-1.5 text-sm font-medium">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-1.5 text-sm font-medium">
                  <Clock className="w-3.5 h-3.5 text-primary" /> Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seats" className="flex items-center gap-1.5 text-sm font-medium">
                <Users className="w-3.5 h-3.5 text-primary" /> Available Seats
              </Label>
              <Input
                id="seats"
                type="number"
                min="1"
                max="6"
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full rounded-full h-11 text-sm font-semibold">
              Post Ride
            </Button>
          </form>
        </div>

        {/* Google Maps placeholder */}
        <div className="mt-4 bg-accent/50 rounded-2xl border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">
            🗺️ Google Maps route preview coming soon
          </p>
        </div>
      </motion.main>
      <BottomNav />
    </div>
  );
};

export default PostRide;
