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

          {/* Light intro form */}
          <div>
            <h3 className="font-display text-base font-bold text-navy-deep mb-3 tracking-tight flex items-center gap-2">
              <div className="h-px w-6 bg-gold" />
              השאירו פרטים לשיחה קצרה
            </h3>

            {submitState === "ok" ? (
              <div className="rounded-md border border-emerald-300 bg-emerald-50 p-5 text-center space-y-3">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h4 className="font-display text-lg font-bold text-emerald-800">
                  קיבלנו! נחזור אליכם תוך יום עסקים ✨
                </h4>
                <p className="text-sm text-emerald-700/90 max-w-md mx-auto leading-relaxed">
                  ניצור איתכם קשר לתיאום שיחת {contactMethod === "phone" ? "טלפון" : "Zoom"} של 30 דקות. אם זה דחוף — אפשר לפנות ישירות:
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
                  <a
                    href={`mailto:${ANAT_EMAIL}`}
                    className="rounded bg-navy-deep text-cream px-4 py-2 text-xs font-bold hover:bg-navy transition"
                  >
                    שליחת מייל ישירה
                  </a>
                  <a
                    href={`https://wa.me/${ANAT_WHATSAPP_DIGITS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded bg-emerald-700 text-white px-4 py-2 text-xs font-bold hover:bg-emerald-800 transition"
                  >
                    WhatsApp לענת
                  </a>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded border border-border/70 bg-white px-4 py-2 text-xs font-bold text-navy-deep hover:bg-cream transition"
                  >
                    שליחת בקשה נוספת
                  </button>
                </div>
              </div>
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
      className="group flex items-center gap-2 rounded-md border border-border/70 bg-white px-3 py-2.5 text-xs font-semibold text-navy-deep transition-all hover:border-gold hover:bg-gold/10 hover:shadow-md min-h-[44px]"
    >
      <Icon className="h-4 w-4 text-gold flex-shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      <ExternalLink className="h-3 w-3 opacity-40 group-hover:opacity-100 transition" />
    </a>
  );
}
