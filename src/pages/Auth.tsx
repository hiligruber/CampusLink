import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bus, Mail, Lock, User, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { useLang } from "@/contexts/LanguageContext";
import authHero from "@/assets/auth-hero.jpg";

const Auth = () => {
  const navigate = useNavigate();
  const { t, lang, setLang } = useLang();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 py-10 overflow-hidden">
      {/* Hero background image */}
      <div className="absolute inset-0 -z-10">
        <img
          src={authHero}
          alt="Students on campus"
          className="w-full h-full object-cover"
        />
        {/* Elegant dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/60 to-slate-950/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,6,23,0.55)_100%)]" />
      </div>

      {/* Language switcher */}
      <div className="absolute top-5 end-5 z-10">
        <div className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 backdrop-blur-xl p-1 shadow-lg">
          <Globe className="w-3.5 h-3.5 text-white/80 mx-1.5" />
          <button
            onClick={() => setLang("EN")}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
              lang === "EN" ? "bg-white text-slate-900 shadow" : "text-white/80 hover:text-white"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang("HE")}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
              lang === "HE" ? "bg-white text-slate-900 shadow" : "text-white/80 hover:text-white"
            }`}
          >
            עב
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-sm space-y-6 relative"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="text-center space-y-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/25 mx-auto flex items-center justify-center shadow-2xl">
            <Bus className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">
              CampusLink
            </h1>
            <p className="text-sm text-white/80 mt-1 drop-shadow">{t("auth_tagline")}</p>
          </div>
        </motion.div>

        {/* Glass Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.55 }}
          className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-2xl p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
        >
          <div className="mb-5 text-center">
            <h2 className="text-xl font-bold text-white">
              {isSignUp ? t("auth_create_account") : t("auth_welcome_back")}
            </h2>
            <p className="text-xs text-white/75 mt-1">
              {isSignUp ? t("auth_signup_subtitle") : t("auth_signin_subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="flex items-center gap-1.5 text-xs font-medium text-white/90">
                  <User className="w-3.5 h-3.5" /> {t("auth_full_name")}
                </Label>
                <Input
                  id="name"
                  placeholder={t("auth_full_name_ph")}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="rounded-xl h-11 bg-white/15 border-white/25 text-white placeholder:text-white/50 focus-visible:ring-white/40"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="flex items-center gap-1.5 text-xs font-medium text-white/90">
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
                className="rounded-xl h-11 bg-white/15 border-white/25 text-white placeholder:text-white/50 focus-visible:ring-white/40"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="flex items-center gap-1.5 text-xs font-medium text-white/90">
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
                className="rounded-xl h-11 bg-white/15 border-white/25 text-white placeholder:text-white/50 focus-visible:ring-white/40"
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-full h-11 bg-white text-slate-900 hover:bg-white/90 font-semibold shadow-lg transition-transform hover:-translate-y-0.5"
              disabled={loading}
            >
              {loading ? t("auth_loading") : isSignUp ? t("auth_create_btn") : t("auth_sign_in")}
            </Button>
          </form>

          <p className="text-[11px] text-center text-white/60 mt-4 leading-relaxed">
            {t("auth_terms")}
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-sm text-white/85"
        >
          {isSignUp ? t("auth_have_account") : t("auth_no_account")}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-white font-semibold underline-offset-4 hover:underline"
          >
            {isSignUp ? t("auth_sign_in_link") : t("auth_sign_up_link")}
          </button>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Auth;
