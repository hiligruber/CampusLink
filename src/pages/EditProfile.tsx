import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, Loader2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const EditProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [music, setMusic] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, hobbies, music_preference, avatar_url")
        .eq("user_id", user.id)
        .single();
      if (!error && data) {
        setFullName(data.full_name || "");
        setHobbies(data.hobbies || "");
        setMusic(data.music_preference || "");
        setAvatarUrl(data.avatar_url || null);
      }
      setLoading(false);
    })();
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("התמונה גדולה מדי (מקסימום 5MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      // Persist immediately so it shows everywhere even before "Save"
      await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("user_id", user.id);
      setAvatarUrl(pub.publicUrl);
      queryClient.invalidateQueries({ queryKey: ["header-profile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("התמונה הועלתה");
    } catch (err: any) {
      console.error("avatar upload failed", err);
      toast.error(err?.message || "העלאה נכשלה");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          hobbies: hobbies || null,
          music_preference: music || null,
          avatar_url: avatarUrl,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("הפרופיל עודכן");
      navigate("/profile");
    } catch (err: any) {
      toast.error(err?.message || "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const initials = (fullName || "?").split(" ").map((n) => n[0]).join("").slice(0, 2);

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="עריכת פרופיל" />
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-lg mx-auto px-4 py-6 space-y-5"
      >
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm flex flex-col items-center">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="profile"
                className="w-24 h-24 rounded-full object-cover border-2 border-primary/20"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition disabled:opacity-50"
              aria-label="החלף תמונה"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3">לחץ על המצלמה להחלפת תמונה</p>
        </div>

        <div className="space-y-4 bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="fullName">שם מלא</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="השם שלך"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hobbies">תחביבים / תחומי עניין</Label>
            <Textarea
              id="hobbies"
              value={hobbies}
              onChange={(e) => setHobbies(e.target.value)}
              placeholder="ספורט, סדרות, טכנולוגיה..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="music">מוזיקה מועדפת / סגנון שיחה בנסיעה</Label>
            <Textarea
              id="music"
              value={music}
              onChange={(e) => setMusic(e.target.value)}
              placeholder="פופ ישראלי, פודקאסטים, אוהב לדבר / שקט..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 h-12 rounded-xl gap-2" onClick={() => navigate("/profile")}>
            <ArrowRight className="w-4 h-4" />
            חזרה
          </Button>
          <Button className="flex-1 h-12 rounded-xl" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "שמור"}
          </Button>
        </div>
      </motion.main>
      <BottomNav />
    </div>
  );
};

export default EditProfile;
