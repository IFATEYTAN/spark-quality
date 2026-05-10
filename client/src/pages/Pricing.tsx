import { useAuth } from "@/_core/hooks/useAuth";
import { CinematicShell, GlassCard, GoldEyebrow } from "@/components/CinematicShell";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Check, Loader2, LogIn, X } from "lucide-react";
import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type PaidPlan = "basic" | "pro" | "premium";

type PlanCard = {
  slug: PaidPlan;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number; // per-month price after annual discount
  flagsQuota: string;
  clientLimit: string;
  features: string[];
  missing: string[];
  popular: boolean;
};

const PLANS: PlanCard[] = [
  {
    slug: "basic",
    name: "Base Plan",
    description: "לסוכן שרוצה לפספס פחות — 3 הטריגרים החשובים ביותר",
    monthlyPrice: 150,
    annualPrice: 128, // 150 * 0.85 ≈ 128 (15% off, billed yearly = 1,530₪)
    flagsQuota: "3 טריגרים מרמת P1–P3",
    clientLimit: "עד 300 לקוחות בתיק",
    features: [
      "עד 300 לקוחות בתיק",
      "3 טריגרים מרמת P1–P3 (ריסק זמני, פנסיה חסרה, דמי ניהול גבוהים)",
      "הפקת דוחות חודשיים",
      "תמיכה במייל",
    ],
    missing: [
      "AI Composer (הודעות שליחה מוכנות)",
      "ייפוי כוח (P0)",
      "טריגרי P4 (ימי הולדת, VIP, ללא מייל)",
      "אוטומציות WhatsApp / Email",
    ],
    popular: false,
  },
  {
    slug: "pro",
    name: "Pro Plan",
    description: "לסוכנות שרוצה לצמוח בלי לעבוד יותר — 10 טריגרים P0–P3",
    monthlyPrice: 249,
    annualPrice: 212, // 249 * 0.85 ≈ 212 (15% off, billed yearly = 2,539₪)
    flagsQuota: "10 טריגרים מרמת P0–P3",
    clientLimit: "עד 1,000 לקוחות בתיק",
    features: [
      "עד 1,000 לקוחות בתיק",
      "10 טריגרים ב-P0–P3: ייפוי כוח, ריסק זמני, פנסיה/ביטוח/סיעוד/AUM, דמי ניהול",
      "AI Composer — הודעות מוכנות לשליחה",
      "ייצוא נתונים מלא",
      "תמיכה בוואטסאפ",
      "סיכום תיק לפגישה (AI)",
      "דוח שבועי",
    ],
    missing: [
      "טריגרי P4 (ימי הולדת, VIP, ללא מייל)",
      "אוטומציות שליחה (WhatsApp / Email)",
      "רשימת משימות יומית (AI)",
    ],
    popular: true,
  },
  {
    slug: "premium",
    name: "Premium Plan",
    description: "לסוכנויות גדולות — כל 16 הטריגרים ואוטומציה מלאה",
    monthlyPrice: 389,
    annualPrice: 331, // 389 * 0.85 ≈ 331 (15% off, billed yearly = 3,967₪)
    flagsQuota: "כל 16 הטריגרים · P0–P4",
    clientLimit: "לקוחות ללא הגבלה",
    features: [
      "לקוחות ללא הגבלה",
      "כל 16 הטריגרים ב-P0–P4 (כולל ימי הולדת, VIP, ללא מייל)",
      "אוטומציות WhatsApp / Email",
      "רשימת משימות יומית (AI)",
      "Smart Q&A על הדוח",
      "מנהל לקוח אישי + Onboarding",
      "דוח יומי · תמיכת VIP",
    ],
    missing: [],
    popular: false,
  },
];

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();

  // Primary path — POST to the Make webhook. Make orchestrates the iCount
  // payment page and POSTs back to /api/billing/activate when payment is
  // confirmed. We just take the user to /billing/waiting and let the activation
  // callback flip the workspace to active.
  // Holds the tab we pre-open synchronously in the click handler so the
  // browser treats it as a user-gesture and never popup-blocks it. After the
  // mutation comes back we redirect that tab to the iCount payment URL.
  const checkoutWindowRef = useRef<Window | null>(null);

  const startCheckoutViaMake = trpc.billing.startCheckoutViaMake.useMutation({
    onSuccess: (res) => {
      const w = checkoutWindowRef.current;
      if (res.paymentUrl) {
        if (w && !w.closed) {
          // Re-target the pre-opened blank tab; this is allowed because the
          // tab was opened in the same user-gesture as the mutation start.
          w.location.replace(res.paymentUrl);
          toast.success("פתחנו עבורכם את עמוד התשלום בכרטיסייה חדשה", {
            description: "השלימו את התשלום וחזרו אל מסך זה — הגישה תיפתח אוטומטית.",
          });
        } else {
          // Pre-open failed (rare). Try a normal window.open as a fallback.
          const opened = window.open(res.paymentUrl, "_blank", "noopener,noreferrer");
          if (!opened) {
            toast.warning("הדפדפן חסם את הכרטיסייה החדשה", {
              description: "לחצו על הלינק במסך ההמתנה כדי לפתוח את עמוד התשלום.",
            });
          }
        }
        checkoutWindowRef.current = null;
        navigate(
          `/billing/waiting?req=${res.requestId}&payUrl=${encodeURIComponent(res.paymentUrl)}`,
        );
        return;
      }
      // No URL came back. Close the pre-opened blank tab and fall back to
      // the legacy email flow.
      if (w && !w.closed) w.close();
      checkoutWindowRef.current = null;
      toast.success("הבקשה נשלחה — מעבירים אתכם למסך ההמתנה", {
        description:
          "לינק לעמוד התשלום יגיע אליכם במייל. הגישה למערכת תיפתח אוטומטית מיד עם אישור התשלום.",
      });
      navigate(`/billing/waiting?req=${res.requestId}`);
    },
    onError: (err) => {
      // Close the pre-opened blank tab so the user isn't left staring at
      // about:blank.
      const w = checkoutWindowRef.current;
      if (w && !w.closed) w.close();
      checkoutWindowRef.current = null;
      toast.error("לא הצלחנו לפתוח את הבקשה לתשלום", { description: err.message });
    },
  });
  // Fallback path — manual followup (notify owner). Kept for the
  // "לקבלת הצעת מחיר מותאם" CTA.
  const requestCheckout = trpc.billing.requestCheckout.useMutation({
    onSuccess: () => {
      toast.success("הבקשה התקבלה ✨", {
        description: "ענת מצוות SPARK תיצור איתכם קשר במייל עם לינק תשלום ב-iCount.",
      });
    },
    onError: (err) => {
      toast.error("שגיאה בשליחת הבקשה", { description: err.message });
    },
  });

  const userWorkspaceId = (user as { workspaceId?: number } | null | undefined)?.workspaceId ?? null;

  const handleSelect = (slug: PaidPlan) => {
    // Anyone without an active workspace must complete the full onboarding
    // (license verification + payment). No trial path exists anywhere.
    if (!isAuthenticated) {
      navigate("/onboarding");
      return;
    }
    if (!userWorkspaceId) {
      navigate("/onboarding");
      return;
    }
    // Pre-open the new tab synchronously so it's tied to this user-gesture
    // and won't be popup-blocked. We'll redirect it once the mutation
    // returns the iCount URL (or close it if there is none).
    checkoutWindowRef.current = window.open("about:blank", "_blank", "noopener,noreferrer");
    startCheckoutViaMake.mutate({
      plan: slug,
      period: isAnnual ? "yearly" : "monthly",
      origin: window.location.origin,
    });
  };

  const ctaLabel = (plan: PlanCard): string => {
    if (isAuthenticated && userWorkspaceId) {
      return `שדרוג ל-${plan.name}`;
    }
    return `בחר ${plan.name}`;
  };

  // Returning users landing on /pricing should be able to enter the app
  // without going through onboarding again. Authenticated -> /dashboard;
  // unauthenticated -> OAuth via getLoginUrl().
  const handleLoginClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isAuthenticated) {
      e.preventDefault();
      navigate("/dashboard");
    }
  };

  return (
    <CinematicShell heroAsset="hero" overlayStrength={85} showSidebar={false}>
      {/* Top-left login entry. Visible on every viewport so existing
          customers reaching /pricing have a clear path back into the app.
          The page is RTL but the login pill belongs in the LTR top-left
          corner per spec. */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-30">
        <a
          href={isAuthenticated ? "/dashboard" : getLoginUrl()}
          onClick={handleLoginClick}
          className="group inline-flex items-center gap-2 rounded-full border border-gold/40 bg-black/40 backdrop-blur px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-white/90 hover:text-gold hover:border-gold transition-colors"
          aria-label="כניסה למערכת לחשבון קיים"
        >
          <LogIn className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline text-white/60 group-hover:text-gold/80">
            יש לכם חשבון?
          </span>
          <span className="font-medium">כניסה למערכת</span>
        </a>
      </div>

      <div className="container max-w-6xl py-20">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-4">
            <GoldEyebrow>תמחור פשוט ושקוף · ללא ניסיון חינם</GoldEyebrow>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6">
            בחרו את התוכנית המתאימה <span className="text-gold">לסוכנות שלכם</span>
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            כל תוכנית כוללת ליווי הקמה, הדרכה אישית, ותשלום מאובטח דרך iCount. הגישה למערכת תיפתח מיד עם השלמת התשלום וההצגת רישיון סוכן בתוקף.
          </p>

          {/* Segmented toggle — חודשי / שנתי */}
          <div
            role="tablist"
            aria-label="בחירת תקופת חיוב"
            className="inline-flex items-center gap-1 mt-10 p-1 rounded-full bg-white/5 border border-white/15 backdrop-blur-sm"
          >
            <button
              role="tab"
              aria-selected={!isAnnual}
              onClick={() => setIsAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
                !isAnnual
                  ? "bg-gold text-[#06101F] shadow-[0_4px_18px_rgba(212,175,75,0.25)]"
                  : "text-white/65 hover:text-white"
              }`}
            >
              חודשי
            </button>
            <button
              role="tab"
              aria-selected={isAnnual}
              onClick={() => setIsAnnual(true)}
              className={`relative px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
                isAnnual
                  ? "bg-gold text-[#06101F] shadow-[0_4px_18px_rgba(212,175,75,0.25)]"
                  : "text-white/65 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                שנתי
                <span
                  className={`text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-full uppercase ${
                    isAnnual
                      ? "bg-[#06101F]/15 text-[#06101F]"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                  }`}
                >
                  חיסכון 16%
                </span>
              </span>
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
          {PLANS.map((plan) => (
            <GlassCard
              key={plan.slug}
              goldAccent={plan.popular}
              className={`p-7 flex flex-col relative ${plan.popular ? "md:scale-105 md:z-10 ring-2 ring-gold/40" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gold text-[#06101F] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                  הבחירה של רוב הסוכנים
                </div>
              )}

              <h3 className="font-display text-2xl font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-white/60 text-sm mb-6 min-h-[44px]">{plan.description}</p>

              <div className="mb-2">
                <span className="text-5xl font-bold text-white">
                  ₪{isAnnual ? plan.annualPrice : plan.monthlyPrice}
                </span>
                <span className="text-white/50 ml-2">/ לחודש</span>
              </div>
              <div className="text-gold/80 text-xs mb-6 min-h-[18px]">
                {isAnnual && `חיוב שנתי של ₪${(plan.annualPrice * 12).toLocaleString("he-IL")} מראש`}
              </div>

              {/* Quota highlight strip */}
              <div className="rounded-lg border border-gold/30 bg-gold/5 px-4 py-3 mb-6 space-y-1">
                <div className="text-gold text-sm font-bold">{plan.clientLimit}</div>
                <div className="text-white/70 text-xs">{plan.flagsQuota}</div>
              </div>

              <button
                onClick={() => handleSelect(plan.slug)}
                disabled={startCheckoutViaMake.isPending || requestCheckout.isPending}
                className={`w-full py-3 rounded-lg font-medium transition-all mb-6 disabled:opacity-50 inline-flex items-center justify-center gap-2 ${
                  plan.popular
                    ? "bg-gold text-[#06101F] hover:bg-gold-light shadow-[0_0_20px_rgba(201,169,97,0.3)]"
                    : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                }`}
              >
                {(startCheckoutViaMake.isPending && startCheckoutViaMake.variables?.plan === plan.slug) ||
                (requestCheckout.isPending && requestCheckout.variables?.plan === plan.slug) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  ctaLabel(plan)
                )}
              </button>

              {/* Feature list — what's IN */}
              <div className="space-y-3 flex-1">
                <div className="text-white/60 text-[11px] uppercase tracking-wider mb-2">
                  כלול בתוכנית
                </div>
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                    <span className="text-white/85 text-sm leading-relaxed">{feature}</span>
                  </div>
                ))}

                {/* Missing — what's NOT */}
                {plan.missing.length > 0 && (
                  <>
                    <div className="text-white/40 text-[11px] uppercase tracking-wider mt-5 mb-2">
                      לא כלול בתוכנית
                    </div>
                    {plan.missing.map((feature) => (
                      <div key={feature} className="flex items-start gap-3 opacity-60">
                        <X className="h-4 w-4 text-white/40 shrink-0 mt-0.5" />
                        <span className="text-white/55 text-sm leading-relaxed line-through">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Comparison table */}
        <div className="mt-20 max-w-5xl mx-auto">
          <h2 className="text-center font-display text-2xl font-bold text-white mb-8">השוואה מלאה בין התוכניות</h2>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-4 px-5 text-right font-semibold text-white/70 uppercase tracking-wider text-[11px]">תכונה</th>
                  <th className="py-4 px-5 text-center font-semibold text-white/70 uppercase tracking-wider text-[11px]">Base</th>
                  <th className="py-4 px-5 text-center font-semibold text-gold uppercase tracking-wider text-[11px] bg-gold/[0.04]">Pro ★</th>
                  <th className="py-4 px-5 text-center font-semibold text-white/70 uppercase tracking-wider text-[11px]">Premium</th>
                </tr>
              </thead>
              <tbody className="text-white/85">
                {[
                  ["מספר לקוחות", "עד 300", "עד 1,000", "ללא הגבלה"],
                  ["מספר טריגרים", "3", "10", "16"],
                  ["תדירות דוחות", "חודשי", "שבועי", "יומי"],
                  ["ייפוי כוח (P0)", "✕", "✓", "✓"],
                  ["ריסק זמני (P1)", "✓", "✓", "✓"],
                  ["פנסיה / ביטוח / סיעוד / AUM (P2)", "קטן", "✓", "✓"],
                  ["דמי ניהול / מסלול / עצמאים (P3)", "קטן", "✓", "✓"],
                  ["ימי הולדת + VIP + ללא מייל (P4)", "✕", "✕", "✓"],
                  ["AI Composer (הודעות מוכנות)", "✕", "✓", "✓"],
                  ["אוטומציות שליחה", "✕", "✕", "✓"],
                  ["רשימת משימות יומית (AI)", "✕", "✕", "✓"],
                  ["Smart Q&A על הדוח", "✕", "✕", "✓"],
                  ["תמיכה", "מייל", "וואטסאפ", "VIP"],
                ].map((row, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-5 text-right text-white/85 font-medium">{row[0]}</td>
                    <td className="py-3 px-5 text-center text-white/70">{row[1] === "✓" ? <span className="text-gold">✓</span> : row[1] === "✕" ? <span className="text-white/25">✕</span> : row[1]}</td>
                    <td className="py-3 px-5 text-center text-white/70 bg-gold/[0.04]">{row[2] === "✓" ? <span className="text-gold">✓</span> : row[2] === "✕" ? <span className="text-white/25">✕</span> : row[2]}</td>
                    <td className="py-3 px-5 text-center text-white/70">{row[3] === "✓" ? <span className="text-gold">✓</span> : row[3] === "✕" ? <span className="text-white/25">✕</span> : row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-16 grid gap-3 text-center max-w-3xl mx-auto">
          <p className="text-white/50 text-sm">
            * הגישה למערכת מוגבלת לסוכן ביטוח בעל רישיון בתוקף, ומותנית באימות הרישיון בתהליך ההרשמה.
          </p>
          <p className="text-white/50 text-sm">
            ** ייצוא נתונים מלא מתאפשר רק במנוי Premium פעיל. עם סיום המנוי הייצוא נחסם.
          </p>
          <p className="text-white/50 text-sm">
            *** המעבר בין תוכניות אפשרי בכל עת — שדרוג מיידי, הורדת תוכנית בסוף תקופת החיוב.
          </p>
        </div>
      </div>
    </CinematicShell>
  );
}
