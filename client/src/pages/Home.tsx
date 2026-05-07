// Home — Landing שיווקי בסגנון הסינמטי של הדמו
// רקע נייבי עמוק, חלקיקי זהב, טיפוגרפיה Rubik, כפתורי זהב
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ContactModal } from "@/components/ContactModal";
import { SiteNav } from "@/components/SiteNav";
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
import { getLoginUrl } from "@/const";

export default function Home() {
  const { isAuthenticated, user, loading } = useAuth();

  // אם המשתמש כבר מחובר — נתב אותו למסך הנכון לפי מצב הסוכנות.
  // יוצא מן הכלל: אם הגענו עם ?contact=1 (סריקת QR מהדמו) — נישאר על דף הבית כדי להציג את טופס יצירת הקשר.
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !user) return;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("contact") === "1") return;
    }
    const hasWorkspace = Boolean((user as { workspaceId?: number | null }).workspaceId);
    window.location.replace(hasWorkspace ? "/dashboard" : "/onboarding");
  }, [loading, isAuthenticated, user]);

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
  // Open ContactModal automatically when ?contact=1 is present (used by demo QR code)
  const [contactOpen, setContactOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("contact") === "1") {
      setContactOpen(true);
    }
  }, []);

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

      {/* Sticky top navigation (mini-site) */}
      <SiteNav available={["hero", "how", "categories", "security", "pricing", "team", "contact"]} />

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
              הסוכן שלך,
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
              העלאת דוח שורנס, ניתוח ב-AI תוך שניות, וזיהוי אוטומטי של הזדמנויות
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
              </Link>
              <a
                href={loginHref}
                className="group flex items-center gap-2 rounded-md border-2 border-white/30 bg-white/5 px-8 py-4 text-base font-bold text-white backdrop-blur-md transition-all hover:bg-white/10 hover:border-gold/60"
              >
                בחרי תוכנית והתחילי
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </a>
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
                body: "מעלים דוח שורנס, ה-AI סורק את כל הלקוחות, מזהה דגלים — תום הנחה, ביטוחים פגי תוקף, יום הולדת מתקרב — ויוצר רשימת פעולות ממוקדת.",
              },
              {
                icon: TrendingUp,
                title: "תיק לקוחות מסודר",
                body: "כל הלקוחות שלך במקום אחד, עם פילוח לפי גיל, יצרן ביטוח, נכסים, ופרמיות. חיפוש מהיר ופילטרים חכמים.",
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
                הנתונים שלך — <span className="text-gold">שלך בלבד.</span>
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
              תוכנית לכל גודל סוכנות
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Base */}
            <div className="rounded-lg p-8 backdrop-blur-md bg-white/5 border border-white/10 flex flex-col">
              <div className="text-[11px] tracking-[0.3em] uppercase text-white/60 mb-3">
                Base Plan
              </div>
              <h3 className="font-display text-2xl font-black text-white tracking-tight">
                לסוכנים עצמאיים שרוצים להתחיל לעבוד חכם
              </h3>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-display text-5xl font-black text-white">
                  150
                </span>
                <span className="text-base text-white/60">₪ / חודש</span>
              </div>
              <p className="text-xs text-white/50 mt-1">
                חיוב שנתי של 1800 ₪
              </p>
              <ul className="mt-8 space-y-3 text-sm text-white/80 flex-1">
                {[
                  "עד 300 לקוחות פעילים",
                  "זיהוי דגלים אוטומטי (ריסק, פנסיה)",
                  "הפקת דוחות חודשיים",
                  "תמיכה במייל",
                ].map((p) => (
                  <li key={p} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-gold shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
              <a
                href={loginHref}
                className="mt-8 w-full flex items-center justify-center gap-2 rounded-md border-2 border-white/30 bg-white/5 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/10 hover:border-gold/60"
              >
                בחר Base
              </a>
            </div>

            {/* Pro */}
            <div className="rounded-lg p-8 backdrop-blur-md bg-white/5 border border-white/10 flex flex-col">
              <div className="text-[11px] tracking-[0.3em] uppercase text-white/60 mb-3">
                Pro Plan
              </div>
              <h3 className="font-display text-2xl font-black text-white tracking-tight">
                לסוכנויות בצמיחה שצריכות יותר
              </h3>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-display text-5xl font-black text-white">
                  249
                </span>
                <span className="text-base text-white/60">₪ / חודש</span>
              </div>
              <p className="text-xs text-white/50 mt-1">
                חיוב שנתי של 2988 ₪
              </p>
              <ul className="mt-8 space-y-3 text-sm text-white/80 flex-1">
                {[
                  "עד 1000 לקוחות פעילים",
                  "זיהוי דגלים מורחב",
                  "ייצוא נתונים מלא",
                  "תמיכה בוואטסאפ",
                ].map((p) => (
                  <li key={p} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-gold shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
              <a
                href={loginHref}
                className="mt-8 w-full flex items-center justify-center gap-2 rounded-md border-2 border-white/30 bg-white/5 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/10 hover:border-gold/60"
              >
                בחר Pro
              </a>
            </div>

            {/* Premium */}
            <div className="relative rounded-lg p-8 backdrop-blur-md bg-gradient-to-br from-gold/10 to-gold/5 border border-gold/40 shadow-[0_8px_32px_rgba(201,169,97,0.2)] flex flex-col">
              <div className="absolute -top-3 right-1/2 translate-x-1/2 px-3 py-1 bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] text-[11px] font-bold tracking-widest uppercase rounded-full shadow-lg">
                המומלץ ביותר
              </div>
              <div className="text-[11px] tracking-[0.3em] uppercase text-gold mb-3">
                Premium Plan
              </div>
              <h3 className="font-display text-2xl font-black text-white tracking-tight">
                לסוכנויות צומחות שדורשות אוטומציה מלאה
              </h3>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-display text-5xl font-black text-gold">
                  389
                </span>
                <span className="text-base text-white/60">₪ / חודש</span>
              </div>
              <p className="text-xs text-white/50 mt-1">
                חיוב שנתי של 4668 ₪
              </p>
              <ul className="mt-8 space-y-3 text-sm text-white/85 flex-1">
                {[
                  "לקוחות ללא הגבלה",
                  "זיהוי דגלים אוטומטי מלא",
                  "זיהוי הזדמנויות פיננסיות (VIP, 190, השתלמות)",
                  "ייצוא נתונים מלא (מותנה במנוי פעיל)",
                  "אוטומציות Email ו-WhatsApp",
                  "תמיכה VIP",
                ].map((p) => (
                  <li key={p} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-gold shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
              <a
                href={loginHref}
                className="mt-8 w-full flex items-center justify-center gap-2 rounded-md bg-gradient-to-br from-gold to-[#B89346] px-6 py-3 text-sm font-bold text-[#06101F] shadow-lg shadow-gold/30 transition-all hover:scale-[1.02]"
              >
                בחר פרימיום
              </a>
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
              שש קטגוריות שמעלות לך את ההכנסות
            </h2>
            <p className="mt-4 text-base text-white/70 max-w-2xl mx-auto leading-relaxed">
              המערכת סורקת את תיק הלקוחות שלך ומסמנת כל הזדמנות לאחת משש קטגוריות קבועות — כל אחת עם תרחיש מדויק ותסריט פעולה מוכן למשלוח.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {[
              { tag: "VIP", title: "הזדמנויות VIP", desc: "לקוחות עם צבירה גבוהה — סלקט אישי והרחבת מוצרים." },
              { tag: "תיקון 190", title: "תיקון 190 — הטבה מיסויית", desc: "זיהוי לקוחות שזכאים ל-30% פטור ממס על המשיכה." },
              { tag: "השתלמות", title: "השתלמות נזילה", desc: "לקוחות שצברו זמן ומוכנים למשיכה אלטרנטיבית." },
              { tag: "דמי ניהול", title: "דמי ניהול גבוהים", desc: "זיהוי תמהילים חריגים ממוצע ההנפקה — הזדמנות להטבת תנאים." },
              { tag: "ריסק", title: "ריסק מסתיים", desc: "תזכורות אוטומטיות טרם תפוגה לחידוש והמשך כיסוי." },
              { tag: "כיסוי", title: "חוסרי כיסוי", desc: "לקוחות עם פערי כיסוי בטיחות לימיים / אובדן כושר עבודה." },
            ].map((cat, i) => (
              <div
                key={i}
                className="rounded-md border border-gold/15 bg-white/[0.03] p-5 backdrop-blur-sm hover:border-gold/40 hover:bg-white/[0.06] transition-colors"
              >
                <div className="label-tag text-[10px] text-gold tracking-[0.3em] mb-2">
                  {cat.tag}
                </div>
                <h3 className="font-display text-lg font-black text-white mb-2">{cat.title}</h3>
                <p className="text-sm text-white/65 leading-relaxed">{cat.desc}</p>
              </div>
            ))}
          </div>
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
              שתי מומחות משוק הסוכנות שזיהו את הצורך — ובנו את המערכת מתוך שלו.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              { initials: "יא", name: "יפעת איתן", role: "מייסדת ומנהלת מוצר", bio: "מגיעה מעולם סוכנות הביטוח וזיהתה את הפער — זמן יקר שמתבזבז על תיוק תיקי לקוחות ומעקב אחר הזדמנויות שמתפספסות." },
              { initials: "עג", name: "ענת גרינברג", role: "מייסדת ושותפה למוצר", bio: "ממירה תרחישי מכר לתהליכי עבודה חכמים, בשילוב אוטומציה ו-AI שמשחררים זמן לסוכנים ומגדילים את טיוב ההצעה ללקוח." },
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
              מוכנה לראות את <span className="text-gold">SPARK AI</span> בפעולה?
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
