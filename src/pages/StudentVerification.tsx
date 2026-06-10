import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INSTITUTIONS } from "@/lib/institutions";
import { toast } from "sonner";
import {
  Upload,
  GraduationCap,
  Loader2,
  Clock,
  XCircle,
  LogOut,
  AtSign,
  Sparkles,
  Music,
  IdCard,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const INTEREST_SUGGESTIONS = [
  "ספורט",
  "טכנולוגיה",
  "סרטים",
  "לימודים",
  "מסיבות",
  "טיולים",
  "אוכל",
  "גיימינג",
  "ספרים",
  "אומנות",
  "צילום",
  "כושר",
  "יוגה",
  "טבע",
];

const MUSIC_SUGGESTIONS = [
  "פופ",
  "היפ הופ",
  "אלקטרונית",
  "מוזיקה ישראלית",
  "רוק",
  "אינדי",
  "ג'אז",
  "קלאסית",
  "R&B",
  "רגאיי",
  "מטאל",
  "לטינית",
];

const TOTAL_STEPS = 4;

const StudentVerification = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [status, setStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [institution, setInstitution] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [music, setMusic] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .rpc("get_my_profile")
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setStatus(data.verification_status);
          setRejectionReason(data.rejection_reason);
          if (data.institution) setInstitution(data.institution);
          if (data.username) setUsername(data.username);
          if (data.hobbies)
            setInterests(
              String(data.hobbies)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            );
          if (data.music_preference)
            setMusic(
              String(data.music_preference)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            );
          if (data.verification_status === "approved")
            navigate("/", { replace: true });
        }
        setLoading(false);
      });
  }, [user, navigate]);

  const toggle = (list: string[], setList: (v: string[]) => void, v: string) => {
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  };

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) return toast.error("נא להעלות קובץ תמונה");
    if (f.size > 5 * 1024 * 1024) return toast.error("קובץ גדול מ-5MB");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const canNext = () => {
    if (step === 1) return username.trim().length >= 3;
    if (step === 2) return !!institution;
    if (step === 3) return interests.length > 0 || music.length > 0;
    if (step === 4) return !!file;
    return false;
  };

  const handleSubmit = async () => {
    if (!user || !institution || !file || !username.trim())
      return toast.error("נא למלא את כל הפרטים");
    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/student-id-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("student-ids")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({
          username: username.trim(),
          institution,
          hobbies: interests.join(", "),
          music_preference: music.join(", "),
          student_id_url: path,
          verification_status: "pending_review",
          rejection_reason: null,
        })
        .eq("user_id", user.id);
      if (updErr) {
        if (updErr.message.includes("username"))
          throw new Error("שם המשתמש כבר תפוס, נסה אחר");
        throw updErr;
      }
      setStatus("pending_review");
      toast.success("הבקשה נשלחה לאישור מנהל המערכת");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // ── Pending confirmation screen ───────────────────────────────
  if (status === "pending_review") {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center px-4" dir="rtl">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="w-full max-w-md bg-card rounded-3xl border border-border p-8 text-center space-y-5 shadow-lg"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 mx-auto flex items-center justify-center">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold">בקשת ההצטרפות שלך ממתינה לאישור מנהל</h2>
          <p className="text-sm text-muted-foreground">
            ברגע שמנהל יאשר את הבקשה, תקבל גישה מלאה ל-CampusLink. נשלח לך הודעה במייל.
          </p>
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-xl p-3 space-y-1">
            <div>שם משתמש: <span className="font-semibold">@{username}</span></div>
            <div>מוסד: <span className="font-semibold">{institution}</span></div>
          </div>
          <Button variant="outline" onClick={signOut} className="w-full rounded-full">
            <LogOut className="w-4 h-4 ml-2" /> התנתק
          </Button>
        </motion.div>
      </div>
    );
  }

  const stepMeta = [
    { icon: AtSign, title: "בחר שם משתמש", sub: "כך אחרים יזהו אותך" },
    { icon: GraduationCap, title: "מוסד הלימודים", sub: "מאיזה קמפוס אתה?" },
    { icon: Sparkles, title: "תחביבים ומוזיקה", sub: "ספר לנו מה אתה אוהב" },
    { icon: IdCard, title: "אימות סטודנט", sub: "העלה תמונת תעודת סטודנט" },
  ][step - 1];

  const StepIcon = stepMeta.icon;

  return (
    <div className="min-h-screen bg-background pb-12 relative overflow-hidden" dir="rtl">
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto px-4 py-8 space-y-6 relative z-10"
      >
        {/* Progress */}
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < step ? "bg-gradient-to-r from-indigo-600 to-violet-600" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 mx-auto flex items-center justify-center">
            <StepIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">{stepMeta.title}</h1>
          <p className="text-sm text-muted-foreground">{stepMeta.sub}</p>
          <p className="text-xs text-muted-foreground">שלב {step} מתוך {TOTAL_STEPS}</p>
        </div>

        {status === "rejected" && rejectionReason && step === 1 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex gap-2">
            <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-destructive">הבקשה הקודמת נדחתה</p>
              <p className="text-muted-foreground text-xs mt-1">{rejectionReason}</p>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-card rounded-2xl border border-border p-5 space-y-4"
          >
            {step === 1 && (
              <div className="space-y-2">
                <Label>שם משתמש</Label>
                <div className="relative">
                  <AtSign className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase())
                    }
                    placeholder="your_handle"
                    className="pr-9"
                    maxLength={24}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  3-24 תווים, אותיות באנגלית, מספרים, נקודה או קו תחתון.
                </p>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-2">
                <Label>מוסד לימודים</Label>
                <Select value={institution} onValueChange={setInstitution}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מוסד" />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTITUTIONS.map((inst) => (
                      <SelectItem key={inst} value={inst}>
                        {inst}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary" /> תחביבים
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_SUGGESTIONS.map((tag) => {
                      const on = interests.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggle(interests, setInterests, tag)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                            on
                              ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent shadow-sm scale-105"
                              : "bg-muted/40 border-border hover:bg-muted"
                          }`}
                        >
                          {on && <Check className="w-3 h-3 inline ml-1" />}
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Music className="w-4 h-4 text-primary" /> ז'אנרים מועדפים
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {MUSIC_SUGGESTIONS.map((tag) => {
                      const on = music.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggle(music, setMusic, tag)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                            on
                              ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent shadow-sm scale-105"
                              : "bg-muted/40 border-border hover:bg-muted"
                          }`}
                        >
                          {on && <Check className="w-3 h-3 inline ml-1" />}
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <Label>תעודת סטודנט</Label>
                <label
                  htmlFor="student-id"
                  className="block border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  {preview ? (
                    <img
                      src={preview}
                      alt="תצוגה מקדימה"
                      className="max-h-56 mx-auto rounded-lg"
                    />
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        לחץ להעלאת תמונה של תעודת הסטודנט
                      </p>
                      <p className="text-xs text-muted-foreground">JPG, PNG עד 5MB</p>
                    </div>
                  )}
                  <input
                    id="student-id"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </label>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Nav */}
        <div className="flex items-center gap-2">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-full"
            >
              <ChevronRight className="w-4 h-4 ml-1" /> חזרה
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className="rounded-full flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95"
            >
              המשך <ChevronLeft className="w-4 h-4 mr-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canNext() || submitting}
              className="rounded-full flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>שלח לאישור <Check className="w-4 h-4 mr-1" /></>
              )}
            </Button>
          )}
        </div>

        <button
          onClick={signOut}
          className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
        >
          <LogOut className="w-3 h-3" /> התנתק
        </button>
      </motion.main>
    </div>
  );
};

export default StudentVerification;
