import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVerificationStatus } from "@/hooks/use-verification";
import AppHeader from "@/components/AppHeader";
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
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Profile" />
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-lg mx-auto px-4 py-6 space-y-4"
      >
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm text-center">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="profile"
              className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-2 border-primary/20"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-3">
              <span className="text-2xl font-bold text-primary">
                {(profile?.full_name || "?").split(" ").map((n: string) => n[0]).join("")}
              </span>
            </div>
          )}
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

        {(profile?.hobbies || profile?.music_preference) && (
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-3">
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

        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start gap-2 h-12 rounded-xl" onClick={() => navigate("/profile/edit")}>
            <UserCog className="w-4 h-4 text-primary" />
            עריכת פרופיל
          </Button>
          {isAdmin && (
            <Button variant="outline" className="w-full justify-start gap-2 h-12 rounded-xl" onClick={() => navigate("/admin")}>
              <ShieldCheck className="w-4 h-4 text-primary" />
              פאנל ניהול - אימות סטודנטים
            </Button>
          )}
          <Button variant="outline" className="w-full justify-start gap-2 h-12 rounded-xl" onClick={handleCalendarSync}>
            <Calendar className="w-4 h-4 text-primary" />
            Sync with Google Calendar
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2 h-12 rounded-xl text-destructive" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </motion.main>
      <BottomNav />
    </div>
  );
};

export default Profile;
