import { useAuth } from "@/_core/hooks/useAuth";
import { CinematicShell, GlassCard, GoldEyebrow } from "@/components/CinematicShell";
import { decidePricingCta, type AccessStatus } from "@shared/pricingCta";
import { EnterpriseContactDialog } from "@/components/EnterpriseContactDialog";
import { getLoginUrl, getSignupUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Check, Crown, Loader2, LogIn, MessageCircle, X } from "lucide-react";
import React, { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import type { PlanKey } from "@shared/planFeatures";

type PaidPlan = "basic";

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

// SPARK Quality moved to a single-tier model. The `basic` slug is reused for
// backwards compatibility with the billing pipeline, but all gates are open.
const PLAN: PlanCard = {
  slug: "basic",
  name: "SPARK Quality",
  description: "כל מה שסוכן צריך — ללא הגבלהת לקוחות, כל 16 הטריגרים, AI מלא",
  monthlyPrice: 199,
  annualPrice: 169, // 199 × 0.85 ≈ 169 (15% off; billed yearly = 2,028₪)
  flagsQuota: "כל 16 הטריגרים · P0–P4",
  clientLimit: "לקוחות ללא הגבלה",
  features: [
    "לקוחות ללא הגבלה — טענו תיקים בכל גודל",
    "כל 16 הטריגרים: ייפוי כוח, ריסק זמני, פנסיה/ביטוח/סיעודי/AUM, דמי ניהול, VIP וימי הולדת",
    "AI Composer — 3 גרסאות מוכנות לכל הודעת וואטסאפ בלחיצה אחת",
    "תדריך בוקר עם AI ו'שאל את ה-AI על הנתונים'",
    "רשימת משימות יומית · דוח יומי + שבועי",
    "אוטומציות WhatsApp / Email",
    "ייצוא נתונים מלא (נעול לתקופת מנוי פעיל)",
    "תמיכת וואטסאפ + מייל בימי העסקים",
  ],
  missing: [],
  popular: true,
};



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

  // Single-tier model: we still query the access status so the CTA can read
  // "התוכנית שלכם" when the user already has an active SPARK Quality plan.
  const accessQuery = trpc.billing.myAccessStatus.useQuery(undefined, {
    enabled: !!isAuthenticated,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const currentPlan = useMemo<PlanKey | null>(() => {
    const raw = (accessQuery.data as { plan?: string } | undefined)?.plan;
    if (raw === "basic" || raw === "pro" || raw === "premium" || raw === "enterprise") return raw;
    return null;
  }, [accessQuery.data]);

  // Round 115 — "התוכנית שלכם פעילה" הוצגה רק כ֠שהמנוי למעשה פעיל או במצב grace.
  // לפני לכן, workspace עם plan='basic' אבל subscriptionStatus='pending_payment'
  // היה מסומן בטעות כ-"פעיל" תוך סתירה למסך /billing.
  const accessStatus = (accessQuery.data as { status?: string } | undefined)?.status;
  const hasActiveSubscription =
    accessStatus === "active" || accessStatus === "grace";

  const [enterpriseOpen, setEnterpriseOpen] = useState(false);

  const handleSelect = (slug: PaidPlan) => {
    // Round 110: /onboarding is a protected route (mountOnboarding gates on
    // isAuthenticated). Sending an anonymous visitor there caused the page to
    // bounce through the protected guard and silently drop the click. The
    // correct funnel for anonymous visitors is OAuth signup → callback
    // redirects to /onboarding once the session cookie exists.
    void slug;
    if (!isAuthenticated) {
      window.location.href = getSignupUrl();
      return;
    }
    if (!userWorkspaceId) {
      navigate(`/onboarding?cycle=${isAnnual ? "yearly" : "monthly"}`);
      return;
    }
    // Round 117 — למשתמש מחובר עם workspace שעדיין לא שילם תשלום (pending_payment),
    // נפעיל את תהליך ה-checkout ישירות מפה. אין יותר מסך /account/billing סטטי.
    // הקריאה ל-startCheckoutViaMake תטפל בזה.
    //
    // Pre-open the new tab synchronously so it's tied to this user-gesture
    // and won't be popup-blocked. We'll redirect it once the mutation
    // returns the iCount URL (or close it if there is none).
    // Round 118: Removed "noopener,noreferrer" so the browser allows us to
    // inject the payUrl into this tab via w.location.replace() later.
    checkoutWindowRef.current = window.open("about:blank", "_blank");
    startCheckoutViaMake.mutate({
      plan: slug,
      period: isAnnual ? "yearly" : "monthly",
      origin: window.location.origin,
    });
  };

  // Round 115 — כל לוגיקת ה-CTA מרוכזת ב-decidePricingCta() כדי להיות ניתנת לבדיקה ב-vitest.
  const cta = (plan: PlanCard) =>
    decidePricingCta({
      isAuthenticated: !!isAuthenticated,
      workspaceId: userWorkspaceId,
      accessStatus: (accessStatus as AccessStatus | null | undefined) ?? null,
      currentPlan,
      planName: plan.name,
    });
  const ctaLabel = (plan: PlanCard): string => cta(plan).label;
  const isCurrent = (plan: PlanCard): boolean => cta(plan).action === "noop";

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

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {[PLAN].map((plan: PlanCard) => (
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
                disabled={startCheckoutViaMake.isPending || requestCheckout.isPending || isCurrent(plan)}
                aria-current={isCurrent(plan) ? "true" : undefined}
                className={`w-full py-3 rounded-lg font-medium transition-all mb-6 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 ${
                  isCurrent(plan)
                    ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 cursor-not-allowed"
                    : plan.popular
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
                {plan.features.map((feature: string) => (
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
                    {plan.missing.map((feature: string) => (
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

          {/* 4th card — Enterprise (contact-only, no checkout) */}
          <GlassCard
            key="enterprise"
            goldAccent={false}
            className="p-7 flex flex-col relative ring-1 ring-white/15"
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white/10 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap border border-white/20">
              מותאם לסוכנויות גדולות
            </div>
            <h3 className="font-display text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Crown className="h-5 w-5 text-gold" />
              Enterprise
            </h3>
            <p className="text-white/60 text-sm mb-6 min-h-[44px]">
              לסוכנויות גדולות עם דרישות מיוחדות — אינטגרציות, SLA, הטמעת CRM, ותמיכה טלפונית יעודית.
            </p>
            <div className="mb-2">
              <span className="text-3xl font-bold text-white/90">מחיר מותאם</span>
            </div>
            <div className="text-white/50 text-xs mb-6 min-h-[18px]">
              ההצעה אישית לאחר שיחת היכרות
            </div>
            <div className="rounded-lg border border-white/15 bg-white/[0.03] px-4 py-3 mb-6 space-y-1">
              <div className="text-white text-sm font-bold">לקוחות וטריגרים — ללא הגבלה</div>
              <div className="text-white/70 text-xs">כל הפיצ׳רים של Premium + תוספות מותאמות</div>
            </div>
            <button
              onClick={() => setEnterpriseOpen(true)}
              className="w-full py-3 rounded-lg font-medium transition-all mb-6 inline-flex items-center justify-center gap-2 bg-white/10 text-white hover:bg-white/20 border border-white/20"
            >
              <MessageCircle className="h-4 w-4" />
              צרו קשר
            </button>
            <div className="space-y-3 flex-1">
              <div className="text-white/60 text-[11px] uppercase tracking-wider mb-2">מה כלול בתוכנית</div>
              {[
                "כל תכולות Premium",
                "ללא הגבלת לקוחות ומשתמשים",
                "אינטגרציות CRM יעודיות (Salesforce / Priority)",
                "SLA חוזה עם התחייבות זמינות",
                "מנהל לקוח אישי ו-Onboarding מורחב",
                "העברת נתונים יעודית מ-CRM ישן",
                "הגדרות SSO / Active Directory",
              ].map((feat) => (
                <div key={feat} className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                  <span className="text-white/85 text-sm leading-relaxed">{feat}</span>
                </div>
              ))}
            </div>
          </GlassCard>
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
      <EnterpriseContactDialog open={enterpriseOpen} onOpenChange={setEnterpriseOpen} />
    </CinematicShell>
  );
}
