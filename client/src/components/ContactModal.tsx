// Editorial Fintech | מודאל "קבעו שיחת היכרות של 30 דקות" — שיחת היכרות קצרה ולא פורמלית
// פרטים: ענת גרינברג (anathemell@gmail.com, 054-739-5570), יפעת איתן (054-563-3661)
// קישורים: SPARK AI website, Facebook, כרטיס ביקור דיגיטלי
import { useEffect, useState } from "react";
import {
  X,
  Mail,
  Phone,
  Send,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Facebook,
  Globe,
  CreditCard,
  Sparkles,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

const ANAT_EMAIL = "anathemell@gmail.com";
const ANAT_WHATSAPP = "054-739-5570";
const ANAT_WHATSAPP_DIGITS = "972547395570";
const IFAT_WHATSAPP = "054-563-3661";
const IFAT_WHATSAPP_DIGITS = "972545633661";

const SOCIAL_LINKS = {
  website: "https://spark-ai-sprinkle-ai-and-automat-30332645.base44.app/Main",
  facebook: "https://www.facebook.com/people/Spark-Ai/61572580830662/",
  digitalCard: "https://get-marketing.co.il/spark-ai/",
};

type SubmitState = "idle" | "submitting" | "ok" | "error";
type ContactMethod = "phone" | "zoom";

export function ContactModal({ open, onClose }: ContactModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactMethod, setContactMethod] = useState<ContactMethod>("phone");
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const sendMutation = trpc.contact.send.useMutation({
    onSuccess: () => setSubmitState("ok"),
    onError: (err) => {
      setErrorMessage(err.message ?? "שליחת ההודעה נכשלה. נסו שוב או שלחו וואטסאפ ישירות.");
      setSubmitState("error");
    },
  });

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handler);
    };
  }, [open, onClose]);

  if (!open) return null;

  const isValidPhone = (v: string) => /^[\d\s\-+()]{7,}$/.test(v.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !isValidPhone(phone)) {
      setErrorMessage("אנא מלאו שם וטלפון תקין לפני השליחה.");
      setSubmitState("error");
      return;
    }

    setSubmitState("submitting");
    setErrorMessage("");
    sendMutation.mutate({
      name: name.trim(),
      phone: phone.trim(),
      contactMethod: contactMethod === "phone" ? "טלפון" : "Zoom",
      email: email.trim() || undefined,
      interest: interest.trim() || undefined,
      source: "SPARK Quality Demo · ContactModal",
    });
  };

  const handleReset = () => {
    setName("");
    setPhone("");
    setContactMethod("phone");
    setEmail("");
    setInterest("");
    setErrorMessage("");
    setSubmitState("idle");
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-6 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy-deep/85 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-cream rounded-md shadow-2xl shadow-navy/40 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border/60 bg-cream/95 backdrop-blur px-5 sm:px-8 py-4 sm:py-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px w-10 bg-gold" />
              <span className="label-tag text-gold text-[10px]">בואו נדבר · SPARK AI</span>
            </div>
            <h2
              id="contact-modal-title"
              className="font-display text-2xl sm:text-3xl font-black text-navy-deep tracking-tight leading-tight"
            >
              קבעו שיחת היכרות של 30 דקות
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              שיחת טלפון או Zoom קצרה כדי להבין את הצרכים שלכם ולבדוק התאמה ל-SPARK AI.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-md border border-border/70 bg-white p-2 text-navy-deep transition-all hover:border-navy-deep hover:bg-navy-deep hover:text-cream"
            aria-label="סגור"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-8 py-5 sm:py-6 space-y-6">
          {/* Value bullets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <ValueBullet text="מבט-על על פוטנציאל הערך אצלכם" />
            <ValueBullet text="בדיקת התאמה לפיילוט של 5–10 סוכנים" />
            <ValueBullet text="כיוון פרקטי ל-2 תהליכים שכדאי לאוטומט" />
          </div>

          {/* Direct contact cards */}
          <div>
            <h3 className="font-display text-base font-bold text-navy-deep mb-3 tracking-tight flex items-center gap-2">
              <div className="h-px w-6 bg-gold" />
              פרטי התקשרות ישירים
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Anat */}
              <div className="rounded-md border-2 border-gold/30 bg-white p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center text-navy-deep font-display font-black text-sm">
                    ענ
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-base font-bold text-navy-deep">ענת גרינברג</div>
                    <div className="text-[11px] text-muted-foreground leading-tight">
                      מנכ״לית · מומחית אוטומציה ו-AI
                    </div>
                  </div>
                </div>
                <a
                  href={`mailto:${ANAT_EMAIL}`}
                  className="flex items-center gap-2 rounded border border-border/60 bg-cream/60 px-3 py-2 text-xs text-navy-deep hover:bg-navy-deep hover:text-cream hover:border-navy-deep transition-all min-h-[40px]"
                >
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate" dir="ltr">{ANAT_EMAIL}</span>
                </a>
                <a
                  href={`https://wa.me/${ANAT_WHATSAPP_DIGITS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded border border-border/60 bg-cream/60 px-3 py-2 text-xs text-navy-deep hover:bg-emerald-700 hover:text-white hover:border-emerald-700 transition-all min-h-[40px]"
                >
                  <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                  <span dir="ltr">{ANAT_WHATSAPP}</span>
                  <span className="ms-auto text-[10px] font-bold uppercase tracking-wider opacity-70">
                    WhatsApp
                  </span>
                </a>
              </div>

              {/* Ifat */}
              <div className="rounded-md border-2 border-gold/30 bg-white p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center text-navy-deep font-display font-black text-sm">
                    יפ
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-base font-bold text-navy-deep">יפעת איתן</div>
                    <div className="text-[11px] text-muted-foreground leading-tight">
                      מייסדת ומנכ״לית שותפה
                    </div>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${IFAT_WHATSAPP_DIGITS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded border border-border/60 bg-cream/60 px-3 py-2 text-xs text-navy-deep hover:bg-emerald-700 hover:text-white hover:border-emerald-700 transition-all min-h-[40px]"
                >
                  <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                  <span dir="ltr">{IFAT_WHATSAPP}</span>
                  <span className="ms-auto text-[10px] font-bold uppercase tracking-wider opacity-70">
                    WhatsApp
                  </span>
                </a>
              </div>
            </div>
          </div>

          {/* Light intro form OR success panel */}
          <div>
            <h3 className="font-display text-base font-bold text-navy-deep mb-3 tracking-tight flex items-center gap-2">
              <div className="h-px w-6 bg-gold" />
              {submitState === "ok" ? "ההודעה נשלחה בהצלחה" : "השאירו פרטים לשיחה קצרה"}
            </h3>

            {submitState === "ok" ? (
              <SuccessPanel
                contactMethod={contactMethod}
                anatEmail={ANAT_EMAIL}
                anatWhatsappDigits={ANAT_WHATSAPP_DIGITS}
                onClose={onClose}
                onReset={handleReset}
              />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Row 1: Name + Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-[11px] font-bold tracking-wider text-navy-deep/70 mb-1.5"
                    >
                      שם פרטי <span className="text-gold">*</span>
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="ישראל"
                      className="w-full rounded border border-border/70 bg-white px-3 py-2.5 text-sm text-navy-deep focus:border-gold focus:ring-2 focus:ring-gold/30 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="contact-phone"
                      className="block text-[11px] font-bold tracking-wider text-navy-deep/70 mb-1.5"
                    >
                      טלפון <span className="text-gold">*</span>
                    </label>
                    <input
                      id="contact-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="050-1234567"
                      dir="ltr"
                      className="w-full rounded border border-border/70 bg-white px-3 py-2.5 text-sm text-navy-deep focus:border-gold focus:ring-2 focus:ring-gold/30 focus:outline-none transition text-right"
                    />
                  </div>
                </div>

                {/* Row 2: How to talk (phone/zoom) */}
                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-navy-deep/70 mb-1.5">
                    איך נוח לכם לדבר? <span className="text-gold">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <ContactMethodOption
                      value="phone"
                      current={contactMethod}
                      onSelect={setContactMethod}
                      label="טלפון"
                      icon={Phone}
                    />
                    <ContactMethodOption
                      value="zoom"
                      current={contactMethod}
                      onSelect={setContactMethod}
                      label="Zoom"
                      icon={Sparkles}
                    />
                  </div>
                </div>

                {/* Row 3: Email (optional) */}
                <div>
                  <label
                    htmlFor="contact-email"
                    className="block text-[11px] font-bold tracking-wider text-navy-deep/70 mb-1.5"
                  >
                    אימייל <span className="text-muted-foreground/60 font-normal">(רשות)</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    dir="ltr"
                    className="w-full rounded border border-border/70 bg-white px-3 py-2.5 text-sm text-navy-deep focus:border-gold focus:ring-2 focus:ring-gold/30 focus:outline-none transition text-right"
                  />
                </div>

                {/* Row 4: Interest (optional) */}
                <div>
                  <label
                    htmlFor="contact-interest"
                    className="block text-[11px] font-bold tracking-wider text-navy-deep/70 mb-1.5"
                  >
                    מה תרצו לבדוק בשיחה? <span className="text-muted-foreground/60 font-normal">(רשות)</span>
                  </label>
                  <input
                    id="contact-interest"
                    type="text"
                    value={interest}
                    onChange={(e) => setInterest(e.target.value)}
                    placeholder="ניתוח דוחות / סיכומי פגישות / אוטומציות / אחר"
                    className="w-full rounded border border-border/70 bg-white px-3 py-2.5 text-sm text-navy-deep focus:border-gold focus:ring-2 focus:ring-gold/30 focus:outline-none transition"
                  />
                </div>

                {submitState === "error" && (
                  <div className="flex items-start gap-2 rounded border border-red-300 bg-red-50 p-3 text-xs text-red-800">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{errorMessage || "אנא מלאו שם וטלפון לפני השליחה."}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={submitState === "submitting" || sendMutation.isPending}
                    className="group flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded bg-navy-deep px-6 py-3 text-sm font-bold text-cream transition-all hover:bg-navy hover:shadow-2xl hover:shadow-navy/20 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    {submitState === "submitting" || sendMutation.isPending ? (
                      <>
                        <Sparkles className="h-4 w-4 animate-spin text-gold" />
                        שולח...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 text-gold" />
                        תאמו שיחה קצרה
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-muted-foreground sm:flex-1 leading-relaxed flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-gold flex-shrink-0" />
                    ללא התחייבות, עם חזרה תוך יום עסקים.
                  </p>
                </div>
              </form>
            )}
          </div>

          {/* Footer links — clean, no header label */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border/40">
            <SocialLink href={SOCIAL_LINKS.website} icon={Globe} label="אתר רשמי" />
            <SocialLink
              href={SOCIAL_LINKS.digitalCard}
              icon={CreditCard}
              label="כרטיס דיגיטלי"
            />
            <SocialLink href={SOCIAL_LINKS.facebook} icon={Facebook} label="Facebook" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------- */
/* Success panel — animated celebration         */
/* -------------------------------------------- */
function SuccessPanel({
  contactMethod,
  anatEmail,
  anatWhatsappDigits,
  onClose,
  onReset,
}: {
  contactMethod: ContactMethod;
  anatEmail: string;
  anatWhatsappDigits: string;
  onClose: () => void;
  onReset: () => void;
}) {
  // Eight little confetti specks bursting outward in a circle
  const confetti = [
    { x: 60, y: -70, rot: 220, color: "bg-gold", delay: 0 },
    { x: -65, y: -50, rot: -180, color: "bg-emerald-500", delay: 60 },
    { x: 80, y: 30, rot: 140, color: "bg-navy-deep", delay: 120 },
    { x: -80, y: 20, rot: -110, color: "bg-gold", delay: 40 },
    { x: 30, y: -90, rot: 260, color: "bg-emerald-600", delay: 100 },
    { x: -30, y: -85, rot: -240, color: "bg-gold/80", delay: 80 },
    { x: 95, y: -10, rot: 200, color: "bg-emerald-500", delay: 140 },
    { x: -95, y: -15, rot: -200, color: "bg-navy", delay: 20 },
  ];

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative overflow-hidden rounded-md border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-cream to-emerald-50/40 p-6 sm:p-8 text-center animate-success-pop"
    >
      {/* Decorative confetti */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {confetti.map((c, i) => (
          <span
            key={i}
            className={`absolute h-2 w-2 rounded-sm ${c.color} animate-confetti`}
            style={{
              ["--confetti-x" as string]: `${c.x}px`,
              ["--confetti-y" as string]: `${c.y}px`,
              ["--confetti-rot" as string]: `${c.rot}deg`,
              animationDelay: `${c.delay + 350}ms`,
            }}
          />
        ))}
      </div>

      {/* Animated check */}
      <div className="relative mx-auto mb-4 h-20 w-20 sm:h-24 sm:w-24">
        {/* Concentric pulse rings */}
        <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-success-ring" />
        <span
          className="absolute inset-0 rounded-full bg-emerald-400/20 animate-success-ring"
          style={{ animationDelay: "350ms" }}
        />
        {/* Inner solid disc */}
        <div className="relative flex h-full w-full items-center justify-center rounded-full bg-emerald-600 shadow-lg shadow-emerald-600/40 animate-check-circle">
          <svg viewBox="0 0 52 52" className="h-12 w-12 sm:h-14 sm:w-14">
            <path
              d="M14 27 L23 36 L40 18"
              fill="none"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-check-draw"
            />
          </svg>
        </div>
      </div>

      <div className="animate-success-text space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          ההודעה התקבלה
        </div>
        <h4 className="font-display text-2xl sm:text-3xl font-black text-emerald-900 tracking-tight leading-tight">
          תודה! קיבלנו את הפרטים.
        </h4>
        <p className="text-sm text-emerald-800/90 max-w-md mx-auto leading-relaxed">
          נחזור אליכם תוך <span className="font-bold">יום עסקים</span> לתיאום שיחת{" "}
          {contactMethod === "phone" ? "טלפון" : "Zoom"} של 30 דקות.
        </p>
        <p className="text-xs text-emerald-700/80 max-w-md mx-auto leading-relaxed">
          אישור על הפנייה נשלח לתיבת הצוות שלנו · אם זה דחוף, אפשר לפנות ישירות:
        </p>
      </div>

      {/* CTAs */}
      <div className="relative mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 animate-success-text" style={{ animationDelay: "0.85s" }}>
        <a
          href={`mailto:${anatEmail}`}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-navy-deep text-cream px-4 py-2.5 text-xs font-bold hover:bg-navy hover:shadow-lg hover:shadow-navy-deep/30 transition"
        >
          <Mail className="h-3.5 w-3.5 text-gold" />
          שליחת מייל ישירה
        </a>
        <a
          href={`https://wa.me/${anatWhatsappDigits}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold hover:bg-emerald-800 hover:shadow-lg hover:shadow-emerald-700/30 transition"
        >
          <Phone className="h-3.5 w-3.5" />
          WhatsApp לענת
        </a>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-emerald-300 bg-white px-4 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition"
        >
          שליחת בקשה נוספת
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border/70 bg-white px-4 py-2.5 text-xs font-bold text-navy-deep hover:bg-cream transition"
        >
          <X className="h-3.5 w-3.5" />
          סגירה
        </button>
      </div>
    </div>
  );
}

function ValueBullet({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded border border-gold/25 bg-gold/5 px-3 py-2 text-[12px] text-navy-deep leading-snug">
      <Clock className="h-3.5 w-3.5 text-gold flex-shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}

function ContactMethodOption({
  value,
  current,
  onSelect,
  label,
  icon: Icon,
}: {
  value: ContactMethod;
  current: ContactMethod;
  onSelect: (v: ContactMethod) => void;
  label: string;
  icon: typeof Phone;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`flex items-center justify-center gap-2 rounded border-2 px-3 py-2.5 text-sm font-bold transition-all min-h-[44px] ${
        active
          ? "border-gold bg-gold/15 text-navy-deep shadow-md shadow-gold/20"
          : "border-border/60 bg-white text-navy-deep/70 hover:border-gold/50 hover:bg-gold/5"
      }`}
      aria-pressed={active}
    >
      <Icon className={`h-4 w-4 ${active ? "text-gold" : "text-muted-foreground"}`} />
      {label}
    </button>
  );
}

function SocialLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Globe;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between gap-2 rounded border border-border/60 bg-white px-3 py-2.5 text-xs font-bold text-navy-deep hover:border-gold hover:bg-gold/5 transition-all min-h-[40px]"
    >
      <span className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-gold" />
        {label}
      </span>
      <ExternalLink className="h-3 w-3 text-muted-foreground/60 group-hover:text-gold transition" />
    </a>
  );
}
