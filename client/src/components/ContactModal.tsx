// Editorial Fintech | מודאל "קבעו פגישת אפיון" — פרטי קשר + טופס יצירת קשר
// פרטים: ענת (anathemell@gmail.com, 054-739-5570), יפעת (0545633661)
// קישורים: SPARK AI website, Facebook, LinkedIn, כרטיס ביקור דיגיטלי
import { useEffect, useState } from "react";
import {
  X,
  Mail,
  Phone,
  Send,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Linkedin,
  Facebook,
  Globe,
  CreditCard,
  Sparkles,
} from "lucide-react";

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
  website: "https://get-marketing.co.il/spark-ai/",
  facebook: "https://www.facebook.com/people/Spark-Ai/61572580830662/",
  digitalCard: "https://spark-ai-sprinkle-ai-and-automat-30332645.base44.app/Main",
  linkedin: "https://www.linkedin.com/company/spark-ai-il/",
};

type SubmitState = "idle" | "submitting" | "ok" | "error";

export function ContactModal({ open, onClose }: ContactModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

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

  const isValidEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !isValidEmail(email)) {
      setSubmitState("error");
      return;
    }

    setSubmitState("submitting");

    // Open user's mail client with a pre-filled message to anat@
    const subject = encodeURIComponent("פגישת אפיון · SPARK AI Quality");
    const body = encodeURIComponent(
      [
        `שם: ${name}`,
        `מייל: ${email}`,
        phone ? `טלפון: ${phone}` : "",
        "",
        "הודעה:",
        message || "(ללא הודעה)",
        "",
        "—",
        "נשלח דרך SPARK AI Quality Demo",
      ]
        .filter(Boolean)
        .join("\n")
    );

    // Use mailto: to leverage the user's email client (no backend needed for demo)
    const mailto = `mailto:${ANAT_EMAIL}?subject=${subject}&body=${body}`;
    window.location.href = mailto;

    setTimeout(() => {
      setSubmitState("ok");
    }, 400);
  };

  const handleReset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setMessage("");
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
              קבעו פגישת אפיון
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              שיחה קצרה (30 דקות) להבנת הצרכים שלכם והתאמת SPARK AI לסוכנות שלכם.
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
                  <div>
                    <div className="font-display text-base font-bold text-navy-deep">ענת המל</div>
                    <div className="text-[11px] text-muted-foreground">מייסדת · SPARK AI</div>
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
                  <div>
                    <div className="font-display text-base font-bold text-navy-deep">יפעת איתן</div>
                    <div className="text-[11px] text-muted-foreground">שותפה · SPARK AI</div>
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

          {/* Contact form */}
          <div>
            <h3 className="font-display text-base font-bold text-navy-deep mb-3 tracking-tight flex items-center gap-2">
              <div className="h-px w-6 bg-gold" />
              שלחו לנו הודעה
            </h3>

            {submitState === "ok" ? (
              <div className="rounded-md border border-emerald-300 bg-emerald-50 p-5 text-center space-y-3">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h4 className="font-display text-lg font-bold text-emerald-800">
                  המייל נפתח בקליינט שלך
                </h4>
                <p className="text-sm text-emerald-700/90 max-w-md mx-auto leading-relaxed">
                  אם נפתח לך תוכנת מייל — לחצי שלח. אחרת, אפשר ליצור קשר ישירות:
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
                    שליחת הודעה נוספת
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-[11px] font-bold tracking-wider text-navy-deep/70 mb-1.5"
                    >
                      שם מלא <span className="text-gold">*</span>
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="ישראל ישראלי"
                      className="w-full rounded border border-border/70 bg-white px-3 py-2.5 text-sm text-navy-deep focus:border-gold focus:ring-2 focus:ring-gold/30 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-[11px] font-bold tracking-wider text-navy-deep/70 mb-1.5"
                    >
                      מייל <span className="text-gold">*</span>
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      dir="ltr"
                      className="w-full rounded border border-border/70 bg-white px-3 py-2.5 text-sm text-navy-deep focus:border-gold focus:ring-2 focus:ring-gold/30 focus:outline-none transition text-right"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="contact-phone"
                    className="block text-[11px] font-bold tracking-wider text-navy-deep/70 mb-1.5"
                  >
                    טלפון (לא חובה)
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="050-1234567"
                    dir="ltr"
                    className="w-full rounded border border-border/70 bg-white px-3 py-2.5 text-sm text-navy-deep focus:border-gold focus:ring-2 focus:ring-gold/30 focus:outline-none transition text-right"
                  />
                </div>
                <div>
                  <label
                    htmlFor="contact-message"
                    className="block text-[11px] font-bold tracking-wider text-navy-deep/70 mb-1.5"
                  >
                    איך נוכל לעזור?
                  </label>
                  <textarea
                    id="contact-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="ספרי לנו על הסוכנות שלך, גודל הצוות והאתגרים העיקריים..."
                    className="w-full rounded border border-border/70 bg-white px-3 py-2.5 text-sm text-navy-deep focus:border-gold focus:ring-2 focus:ring-gold/30 focus:outline-none transition resize-none"
                  />
                </div>

                {submitState === "error" && (
                  <div className="flex items-start gap-2 rounded border border-red-300 bg-red-50 p-3 text-xs text-red-800">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>אנא מלאו שם ומייל תקין לפני השליחה.</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={submitState === "submitting"}
                    className="group flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded bg-navy-deep px-6 py-3 text-sm font-bold text-cream transition-all hover:bg-navy hover:shadow-2xl hover:shadow-navy/20 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    {submitState === "submitting" ? (
                      <>
                        <Sparkles className="h-4 w-4 animate-spin text-gold" />
                        שולח...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 text-gold" />
                        שלחו את ההודעה
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-muted-foreground sm:flex-1 leading-relaxed">
                    לחיצה תפתח את תוכנת המייל שלכם עם הודעה ערוכה אל{" "}
                    <span dir="ltr" className="font-mono text-navy-deep">
                      {ANAT_EMAIL}
                    </span>
                    .
                  </p>
                </div>
              </form>
            )}
          </div>

          {/* Social links */}
          <div>
            <h3 className="font-display text-base font-bold text-navy-deep mb-3 tracking-tight flex items-center gap-2">
              <div className="h-px w-6 bg-gold" />
              רשת SPARK AI
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <SocialLink href={SOCIAL_LINKS.website} icon={Globe} label="אתר רשמי" />
              <SocialLink
                href={SOCIAL_LINKS.digitalCard}
                icon={CreditCard}
                label="כרטיס דיגיטלי"
              />
              <SocialLink href={SOCIAL_LINKS.facebook} icon={Facebook} label="Facebook" />
              <SocialLink href={SOCIAL_LINKS.linkedin} icon={Linkedin} label="LinkedIn" />
            </div>
          </div>
        </div>
      </div>
    </div>
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
