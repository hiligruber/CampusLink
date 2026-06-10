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
