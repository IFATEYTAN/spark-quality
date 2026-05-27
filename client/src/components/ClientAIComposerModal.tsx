// SPARK AI · ClientAIComposerModal
// Real-LLM message composer for DB-backed clients (Clients page / Drawer).
// Calls trpc.ai.composeMessage which fans out to invokeLLM on the server; falls
// back to a Hebrew template if the LLM is unavailable. UI mirrors the demo
// AIComposerModal so the experience is consistent.
import { useEffect, useRef, useState } from "react";
import {
  Brain,
  CheckCircle2,
  Copy,
  ExternalLink,
  Mail,
  MessageSquare,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export type ComposerClient = {
  id: number;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  isVip?: boolean;
  flagStatus?: string | null;
  totalBalance?: string | number | null;
};

interface Props {
  client: ComposerClient | null;
  channel: "email" | "whatsapp" | null;
  onClose: () => void;
}

const THINKING_STEPS = [
  { label: "קוראת נתוני לקוח", icon: Brain },
  { label: "מנתחת את הדגל וההזדמנות", icon: Sparkles },
  { label: "מתאימה טון אישי", icon: Wand2 },
  { label: "מנסחת הודעה", icon: Sparkles },
];

export function ClientAIComposerModal({ client, channel, onClose }: Props) {
  const [phase, setPhase] = useState<"thinking" | "typing" | "done" | "error">("thinking");
  const [thinkingStep, setThinkingStep] = useState(0);
  const [typedSubject, setTypedSubject] = useState("");
  const [typedBody, setTypedBody] = useState("");
  const [source, setSource] = useState<"llm" | "template" | null>(null);
  const [messageId, setMessageId] = useState<number | null>(null);
  const messageRef = useRef<{ subject: string; body: string } | null>(null);
  const bodyContainerRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const composeMutation = trpc.ai.composeMessage.useMutation();
  const markSentMutation = trpc.outreach.markSent.useMutation();

  useEffect(() => {
    if (!client || !channel) return;

    setPhase("thinking");
    setThinkingStep(0);
    setTypedSubject("");
    setTypedBody("");
    setSource(null);
    setMessageId(null);
    messageRef.current = null;

    const thinkingTimers: ReturnType<typeof setTimeout>[] = [];
    THINKING_STEPS.forEach((_, idx) => {
      thinkingTimers.push(setTimeout(() => setThinkingStep(idx), idx * 350));
    });

    let cancelled = false;

    composeMutation
      .mutateAsync({ clientId: client.id, channel })
      .then((result) => {
        if (cancelled) return;
        messageRef.current = { subject: result.subject ?? "", body: result.body };
        setSource(result.source);
        setMessageId(result.messageId ?? null);
        // Wait at least until thinking animation finishes for a polished feel.
        const minDelay = THINKING_STEPS.length * 350 + 200;
        setTimeout(() => {
          if (cancelled) return;
          setPhase("typing");
          startTyping(result.subject ?? "", result.body);
        }, minDelay);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[composer] mutation failed", err);
        setPhase("error");
        toast.error(err?.message ?? "שגיאה בניסוח ההודעה");
      });

    function startTyping(subject: string, body: string) {
      let subjectIdx = 0;
      let bodyIdx = 0;

      const typeSubject = setInterval(() => {
        subjectIdx++;
        setTypedSubject(subject.slice(0, subjectIdx));
        if (subjectIdx >= subject.length) {
          clearInterval(typeSubject);
          const typeBody = setInterval(() => {
            bodyIdx += Math.floor(Math.random() * 3) + 2;
            setTypedBody(body.slice(0, bodyIdx));
            if (bodyContainerRef.current) {
              bodyContainerRef.current.scrollTop = bodyContainerRef.current.scrollHeight;
            }
            if (bodyIdx >= body.length) {
              setTypedBody(body);
              clearInterval(typeBody);
              setPhase("done");
            }
          }, 18);
        }
      }, 25);

      if (!subject) {
        clearInterval(typeSubject);
        const typeBody = setInterval(() => {
          bodyIdx += Math.floor(Math.random() * 3) + 2;
          setTypedBody(body.slice(0, bodyIdx));
          if (bodyContainerRef.current) {
            bodyContainerRef.current.scrollTop = bodyContainerRef.current.scrollHeight;
          }
          if (bodyIdx >= body.length) {
            setTypedBody(body);
            clearInterval(typeBody);
            setPhase("done");
          }
        }, 18);
      }
    }

    return () => {
      cancelled = true;
      thinkingTimers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id, channel]);

  if (!client || !channel) return null;

  const isEmail = channel === "email";
  const ChannelIcon = isEmail ? Mail : MessageSquare;
  const channelColor = isEmail ? "from-gold to-gold-soft" : "from-emerald-500 to-emerald-400";
  const channelLabel = isEmail ? "Email · Outlook" : "WhatsApp Business";

  const handleCopy = async () => {
    const text = isEmail ? `נושא: ${typedSubject}\n\n${typedBody}` : typedBody;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("ההודעה הועתקה לזיכרון");
    } catch {
      toast.error("לא ניתן להעתיק");
    }
  };

  const handleSend = () => {
    if (isEmail) {
      const to = client.email ?? "";
      const subject = encodeURIComponent(typedSubject);
      const body = encodeURIComponent(typedBody);
      window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_blank");
      toast.success("נפתח Outlook עם טיוטה מוכנה");
    } else {
      const phone = (client.phone ?? "").replace(/\D/g, "");
      if (!phone) {
        toast.error("חסר מספר טלפון ללקוח");
        return;
      }
      const intl = phone.startsWith("0") ? "972" + phone.slice(1) : phone;
      const text = encodeURIComponent(typedBody);
      window.open(`https://wa.me/${intl}?text=${text}`, "_blank");
      toast.success("נפתח WhatsApp עם ההודעה");
    }
    // Record the send so it shows up as "נשלח" in the client's outreach history.
    if (messageId) {
      markSentMutation.mutate(
        { messageId },
        {
          onSuccess: () => {
            utils.outreach.listForClient.invalidate({ clientId: client.id });
          },
        }
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-navy-deep/80 backdrop-blur-md" />
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-2xl shadow-navy/40 animate-fade-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-navy-deep px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br ${channelColor} text-navy-deep shadow-lg`}>
              <ChannelIcon className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold text-white">ניסוח ב-AI</span>
                <Sparkles className="h-4 w-4 text-gold animate-pulse" />
              </div>
              <div className="text-xs text-white/60">
                {channelLabel} · ל-{client.fullName ?? `לקוח ${client.id}`}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-white/60 hover:bg-white/10 hover:text-white transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        {phase === "thinking" && (
          <div className="flex-1 flex items-center justify-center p-12 bg-gradient-to-br from-navy-deep/[0.02] to-gold/[0.05]">
            <div className="text-center max-w-md">
              <div className="relative mx-auto mb-8 h-24 w-24">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gold to-gold-soft animate-pulse" />
                <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                  <Brain className="h-10 w-10 text-navy-deep" strokeWidth={1.5} />
                </div>
                <div className="absolute -inset-4 rounded-full border-2 border-gold/30 border-t-gold animate-spin" style={{ animationDuration: "2s" }} />
              </div>
              <h3 className="font-display text-2xl font-bold text-navy-deep tracking-tight mb-3">
                ה-AI חושב<span className="animate-pulse">...</span>
              </h3>
              <p className="text-sm text-muted-foreground mb-8">
                מנתחת את התיק של {client.fullName ?? "הלקוח"} ומכינה הודעה מותאמת
              </p>
              <div className="space-y-2 text-right">
                {THINKING_STEPS.map((step, idx) => {
                  const isDone = idx < thinkingStep;
                  const isActive = idx === thinkingStep;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 px-4 py-2 rounded-md transition-all duration-300 ${
                        isActive ? "bg-gold/10 border-r-2 border-gold" : isDone ? "opacity-60" : "opacity-30"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : isActive ? (
                        <div className="h-4 w-4 rounded-full bg-gold animate-pulse" />
                      ) : (
                        <div className="h-4 w-4 rounded-full bg-muted-foreground/30" />
                      )}
                      <span className={`text-sm ${isActive ? "font-bold text-navy-deep" : "text-muted-foreground"}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {phase === "error" && (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center max-w-md">
              <h3 className="font-display text-xl font-bold text-navy-deep mb-2">לא ניתן לנסח כרגע</h3>
              <p className="text-sm text-muted-foreground mb-6">
                ה-AI לא זמין. נסה/י שוב בעוד דקה.
              </p>
              <button
                onClick={onClose}
                className="rounded-md border border-border bg-white px-4 py-2 text-xs font-semibold text-navy-deep hover:border-gold"
              >
                סגירה
              </button>
            </div>
          </div>
        )}

        {(phase === "typing" || phase === "done") && (
          <>
            <div className="flex items-center gap-4 border-b border-border bg-cream/50 px-6 py-3 flex-shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-deep text-cream font-display font-bold">
                {(client.fullName ?? "??").split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1">
                <div className="font-display font-bold text-navy-deep text-sm">
                  {client.fullName ?? `לקוח ${client.id}`}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  {client.flagStatus && (
                    <span className="font-semibold text-gold">{client.flagStatus}</span>
                  )}
                  {client.isVip && <span className="font-semibold text-gold">· VIP</span>}
                </div>
              </div>
              {Number(client.totalBalance ?? 0) > 0 && (
                <div className="text-left">
                  <div className="label-tag text-[9px] text-muted-foreground">צבירה</div>
                  <div className="font-display font-bold text-navy-deep mono-num">
                    {Number(client.totalBalance).toLocaleString("he-IL", { maximumFractionDigits: 0 })} ₪
                  </div>
                </div>
              )}
            </div>

            <div ref={bodyContainerRef} className="flex-1 overflow-y-auto p-6 bg-white">
              {isEmail && messageRef.current?.subject && (
                <div className="mb-5 pb-5 border-b border-border">
                  <div className="label-tag text-[10px] text-gold mb-2">נושא</div>
                  <div className="font-display text-lg font-bold text-navy-deep tracking-tight min-h-[2rem]">
                    {typedSubject}
                    {phase === "typing" && typedSubject.length < (messageRef.current?.subject?.length || 0) && (
                      <span className="inline-block w-0.5 h-5 bg-gold animate-pulse ml-1 align-middle" />
                    )}
                  </div>
                </div>
              )}
              <div className="label-tag text-[10px] text-gold mb-2">
                {isEmail ? "תוכן ההודעה" : "הודעת WhatsApp"}
              </div>
              <div className={`relative ${!isEmail ? "max-w-md mr-auto" : ""}`}>
                <div
                  className={`whitespace-pre-line text-sm leading-relaxed text-foreground/90 font-sans ${
                    !isEmail
                      ? "bg-gradient-to-bl from-emerald-50 to-emerald-100/60 border border-emerald-200/60 rounded-2xl rounded-tr-sm p-4 shadow-sm"
                      : ""
                  }`}
                >
                  {typedBody}
                  {phase === "typing" && (
                    <span className="inline-block w-0.5 h-4 bg-gold animate-pulse ml-1 align-middle" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border bg-cream/30 px-6 py-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                {phase === "done" && (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700">ההודעה מוכנה לשליחה</span>
                    {source === "template" && (
                      <span className="label-tag text-[9px] text-amber-700 mr-3" title="ה-LLM לא היה זמין — נשלחה תבנית fallback">
                        תבנית · ה-AI לא היה זמין
                      </span>
                    )}
                    {source === "llm" && (
                      <span className="label-tag text-[9px] text-muted-foreground mr-3">
                        Gemini · ניסוח חי
                      </span>
                    )}
                  </>
                )}
                {phase === "typing" && (
                  <>
                    <Sparkles className="h-4 w-4 text-gold animate-pulse" />
                    <span className="text-xs text-muted-foreground">ה-AI מקליד...</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  disabled={phase !== "done"}
                  className="flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-xs font-semibold text-navy-deep transition-all hover:border-gold hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Copy className="h-3.5 w-3.5" />
                  העתק
                </button>
                <button
                  onClick={handleSend}
                  disabled={phase !== "done"}
                  className={`group flex items-center gap-2 rounded-md bg-gradient-to-l ${channelColor} px-5 py-2 text-xs font-bold text-navy-deep transition-all hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {isEmail ? "פתח ב-Outlook" : "פתח ב-WhatsApp"}
                  <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
