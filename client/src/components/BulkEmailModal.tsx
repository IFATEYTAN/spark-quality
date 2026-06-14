// SPARK AI · BulkEmailModal — compose one (optionally personalized) email and
// send it to many selected clients at once via Resend (clientJourney.bulkEmail).
// Use {{שם}} in the subject/body to insert each client's first name.
// Supports saving / loading / updating reusable templates (trpc.templates.*).
import { useState } from "react";
import { Loader2, Mail, Send, X, Save, FileText } from "lucide-react";
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
  const utils = trpc.useUtils();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loadedTemplateId, setLoadedTemplateId] = useState<number | null>(null);
  const [showSave, setShowSave] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const templatesQuery = trpc.templates.list.useQuery(
    { channel: "email" },
    { enabled: open },
  );

  const invalidateTemplates = () => utils.templates.list.invalidate();

  const createTpl = trpc.templates.create.useMutation({
    onSuccess: () => {
      toast.success("התבנית נשמרה");
      setShowSave(false);
      setTemplateName("");
      invalidateTemplates();
    },
    onError: (err) => toast.error("שגיאה בשמירת התבנית", { description: err.message }),
  });
  const updateTpl = trpc.templates.update.useMutation({
    onSuccess: () => {
      toast.success("התבנית עודכנה");
      invalidateTemplates();
    },
    onError: (err) => toast.error("שגיאה בעדכון", { description: err.message }),
  });
  const deleteTpl = trpc.templates.delete.useMutation({
    onSuccess: () => {
      invalidateTemplates();
    },
    onError: (err) => toast.error("שגיאה במחיקה", { description: err.message }),
  });

  const bulk = trpc.clientJourney.bulkEmail.useMutation({
    onSuccess: (res) => {
      const parts = [`${res.sent} נשלחו`];
      if (res.skipped > 0) parts.push(`${res.skipped} ללא מייל`);
      if (res.failed > 0) parts.push(`${res.failed} נכשלו`);
      toast.success("מייל מרוכז נשלח", { description: parts.join(" · ") });
      setSubject("");
      setBody("");
      setLoadedTemplateId(null);
      onSent?.();
      onOpenChange(false);
    },
    onError: (err) => toast.error("שגיאה בשליחה", { description: err.message }),
  });

  const templates = templatesQuery.data ?? [];
  const canSend = subject.trim().length > 0 && body.trim().length > 0 && clientIds.length > 0;
  const canSaveTemplate = subject.trim().length > 0 || body.trim().length > 0;

  const loadTemplate = (t: { id: number; subject: string | null; body: string }) => {
    setSubject(t.subject ?? "");
    setBody(t.body);
    setLoadedTemplateId(t.id);
  };

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

        {/* Saved templates */}
        {templates.length > 0 && (
          <div className="border border-white/10 rounded-md p-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white/70 mb-2">
              <FileText className="h-3.5 w-3.5 text-gold" /> תבניות שמורות
            </div>
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <span
                  key={t.id}
                  className={`group inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    loadedTemplateId === t.id
                      ? "border-gold/60 bg-gold/15 text-gold"
                      : "border-white/15 text-white/75 hover:bg-white/[0.06]"
                  }`}
                >
                  <button type="button" onClick={() => loadTemplate(t)} className="font-semibold">
                    {t.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTpl.mutate({ id: t.id })}
                    aria-label="מחק תבנית"
                    className="opacity-50 hover:opacity-100 hover:text-rose-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

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

        {/* Template save controls */}
        <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
          {loadedTemplateId !== null && (
            <Button
              variant="outline"
              size="sm"
              disabled={updateTpl.isPending || !canSaveTemplate}
              onClick={() =>
                updateTpl.mutate({ id: loadedTemplateId, subject: subject.trim() || null, body: body.trim() })
              }
            >
              <Save className="h-4 w-4 ml-1" /> עדכן תבנית
            </Button>
          )}
          {showSave ? (
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="שם התבנית"
                maxLength={120}
                className="h-9"
              />
              <Button
                size="sm"
                disabled={!templateName.trim() || createTpl.isPending}
                onClick={() =>
                  createTpl.mutate({
                    name: templateName.trim(),
                    channel: "email",
                    subject: subject.trim() || null,
                    body: body.trim(),
                    triggerKey: triggerKey ?? null,
                  })
                }
              >
                {createTpl.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "שמור"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSave(false)}>
                ביטול
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={!canSaveTemplate}
              onClick={() => setShowSave(true)}
            >
              <Save className="h-4 w-4 ml-1" /> שמור כתבנית חדשה
            </Button>
          )}
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
