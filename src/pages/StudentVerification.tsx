import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INSTITUTIONS } from "@/lib/institutions";
import { toast } from "sonner";
import { Upload, GraduationCap, Loader2, Clock, XCircle, LogOut } from "lucide-react";
import { motion } from "framer-motion";

const StudentVerification = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [institution, setInstitution] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("verification_status, rejection_reason, institution")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setStatus(data.verification_status);
          setRejectionReason(data.rejection_reason);
          if (data.institution) setInstitution(data.institution);
          if (data.verification_status === "approved") navigate("/", { replace: true });
        }
        setLoading(false);
      });
  }, [user, navigate]);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) return toast.error("נא להעלות קובץ תמונה");
    if (f.size > 5 * 1024 * 1024) return toast.error("קובץ גדול מ-5MB");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!user || !institution || !file) return toast.error("נא למלא את כל הפרטים");
    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/student-id-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("student-ids").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({
          institution,
          student_id_url: path,
          verification_status: "pending_review",
          rejection_reason: null,
        })
        .eq("user_id", user.id);
      if (updErr) throw updErr;
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

  return (
    <div className="min-h-screen bg-background pb-12" dir="rtl">
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto px-4 py-8 space-y-5"
      >
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary mx-auto flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">אימות סטודנט</h1>
          <p className="text-sm text-muted-foreground">
            כדי להשתמש ב-CampusLink, יש לאמת שאתם סטודנטים פעילים
          </p>
        </div>

        {status === "pending_review" ? (
          <div className="bg-card rounded-2xl border border-border p-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-yellow-100 mx-auto flex items-center justify-center">
              <Clock className="w-7 h-7 text-yellow-600" />
            </div>
            <h2 className="text-lg font-bold">הבקשה ממתינה לאישור</h2>
            <p className="text-sm text-muted-foreground">
              הבקשה שלך נשלחה למנהל המערכת. תקבל הודעה במייל ברגע שתאושר.
            </p>
            <p className="text-xs text-muted-foreground">מוסד: {institution}</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            {status === "rejected" && rejectionReason && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex gap-2">
                <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-destructive">הבקשה הקודמת נדחתה</p>
                  <p className="text-muted-foreground text-xs mt-1">{rejectionReason}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>מוסד לימודים</Label>
              <Select value={institution} onValueChange={setInstitution}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר את המוסד שלך" />
                </SelectTrigger>
                <SelectContent>
                  {INSTITUTIONS.map((inst) => (
                    <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>תמונת כרטיס סטודנט</Label>
              <label className="block border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:bg-accent/50 transition">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                {preview ? (
                  <img src={preview} alt="preview" className="max-h-48 mx-auto rounded-lg" />
                ) : (
                  <div className="space-y-1 py-3">
                    <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">לחץ להעלאה (עד 5MB)</p>
                  </div>
                )}
              </label>
            </div>

            <Button onClick={handleSubmit} disabled={submitting} className="w-full rounded-full h-11">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "שלח לאישור"}
            </Button>
          </div>
        )}

        <Button variant="ghost" onClick={() => signOut()} className="w-full gap-2">
          <LogOut className="w-4 h-4" /> התנתק
        </Button>
      </motion.main>
    </div>
  );
};

export default StudentVerification;
