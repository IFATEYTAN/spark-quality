import { useAuth } from "@/_core/hooks/useAuth";
import { CinematicShell, GlassCard, GoldEyebrow } from "@/components/CinematicShell";
import { trpc } from "@/lib/trpc";
import { Check, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type PaidPlan = "basic" | "premium";

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const requestCheckout = trpc.billing.requestCheckout.useMutation({
    onSuccess: () => {
      toast.success("הבקשה התקבלה ✨", {
        description: "ענת מצוות SPARK תיצור איתך קשר במייל עם לינק תשלום ב-iCount.",
      });
    },
    onError: (err) => {
      toast.error("שגיאה בשליחת הבקשה", { description: err.message });
    },
  });

  const userWorkspaceId = (user as { workspaceId?: number } | null | undefined)?.workspaceId ?? null;

  const handleSelect = (slug: PaidPlan) => {
    // Not signed in → send through onboarding (which handles login + workspace).
    if (!isAuthenticated) {
      navigate("/onboarding");
      return;
    }
    // Signed in but no workspace → finish onboarding first.
    if (!userWorkspaceId) {
      navigate("/onboarding");
      return;
    }
    // Existing workspace → request a real upgrade.
    requestCheckout.mutate({
      plan: slug,
      period: isAnnual ? "yearly" : "monthly",
    });
  };

  const plans = [
    {
      slug: "basic" as const,
      name: "Base Plan",
      description: "לסוכנים עצמאיים שרוצים להתחיל לעבוד חכם",
      monthlyPrice: 180,
      annualPrice: 150,
      features: [
        "עד 500 לקוחות פעילים",
        "זיהוי דגלים אוטומטי (ריסק, פנסיה)",
        "הפקת דוחות חודשיים",
        "תמיכה במייל",
      ],
      missing: ["ייצוא נתונים", "זיהוי הזדמנויות פיננסיות (VIP, 190)", "אוטומציות WhatsApp"],
      ctaUpgrade: "שדרוג ל-Base",
      ctaTrial: "התחל ניסיון חינם",
      popular: false,
    },
    {
      slug: "premium" as const,
      name: "Premium Plan",
      description: "לסוכנויות צומחות שדורשות אוטומציה מלאה",
      monthlyPrice: 420,
      annualPrice: 350,
      features: [
        "לקוחות ללא הגבלה",
        "זיהוי דגלים אוטומטי מלא",
        "זיהוי הזדמנויות פיננסיות (VIP, 190, השתלמות)",
        "ייצוא נתונים מלא (מותנה במנוי פעיל)",
        "אוטומציות WhatsApp ו-Email",
        "תמיכה טלפונית VIP",
      ],
      missing: [],
      ctaUpgrade: "שדרוג ל-Premium",
      ctaTrial: "בחר פרימיום",
      popular: true,
    },
  ];

  return (
    <CinematicShell heroAsset="hero" overlayStrength={85} showSidebar={false}>
      <div className="container max-w-5xl py-20">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-4">
            <GoldEyebrow>תמחור פשוט ושקוף</GoldEyebrow>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
            בחרו את התוכנית המתאימה <span className="text-gold">לסוכנות שלכם</span>
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            התחילו עם 14 ימי ניסיון חינם. שדרגו, שנו או בטלו בכל עת.
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-4 mt-10">
            <span className={`text-sm font-medium ${!isAnnual ? "text-white" : "text-white/50"}`}>
              תשלום חודשי
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative inline-flex h-7 w-14 items-center rounded-full bg-white/10 border border-white/20 transition-colors focus:outline-none"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-gold transition-transform ${
                  isAnnual ? "translate-x-1" : "translate-x-8"
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${isAnnual ? "text-white" : "text-white/50"}`}>
              תשלום שנתי <span className="text-gold text-xs ml-1">(חיסכון של 16%)</span>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <GlassCard
              key={plan.name}
              goldAccent={plan.popular}
              className={`p-8 flex flex-col ${plan.popular ? "scale-105 z-10" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gold text-[#06101F] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  המומלץ ביותר
                </div>
              )}
              
              <h3 className="font-display text-2xl font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-white/60 text-sm mb-6 h-10">{plan.description}</p>
              
              <div className="mb-8">
                <span className="text-5xl font-bold text-white">
                  ₪{isAnnual ? plan.annualPrice : plan.monthlyPrice}
                </span>
                <span className="text-white/50 ml-2">/ לחודש</span>
                {isAnnual && (
                  <div className="text-gold/80 text-sm mt-2">
                    חיוב שנתי של ₪{plan.annualPrice * 12}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleSelect(plan.slug)}
                disabled={requestCheckout.isPending}
                className={`w-full py-3 rounded-lg font-medium transition-all mb-8 disabled:opacity-50 inline-flex items-center justify-center gap-2 ${
                  plan.popular
                    ? "bg-gold text-[#06101F] hover:bg-gold-light shadow-[0_0_20px_rgba(201,169,97,0.3)]"
                    : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                }`}
              >
                {requestCheckout.isPending && requestCheckout.variables?.plan === plan.slug ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  (isAuthenticated && userWorkspaceId ? plan.ctaUpgrade : plan.ctaTrial)
                )}
              </button>

              <div className="space-y-4 flex-1">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-gold shrink-0" />
                    <span className="text-white/80 text-sm">{feature}</span>
                  </div>
                ))}
                {plan.missing.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 opacity-50">
                    <X className="h-5 w-5 text-white/40 shrink-0" />
                    <span className="text-white/60 text-sm line-through">{feature}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <p className="text-white/50 text-sm">
            * ייצוא נתונים למערכות חיצוניות מתאפשר רק למנויים פעילים בתוכנית Premium.
          </p>
        </div>
      </div>
    </CinematicShell>
  );
}
