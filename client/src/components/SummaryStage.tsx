// Editorial Fintech | מסך סיכום סופי — פריסה גלילה במלואו, ללא חיתוך פוטר/טקסטים
import { useMemo, useState } from "react";
import { ArrowLeft, RotateCcw, Calendar, X, QrCode } from "lucide-react";
import { Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { ContactModal } from "./ContactModal";
import type { ParsedReport } from "@/lib/parseReport";

interface SummaryStageProps {
  onReset: () => void;
  parsed?: ParsedReport | null;
  /** LLM analysis JSON returned by reports.analyze (Surense Skill v2). */
  analysis?: unknown;
}

export function SummaryStage({ onReset, parsed, analysis }: SummaryStageProps) {
  // Optional KPIs from LLM analysis override local heuristics when present.
  const llmKpis = (analysis as { kpis?: Record<string, number>; summary_he?: string } | null)?.kpis;
  const llmSummaryHe = (analysis as { summary_he?: string } | null)?.summary_he;

  // Derive dynamic numbers when a real file was uploaded.
  const totalFlagsLocal = parsed
    ? parsed.stats.vipCustomers +
      parsed.stats.amendment190 +
      parsed.stats.liquidFunds +
      parsed.stats.lowYield +
      parsed.stats.riskFlags +
      parsed.stats.endingDiscount +
      parsed.stats.coverageGaps
    : 1071;
  const totalFlags = (llmKpis?.total_flags as number | undefined) ?? totalFlagsLocal;
  const actionsTaken = parsed ? Math.round(totalFlags * 0.55) : 589;
  const potentialMNum = llmKpis?.potential_revenue
    ? llmKpis.potential_revenue / 1_000_000
    : parsed
      ? parsed.stats.potentialRevenue / 1_000_000
      : 2.84;
  const potentialM = potentialMNum.toFixed(2);
  const customersCount = (llmKpis?.total_clients as number | undefined) ?? (parsed ? parsed.customerCount : 1247);
  const [contactOpen, setContactOpen] = useState(false);
  // Build a QR target URL pointing to the public landing with auto-opened contact form.
  // This works both when the demo is hosted on the deployed domain and on the dev preview,
  // because we read window.location.origin at render-time on the client.
  const contactQrUrl = useMemo(() => {
    if (typeof window === "undefined") return "https://sparkquality-zqvpyevd.manus.space/?contact=1";
    return `${window.location.origin}/?contact=1`;
  }, []);

  return (
    <div className="relative min-h-full w-full animate-fade-in lg:overflow-hidden flex items-center">
      {/* Subtle background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-bl from-cream via-ivory to-white" />
      <div className="absolute -top-32 -left-32 -z-10 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 -z-10 h-96 w-96 rounded-full bg-navy/10 blur-3xl" />

      <div className="relative w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-4 lg:py-6 flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-center">
          {/* RIGHT (RTL primary): content */}
          <div className="lg:col-span-7 min-h-0 lg:overflow-hidden">
            <div className="max-w-2xl">
              <div className="mb-2 flex items-center gap-3 animate-fade-up">
                <div className="h-px w-16 bg-gold" />
                <span className="label-tag text-gold">סיכום הדמו · SPARK AI</span>
              </div>

              <h1
                className="font-display text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black leading-[0.95] text-navy-deep tracking-tighter animate-fade-up"
                style={{ animationDelay: "0.1s" }}
              >
                זה כל
                <br />
                הסיפור<span className="text-gold">.</span>
              </h1>

              <p
                className="mt-2 text-xs leading-relaxed text-muted-foreground font-light max-w-xl animate-fade-up"
                style={{ animationDelay: "0.2s" }}
              >
                ראינו איך תוך פחות מדקה, פלטפורמת SPARK AI הופכת דוח אקסל "מת" לרשימת
                פעולות עסקיות חיה, עם פוטנציאל הכנסה של{" "}
                <span className="font-semibold text-navy-deep">{potentialM} מיליון ₪</span>{parsed ? ` (מהקובץ: ${parsed.fileName})` : ""}.
              </p>

              {llmSummaryHe && (
                <div
                  className="mt-2 rounded-md border border-gold/40 bg-gold/5 px-3 py-2 text-xs leading-relaxed text-navy-deep animate-fade-up"
                  style={{ animationDelay: "0.25s" }}
                >
                  <div className="label-tag text-[10px] text-gold mb-1">תובנת AI מהניתוח</div>
                  {llmSummaryHe}
                </div>
              )}

              {/* Key metrics */}
              <div
                className="mt-2 grid grid-cols-2 lg:grid-cols-4 gap-2 border-y border-border/60 py-2 animate-fade-up"
                style={{ animationDelay: "0.3s" }}
              >
                {[
                  { label: "זמן ניתוח", value: "47", unit: "שניות", sub: "במקום 3 שבועות" },
                  { label: "דגלים זוהו", value: totalFlags.toLocaleString("he-IL"), unit: "", sub: `ב-${customersCount.toLocaleString("he-IL")} לקוחות` },
                  { label: "פעולות בוצעו", value: actionsTaken.toLocaleString("he-IL"), unit: "", sub: "אוטומטיות, מותאמות" },
                  { label: "פוטנציאל", value: potentialM, unit: "M ₪", sub: "הכנסה מיידית" },
                ].map((m, i) => (
                  <div key={i}>
                    <div className="label-tag text-[10px] text-gold mb-1">{m.label}</div>
                    <div className="display-number text-2xl font-black text-navy-deep">
                      {m.value}
                      {m.unit && <span className="text-base text-gold mr-1">{m.unit}</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Next steps */}
              <div className="mt-2 animate-fade-up" style={{ animationDelay: "0.4s" }}>
                <h3 className="font-display text-base font-bold text-navy-deep mb-2 tracking-tight">
                  השלבים הבאים שלכם
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { num: "01", text: "פיילוט עם 5-10 סוכנים נבחרים" },
                    { num: "02", text: "התמקדות ב-2 תהליכים: ניתוח דוחות + סיכומי פגישות" },
                    { num: "03", text: "מדידת ROI לאחר 30 יום והרחבה לכלל הסוכנות" },
                  ].map((step, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-start gap-1 rounded-md border border-gold/40 bg-white/95 p-2 shadow-sm transition-all hover:border-gold hover:shadow-md"
                    >
                      <span className="font-display text-base font-black text-gold mono-num leading-none">
                        {step.num}
                      </span>
                      <span className="text-xs text-navy-deep leading-snug font-semibold">
                        {step.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div
                className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 animate-fade-up"
                style={{ animationDelay: "0.5s" }}
              >
                <button
                  type="button"
                  onClick={onReset}
                  className="group flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-md bg-navy-deep px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-navy hover:shadow-2xl hover:shadow-navy/20"
                >
                  <RotateCcw className="h-4 w-4 transition-transform group-hover:-rotate-180 duration-500" />
                  הפעל את הדמו מההתחלה
                </button>
                <button
                  type="button"
                  onClick={() => setContactOpen(true)}
                  className="group flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-gold/90 hover:shadow-2xl hover:shadow-gold/20"
                >
                  <Calendar className="h-4 w-4" />
                  קבעו פגישת אפיון
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                </button>
                <Link
                  href="/"
                  className="group flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-md border border-navy-deep/20 bg-white px-5 py-2.5 text-sm font-bold text-navy-deep transition-all hover:bg-navy-deep/5 hover:border-navy-deep/40"
                >
                  <X className="h-4 w-4" />
                  יציאה מהדמו
                </Link>
              </div>

              {/* QR-code card — invites attendees to scan and open the contact form on their phones */}
              <div
                className="mt-3 flex flex-row items-center gap-3 rounded-md border border-gold/40 bg-white/95 p-2.5 shadow-md animate-fade-up"
                style={{ animationDelay: "0.55s" }}
              >
                <div className="flex-shrink-0 rounded-md bg-white p-1.5 shadow-inner">
                  <QRCodeSVG
                    value={contactQrUrl}
                    size={72}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#06101F"
                    aria-label="QR ליצירת קשר עם SPARK AI"
                  />
                </div>
                <div className="flex-1 text-right">
                  <div className="flex items-center gap-2 mb-0.5">
                    <QrCode className="h-3.5 w-3.5 text-gold" />
                    <span className="label-tag text-[9px] text-gold tracking-[0.3em]">
                      סרקו · השאירו פרטים
                    </span>
                  </div>
                  <h4 className="font-display text-sm font-black text-navy-deep mb-0.5">
                    רוצים שנחזור אליכם?
                  </h4>
                  <p className="text-[10px] text-navy-deep/75 leading-snug">
                    סרקו את הקוד — יפעת או ענת יחזרו אליכם תוך יום עסקים.
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/** LEFT: Editorial brand statement + testimonial */}
          <aside className="lg:col-span-5 lg:flex lg:flex-col gap-3 min-h-0">
            {/* Brand statement card */}
            <div className="relative overflow-hidden rounded-md shadow-2xl shadow-navy/30 flex-1 min-h-0">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-navy-deep to-[#152844]" />
              <div className="absolute inset-3 border border-gold/30 rounded-md pointer-events-none" />
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 30%, rgba(201, 169, 97, 0.4) 0%, transparent 8%), radial-gradient(circle at 80% 70%, rgba(201, 169, 97, 0.3) 0%, transparent 6%), radial-gradient(circle at 50% 50%, rgba(201, 169, 97, 0.2) 0%, transparent 10%)",
                }}
              />
              <div
                className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
                }}
              />

              {/* Decorative corner ornaments */}
              <div className="absolute top-6 right-6 h-10 w-10 border-t-2 border-r-2 border-gold/40 pointer-events-none" />
              <div className="absolute top-6 left-6 h-10 w-10 border-t-2 border-l-2 border-gold/40 pointer-events-none" />
              <div className="absolute bottom-6 right-6 h-10 w-10 border-b-2 border-r-2 border-gold/40 pointer-events-none" />
              <div className="absolute bottom-6 left-6 h-10 w-10 border-b-2 border-l-2 border-gold/40 pointer-events-none" />

              {/* Content - flow naturally so no text gets clipped */}
              <div className="relative h-full flex flex-col items-center justify-center px-6 sm:px-8 py-6 text-center gap-3">
                <div
                  className="flex items-center gap-3 animate-fade-in flex-wrap justify-center"
                  style={{ animationDelay: "0.3s" }}
                >
                  <div className="h-px w-8 bg-gold/60" />
                  <span className="label-tag text-gold-soft tracking-[0.35em] text-[10px]">
                    THE FUTURE OF INSURANCE
                  </span>
                  <div className="h-px w-8 bg-gold/60" />
                </div>

                <h2
                  className="font-display font-black text-white text-2xl sm:text-3xl lg:text-4xl xl:text-5xl leading-[0.95] tracking-tighter animate-fade-up"
                  style={{ animationDelay: "0.4s" }}
                >
                  <span className="text-gold">הקסם</span>
                  <br />
                  של ה-AI.
                </h2>

                <div
                  className="flex items-center gap-4 animate-fade-in"
                  style={{ animationDelay: "0.6s" }}
                >
                  <div className="h-px w-10 bg-gradient-to-r from-transparent to-gold" />
                  <span className="font-display text-3xl font-thin text-gold/70">×</span>
                  <div className="h-px w-10 bg-gradient-to-l from-transparent to-gold" />
                </div>

                <h2
                  className="font-display font-black text-white text-2xl sm:text-3xl lg:text-4xl xl:text-5xl leading-[0.95] tracking-tighter animate-fade-up"
                  style={{ animationDelay: "0.7s" }}
                >
                  <span className="text-gold">העוצמה</span>
                  <br />
                  שלכם.
                </h2>

                {/* Closing manifesto - now in normal flow, never clipped */}
                <div
                  className="mt-2 flex flex-col items-center gap-3 animate-fade-up max-w-md"
                  style={{ animationDelay: "0.9s" }}
                >
                  <div className="h-px w-48 bg-gradient-to-r from-transparent via-gold to-transparent" />
                  <p className="font-display-light text-white text-base sm:text-lg lg:text-xl text-center tracking-tight leading-relaxed">
                    אתם לא צריכים{" "}
                    <span className="text-gold/50 line-through decoration-gold/70">עוד זמן</span>.
                    <br />
                    אתם צריכים <span className="text-gold font-bold">יותר פוקוס</span>.
                  </p>
                  <p className="font-display-light text-gold-soft/60 text-[11px] sm:text-xs tracking-[0.2em] italic">
                    "You don't need more time. You need more focus."
                  </p>
                  <p className="label-tag text-[10px] text-white/50 tracking-[0.3em]">SPARK AI</p>
                </div>
              </div>
            </div>

            {/* Testimonial card */}
            <div className="animate-fade-up z-10" style={{ animationDelay: "0.9s" }}>
              <div className="bg-white rounded-md p-5 shadow-2xl shadow-navy/40 border border-gold/30">
                <div className="flex gap-3 items-start">
                  <div className="text-5xl font-display text-gold leading-none flex-shrink-0">"</div>
                  <div className="pt-1 flex-1 min-w-0">
                    <p className="font-display text-base lg:text-lg leading-snug text-navy-deep tracking-tight">
                      זה לא רק כלי נוסף. זו <span className="text-gold font-black">מהפכה שקטה</span> בדרך
                      שאני עובדת.
                    </p>
                    <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-gold to-gold-soft flex items-center justify-center text-navy-deep font-display font-black text-sm">
                        רא
                      </div>
                      <div>
                        <div className="text-sm font-bold text-navy-deep">רונית אבני</div>
                        <div className="text-xs text-muted-foreground">סוכנת ביטוח בכירה</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Floating exit button — visible on every variant of /demo (including ?clean=true).
           Uses a real anchor so users can also middle-click to open in a new tab if they want. */}
        <Link
          href="/"
          className="fixed top-4 left-4 z-[80] inline-flex items-center gap-2 rounded-full border border-navy-deep/40 bg-white/95 px-4 py-2 text-xs font-bold text-navy-deep shadow-lg backdrop-blur-md transition-all hover:bg-navy-deep hover:text-white"
          aria-label="יציאה מהדמו וחזרה לאתר"
        >
          <X className="h-3.5 w-3.5" />
          יציאה מהדמו
        </Link>

        {/* Footer (compact line, fits 100vh) */}
        <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between gap-1 flex-shrink-0">
          <p className="text-[10px] text-muted-foreground">
            הדמו מבוסס על דוח "מוצרים בניהול" אמיתי ממערכת surense · נתונים אנונימיים
          </p>
          <p className="text-[10px] text-muted-foreground">© 2026 SPARK AI</p>
        </div>
      </div>

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
