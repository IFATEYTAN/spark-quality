import { useAuth } from "@/_core/hooks/useAuth";
import { CinematicShell, GlassCard, GoldEyebrow } from "@/components/CinematicShell";
import { trpc } from "@/lib/trpc";
import { Check, Loader2, X } from "lucide-react";
import { useState } from "react";
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
    description: "לסוכן עצמאי שמתחיל לעבוד חכם עם תיק לקוחות מצומצם",
    monthlyPrice: 150,
    annualPrice: 126, // 150 * 0.84 ≈ 126 (~16% discount, billed yearly = 1,512₪)
    flagsQuota: "עד 50 דגלים פעילים בו-זמנית",
    clientLimit: "עד 300 לקוחות בתיק",
    features: [
      "עד 300 לקוחות בתיק (כלל ברזל)",
      "עד 50 דגלים פעילים בו-זמנית",
      "זיהוי דגלים אוטומטי בסיסי (ריסק, פנסיה, חוסרי כיסוי)",
      "דשבורד עם 6 קטגוריות הזדמנויות",
      "העלאת דוחות חודשית",
      "תמיכה במייל בלבד",
    ],
    missing: [
      "אוטומציות WhatsApp ו-Email",
      "ייצוא נתונים ל-CRM חיצוני",
      "תמיכה טלפונית VIP",
      "ניתוח AI מתקדם של תרחישים",
    ],
    popular: false,
  },
  {
    slug: "pro",
    name: "Pro Plan",
    description: "לסוכן צומח שרוצה לנהל תיק בינוני עם אוטומציה",
    monthlyPrice: 249,
    annualPrice: 209, // 249 * 0.84 ≈ 209 (~16% discount, billed yearly = 2,508₪)
    flagsQuota: "עד 200 דגלים פעילים בו-זמנית",
    clientLimit: "עד 1,000 לקוחות בתיק",
    features: [
      "עד 1,000 לקוחות בתיק",
      "עד 200 דגלים פעילים בו-זמנית",
      "כל הדגלים של Base, וגם:",
      "זיהוי הזדמנויות פיננסיות (תיקון 190, השתלמות נזילה)",
      "אוטומציות WhatsApp ו-Email מובנות",
      "דוחות חודשיים מלאים + ייצוא ל-Excel",
      "תמיכה במייל ובצ'אט",
    ],
    missing: ["ייצוא נתונים ל-CRM חיצוני", "תמיכה טלפונית VIP"],
    popular: true,
  },
  {
    slug: "premium",
    name: "Premium Plan",
    description: "לסוכנות שמנהלת תיק גדול ודורשת כלים ללא הגבלה",
    monthlyPrice: 389,
    annualPrice: 327, // 389 * 0.84 ≈ 327 (~16% discount, billed yearly = 3,924₪)
    flagsQuota: "דגלים ללא הגבלה",
    clientLimit: "לקוחות ללא הגבלה",
    features: [
      "לקוחות ללא הגבלה (1,000+ בתיק)",
      "דגלים פעילים ללא הגבלה",
      "כל הדגלים של Pro, וגם:",
      "זיהוי הזדמנויות VIP מלא",
      "ניתוח AI מתקדם של תרחישים פנסיוניים",
      "ייצוא נתונים מלא ל-CRM (מותנה במנוי פעיל)",
      "תמיכה טלפונית VIP + Onboarding אישי",
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
  const startCheckoutViaMake = trpc.billing.startCheckoutViaMake.useMutation({
    onSuccess: (res) => {
      // If the Make scenario returned a hosted iCount URL synchronously,
      // open it in a new tab so the user pays without losing the dashboard
      // tab. If no URL was returned (legacy email flow), fall back to the
      // waiting screen and the email link.
      if (res.paymentUrl) {
        const opened = window.open(
          res.paymentUrl,
          "_blank",
          "noopener,noreferrer",
        );
        if (opened) {
          toast.success("פתחנו עבורכם את עמוד התשלום בכרטיסייה חדשה", {
            description:
              "השלימו את התשלום וחזרו אל מסך זה — הגישה תיפתח אוטומטית.",
          });
        } else {
          toast.warning("הדפדפן חסם את הכרטיסייה החדשה", {
            description: "לחצו על הלינק במסך ההמתנה כדי לפתוח את עמוד התשלום.",
          });
        }
        navigate(
          `/billing/waiting?req=${res.requestId}&payUrl=${encodeURIComponent(res.paymentUrl)}`,
        );
        return;
      }
      toast.success("הבקשה נשלחה — מעבירים אתכם למסך ההמתנה", {
        description:
          "לינק לעמוד התשלום נשלח אליכם במייל. הגישה למערכת תיפתח אוטומטית מיד עם אישור התשלום.",
      });
      navigate(`/billing/waiting?req=${res.requestId}`);
    },
    onError: (err) => {
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

  return (
    <CinematicShell heroAsset="hero" overlayStrength={85} showSidebar={false}>
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
