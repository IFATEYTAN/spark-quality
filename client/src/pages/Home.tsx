// Home — Landing שיווקי בסגנון הסינמטי של הדמו
// רקע נייבי עמוק, חלקיקי זהב, טיפוגרפיה Rubik, כפתורי זהב
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ContactModal } from "@/components/ContactModal";
import { TopZoneNav } from "@/components/CinematicShell";
import {
  ArrowLeft,
  Play,
  Sparkles,
  TrendingUp,
  Users,
  Shield,
  Zap,
  Check,
  ChevronLeft,
} from "lucide-react";
import { LOGO, ASSETS } from "@/lib/demoData";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl, getSignupUrl } from "@/const";
import { PRICING_COPY, SPARK_QUALITY_PRICING } from "@shared/copy";

export default function Home() {
  const { isAuthenticated, user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // ⚠️ Round 86 decision: "/" is now the public landing page for everyone, all
  // the time — including authenticated users. The previous auto-redirect to
  // /dashboard hid the marketing site from the very people who paid for it,
  // and conflicted with the user's expectation that visiting the home URL
  // should always show the website ("האתר"). The useLocation/useAuth wires
  // are kept so that the inline CTAs ("כניסה למערכת") still work for logged-in
  // visitors, but no automatic navigation happens here anymore.
  void setLocation; // intentionally unused; kept to avoid wider refactor

  // Landing-page pricing toggle — mirrors the same control on /pricing so
  // visitors can flip between monthly (₪349) and annual-billed (₪297/mo)
  // before clicking "הצטרפו ל-SPARK Quality".
  const [pricingCycle, setPricingCycle] = useState<"monthly" | "yearly">("yearly");
  const isYearly = pricingCycle === "yearly";

  // חלקיקי זהב מאנימציה
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: 1 + Math.random() * 2.5,
        delay: Math.random() * 3,
        duration: 3 + Math.random() * 4,
        opacity: 0.25 + Math.random() * 0.5,
      })),
    []
  );

  const loginHref = getLoginUrl();
  const signupHref = getSignupUrl();
  // Open ContactModal automatically when ?contact=1 is present (used by demo QR code)
  const [contactOpen, setContactOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("contact") === "1") {
      setContactOpen(true);
    }
  }, []);

  // No more early return — the landing page is always rendered. Authenticated
  // users still see it; they can choose to enter the app via the explicit CTAs.
  void isAuthenticated; void user; void loading; // referenced only by markup below

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#06101F] text-white">
      {/* Cinematic background image */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src={ASSETS.hero}
          alt=""
          className="h-full w-full object-cover opacity-90"
        />
        {/* Strong gradient overlay so text is readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#06101F]/55 via-[#06101F]/85 to-[#06101F]" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 35%, transparent 30%, rgba(6,16,31,0.7) 100%)",
          }}
        />
        {/* Grain */}
        <div
          className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      {/* Animated golden particles */}
      <div className="fixed inset-0 z-[1] pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-gold animate-pulse"
            style={{
              top: `${p.top}%`,
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              boxShadow: "0 0 12px rgba(201, 169, 97, 0.7)",
            }}
          />
        ))}
      </div>

      {/* Top nav (legacy) — kept inside a hidden div so its links/SEO anchors still resolve, but visually replaced by <SiteNav/>. */}
      <header hidden aria-hidden="true" className="hidden">
        <div className="container">
          <div className="flex h-20 items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-3">
              <img
                src={LOGO.clear}
                alt="SPARK AI"
                className="h-12 w-auto object-contain"
                style={{
                  filter: "drop-shadow(0 2px 8px rgba(201,169,97,0.4))",
                }}
              />
              <div className="hidden md:flex flex-col leading-tight border-r border-white/15 pr-3">
                <span className="font-display text-base text-gold-light tracking-[0.15em]">
                  <span className="font-semibold">SPARK</span>{" "}
                  <span className="font-light">Quality</span>
                </span>
                <span className="text-[9px] tracking-[0.35em] text-white/45 mt-0.5">
                  מבית SPARK AI
                </span>
              </div>
            </Link>
            <nav className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/demo"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-white/80 hover:text-gold transition-colors"
              >
                <Play className="h-3.5 w-3.5" />
                צפייה בדמו
              </Link>
              <Link
                href="/pricing"
                className="hidden sm:block px-3 py-2 text-sm text-white/80 hover:text-gold transition-colors"
              >
                תמחור
              </Link>
              <a
                href={loginHref}
                className="flex items-center gap-2 rounded-md bg-gradient-to-br from-gold to-[#B89346] px-4 py-2 text-sm font-bold text-[#06101F] shadow-lg shadow-gold/30 transition-all hover:scale-105"
              >
                לאזור האישי
                <ChevronLeft className="h-4 w-4" />
              </a>
            </nav>
          </div>
        </div>
        <div className="h-px bg-gradient-to-l from-transparent via-gold/60 to-transparent" />
      </header>

      {/* Sticky top navigation — minimal: just the 3-zone nav (Site / Demo / Product) + logo + login CTA */}
      <header dir="rtl" className="fixed top-0 inset-x-0 z-50 bg-[#06101F]/85 backdrop-blur-md border-b border-gold/20">
        <div className="container flex items-center justify-between gap-4 py-3">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0" aria-label="SPARK AI — דף הבית">
            <img src={LOGO.clear} alt="SPARK AI" className="h-9 w-auto" />
          </Link>
          <div className="flex-1 flex items-center justify-center">
            <TopZoneNav />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href="#pricing"
              className="hidden md:inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-white/70 hover:text-gold transition-colors"
            >
              מחירים
            </a>
            {isAuthenticated && user ? (
              <a
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-l from-gold to-[#F4D87C] px-3 py-1.5 text-xs font-bold text-[#06101F] shadow-md shadow-gold/30 hover:shadow-gold/50 transition-shadow"
              >
                לאזור האישי
              </a>
            ) : (
              <>
                <a
                  href={loginHref}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-transparent px-3 py-1.5 text-xs font-semibold text-white/85 hover:text-white hover:border-white/40 transition-colors"
                >
                  כניסה
                </a>
                <a
                  href={signupHref}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-l from-gold to-[#F4D87C] px-3 py-1.5 text-xs font-bold text-[#06101F] shadow-md shadow-gold/30 hover:shadow-gold/50 transition-shadow"
                >
                  הרשמה
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="hero" className="relative z-10 pt-28 pb-24 lg:pt-36 lg:pb-40">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            {/* Eyebrow */}
            <div
              className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 mb-8 animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              <span className="text-[11px] tracking-[0.35em] uppercase text-gold-soft font-medium">
                AI לסוכני ביטוח · השקה ראשונה לבתי סוכן בישראל
              </span>
            </div>

            {/* Hero headline */}
            <h1
              className="font-display text-5xl lg:text-7xl font-black leading-[1.05] tracking-tighter text-white animate-fade-up"
              style={{ animationDelay: "0.2s" }}
            >
              הסוכן שלכם,
              <br />
              <span className="text-gold">משוחרר</span>
              <span className="text-white/90"> מהעבודה</span>
              <br />
              <span className="text-white/90">הרפטטיבית</span>
              <span className="text-gold">.</span>
            </h1>

            {/* Subhead */}
            <p
              className="mt-8 text-lg lg:text-xl leading-relaxed text-white/75 max-w-2xl mx-auto animate-fade-up"
              style={{ animationDelay: "0.35s" }}
            >
              העלאת דוח מוצרים בניהול, ניתוח ב-AI תוך שניות, וזיהוי אוטומטי של הזדמנויות
              שימור, צ&apos;ק-אפים, ופוליסות שמתחדשות. בלי קוד. בלי גוגל-שיטס.
              בלי הקלדות חוזרות.
            </p>

            {/* CTAs */}
            <div
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up"
              style={{ animationDelay: "0.5s" }}
            >
              <Link
                href="/demo"
                className="group flex items-center gap-2 rounded-md bg-gradient-to-br from-gold to-[#B89346] px-8 py-4 text-base font-bold text-[#06101F] shadow-2xl shadow-gold/30 transition-all hover:scale-105"
              >
                <Play className="h-4 w-4" />
                צפייה בדמו אינטראקטיבי
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </Link>
            </div>

            <p
              className="mt-6 text-xs tracking-[0.2em] text-white/50 animate-fade-in"
              style={{ animationDelay: "0.8s" }}
            >
              הקמה תוך 60 שניות · ביטול בקליק
            </p>
          </div>

          {/* Stats strip */}
          <div
            className="mt-24 grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto animate-fade-up"
            style={{ animationDelay: "0.7s" }}
          >
            {[
              { num: "47", unit: "שניות", lbl: "זמן ניתוח דוח" },
              { num: "1,584", unit: "", lbl: "לקוחות בדוח לדוגמה" },
              { num: "1,071", unit: "", lbl: "דגלים זוהו" },
              { num: "2.84", unit: "M ₪", lbl: "פוטנציאל הכנסה" },
            ].map((s, i) => (
              <div
                key={i}
                className="text-center border-y border-white/10 py-5 lg:border-y-0 lg:border-l lg:border-r-0 lg:first:border-r-0 lg:last:border-l-0"
              >
                <div className="font-display text-4xl lg:text-5xl font-black text-gold">
                  {s.num}
                  {s.unit && (
                    <span className="text-2xl text-gold-soft mr-1">
                      {s.unit}
                    </span>
                  )}
                </div>
                <div className="text-xs tracking-[0.15em] uppercase text-white/60 mt-2">
                  {s.lbl}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS / FEATURES */}
      <section id="how" className="relative z-10 py-24 border-t border-white/5 bg-[#06101F]/40 backdrop-blur-sm">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px w-12 bg-gold" />
              <span className="text-[11px] tracking-[0.35em] uppercase text-gold font-medium">
                מה SPARK AI עושה בשבילך
              </span>
              <div className="h-px w-12 bg-gold" />
            </div>
            <h2 className="font-display text-4xl lg:text-5xl font-black text-white tracking-tight">
              שלוש פעולות. <span className="text-gold">אין-סוף ערך.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Zap,
                title: "ניתוח אוטומטי בשניות",
                body: "מעלים דוח מוצרים בניהול, ה-AI סורק את כל הלקוחות, מזהה דגלים — תום הנחה, ביטוחים פגי תוקף, יום הולדת מתקרב — ויוצר רשימת פעולות ממוקדת.",
              },
              {
                icon: TrendingUp,
                title: "תיק לקוחות מסודר",
                body: "כל הלקוחות שלכם במקום אחד, עם פילוח לפי גיל, יצרן ביטוח, נכסים, ופרמיות. חיפוש מהיר ופילטרים חכמים.",
              },
              {
                icon: Users,
                title: "צוות ובידוד מלא",
                body: "סוכנים רואים רק את הלקוחות שלהם. מנהלים רואים את כל הסוכנות. הזמנת חברי צוות בקליק עם שליטה בהרשאות.",
              },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="relative rounded-lg p-8 backdrop-blur-md bg-white/5 border border-white/10 transition-all hover:bg-white/[0.07] hover:border-gold/30 hover:shadow-[0_8px_32px_rgba(201,169,97,0.15)]"
                >
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 flex items-center justify-center mb-6">
                    <Icon className="h-5 w-5 text-gold" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-white mb-3 tracking-tight">
                    {f.title}
                  </h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    {f.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRIVACY / SECURITY */}
      <section id="security" className="relative z-10 py-24 border-t border-white/5">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="rounded-lg border border-gold/20 bg-gradient-to-br from-[#06101F]/80 to-[#0B1A2D]/80 backdrop-blur-md p-10 lg:p-14 text-center">
              <Shield className="h-10 w-10 text-gold mx-auto mb-6" />
              <h2 className="font-display text-3xl lg:text-4xl font-black text-white tracking-tight mb-4">
                הנתונים שלכם — <span className="text-gold">שלכם בלבד.</span>
              </h2>
              <p className="text-base lg:text-lg text-white/75 leading-relaxed max-w-2xl mx-auto">
                בידוד מלא בין סוכנויות, הצפנה בכל שכבה, התאמה לחוקי הגנת הפרטיות
                בישראל. שום לקוח לא רואה את הלקוחות של סוכן אחר. שום סוכנות לא
                רואה את הסוכנויות האחרות.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                {[
                  "Multi-Tenant Isolation",
                  "Encrypted at Rest",
                  "Israeli Privacy Law",
                ].map((b) => (
                  <div
                    key={b}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-white/5 border border-white/10 text-xs text-white/85"
                  >
                    <Check className="h-3.5 w-3.5 text-gold" />
                    {b}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative z-10 py-24 border-t border-white/5 bg-[#06101F]/40 backdrop-blur-sm">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px w-12 bg-gold" />
              <span className="text-[11px] tracking-[0.35em] uppercase text-gold font-medium">
                מחירים שקופים
              </span>
              <div className="h-px w-12 bg-gold" />
            </div>
            <h2 className="font-display text-4xl lg:text-5xl font-black text-white tracking-tight">
              תוכנית לכל <span className="text-gold">גודל סוכנות</span>
            </h2>
          </div>

          {/* Single-tier SPARK Quality + Enterprise contact card */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* SPARK Quality — single plan */}
            <div className="relative rounded-lg p-10 backdrop-blur-md bg-gradient-to-br from-gold/12 to-gold/5 border border-gold/45 shadow-[0_8px_32px_rgba(201,169,97,0.22)] flex flex-col">
              <div className="absolute -top-3 right-1/2 translate-x-1/2 px-3 py-1 bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] text-[11px] font-bold tracking-widest uppercase rounded-full shadow-lg whitespace-nowrap">
                {PRICING_COPY.badge}
              </div>
              <div className="text-[11px] tracking-[0.3em] uppercase text-gold mb-3">SPARK Quality</div>
              <h3 className="font-display text-2xl font-black text-white tracking-tight leading-snug">
                {PRICING_COPY.headline}
              </h3>

              {/* Monthly / Yearly toggle */}
              <div className="mt-6 inline-flex rounded-full bg-white/5 border border-white/10 p-1 self-start">
                <button
                  type="button"
                  onClick={() => setPricingCycle("monthly")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${
                    !isYearly ? "bg-gold text-[#06101F]" : "text-white/70 hover:text-white"
                  }`}
                  aria-pressed={!isYearly}
                >
                  חיוב חודשי
                </button>
                <button
                  type="button"
                  onClick={() => setPricingCycle("yearly")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${
                    isYearly ? "bg-gold text-[#06101F]" : "text-white/70 hover:text-white"
                  }`}
                  aria-pressed={isYearly}
                >
                  חיוב שנתי · חיסכון {SPARK_QUALITY_PRICING.yearlyDiscountPct}%
                </button>
              </div>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-display text-6xl font-black text-gold">
                  {isYearly ? SPARK_QUALITY_PRICING.yearlyMonthlyIls : SPARK_QUALITY_PRICING.monthlyIls}
                </span>
                <span className="text-base text-white/60">₪ / חודש</span>
              </div>
              <p className="text-sm text-white/65 mt-2 min-h-[3rem]">
                {isYearly ? (
                  <>
                    חיוב שנתי מראש · <span className="text-gold font-bold">{SPARK_QUALITY_PRICING.yearlyTotalIls.toLocaleString("he-IL")} ₪ לשנה</span>
                    <span className="text-white/50"> · חיסכון {SPARK_QUALITY_PRICING.yearlyDiscountPct}% מהמחיר החודשי</span>
                  </>
                ) : (
                  <>
                    חיוב חודשי · ניתן לעבור לחיוב שנתי בכל עת · <span className="text-gold font-bold">תחסכו {SPARK_QUALITY_PRICING.yearlyDiscountPct}%</span>
                  </>
                )}
              </p>

              <div className="mt-7 flex flex-wrap gap-6 pb-6 border-b border-white/10">
                <div className="flex flex-col">
                  <span className="font-display text-2xl font-bold text-white">∞</span>
                  <span className="text-[11px] text-white/55">לקוחות</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-2xl font-bold text-white">16</span>
                  <span className="text-[11px] text-white/55">טריגרים · P0–P4</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-2xl font-bold text-white">יומי</span>
                  <span className="text-[11px] text-white/55">תדירות דוחות</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-2xl font-bold text-white">∞</span>
                  <span className="text-[11px] text-white/55">חברי צוות</span>
                </div>
              </div>

              <ul className="mt-6 space-y-2.5 text-sm text-white/90 flex-1">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gold shrink-0" />כל 16 הטריגרים החכמים (P0 עד P4)</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gold shrink-0" />AI Composer — וואטסאפ ב-3 וריאציות</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gold shrink-0" />רשימת משימות יומית מבוססת AI</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gold shrink-0" />Smart Q&amp;A על תיק הלקוחות</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gold shrink-0" />סיכום תיק לפגישה (AI Briefing)</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gold shrink-0" />ייצוא נתונים מלא (Excel · HTML)</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gold shrink-0" />ניהול צוות וסוכנים</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gold shrink-0" />חשבוניות אוטומטיות בדואל</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gold shrink-0" />תמיכה אישית בוואטסאפ</li>
              </ul>

              {/* Round 107 — join CTA must enter the onboarding flow.
                  Anonymous → OAuth signup → callback redirects to /onboarding.
                  Authenticated → straight to /onboarding (the wizard handles
                  plan selection + payment). */}
              <a
                href={isAuthenticated ? `/onboarding?cycle=${pricingCycle}` : signupHref}
                className="mt-7 w-full flex items-center justify-center gap-2 rounded-md bg-gradient-to-br from-gold to-[#B89346] px-6 py-3.5 text-sm font-bold text-[#06101F] transition-all hover:scale-105 shadow-lg shadow-gold/30"
              >
                {PRICING_COPY.primaryCta}
              </a>
            </div>

            {/* Enterprise — contact us */}
            <div className="rounded-lg p-10 backdrop-blur-md bg-white/[0.04] border border-white/12 flex flex-col">
              <div className="text-[11px] tracking-[0.3em] uppercase text-white/60 mb-3">Enterprise</div>
              <h3 className="font-display text-2xl font-black text-white tracking-tight leading-snug">
                {PRICING_COPY.enterpriseHeadline}
              </h3>
              <p className="mt-5 text-sm text-white/70 leading-relaxed">
                למעלה מ-10 סוכנים, אינטגרציות פנימיות, הטמעה אישית, SLA ייעודי, וחיבור למערכת ה-CRM שלכם. נשמח לבנות יחד את החבילה.
              </p>

              <ul className="mt-7 space-y-2.5 text-sm text-white/85 flex-1">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gold shrink-0" />כל מה שכלול ב-SPARK Quality</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gold shrink-0" />הטמעה והדרכה צוותית</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gold shrink-0" />אינטגרציה ל-CRM קיים</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gold shrink-0" />מנהל לקוח ייעודי + SLA</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gold shrink-0" />הסכם DPA מותאם</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gold shrink-0" />חשבונית עוסק מאוחד · חוזה שנתי</li>
              </ul>

              <Link href="/pricing#enterprise" className="mt-7 w-full flex items-center justify-center gap-2 rounded-md border-2 border-white/30 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/10 hover:border-gold/60">
                דברו איתנו
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES — 6 קטגוריות ההזדמנויות שהמנוע מזהה אוטומטית */}
      <section id="categories" className="relative z-10 py-24 border-t border-white/5">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px w-12 bg-gold" />
              <span className="text-[11px] tracking-[0.35em] uppercase text-gold font-medium">
                המנוע מזהה
              </span>
              <div className="h-px w-12 bg-gold" />
            </div>
            <h2 className="font-display text-4xl lg:text-5xl font-black text-white tracking-tight">
              16 טריגרים חכמים <span className="text-gold">ב-5 רמות עדיפות</span>
            </h2>
            <p className="mt-4 text-base text-white/70 max-w-2xl mx-auto leading-relaxed">
              המנוע סורק את תיק הלקוחות ומסמן כל הזדמנות ב-16 טריגרים מדויקים, מדורגים ב-5 רמות עדיפות — מ-P0 (שדה ירוק) ועד P4 (שימור ונגיעה אישית).
            </p>
          </div>

          {(() => {
            const PRIORITY_GROUPS = [
              {
                priority: "P0",
                color: "text-emerald-300",
                pillBg: "bg-emerald-500/15 border-emerald-400/40",
                title: "שדה ירוק · מה זה שלכם",
                subtitle: "לקוחות שהמערכת מזהה — לפני המתחרים",
                triggers: [
                  { name: "ייפוי כוח — אתה בעל התיק", desc: "המערכת משדרגת אוטומטית את הלקוחות שגיליתם גדולה וטרם מונה לעזוב." },
                  { name: "סוכן רשום — ביצור AUM", desc: "לקוחות שאתם סוכן רשום עליהם — מוכנים למהלכי מכירה מהירים." },
                ],
              },
              {
                priority: "P1",
                color: "text-rose-300",
                pillBg: "bg-rose-500/15 border-rose-400/40",
                title: "סיכון מיידי",
                subtitle: "כיסוי שעומד להסתיים — חלון הזדמנות קצר",
                triggers: [
                  { name: "ריסק זמני מסתיים", desc: "תזכורת טרם תפוגה עם הצעת חידוש — לפני שהלקוח מגלה שהלכת לאיבוד." },
                  { name: "חוסר כיסוי קריטי", desc: "לקוחות עם פערי כיסוי בטיחות לימיים / אובדן כושר עבודה — תסריט השלמה מוכן." },
                ],
              },
              {
                priority: "P2",
                color: "text-amber-300",
                pillBg: "bg-amber-500/15 border-amber-400/40",
                title: "פערי חיסכון, פנסיה וסיעוד",
                subtitle: "לקוחות שחסר להם רובד משמעותי בהגנה ארוכת-טווח",
                triggers: [
                  { name: "חיסכון ללא ביטוח", desc: "לקוח עם צבירה משמעותית ללא כיסוי להם — חובת רגולטורית והזדמנות מכירה." },
                  { name: "+46 ללא סיעוד", desc: "לקוחות מעל 46 בלי כיסוי סיעודי — תקופה קריטית למכירה לפני עליית הפרמיה." },
                  { name: "ללא פנסיה", desc: "לקוחות ללא קרן פנסיה פעיל — חשיפה להטבות מס ולחיסכון לטווח ארוך." },
                  { name: "AUM נמוך במערכת", desc: "תיק ללא ניהול אקטיבי — הזדמנות לרה-אלוקציה והעלאת תשואה." },
                ],
              },
              {
                priority: "P3",
                color: "text-sky-300",
                pillBg: "bg-sky-500/15 border-sky-400/40",
                title: "דמי ניהול, מסלול, עצמאים",
                subtitle: "אופטימיזציה ותיקון מבנה — שיפור תשואה לטווח ארוך",
                triggers: [
                  { name: "דמי ניהול גבוהים", desc: "תמהילים חריגים ממוצע ההנפקה — הזדמנות להטבת תנאים והגדלת AUM." },
                  { name: "מסלול לא מתאים", desc: "לקוחות במסלול סיכון לא תואם לגיל או לטווח ההשקעה — המלצת התאמה." },
                  { name: "עצמאים שלא הפקידו", desc: "עצמאי / בעל שליטה שלא הפקיד — חשיפת מס ואובדן כסף לפרישה." },
                  { name: "ריכוז יתר בחברה אחת", desc: "יותר מ-35% מה-AUM בחברה אחת — סיכון מנוהל לא מספיק. הצעת פיזור." },
                ],
              },
              {
                priority: "P4",
                color: "text-fuchsia-300",
                pillBg: "bg-fuchsia-500/15 border-fuchsia-400/40",
                title: "שימור ונגיעה אישית",
                subtitle: "לקוח שמרגיש ראוי — לא עוזב",
                triggers: [
                  { name: "יום הולדת מפנה — 40 / 50 / 60", desc: "גיל מפנה = הזמן הנכון לסקירת תיק. וואטסאפ אישי + הצעת פגישה מוכנים אוטומטית." },
                  { name: "יום הולדת החודש", desc: "~99 לקוחות בחודש — הודעת וואטסאפ אישית מוכנה לשליחה. נגיעה ללא מאמץ." },
                  { name: "VIP · זהב · פרימיום", desc: "227 לקוחות עם צבירה גבוהה — פגישה שנתית אישית בעדיפות עם סיכום תיק מוכן." },
                  { name: "ללא מייל", desc: "כ-60 לקוחות בממוצע — SMS אוטומטי לבקשת עדכון פרטי קשר." },
                ],
              },
            ];
            return (
              <div className="max-w-6xl mx-auto space-y-8">
                {PRIORITY_GROUPS.map(group => (
                  <div key={group.priority} className="rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 lg:p-8">
                    <div className="flex items-start gap-4 mb-5">
                      <span className={`flex-shrink-0 inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${group.pillBg} ${group.color}`}>
                        {group.priority}
                      </span>
                      <div>
                        <div className={`text-[11px] tracking-[0.25em] uppercase font-medium ${group.color} mb-1`}>{group.subtitle}</div>
                        <h3 className="font-display text-xl lg:text-2xl font-black text-white leading-tight">{group.title}</h3>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {group.triggers.map(t => (
                        <div key={t.name} className="rounded-md border border-gold/10 bg-[#06101F]/40 p-4 hover:border-gold/30 transition-colors">
                          <div className="font-display text-sm font-black text-white mb-1 leading-tight">{t.name}</div>
                          <p className="text-xs text-white/60 leading-relaxed">{t.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="text-center pt-4">
                  <p className="text-xs text-white/45 tracking-[0.2em] uppercase">
                    סך הכול · 16 טריגרים ב-5 רמות עדיפות
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* TEAM */}
      <section id="team" className="relative z-10 py-24 border-t border-white/5 bg-[#06101F]/40 backdrop-blur-sm">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px w-12 bg-gold" />
              <span className="text-[11px] tracking-[0.35em] uppercase text-gold font-medium">
                הצוות
              </span>
              <div className="h-px w-12 bg-gold" />
            </div>
            <h2 className="font-display text-4xl lg:text-5xl font-black text-white tracking-tight">
              מי מאחורי SPARK AI
            </h2>
            <p className="mt-4 text-base text-white/70 leading-relaxed">
              שילוב נדיר של 25 שנות ניסיון בעולם הביטוח והפנסיה יחד עם מומחיות מובילה באוטומציה עסקית ו-AI — שתי מייסדות שהפכו את הצורך הכואב של הסוכנים לפתרון.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              { initials: "עג", name: "ענת גרינברג", role: "מנכ״לית · מומחית אוטומציה ו-AI", bio: "מומחית בולטת לאוטומציה עסקית, טרנספורמציה דיגיטלית ופיתוח תהליכי No-Code. מגישה את הפודקאסט המוביל ״מדברים אוטומציה״, ומביאה ל-SPARK AI את היכולת להפוך תרחישי מכר לתהליכי עבודה חכמים שמשחררים זמן לסוכנים." },
              { initials: "יא", name: "יפעת איתן", role: "מייסדת ומנכ״לית שותפה", bio: "מעל 25 שנות ניסיון בעולם הביטוח — תביעות, בריאות, חיים ופנסיה. מומחית בניהול תהליכים רגולטוריים מורכבים ושיפור ביצועים עסקיים, ומלווה סוכנויות בהטמעת פתרונות טכנולוגיים שמגדילים רווחיות." },
            ].map((m, i) => (
              <div
                key={i}
                className="rounded-md border border-gold/15 bg-white/[0.04] p-6 backdrop-blur-sm hover:border-gold/40 transition-colors"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gold to-[#B89346] flex items-center justify-center text-[#06101F] font-display font-black text-lg">
                    {m.initials}
                  </div>
                  <div>
                    <div className="font-display text-lg font-black text-white leading-tight">{m.name}</div>
                    <div className="text-xs text-gold-soft tracking-wide">{m.role}</div>
                  </div>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{m.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="contact" className="relative z-10 py-24 border-t border-white/5">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-display text-4xl lg:text-5xl font-black text-white tracking-tight mb-6">
              מוכנים לראות את <span className="text-gold">SPARK AI</span> בפעולה?
            </h2>
            <p className="text-base text-white/70 leading-relaxed mb-10">
              הפעילו את הדמו האינטראקטיבי וצפו איך 1,584 לקוחות הופכים בתוך
              דקה ל-1,071 פעולות עסקיות מוכנות.
            </p>
            <Link
              href="/demo"
              className="inline-flex items-center gap-3 rounded-md bg-gradient-to-l from-gold to-[#F4D87C] px-10 py-5 font-display font-bold text-[#06101F] text-lg tracking-tight shadow-2xl shadow-gold/30 transition-all hover:scale-105"
            >
              <Play className="h-5 w-5" />
              לדמו האינטראקטיבי
            </Link>
            {user && (
              <p className="mt-6 text-xs text-white/50">
                מחובר/ת בתור {user.name}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 py-10 border-t border-white/10 bg-[#06101F]/80 backdrop-blur-md">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
            <div className="flex items-center gap-3">
              <img
                src={LOGO.clear}
                alt="SPARK AI"
                className="h-7 w-auto opacity-80"
              />
              <span>© 2026 SPARK AI · כל הזכויות שמורות</span>
            </div>
            <div className="flex items-center gap-2 tracking-[0.2em] uppercase">
              <span>צוות</span>
              <span className="text-white/80">יפעת איתן</span>
              <span className="text-gold/60">×</span>
              <span className="text-white/80">ענת גרינברג</span>
            </div>
          </div>
          <div className="mt-5 pt-5 border-t border-white/10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/55">
            <a href="/legal/terms" className="hover:text-gold transition-colors">תנאי שימוש</a>
            <span className="text-white/20">·</span>
            <a href="/legal/privacy" className="hover:text-gold transition-colors">מדיניות פרטיות</a>
            <span className="text-white/20">·</span>
            <a href="/legal/accessibility" className="hover:text-gold transition-colors">הצהרת נגישות</a>
            <span className="text-white/20">·</span>
            <a href="/pricing" className="hover:text-gold transition-colors">תמחור</a>
          </div>
        </div>
      </footer>
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
