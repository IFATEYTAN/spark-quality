// Editorial Fintech | מודאל ניסוח AI - אפקט ה-WOW
import { useEffect, useState, useRef } from "react";
import { X, Mail, MessageSquare, Sparkles, Send, Brain, CheckCircle2, Copy, Wand2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { Customer } from "@/lib/demoData";

interface AIComposerModalProps {
  customer: Customer | null;
  channel: "email" | "whatsapp" | null;
  onClose: () => void;
}

// תבניות הודעות מותאמות אישית לכל סטטוס
const buildMessage = (customer: Customer, channel: "email" | "whatsapp"): { subject?: string; body: string } => {
  const firstName = customer.name.split(" ")[0];

  if (customer.status === "ריסק זמני") {
    if (channel === "email") {
      return {
        subject: `${firstName}, פוליסת ${customer.product} שלך מסתיימת בקרוב - בואו נדבר`,
        body: `שלום ${firstName},\n\nכאן יפעת מ-SPARK AI. עברתי על התיק שלך וראיתי שפוליסת הריסק שלך ב${customer.insurer} עומדת להסתיים בקרוב.\n\nבמהלך השנים האחרונות הצטברה אצלך צבירה של ${customer.accumulation.toLocaleString("he-IL")} ₪, וחשוב לי לוודא שהכיסוי שלך ממשיך להגן עליך ועל המשפחה.\n\nאשמח לתאם איתך שיחה קצרה (10-15 דקות) השבוע, לבדוק שהכיסוי עדיין מתאים לצרכים שלך ולעדכן במידת הצורך.\n\nמתי נוח לך לשוחח?\n\nבברכה,\nיפעת איתן\nסוכנת ביטוח בכירה | SPARK AI\n054-XXX-XXXX`,
      };
    }
    return {
      body: `שלום ${firstName} 👋\n\nכאן יפעת מ-SPARK AI. רציתי לעדכן שפוליסת הריסק שלך ב${customer.insurer} מסתיימת בקרוב 📅\n\nאשמח לתאם איתך שיחה קצרה השבוע כדי לוודא שהכיסוי שלך עדכני ומתאים לצרכים הנוכחיים שלך.\n\nמתי נוח לך?`,
    };
  }

  if (customer.status === "ללא פנסיה") {
    if (channel === "email") {
      return {
        subject: `${firstName}, הזדמנות לחיסכון פנסיוני מותאם אישית עבורך`,
        body: `שלום ${firstName},\n\nכאן יפעת מ-SPARK AI. ראיתי בתיק שלך פעילות יציבה במוצר ${customer.product} (${customer.insurer}) עם צבירה של ${customer.accumulation.toLocaleString("he-IL")} ₪.\n\nשמתי לב שעדיין אין לך מוצר פנסיוני פעיל. בגיל ${customer.age}, יש לך הזדמנות מצוינת לבנות חיסכון פנסיוני משמעותי בזכות זמן רב יחסית של חיסכון.\n\nהכנתי עבורך השוואה מותאמת בין 3 קרנות פנסיה מובילות, בהתבסס על הפרופיל שלך.\n\nמוזמן/ת לקבוע פגישה (גם וירטואלית) של 30 דקות?\n\nבברכה,\nיפעת איתן | SPARK AI`,
      };
    }
    return {
      body: `שלום ${firstName} 👋\n\nראיתי שיש לך תיק פעיל אצלנו, אבל עדיין אין מוצר פנסיוני.\n\nבגיל ${customer.age} זה זמן מצוין לבנות חיסכון פנסיוני 💪\n\nהכנתי עבורך השוואה אישית של 3 קרנות פנסיה מובילות. רוצה שאשלח?`,
    };
  }

  if (customer.status === "תום הנחה") {
    if (channel === "email") {
      return {
        subject: `${firstName}, חשוב: הנחת הפרמיה שלך מסתיימת בקרוב`,
        body: `שלום ${firstName},\n\nכאן יפעת מ-SPARK AI. רציתי ליידע אותך מראש שהנחת הפרמיה שלך במוצר ${customer.product} (${customer.insurer}) תסתיים בעוד מספר שבועות.\n\nכלקוח/ה ותיק/ה שלנו עם צבירה של ${customer.accumulation.toLocaleString("he-IL")} ₪, חשוב לי שנעבור יחד על האפשרויות העומדות בפניך, כדי לבחון אם אפשר לחדש את ההטבה או למצוא מוצר אטרקטיבי יותר.\n\nמתי תוכל/י לפנות 20 דקות לפגישת ייעוץ ללא עלות?\n\nבברכה,\nיפעת איתן | SPARK AI`,
      };
    }
    return {
      body: `שלום ${firstName} 👋\n\nרק רציתי לעדכן שהנחת הפרמיה שלך במוצר ${customer.product} מסתיימת בקרוב 📅\n\nבואו נמצא יחד את הפתרון הכי משתלם לך - אם זה חידוש ההנחה או מעבר למוצר עדיף.\n\nמתי נוח לדבר?`,
    };
  }

  // Default
  return {
    subject: `${firstName}, עדכון לגבי תיק הביטוח שלך`,
    body: `שלום ${firstName},\n\nכאן יפעת. רציתי לבדוק שהכל בסדר ושהמוצר ${customer.product} ב${customer.insurer} עדיין מתאים לצרכים שלך.\n\nאשמח לתאם שיחה קצרה לסקירה תקופתית.\n\nבברכה,\nיפעת איתן | SPARK AI`,
  };
};

// שלבי ה"חשיבה" של ה-AI
const AI_THINKING_STEPS = [
  { label: "קורא נתוני לקוח", icon: Brain },
  { label: "מנתח היסטוריית רכישות", icon: Sparkles },
  { label: "מזהה טון תקשורת מועדף", icon: Wand2 },
  { label: "מנסח הודעה מותאמת אישית", icon: Sparkles },
];

export function AIComposerModal({ customer, channel, onClose }: AIComposerModalProps) {
  const [phase, setPhase] = useState<"thinking" | "typing" | "done">("thinking");
  const [thinkingStep, setThinkingStep] = useState(0);
  const [typedSubject, setTypedSubject] = useState("");
  const [typedBody, setTypedBody] = useState("");
  const messageRef = useRef<{ subject?: string; body: string } | null>(null);
  const bodyContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!customer || !channel) return;
    messageRef.current = buildMessage(customer, channel);
    setPhase("thinking");
    setThinkingStep(0);
    setTypedSubject("");
    setTypedBody("");

    const thinkingTimers: NodeJS.Timeout[] = [];
    AI_THINKING_STEPS.forEach((_, idx) => {
      thinkingTimers.push(
        setTimeout(() => setThinkingStep(idx), idx * 450),
      );
    });

    const startTyping = setTimeout(() => {
      setPhase("typing");
      const msg = messageRef.current!;
      const fullSubject = msg.subject || "";
      const fullBody = msg.body;
      let subjectIdx = 0;
      let bodyIdx = 0;

      const typeSubject = setInterval(() => {
        subjectIdx++;
        setTypedSubject(fullSubject.slice(0, subjectIdx));
        if (subjectIdx >= fullSubject.length) {
          clearInterval(typeSubject);
          // start typing body
          const typeBody = setInterval(() => {
            bodyIdx += Math.floor(Math.random() * 3) + 2;
            setTypedBody(fullBody.slice(0, bodyIdx));
            // auto-scroll
            if (bodyContainerRef.current) {
              bodyContainerRef.current.scrollTop = bodyContainerRef.current.scrollHeight;
            }
            if (bodyIdx >= fullBody.length) {
              setTypedBody(fullBody);
              clearInterval(typeBody);
              setPhase("done");
            }
          }, 18);
        }
      }, 25);

      // If no subject (whatsapp), start body directly
      if (!fullSubject) {
        clearInterval(typeSubject);
        const typeBody = setInterval(() => {
          bodyIdx += Math.floor(Math.random() * 3) + 2;
          setTypedBody(fullBody.slice(0, bodyIdx));
          if (bodyContainerRef.current) {
            bodyContainerRef.current.scrollTop = bodyContainerRef.current.scrollHeight;
          }
          if (bodyIdx >= fullBody.length) {
            setTypedBody(fullBody);
            clearInterval(typeBody);
            setPhase("done");
          }
        }, 18);
      }
    }, AI_THINKING_STEPS.length * 450 + 300);

    return () => {
      thinkingTimers.forEach(clearTimeout);
      clearTimeout(startTyping);
    };
  }, [customer, channel]);

  if (!customer || !channel) return null;

  const isEmail = channel === "email";
  const ChannelIcon = isEmail ? Mail : MessageSquare;
  const channelColor = isEmail ? "from-gold to-gold-soft" : "from-emerald-500 to-emerald-400";
  const channelTextColor = isEmail ? "text-gold" : "text-emerald-400";
  const channelLabel = isEmail ? "Email · Outlook" : "WhatsApp Business";

  const handleCopy = async () => {
    const text = isEmail
      ? `נושא: ${typedSubject}\n\n${typedBody}`
      : typedBody;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("ההודעה הועתקה לזיכרון");
    } catch {
      toast.error("לא ניתן להעתיק");
    }
  };

  const handleSend = () => {
    if (!customer) return;
    if (isEmail) {
      const to = customer.email || "";
      const subject = encodeURIComponent(typedSubject);
      const body = encodeURIComponent(typedBody);
      window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_blank");
      toast.success("נפתח Outlook עם טיוטה מוכנה");
    } else {
      const phone = customer.phone.replace(/\D/g, "");
      const intl = phone.startsWith("0") ? "972" + phone.slice(1) : phone;
      const text = encodeURIComponent(typedBody);
      window.open(`https://wa.me/${intl}?text=${text}`, "_blank");
      toast.success("נפתח WhatsApp עם ההודעה");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-navy-deep/80 backdrop-blur-md" />

      {/* Modal */}
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-2xl shadow-navy/40 animate-fade-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-border bg-navy-deep px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br ${channelColor} text-navy-deep shadow-lg`}>
              <ChannelIcon className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold text-white">
                  ניסוח אוטומטי ב-AI
                </span>
                <Sparkles className="h-4 w-4 text-gold animate-pulse" />
              </div>
              <div className="text-xs text-white/60">{channelLabel} · ל-{customer.name}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-white/60 hover:bg-white/10 hover:text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* AI thinking phase */}
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
                מנתח את התיק של {customer.name} ומכין הודעה מותאמת אישית
              </p>

              {/* Thinking steps */}
              <div className="space-y-2 text-right">
                {AI_THINKING_STEPS.map((step, idx) => {
                  const isDone = idx < thinkingStep;
                  const isActive = idx === thinkingStep;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 px-4 py-2 rounded-md transition-all duration-300 ${
                        isActive
                          ? "bg-gold/10 border-r-2 border-gold"
                          : isDone
                            ? "opacity-60"
                            : "opacity-30"
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

        {/* Typing / Done phase */}
        {(phase === "typing" || phase === "done") && (
          <>
            {/* Customer context bar */}
            <div className="flex items-center gap-4 border-b border-border bg-cream/50 px-6 py-3 flex-shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-deep text-cream font-display font-bold">
                {customer.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="flex-1">
                <div className="font-display font-bold text-navy-deep text-sm">{customer.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>{customer.age} · {customer.city}</span>
                  <span>·</span>
                  <span>{customer.product}</span>
                  <span>·</span>
                  <span className="font-semibold text-gold">{customer.status}</span>
                </div>
              </div>
              <div className="text-left">
                <div className="label-tag text-[9px] text-muted-foreground">צבירה</div>
                <div className="font-display font-bold text-navy-deep mono-num">{customer.accumulation.toLocaleString("he-IL")} ₪</div>
              </div>
            </div>

            {/* Message body */}
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
                <div className={`whitespace-pre-line text-sm leading-relaxed text-foreground/90 font-sans ${
                  !isEmail ? "bg-gradient-to-bl from-emerald-50 to-emerald-100/60 border border-emerald-200/60 rounded-2xl rounded-tr-sm p-4 shadow-sm" : ""
                }`}>
                  {typedBody}
                  {phase === "typing" && (
                    <span className="inline-block w-0.5 h-4 bg-gold animate-pulse ml-1 align-middle" />
                  )}
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between border-t border-border bg-cream/30 px-6 py-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                {phase === "done" && (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700">ההודעה מוכנה למשלוח</span>
                    <span className="label-tag text-[9px] text-muted-foreground mr-3">
                      ⏱ ניסוח: 1.2 שניות
                    </span>
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
