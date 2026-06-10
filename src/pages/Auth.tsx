import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bus, Mail, Lock, User, Globe, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { useLang } from "@/contexts/LanguageContext";

const Auth = () => {
  const navigate = useNavigate();
  const { t, lang, setLang } = useLang();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const dir = lang === "HE" ? "rtl" : "ltr";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/verify`,
          },
        });
        if (error) throw error;
        toast.success(t("auth_signup_success"));
        navigate("/verify");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("auth_signin_success"));
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={dir} className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center px-4 py-10">
      {/* Decorative gradient blobs — same language as onboarding */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] rounded-full bg-primary/[0.04] blur-3xl pointer-events-none" />

      {/* Language switcher */}
      <div className="absolute top-5 end-5 z-10">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card/80 backdrop-blur-md p-1 shadow-sm">
          <Globe className="w-3.5 h-3.5 text-muted-foreground mx-1.5" />
          <button
            onClick={() => setLang("EN")}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
              lang === "EN" ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang("HE")}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
              lang === "HE" ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            עב
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md space-y-6 relative z-0"
      >
        {/* Logo header — mirrors onboarding step-icon */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">CampusLink</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("auth_tagline")}</p>
          </div>
        </div>

        {/* Form card — same shell as onboarding */}
        <div className="bg-card rounded-3xl border border-border p-7 shadow-lg space-y-5">
          <div className="text-center">
            <h2 className="text-xl font-bold">
              {isSignUp ? t("auth_create_account") : t("auth_welcome_back")}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {isSignUp ? t("auth_signup_subtitle") : t("auth_signin_subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="flex items-center gap-1.5 text-xs font-medium">
                  <User className="w-3.5 h-3.5" /> {t("auth_full_name")}
                </Label>
                <Input
                  id="name"
                  placeholder={t("auth_full_name_ph")}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="rounded-xl h-11"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="flex items-center gap-1.5 text-xs font-medium">
                <Mail className="w-3.5 h-3.5" /> {t("auth_email")}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t("auth_email_ph")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="flex items-center gap-1.5 text-xs font-medium">
                <Lock className="w-3.5 h-3.5" /> {t("auth_password")}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={t("auth_password_ph")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                dir="ltr"
                className="rounded-xl h-11"
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95 text-white font-semibold shadow-md shadow-indigo-500/20 transition-transform hover:-translate-y-0.5"
              disabled={loading}
            >
              {loading ? t("auth_loading") : isSignUp ? t("auth_create_btn") : t("auth_sign_in")}
            </Button>
          </form>

          <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
            {t("auth_terms")}
          </p>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? t("auth_have_account") : t("auth_no_account")}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent hover:underline underline-offset-4"
          >
            {isSignUp ? t("auth_sign_in_link") : t("auth_sign_up_link")}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
