import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { MapPin, Calendar, Clock, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { postRide } from "@/lib/rides-api";
import { supabase } from "@/integrations/supabase/client";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import RouteMap from "@/components/RouteMap";
import { useLang } from "@/contexts/LanguageContext";

const PostRide = () => {
  const { user } = useAuth();
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [seats, setSeats] = useState("3");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [driverName, setDriverName] = useState("Student");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setDriverName(data.full_name);
      });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !date || !time || !user) {
      toast.error("Please fill in all required fields");
      return;
    }
    setLoading(true);

    try {
      await postRide({
        driver_id: user.id,
        driver_name: driverName,
        origin,
        destination,
        departure_time: new Date(`${date}T${time}`).toISOString(),
        total_seats: parseInt(seats),
        notes: notes || undefined,
      });
      toast.success("Ride posted successfully!", { description: `${origin} → ${destination}` });
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      setOrigin("");
      setDate("");
      setTime("");
      setSeats("3");
      setNotes("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to post ride");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader subtitle={t("post_a_ride")} />
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-lg mx-auto px-4 py-6"
      >
        <div className="bg-card rounded-2xl border border-border p-5 shadow-card">
          <p className="text-sm text-muted-foreground mb-5">
            {t("post_intro")}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="origin" className="flex items-center gap-1.5 text-sm font-medium">
                <MapPin className="w-3.5 h-3.5 text-primary" /> {t("origin")}
              </Label>
              <PlacesAutocomplete id="origin" placeholder="" value={origin} onChange={setOrigin} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination" className="flex items-center gap-1.5 text-sm font-medium">
                <MapPin className="w-3.5 h-3.5 text-accent" /> {t("destination")}
              </Label>
              <PlacesAutocomplete id="destination" placeholder="" value={destination} onChange={setDestination} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-1.5 text-sm font-medium">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> {t("date")}
                </Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-1.5 text-sm font-medium">
                  <Clock className="w-3.5 h-3.5 text-primary" /> {t("time")}
                </Label>
                <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="seats" className="flex items-center gap-1.5 text-sm font-medium">
                <Users className="w-3.5 h-3.5 text-primary" /> {t("available_seats")}
              </Label>
              <Input id="seats" type="number" min="1" max="6" value={seats} onChange={(e) => setSeats(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-1.5 text-sm font-medium">
                {t("notes_opt")}
              </Label>
              <Input id="notes" placeholder="" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button type="submit" className="w-full rounded-full h-11 text-sm font-semibold" disabled={loading}>
              {loading ? t("posting") : t("post_ride")}
            </Button>
          </form>
        </div>

        <div className="mt-4">
          <RouteMap origin={origin} destination={destination} height="220px" />
        </div>
      </motion.main>
      <BottomNav />
    </div>
  );
};

export default PostRide;
