/**
 * WhatsAppComposerModalV2 — Round 92.
 *
 * Real Claude-powered WhatsApp message generator. Replaces the static-template
 * `AIComposerModal` for any flow that wants 3 distinct variants the agent can
 * pick from, copy, or open directly in WhatsApp web/app.
 *
 * Pipeline:
 *   1. Agent fills form (tone + free-form context).
 *   2. We call `trpc.reports.composeVariants` which:
 *      - Calls Claude with VARIANTS_3_SYSTEM
 *      - Persists the call to `messageGenerations`
 *      - Returns `{ generationId, variants: string[3] }`
 *   3. UI shows the 3 variants in a tab strip with copy / open-WA / pick.
 *   4. On pick, we call `trpc.reports.markVariantSelected`.
 *   5. History strip shows past generations for this client (per workspace).
 *
 * Hebrew RTL throughout. Uses brand tokens (gold + foreground) so it sits
 * cleanly inside the existing dashboard chrome.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  ExternalLink,
  Loader2,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  History,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export type ComposerTone = "warm" | "professional" | "urgent";

export interface WhatsAppComposerModalV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, history is shown and the generation is linked to this client. */
  client?: {
    id: number;
    fullName?: string | null;
    phone?: string | null;
    age?: number | null;
    flagStatus?: string;
  } | null;
  /** Trigger metadata used to compose. */
  triggerKey: string;
  triggerLabel: string;
  triggerHint?: string;
  /** Default agent name shown as the signature. */
  agentName: string;
  productOrCompany?: string;
}

const TONE_OPTIONS: Array<{ value: ComposerTone; label: string; emoji: string }> = [
  { value: "warm", label: "חם ואישי", emoji: "💙" },
  { value: "professional", label: "מקצועי", emoji: "🎯" },
  { value: "urgent", label: "דחוף", emoji: "⚡" },
];

function firstNameOf(fullName?: string | null): string {
  if (!fullName) return "לקוח";
  return fullName.trim().split(/\s+/)[0] ?? "לקוח";
}

function normalizeIsraeliPhoneForWa(phone?: string | null): string | null {
  if (!phone) return null;
  // Strip everything that isn't a digit or a leading '+'
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return null;
  // Israeli mobiles: 05X-XXXXXXX → 9725XXXXXXXX
  if (digits.startsWith("0") && digits.length === 10) {
    return "972" + digits.slice(1);
  }
  if (digits.startsWith("972")) return digits;
  return digits;
}

function buildWhatsAppHref(message: string, phone?: string | null): string {
  const encoded = encodeURIComponent(message.trim());
  const num = normalizeIsraeliPhoneForWa(phone);
  if (num) return `https://wa.me/${num}?text=${encoded}`;
  return `https://wa.me/?text=${encoded}`;
}

export function WhatsAppComposerModalV2({
  open,
  onOpenChange,
  client,
  triggerKey,
  triggerLabel,
  triggerHint,
  agentName,
  productOrCompany,
}: WhatsAppComposerModalV2Props) {
  const utils = trpc.useUtils();
  const [tone, setTone] = useState<ComposerTone>("warm");
  const [context, setContext] = useState("");
  const [variants, setVariants] = useState<string[]>([]);
  const [generationId, setGenerationId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("v0");
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);

  const composeMutation = trpc.reports.composeVariants.useMutation({
    onSuccess: data => {
      setVariants(data.variants);
      setGenerationId(data.generationId);
      setPickedIndex(null);
      setActiveTab("v0");
      if (client?.id) {
        utils.reports.listGenerationsForClient.invalidate({ clientId: client.id });
      }
      utils.reports.listGenerationsForWorkspace.invalidate();
    },
    onError: err => {
      toast.error("שגיאה בהפקת הודעות", { description: err.message });
    },
  });

  const markSelectedMutation = trpc.reports.markVariantSelected.useMutation({
    onSuccess: () => {
      if (client?.id) {
        utils.reports.listGenerationsForClient.invalidate({ clientId: client.id });
      }
    },
  });

  const historyQuery = trpc.reports.listGenerationsForClient.useQuery(
    { clientId: client?.id ?? 0, limit: 10 },
    { enabled: open && !!client?.id },
  );

  // Reset state when the modal closes so re-opening for another client
  // doesn't show stale variants.
  useEffect(() => {
    if (!open) {
      setVariants([]);
      setGenerationId(null);
      setPickedIndex(null);
      setContext("");
      setTone("warm");
      setActiveTab("v0");
    }
  }, [open]);

  const handleGenerate = () => {
    if (composeMutation.isPending) return;
    composeMutation.mutate({
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

  const handleCopy = (text: string, idx: number) => {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success(`הועתק (גרסה ${idx + 1})`);
        if (generationId !== null && pickedIndex !== idx) {
          setPickedIndex(idx);
          markSelectedMutation.mutate({ generationId, selectedIndex: idx });
        }
      })
      .catch(() => toast.error("לא הצלחתי להעתיק"));
  };

  const handleOpenWhatsApp = (text: string, idx: number) => {
    if (!text) return;
    const url = buildWhatsAppHref(text, client?.phone);
    window.open(url, "_blank", "noopener");
    if (generationId !== null && pickedIndex !== idx) {
      setPickedIndex(idx);
      markSelectedMutation.mutate({ generationId, selectedIndex: idx });
    }
  };

  const hasVariants = variants.length > 0 && variants.some(v => v.trim().length > 0);
  const history = useMemo(() => historyQuery.data ?? [], [historyQuery.data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-gold/40"
      >
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MessageSquare className="h-5 w-5 text-gold" />
            מחולל הודעות וואטסאפ — {triggerLabel}
          </DialogTitle>
          <DialogDescription className="text-right">
            {client?.fullName ? (
              <>
                לקוח: <span className="font-medium">{client.fullName}</span>
                {client.age ? <> · גיל {client.age}</> : null}
                {client.phone ? <> · {client.phone}</> : null}
              </>
            ) : (
              <>הפקה כללית — בחר טון, הוסף הקשר וקבל 3 גרסאות מותאמות.</>
            )}
          </DialogDescription>
        </DialogHeader>

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
            <Label htmlFor="composer-context" className="text-sm font-medium mb-2 block">
              הקשר נוסף (אופציונלי)
            </Label>
            <Textarea
              id="composer-context"
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="למשל: עזב מעסיק לפני חודש · ותיק 8 שנים בסוכנות · ביקש לחזור אליו ביום שני"
              rows={2}
              className="resize-none"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={composeMutation.isPending}
            className="w-full bg-gold hover:bg-gold/90 text-foreground font-semibold h-11"
          >
            {composeMutation.isPending ? (
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

        {/* ── Variants ─────────────────────────────────────── */}
        {hasVariants && (
          <div className="mt-6 border-t border-border pt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
              <TabsList className="grid w-full grid-cols-3">
                {variants.map((_, i) => (
                  <TabsTrigger key={i} value={`v${i}`} className="data-[state=active]:bg-gold/15">
                    גרסה {i + 1}
                    {pickedIndex === i ? <CheckCircle2 className="h-3.5 w-3.5 ms-1 text-emerald-600" /> : null}
                  </TabsTrigger>
                ))}
              </TabsList>
              {variants.map((text, i) => (
                <TabsContent key={i} value={`v${i}`} className="mt-3">
                  <div className="bg-muted/40 border border-border rounded-lg p-4 whitespace-pre-wrap text-sm leading-relaxed min-h-[120px]">
                    {text || <span className="text-muted-foreground">— ריק —</span>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(text, i)}
                      disabled={!text}
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 me-1.5" />
                      העתק
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleOpenWhatsApp(text, i)}
                      disabled={!text}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <ExternalLink className="h-4 w-4 me-1.5" />
                      פתח בוואטסאפ
                    </Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}

        {/* ── History ──────────────────────────────────────── */}
        {client?.id && history.length > 0 && (
          <div className="mt-6 border-t border-border pt-4">
            <div className="flex items-center gap-2 mb-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">הפקות קודמות ללקוח זה</span>
              <span className="text-xs text-muted-foreground">({history.length})</span>
            </div>
            <ul className="space-y-1.5 max-h-32 overflow-y-auto">
              {history.map(row => {
                const created = new Date(row.createdAt as unknown as string);
                const tonemap: Record<string, string> = {
                  warm: "חם",
                  professional: "מקצועי",
                  urgent: "דחוף",
                };
                return (
                  <li
                    key={row.id}
                    className="text-xs flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-muted/30"
                  >
                    <span className="truncate text-muted-foreground">
                      {row.triggerKey} · {tonemap[row.tone] ?? row.tone}
                      {typeof row.selectedIndex === "number" ? ` · נבחרה גרסה ${row.selectedIndex + 1}` : " · לא נבחרה"}
                    </span>
                    <span className="text-muted-foreground/70 shrink-0">
                      {created.toLocaleString("he-IL", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex justify-end mt-4 pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 me-1" />
            סגירה
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
