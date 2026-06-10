import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVerificationStatus } from "@/hooks/use-verification";
import { Navigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, CheckCircle2, XCircle, Mail, Building2, ShieldCheck, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AdminSupportSection from "@/components/AdminSupportSection";

const Admin = () => {
  const { user } = useAuth();
  const { isAdmin, loading } = useVerificationStatus();
  const qc = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);

  const { data: pending, isLoading } = useQuery({
    queryKey: ["pending-verifications"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pending_verifications");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage.from("student-ids").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const approve = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ verification_status: "approved", verified_at: new Date().toISOString(), rejection_reason: null })
      .eq("user_id", userId);
    if (error) return toast.error(error.message);
    toast.success("הסטודנט אושר");
    qc.invalidateQueries({ queryKey: ["pending-verifications"] });
  };

  const reject = async () => {
    if (!rejectingId || !reason.trim()) return;
    const { error } = await supabase
      .from("profiles")
      .update({ verification_status: "rejected", rejection_reason: reason })
      .eq("user_id", rejectingId);
    if (error) return toast.error(error.message);
    toast.success("הבקשה נדחתה");
    setRejectingId(null);
    setReason("");
    qc.invalidateQueries({ queryKey: ["pending-verifications"] });
  };

  const { data: admins = [], isLoading: adminsLoading } = useQuery({
    queryKey: ["admins"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (error) throw error;
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [] as Array<{ user_id: string; full_name: string | null; email: string | null }>;
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", ids);
      return (profs ?? []) as Array<{ user_id: string; full_name: string | null; email: string | null }>;
    },
    enabled: !!isAdmin,
  });

  const addAdmin = async () => {
    const email = newAdminEmail.trim().toLowerCase();
    if (!email) return;
    setAddingAdmin(true);
    try {
      const { data: prof, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, email")
        .ilike("email", email)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!prof) {
        toast.error("לא נמצא משתמש עם המייל הזה");
        return;
      }
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: prof.user_id, role: "admin" });
      if (error) {
        if (String(error.message).includes("duplicate")) {
          toast.message("המשתמש כבר מנהל");
        } else {
          throw error;
        }
      } else {
        toast.success("המשתמש מונה למנהל");
      }
      setNewAdminEmail("");
      qc.invalidateQueries({ queryKey: ["admins"] });
    } catch (e: any) {
      toast.error(e?.message || "פעולה נכשלה");
    } finally {
      setAddingAdmin(false);
    }
  };

  const removeAdmin = async (userId: string) => {
    if (userId === user?.id) {
      toast.error("לא ניתן להסיר את עצמך");
      return;
    }
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "admin");
    if (error) return toast.error(error.message);
    toast.success("הרשאת המנהל הוסרה");
    qc.invalidateQueries({ queryKey: ["admins"] });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      <AppHeader title="ניהול - אימות סטודנטים" />
      <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : pending && pending.length > 0 ? (
          pending.map((p) => (
            <div key={p.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div>
                <h3 className="font-bold">{p.full_name || "ללא שם"}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Mail className="w-3 h-3" />{p.email}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" />{p.institution}</p>
              </div>
              {p.student_id_url && (
                <Button variant="outline" size="sm" onClick={() => getSignedUrl(p.student_id_url!)} className="w-full">
                  צפה בכרטיס סטודנט
                </Button>
              )}
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 gap-1" onClick={() => approve(p.user_id)}>
                  <CheckCircle2 className="w-4 h-4" />אשר
                </Button>
                <Button size="sm" variant="destructive" className="flex-1 gap-1" onClick={() => setRejectingId(p.user_id)}>
                  <XCircle className="w-4 h-4" />דחה
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 text-muted-foreground text-sm">אין בקשות ממתינות</div>
        )}

        <div className="bg-card rounded-2xl border border-border p-4 space-y-3 mt-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="font-bold">ניהול מנהלים</h2>
          </div>

          <div className="space-y-2">
            {adminsLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
            ) : admins.length === 0 ? (
              <p className="text-xs text-muted-foreground">אין מנהלים רשומים</p>
            ) : (
              admins.map((a) => (
                <div key={a.user_id} className="flex items-center justify-between gap-2 bg-secondary/40 rounded-xl p-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{a.full_name || "ללא שם"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{a.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive gap-1"
                    onClick={() => removeAdmin(a.user_id)}
                    disabled={a.user_id === user?.id}
                    title={a.user_id === user?.id ? "לא ניתן להסיר את עצמך" : "הסר מנהל"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">הוסף מנהל לפי מייל</p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="student@example.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="flex-1"
                dir="ltr"
              />
              <Button onClick={addAdmin} disabled={addingAdmin || !newAdminEmail.trim()} className="gap-1">
                {addingAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                הוסף
              </Button>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />

      <Dialog open={!!rejectingId} onOpenChange={(o) => !o && setRejectingId(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>סיבת דחייה</DialogTitle></DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="הסבר למה הבקשה נדחית..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)}>ביטול</Button>
            <Button variant="destructive" onClick={reject} disabled={!reason.trim()}>דחה בקשה</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
