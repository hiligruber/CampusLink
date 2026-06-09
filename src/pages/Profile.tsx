import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVerificationStatus } from "@/hooks/use-verification";
import AppHeader from "@/components/AppHeader";
import AvatarImage from "@/components/AvatarImage";
import BottomNav from "@/components/BottomNav";
import RideHistory from "@/components/RideHistory";
import { Button } from "@/components/ui/button";
import { Star, Mail, Building2, LogOut, Calendar, Loader2, ShieldCheck, UserCog, Music, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useVerificationStatus();
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleCalendarSync = () => {
    window.open("https://calendar.google.com", "_blank");
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <AppHeader title="Profile" />
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-5xl mx-auto px-5 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-5"
      >
        <div className="lg:col-span-1 glass-card rounded-3xl p-6 text-center">
          <AvatarImage
            src={profile?.avatar_url}
            name={profile?.full_name}
            alt="profile"
            className="w-20 h-20 rounded-full mx-auto mb-3 border-2 border-primary/20 text-2xl"
          />
          <h2 className="text-lg font-bold text-foreground">{profile?.full_name || "Student"}</h2>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
            <Mail className="w-3.5 h-3.5" /> {profile?.email || user?.email}
          </p>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
            <Building2 className="w-3.5 h-3.5" /> {profile?.institution || "Academic College"}
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 bg-accent rounded-full px-4 py-1.5">
            <Star className="w-4 h-4 fill-warning text-warning" />
            <span className="text-sm font-semibold text-accent-foreground">
              {profile?.rating ?? 5.0} / 5.0
            </span>
            <span className="text-xs text-muted-foreground ml-1">Reliability</span>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          {(profile?.hobbies || profile?.music_preference) && (
            <div className="glass-card rounded-3xl p-6 space-y-3">
              {profile?.hobbies && (
                <div className="flex items-start gap-2">
                  <Heart className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">תחביבים</p>
                    <p className="text-sm text-foreground">{profile.hobbies}</p>
                  </div>
                </div>
              )}
              {profile?.music_preference && (
                <div className="flex items-start gap-2">
                  <Music className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">מוזיקה / שיחה בנסיעה</p>
                    <p className="text-sm text-foreground">{profile.music_preference}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <RideHistory />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button variant="outline" className="justify-start gap-2 h-12 rounded-2xl" onClick={() => navigate("/profile/edit")}>
              <UserCog className="w-4 h-4 text-primary" />
              עריכת פרופיל
            </Button>
            {isAdmin && (
              <Button variant="outline" className="justify-start gap-2 h-12 rounded-2xl" onClick={() => navigate("/admin")}>
                <ShieldCheck className="w-4 h-4 text-primary" />
                פאנל ניהול
              </Button>
            )}
            <Button variant="outline" className="justify-start gap-2 h-12 rounded-2xl" onClick={handleCalendarSync}>
              <Calendar className="w-4 h-4 text-primary" />
              Google Calendar
            </Button>
            <Button variant="outline" className="justify-start gap-2 h-12 rounded-2xl text-destructive" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </motion.main>
      <BottomNav />
    </div>
  );
};

export default Profile;
