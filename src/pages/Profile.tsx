import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVerificationStatus } from "@/hooks/use-verification";
import AppHeader from "@/components/AppHeader";
import AvatarImage from "@/components/AvatarImage";
import BottomNav from "@/components/BottomNav";
import RideHistory from "@/components/RideHistory";
import { Button } from "@/components/ui/button";
import { Star, Mail, Building2, LogOut, Calendar, Loader2, ShieldCheck, UserCog, Music, Heart, Settings as SettingsIcon } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useLang } from "@/contexts/LanguageContext";

const Profile = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useVerificationStatus();
  const navigate = useNavigate();
  const { t } = useLang();

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
      <AppHeader subtitle={t("profile_title")} />
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-5xl mx-auto px-5 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Sticky-style profile column */}
        <div className="lg:col-span-1">
          <div className="relative glass-card rounded-3xl p-7 text-center overflow-hidden">
            <div className="absolute -top-16 -right-10 w-44 h-44 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-10 w-52 h-52 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="avatar-ring inline-block">
                <div className="w-28 h-28 rounded-full bg-card overflow-hidden border-2 border-card">
                  <AvatarImage
                    src={profile?.avatar_url}
                    name={profile?.full_name}
                    alt={profile?.full_name || "profile"}
                    className="w-full h-full text-3xl"
                  />
                </div>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight mt-4">
                {profile?.full_name || "Student"}
              </h2>
              <div className="mt-3 space-y-1.5">
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {profile?.email || user?.email}
                </p>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> {profile?.institution || "Academic College"}
                </p>
              </div>
              <div className="mt-5 inline-flex items-center gap-2 bg-gradient-to-r from-primary to-accent rounded-full px-4 py-2 shadow-pop">
                <Star className="w-4 h-4 fill-white text-white" />
                <span className="text-sm font-bold text-white">
                  {Number(profile?.rating ?? 5.0).toFixed(1)} / 5.0
                </span>
                <span className="text-[10px] uppercase tracking-wider text-white/80 font-bold ml-1">
                  {t("reliability")}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          {(profile?.hobbies || profile?.music_preference) && (
            <div className="glass-card rounded-3xl p-6 space-y-4">
              {profile?.hobbies && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Heart className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("hobbies")}</p>
                    <p className="text-sm text-foreground font-medium mt-0.5">{profile.hobbies}</p>
                  </div>
                </div>
              )}
              {profile?.music_preference && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <Music className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("music_pref")}</p>
                    <p className="text-sm text-foreground font-medium mt-0.5">{profile.music_preference}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <RideHistory />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button variant="outline" className="justify-start gap-2 h-12 rounded-2xl" onClick={() => navigate("/profile/edit")}>
              <UserCog className="w-4 h-4 text-primary" /> {t("edit_profile")}
            </Button>
            <Button variant="outline" className="justify-start gap-2 h-12 rounded-2xl" onClick={() => navigate("/settings")}>
              <SettingsIcon className="w-4 h-4 text-primary" /> {t("settings_title")}
            </Button>
            {isAdmin && (
              <Button variant="outline" className="justify-start gap-2 h-12 rounded-2xl" onClick={() => navigate("/admin")}>
                <ShieldCheck className="w-4 h-4 text-primary" /> {t("admin_panel")}
              </Button>
            )}
            <Button variant="outline" className="justify-start gap-2 h-12 rounded-2xl" onClick={handleCalendarSync}>
              <Calendar className="w-4 h-4 text-primary" /> Google Calendar
            </Button>
            <Button variant="outline" className="justify-start gap-2 h-12 rounded-2xl text-destructive sm:col-span-2" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" /> {t("sign_out")}
            </Button>
          </div>
        </div>
      </motion.main>
      <BottomNav />
    </div>
  );
};

export default Profile;
