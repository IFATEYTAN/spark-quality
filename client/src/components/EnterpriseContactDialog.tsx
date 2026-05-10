// client/src/components/EnterpriseContactDialog.tsx
// ----------------------------------------------------------------------------
// Modal lead-capture form behind the Enterprise pricing card. POSTs to the
// trpc.billing.requestEnterpriseContact mutation, which emails Anat and pings
// the owner. Form is intentionally simple — name/email/phone are required;
// agency name, client count, and notes are optional.
// ----------------------------------------------------------------------------
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EnterpriseContactDialog({ open, onOpenChange }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [clientCount, setClientCount] = useState("");
  const [notes, setNotes] = useState("");

  const submit = trpc.billing.requestEnterpriseContact.useMutation({
    onSuccess: () => {
      toast.success("הבקשה נשלחה בהצלחה", {
        description: "ענת מצוות SPARK תיצור איתכם קשר תוך יום עסקים.",
      });
      onOpenChange(false);
      // Reset
      setFullName(""); setEmail(""); setPhone("");
      setAgencyName(""); setClientCount(""); setNotes("");
    },
    onError: (err) => {
      toast.error("לא הצלחנו לשלוח את הבקשה", { description: err.message });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      toast.warning("נא למלא שם מלא, אימייל וטלפון");
      return;
    }
    submit.mutate({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      agencyName: agencyName.trim() || undefined,
      clientCount: clientCount.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-[#0E1827] border border-gold/30 text-white" dir="rtl">
        <DialogHeader>
          <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-gradient-to-br from-gold/30 to-gold/10 border border-gold/40 flex items-center justify-center">
            <Mail className="h-7 w-7 text-gold" />
          </div>
          <DialogTitle className="text-center font-display text-2xl">
            תוכנית Enterprise · התאמה אישית
          </DialogTitle>
          <DialogDescription className="text-center text-white/70 pt-1">
            מתאים לסוכנויות גדולות עם דרישות מיוחדות. השאירו פרטים וענת תיצור קשר תוך יום עסקים.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3 mt-2">
          <div>
            <Label htmlFor="ent-name" className="text-white/80 text-sm">שם מלא *</Label>
            <Input
              id="ent-name" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="bg-white/5 border-white/15 text-white" required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ent-email" className="text-white/80 text-sm">אימייל *</Label>
              <Input
                id="ent-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/15 text-white" required dir="ltr"
              />
            </div>
            <div>
              <Label htmlFor="ent-phone" className="text-white/80 text-sm">טלפון *</Label>
              <Input
                id="ent-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="bg-white/5 border-white/15 text-white" required dir="ltr"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ent-agency" className="text-white/80 text-sm">שם הסוכנות</Label>
              <Input
                id="ent-agency" value={agencyName} onChange={(e) => setAgencyName(e.target.value)}
                className="bg-white/5 border-white/15 text-white"
              />
            </div>
            <div>
              <Label htmlFor="ent-count" className="text-white/80 text-sm">כמות לקוחות משוערת</Label>
              <Input
                id="ent-count" value={clientCount} onChange={(e) => setClientCount(e.target.value)}
                placeholder="למשל: 5,000"
                className="bg-white/5 border-white/15 text-white"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="ent-notes" className="text-white/80 text-sm">הערות / צרכים מיוחדים</Label>
            <Textarea
              id="ent-notes" value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={3} className="bg-white/5 border-white/15 text-white"
              placeholder="אינטגרציות, SLA, ריבוי-משתמשים, פיצ'רים מיוחדים..."
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button" variant="outline" onClick={() => onOpenChange(false)}
              className="flex-1 border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              ביטול
            </Button>
            <Button
              type="submit" disabled={submit.isPending}
              className="flex-1 bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] hover:scale-[1.01] font-bold disabled:opacity-50"
            >
              {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "שליחת הבקשה"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
