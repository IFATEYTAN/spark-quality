/**
 * EmailComposerModal — Round 132.
 *
 * Mirror of WhatsAppComposerModalV2 for **email**. The agent picks a tone,
 * adds optional context, and Claude returns 3 distinct subject+body drafts.
 * The agent can edit the subject/body inline, then "open in Mail" (mailto:)
 * which we open in a new tab; on send we log a `clientJourney.logActivity`
 * row of type `"email"` so the journey timeline records the touch.
 *
 * Hebrew RTL. Uses brand tokens. No Outlook OAuth required — mailto: covers
 * Outlook/Gmail/Apple Mail/Thunderbird out of the box.
 */
import { useEffect, useState } from "react";
import {
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  Sparkles,
  CheckCircle2,
  FileText,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export type EmailComposerTone = "warm" | "professional" | "urgent";

export interface EmailComposerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: {
    id: number;
    fullName?: string | null;
    email?: string | null;
    age?: number | null;
    flagStatus?: string;
  } | null;
  triggerKey: string;
  triggerLabel: string;
  triggerHint?: string;
  agentName: string;
  productOrCompany?: string;
}

interface EmailVariant {
  subject: string;
  body: string;
}

const TONE_OPTIONS: Array<{ value: EmailComposerTone; label: string; emoji: string }> = [
  { value: "warm", label: "חם ואישי", emoji: "💙" },
  { value: "professional", label: "מקצועי", emoji: "🎯" },
  { value: "urgent", label: "דחוף", emoji: "⚡" },
];

function firstNameOf(fullName?: string | null): string {
  if (!fullName) return "לקוח";
  return fullName.trim().split(/\s+/)[0] ?? "לקוח";
}

function buildMailtoHref(variant: EmailVariant, to?: string | null): string {
  const subject = encodeURIComponent(variant.subject.trim());
  const body = encodeURIComponent(variant.body.trim());
  const recipient = to ? encodeURIComponent(to.trim()) : "";
  return `mailto:${recipient}?subject=${subject}&body=${body}`;
}

export function EmailComposerModal({
  open,
  onOpenChange,
  client,
  triggerKey,
  triggerLabel,
  triggerHint,
  agentName,
  productOrCompany,
}: EmailComposerModalProps) {
  const utils = trpc.useUtils();
  const [tone, setTone] = useState<EmailComposerTone>("warm");
  const [context, setContext] = useState("");
  const [variants, setVariants] = useState<EmailVariant[]>([]);
  const [activeTab, setActiveTab] = useState("v0");
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [generationId, setGenerationId] = useState<number | null>(null);
  const [showSave, setShowSave] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const templatesQuery = trpc.templates.list.useQuery(
    { channel: "email" },
    { enabled: open },
  );
  const createTpl = trpc.templates.create.useMutation({
    onSuccess: () => {
      toast.success("התבנית נשמרה");
      setShowSave(false);
      setTemplateName("");
      utils.templates.list.invalidate();
    },
    onError: err => toast.error("שגיאה בשמירת התבנית", { description: err.message }),
  });
  const deleteTpl = trpc.templates.delete.useMutation({
    onSuccess: () => utils.templates.list.invalidate(),
    onError: err => toast.error("שגיאה במחיקה", { description: err.message }),
  });

  const markSelectedMutation = trpc.reports.markVariantSelected.useMutation();

  const generateMutation = trpc.clientJourney.generateEmail.useMutation({
    onSuccess: data => {
      setVariants(data.variants);
      setGenerationId(data.generationId);
      setPickedIndex(null);
      setActiveTab("v0");
    },
    onError: err => {
      toast.error("שגיאה בהפקת המיילים", { description: err.message });
    },
  });

  const logActivity = trpc.clientJourney.logActivity.useMutation({
    onSuccess: () => {
      if (client?.id) {
        utils.clientJourney.getDetail.invalidate({ clientId: client.id });
      }
    },
  });

  useEffect(() => {
    if (!open) {
      setVariants([]);
      setGenerationId(null);
      setPickedIndex(null);
      setContext("");
      setTone("warm");
      setActiveTab("v0");
      setShowSave(false);
      setTemplateName("");
    }
  }, [open]);

  // Load a saved template as a single ready-to-send variant. {{שם}} / {{name}}
  // is replaced with the client's first name so it's ready immediately.
  const loadTemplate = (tpl: { subject: string | null; body: string }) => {
    const name = firstNameOf(client?.fullName);
    const fill = (s: string) => s.replace(/\{\{\s*(?:name|שם)\s*\}\}/g, name);
    setVariants([{ subject: fill(tpl.subject ?? ""), body: fill(tpl.body) }]);
    setGenerationId(null);
    setPickedIndex(null);
    setActiveTab("v0");
  };

  const templates = templatesQuery.data ?? [];

  const handleGenerate = () => {
    if (generateMutation.isPending) return;
    generateMutation.mutate({
      clientId: client?.id ?? null,
      triggerKey,
      triggerLabel,
      triggerHint,
      firstName: firstNameOf(client?.fullName),
      age: client?.age ?? undefined,
      productOrCompany,
      context: context.trim() || undefined,
      tone,
      agentName,
    });
  };

  const updateVariant = (idx: number, patch: Partial<EmailVariant>) => {
    setVariants(prev => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  const handleCopyBody = (variant: EmailVariant, idx: number) => {
    if (!variant.body) return;
    const composed = `נושא: ${variant.subject}\n\n${variant.body}`;
    navigator.clipboard
      .writeText(composed)
      .then(() => {
        toast.success(`הועתק (גרסה ${idx + 1})`);
        setPickedIndex(idx);
      })
      .catch(() => toast.error("לא הצלחתי להעתיק"));
  };

  const handleOpenMail = (variant: EmailVariant, idx: number) => {
    if (!variant.body && !variant.subject) return;
    const url = buildMailtoHref(variant, client?.email);
    window.location.href = url;
    setPickedIndex(idx);
    // Persist the (possibly edited) variants + which one was used, so edits
    // are not lost on navigation and the history reflects what was sent.
    if (generationId !== null) {
      markSelectedMutation.mutate({
        generationId,
        selectedIndex: idx,
        variantsJson: variants.map(v => JSON.stringify(v)),
      });
    }
    if (client?.id) {
      logActivity.mutate({
        clientId: client.id,
        type: "email",
        outcome: "נפתח לשליחה",
        content: `נושא: ${variant.subject}\n\n${variant.body}`,
        triggerKey,
      });
    }
    toast.success("נפתח בלקוח הדוא\"ל שלך");
  };

  const hasVariants = variants.length > 0 && variants.some(v => v.body.trim().length > 0);
  const activeVariant = variants[Number(activeTab.replace("v", ""))] ?? { subject: "", body: "" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-gold/40"
      >
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Mail className="h-5 w-5 text-gold" />
            מחולל מיילים — {triggerLabel}
          </DialogTitle>
          <DialogDescription className="text-right">
            {client?.fullName ? (
              <>
                לקוח: <span className="font-medium">{client.fullName}</span>
                {client.age ? <> · גיל {client.age}</> : null}
                {client.email ? <> · {client.email}</> : null}
              </>
            ) : (
              <>הפקה כללית — בחר טון, הוסף הקשר וקבל 3 גרסאות מותאמות.</>
            )}
          </DialogDescription>
        </DialogHeader>

        {!client?.email && client && (
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-300/60 px-3 py-2 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
            ⚠️ אין כתובת מייל ללקוח זה. המייל יוכן ויועתק/יפתח ריק כך שתוכל להזין נמען ידנית.
          </div>
        )}

        {/* ── Form ─────────────────────────────────────────── */}
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-sm font-medium mb-2 block">טון הפנייה</Label>
            <div className="grid grid-cols-3 gap-2">
              {TONE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTone(opt.value)}
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition ${
                    tone === opt.value
                      ? "border-gold bg-gold/10 text-foreground"
                      : "border-border bg-transparent text-muted-foreground hover:border-gold/50"
                  }`}
                >
                  <span className="me-1">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="email-composer-context" className="text-sm font-medium mb-2 block">
              הקשר נוסף (אופציונלי)
            </Label>
            <Textarea
              id="email-composer-context"
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="למשל: ותיק 8 שנים בסוכנות · ביקש פגישה בזום · ילדים בגילי 17-19"
              rows={2}
              className="resize-none"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="w-full bg-gold hover:bg-gold/90 text-foreground font-semibold h-11"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                מפיק 3 גרסאות עם Claude…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 me-2" />
                {hasVariants ? "הפק גרסאות חדשות" : "הפק 3 גרסאות"}
              </>
            )}
          </Button>
        </div>

        {/* ── Saved templates ─────────────────────────────── */}
        {templates.length > 0 && (
          <div className="mt-4 border border-border rounded-md p-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-2">
              <FileText className="h-3.5 w-3.5 text-gold" /> תבניות שמורות
            </div>
            <div className="flex flex-wrap gap-2">
              {templates.map(t => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-foreground hover:bg-gold/10 transition-colors"
                >
                  <button type="button" onClick={() => loadTemplate(t)} className="font-semibold">
                    {t.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTpl.mutate({ id: t.id })}
                    aria-label="מחק תבנית"
                    className="opacity-50 hover:opacity-100 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Variants ─────────────────────────────────────── */}
        {hasVariants && (
          <div className="mt-6 border-t border-border pt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
              <TabsList className="grid w-full grid-cols-3">
                {variants.map((_, i) => (
                  <TabsTrigger key={i} value={`v${i}`} className="data-[state=active]:bg-gold/15">
                    גרסה {i + 1}
                    {pickedIndex === i ? (
                      <CheckCircle2 className="h-3.5 w-3.5 ms-1 text-emerald-600" />
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>
              {variants.map((variant, i) => (
                <TabsContent key={i} value={`v${i}`} className="mt-3 space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                      נושא המייל
                    </Label>
                    <Input
                      value={variant.subject}
                      onChange={e => updateVariant(i, { subject: e.target.value })}
                      className="bg-muted/40 border-border font-medium"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                      גוף המייל (ניתן לעריכה)
                    </Label>
                    <Textarea
                      value={variant.body}
                      onChange={e => updateVariant(i, { body: e.target.value })}
                      rows={9}
                      className="bg-muted/40 border-border text-sm leading-relaxed whitespace-pre-wrap font-sans"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyBody(variant, i)}
                      disabled={!variant.body}
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 me-1.5" />
                      העתק (נושא + גוף)
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleOpenMail(variant, i)}
                      disabled={!variant.body && !variant.subject}
                      className="flex-1 bg-gold hover:bg-gold/90 text-foreground"
                    >
                      <ExternalLink className="h-4 w-4 me-1.5" />
                      פתח ב-Mail / Outlook
                    </Button>
                  </div>
                  {showSave ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={templateName}
                        onChange={e => setTemplateName(e.target.value)}
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
                            subject: variant.subject.trim() || null,
                            body: variant.body.trim(),
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
                      onClick={() => setShowSave(true)}
                      disabled={!variant.body.trim()}
                    >
                      <Save className="h-4 w-4 me-1.5" /> שמור כתבנית
                    </Button>
                  )}
                </TabsContent>
              ))}
            </Tabs>
            <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed text-right">
              💡 הלחיצה על "פתח ב-Mail / Outlook" פותחת את לקוח הדוא"ל המוגדר במחשב/מובייל (Outlook, Gmail, Apple Mail וכו׳) עם הנושא והגוף ממולאים. הפעולה תיכנס אוטומטית ליומן הפעילות של הלקוח.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-4 mt-4 border-t border-border">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 me-1" />
            סגירה
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EmailComposerModal;
