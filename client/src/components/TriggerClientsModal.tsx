/**
 * TriggerClientsModal — Round 131.
 *
 * Lists all clients matching a single trigger. Each row supports the full
 * agent journey now:
 *   - Click the client name → opens `ClientDetailModal` (full panel)
 *   - Quick tel: button (calls phone immediately + logs activity)
 *   - Quick mailto: button
 *   - WhatsApp Composer (existing)
 *   - Mark handled / un-mark
 *   - Extra-trigger badges (other categories this client matches)
 *
 * Real data only — fetched via `trpc.triggers.listClients` which already
 * filters by `workspaceId` (and by `assignedAgentId` for non-admin agents).
 * The badges are merged in client-side from `trpc.clientJourney.getDetail`
 * lazily on hover or are simply hinted with `extraTriggerCount` from the
 * server when present. To keep traffic small we render the lazy approach
 * via the detail modal — the row simply shows count of OTHER matching
 * triggers when the data ships it.
 */
import { useState } from "react";
import { CheckCircle2, MessageSquare, RotateCcw, X, Loader2, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { WhatsAppComposerModalV2 } from "./WhatsAppComposerModalV2";
import { EmailComposerModal } from "./EmailComposerModal";
import { ClientDetailModal } from "./ClientDetailModal";
import type { TriggerKey } from "@/lib/triggerScenarios";

export type TriggerBucket = "urgent" | "opportunity" | "improvement" | "retention";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerKey: TriggerKey;
  triggerLabel: string;
  triggerHint?: string;
  bucket: TriggerBucket;
  agentName: string;
}

const BUCKET_HEADER: Record<TriggerBucket, string> = {
  urgent: "border-r-4 border-[#dc2626]",
  opportunity: "border-r-4 border-[#CCA45E]",
  improvement: "border-r-4 border-[#d97706]",
  retention: "border-r-4 border-[#059669]",
};

function fmtIls(n: number | string | null | undefined): string {
  const num = typeof n === "string" ? Number(n) : n;
  if (!num || num === 0 || Number.isNaN(num)) return "—";
  if (num >= 1_000_000) return `₪${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `₪${(num / 1_000).toFixed(0)}K`;
  return `₪${num.toLocaleString("he-IL")}`;
}

function ageFromBirthDate(birthDate: Date | string | null | undefined): number | null {
  if (!birthDate) return null;
  const d = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.length >= 7 ? `tel:${cleaned}` : null;
}

export function TriggerClientsModal({
  open,
  onOpenChange,
  triggerKey,
  triggerLabel,
  triggerHint,
  bucket,
  agentName,
}: Props) {
  const utils = trpc.useUtils();
  const listQuery = trpc.triggers.listClients.useQuery(
    { triggerKey },
    { enabled: open, refetchOnWindowFocus: false },
  );

  const markMutation = trpc.triggers.markHandled.useMutation({
    onSuccess: () => {
      utils.triggers.listClients.invalidate({ triggerKey });
      utils.triggers.handledCounts.invalidate();
    },
  });

  const unmarkMutation = trpc.triggers.unmarkHandled.useMutation({
    onSuccess: () => {
      utils.triggers.listClients.invalidate({ triggerKey });
      utils.triggers.handledCounts.invalidate();
    },
  });

  const logActivityMutation = trpc.clientJourney.logActivity.useMutation();

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerClient, setComposerClient] = useState<{
    id: number;
    fullName?: string | null;
    phone?: string | null;
    age?: number | null;
  } | null>(null);

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailClient, setEmailClient] = useState<{
    id: number;
    fullName?: string | null;
    email?: string | null;
    age?: number | null;
  } | null>(null);

  const [detailClientId, setDetailClientId] = useState<number | null>(null);

  const rows = listQuery.data ?? [];
  const handledCount = rows.filter(r => r.handled).length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          dir="rtl"
          className={`max-w-3xl max-h-[88vh] overflow-y-auto bg-card text-card-foreground ${BUCKET_HEADER[bucket]}`}
        >
          <DialogHeader className="text-right">
            <DialogTitle className="text-xl flex items-center justify-between gap-2">
              <span>{triggerLabel}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {handledCount} / {rows.length} טופלו
              </span>
            </DialogTitle>
            {triggerHint ? (
              <DialogDescription className="text-right">{triggerHint}</DialogDescription>
            ) : null}
          </DialogHeader>

          {listQuery.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              אין כרגע לקוחות בקטגוריה הזו.
            </div>
          ) : (
            <ul className="divide-y divide-border mt-2">
              {rows.map(row => {
                const age = ageFromBirthDate(row.birthDate);
                const tel = telHref(row.phone);
                const hasEmail = !!row.email && row.email.includes("@");
                return (
                  <li
                    key={row.id}
                    className={`py-3 flex items-center gap-3 ${
                      row.handled ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setDetailClientId(row.id)}
                          className="font-medium truncate text-right hover:text-primary hover:underline focus:outline-none focus:text-primary transition-colors"
                          title="פתח כרטיס לקוח מלא"
                        >
                          {row.fullName ?? "לקוח ללא שם"}
                        </button>
                        {row.handled ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                        {age ? <span>גיל {age}</span> : null}
                        {row.phone ? <span dir="ltr">{row.phone}</span> : null}
                        <span>צבירה: {fmtIls(row.totalBalance)}</span>
                        {row.idNumber ? <span>ת״ז: {row.idNumber}</span> : null}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {tel ? (
                        <Button
                          size="icon"
                          variant="outline"
                          asChild
                          className="h-8 w-8"
                          title="התקשר"
                          onClick={() => {
                            // Log call attempt; a tel: link still triggers natively via the <a>
                            logActivityMutation.mutate({
                              clientId: row.id,
                              type: "call",
                              triggerKey: triggerKey as string,
                              content: "התקשר ללקוח (כפתור מהיר)",
                            });
                          }}
                        >
                          <a href={tel} aria-label="התקשר">
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      ) : null}
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        title={hasEmail ? "מחולל מיילים AI" : "מחולל מיילים AI (אין כתובת — תוכל להזין ידנית)"}
                        onClick={() => {
                          setEmailClient({
                            id: row.id,
                            fullName: row.fullName,
                            email: row.email,
                            age,
                          });
                          setEmailOpen(true);
                        }}
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setComposerClient({
                            id: row.id,
                            fullName: row.fullName,
                            phone: row.phone,
                            age,
                          });
                          setComposerOpen(true);
                        }}
                      >
                        <MessageSquare className="h-3.5 w-3.5 me-1" />
                        וואטסאפ
                      </Button>
                      {row.handled ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            unmarkMutation.mutate({ clientId: row.id, triggerKey })
                          }
                          disabled={unmarkMutation.isPending}
                        >
                          <RotateCcw className="h-3.5 w-3.5 me-1" />
                          בטל
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => {
                            markMutation.mutate(
                              { clientId: row.id, triggerKey },
                              {
                                onSuccess: () =>
                                  toast.success("סומן כטופל", {
                                    description: row.fullName ?? undefined,
                                  }),
                              },
                            );
                          }}
                          disabled={markMutation.isPending}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 me-1" />
                          טפלתי
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
            <div className="text-xs text-muted-foreground">
              💡 לחיצה על שם הלקוח פותחת כרטיס מלא — כל ההתראות, יומן הפעולות ותזכורות.
            </div>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 me-1" />
              סגירה
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {composerClient ? (
        <WhatsAppComposerModalV2
          open={composerOpen}
          onOpenChange={setComposerOpen}
          client={composerClient}
          triggerKey={triggerKey}
          triggerLabel={triggerLabel}
          triggerHint={triggerHint}
          agentName={agentName}
        />
      ) : null}

      {emailClient ? (
        <EmailComposerModal
          open={emailOpen}
          onOpenChange={setEmailOpen}
          client={emailClient}
          triggerKey={triggerKey}
          triggerLabel={triggerLabel}
          triggerHint={triggerHint}
          agentName={agentName}
        />
      ) : null}

      <ClientDetailModal
        clientId={detailClientId}
        open={detailClientId !== null}
        onOpenChange={o => {
          if (!o) setDetailClientId(null);
        }}
        triggerContext={triggerKey}
        onMarkHandled={() => {
          // Refresh this list after mark-handled inside the detail modal.
          utils.triggers.listClients.invalidate({ triggerKey });
          utils.triggers.handledCounts.invalidate();
        }}
      />
    </>
  );
}
