import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bus, Mail, Lock, User } from "lucide-react";
import { motion } from "framer-motion";

const Auth = () => {
  const navigate = useNavigate();
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
        toast.success("נרשמת בהצלחה! המשך לאימות סטודנט");
        navigate("/verify");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("ברוך הבא!");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm space-y-6"
      >
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary mx-auto flex items-center justify-center">
            <Bus className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">CampusLink</h1>
          <p className="text-sm text-muted-foreground">
            Carpool with fellow MTA students
          </p>
        </div>

        {/* Form */}
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-1.5 text-sm">
                  <User className="w-3.5 h-3.5 text-primary" /> Full Name
                </Label>
                <Input
                  id="name"
                  placeholder="Noa Cohen"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1.5 text-sm">
                <Mail className="w-3.5 h-3.5 text-primary" /> Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@mta.ac.il"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-1.5 text-sm">
                <Lock className="w-3.5 h-3.5 text-primary" /> Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full rounded-full h-11" disabled={loading}>
              {loading ? "..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary font-medium hover:underline"
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
