import { mockUser } from "@/lib/mock-data";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Star, Mail, Building2, LogIn, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const Profile = () => {
  const handleSSOLogin = () => {
    toast.info("College SSO login will be integrated here", {
      description: "OAuth2 integration with MTA authentication system",
    });
  };

  const handleCalendarSync = () => {
    toast.info("Google Calendar sync coming soon", {
      description: "Confirmed rides will appear in your calendar",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Profile" />
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-lg mx-auto px-4 py-6 space-y-4"
      >
        {/* Avatar + info */}
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-3">
            <span className="text-2xl font-bold text-primary">
              {mockUser.full_name.split(" ").map((n) => n[0]).join("")}
            </span>
          </div>
          <h2 className="text-lg font-bold text-foreground">{mockUser.full_name}</h2>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
            <Mail className="w-3.5 h-3.5" /> {mockUser.email}
          </p>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
            <Building2 className="w-3.5 h-3.5" /> MTA - Academic College of Tel Aviv-Yaffo
          </p>

          {/* Rating */}
          <div className="mt-4 inline-flex items-center gap-1.5 bg-accent rounded-full px-4 py-1.5">
            <Star className="w-4 h-4 fill-warning text-warning" />
            <span className="text-sm font-semibold text-accent-foreground">
              {mockUser.rating} / 5.0
            </span>
            <span className="text-xs text-muted-foreground ml-1">Reliability</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 h-12 rounded-xl"
            onClick={handleSSOLogin}
          >
            <LogIn className="w-4 h-4 text-primary" />
            Sign in with MTA College SSO
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 h-12 rounded-xl"
            onClick={handleCalendarSync}
          >
            <Calendar className="w-4 h-4 text-primary" />
            Sync with Google Calendar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Rides Given", value: "12" },
            { label: "Rides Taken", value: "8" },
            { label: "CO₂ Saved", value: "24kg" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-card rounded-xl border border-border p-3 text-center"
            >
              <p className="text-xl font-bold text-primary">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.main>
      <BottomNav />
    </div>
  );
};

export default Profile;
