// SPARK AI · BulkEmailModal — compose one (optionally personalized) email and
// send it to many selected clients at once via Resend (clientJourney.bulkEmail).
// Use {{שם}} in the subject/body to insert each client's first name.
import { useState } from "react";
import { Loader2, Mail, Send, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface BulkEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientIds: number[];
  /** Optional trigger context, logged on each sent activity. */
  triggerKey?: string;
  /** Called after a successful send (e.g. to clear the selection). */
  onSent?: () => void;
}

export function BulkEmailModal({
  open,
  onOpenChange,
  clientIds,
  triggerKey,
  onSent,
}: BulkEmailModalProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const bulk = trpc.clientJourney.bulkEmail.useMutation({
    onSuccess: (res) => {
      const parts = [`${res.sent} נשלחו`];
      if (res.skipped > 0) parts.push(`${res.skipped} ללא מייל`);
      if (res.failed > 0) parts.push(`${res.failed} נכשלו`);
      toast.success("מייל מרוכז נשלח", { description: parts.join(" · ") });
      setSubject("");
      setBody("");
      onSent?.();
      onOpenChange(false);
    },
    onError: (err) => toast.error("שגיאה בשליחה", { description: err.message }),
  });

  const canSend = subject.trim().length > 0 && body.trim().length > 0 && clientIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-gold" />
            שליחת מייל ל-{clientIds.length.toLocaleString("he-IL")} לקוחות
          </DialogTitle>
          <DialogDescription>
            השתמשו ב-<code className="text-gold">{"{{שם}}"}</code> כדי לשתול את שם הלקוח.
            לקוחות ללא כתובת מייל ידולגו אוטומטית.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <Label htmlFor="bulk-subject" className="mb-1.5 block">נושא</Label>
            <Input
              id="bulk-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="לדוגמה: עדכון חשוב לתיק שלך, {{שם}}"
              maxLength={200}
            />
          </div>
          <div>
            <Label htmlFor="bulk-body" className="mb-1.5 block">תוכן ההודעה</Label>
            <Textarea
              id="bulk-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder={"שלום {{שם}},\n\n..."}
              maxLength={5000}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={bulk.isPending}>
            <X className="h-4 w-4 ml-1" /> ביטול
          </Button>
          <Button
            onClick={() =>
              bulk.mutate({ clientIds, subject: subject.trim(), body: body.trim(), triggerKey })
            }
            disabled={!canSend || bulk.isPending}
          >
            {bulk.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin ml-1" />
            ) : (
              <Send className="h-4 w-4 ml-1" />
            )}
            שליחה
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
