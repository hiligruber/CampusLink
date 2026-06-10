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
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 py-10 overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-80 h-80 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-pink-400/20 blur-3xl" />

      {/* Language switcher */}
      <div className="absolute top-5 end-5 z-10">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card/70 backdrop-blur-md p-1 shadow-sm">
          <Globe className="w-3.5 h-3.5 text-muted-foreground mx-1.5" />
          <button
            onClick={() => setLang("EN")}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
              lang === "EN" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang("HE")}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
              lang === "HE" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            עב
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm space-y-7 relative z-[1]"
      >
        {/* Logo */}
        <div className="text-center space-y-3">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-pink-500 mx-auto flex items-center justify-center shadow-lg shadow-primary/30"
          >
            <Bus className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
              CampusLink
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t("auth_tagline")}</p>
          </div>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card/80 backdrop-blur-xl rounded-3xl border border-border/60 p-6 shadow-xl shadow-primary/5"
        >
          <div className="mb-5 text-center">
            <h2 className="text-xl font-bold text-foreground">
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
                  <User className="w-3.5 h-3.5 text-primary" /> {t("auth_full_name")}
                </Label>
                <Input
                  id="name"
                  placeholder={t("auth_full_name_ph")}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="rounded-xl h-11 bg-background/60"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="flex items-center gap-1.5 text-xs font-medium">
                <Mail className="w-3.5 h-3.5 text-primary" /> {t("auth_email")}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t("auth_email_ph")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl h-11 bg-background/60"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="flex items-center gap-1.5 text-xs font-medium">
                <Lock className="w-3.5 h-3.5 text-primary" /> {t("auth_password")}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={t("auth_password_ph")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="rounded-xl h-11 bg-background/60"
                dir="ltr"
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-full h-11 bg-gradient-to-r from-primary to-pink-500 hover:opacity-90 shadow-lg shadow-primary/20 font-semibold"
              disabled={loading}
            >
              {loading ? t("auth_loading") : isSignUp ? t("auth_create_btn") : t("auth_sign_in")}
            </Button>
          </form>

          <p className="text-[11px] text-center text-muted-foreground mt-4 leading-relaxed">
            {t("auth_terms")}
          </p>
        </motion.div>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? t("auth_have_account") : t("auth_no_account")}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary font-semibold hover:underline"
          >
            {isSignUp ? t("auth_sign_in_link") : t("auth_sign_up_link")}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
