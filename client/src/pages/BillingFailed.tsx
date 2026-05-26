import { useLocation } from "wouter";
import { useMemo } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { CinematicShell } from "@/components/CinematicShell";
import { GlassCard, GoldEyebrow } from "@/components/CinematicShell";

export default function BillingFailed() {
  const [location, navigate] = useLocation();
  const reason = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("reason");
  }, [location]);
  const isTimeout = reason === "timeout";
  return (
    <CinematicShell heroAsset="hero" overlayStrength={90} showSidebar={false}>
      <div className="container max-w-2xl py-24 text-center">
        <div className="flex justify-center mb-4">
          <GoldEyebrow>{isTimeout ? "המתנו הרבה זמן" : "הסליקה לא הושלמה"}</GoldEyebrow>
        </div>
        {isTimeout ? (
          <Clock className="h-20 w-20 text-amber-300 mx-auto mb-6" />
        ) : (
          <AlertTriangle className="h-20 w-20 text-amber-300 mx-auto mb-6" />
        )}
        <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
          {isTimeout ? (
            <>לא קיבלנו <span className="text-gold">אישור לתשלום בזמן</span></>
          ) : (
            <>לא הצלחנו <span className="text-gold">לפתוח את הוראת הקבע</span></>
          )}
        </h1>
        <p className="text-white/70 text-lg leading-relaxed mb-8">
          {isTimeout
            ? "חיכינו 10 דקות לאישור התשלום מ-iCount ולא קיבלנו מענה. זה לאו אומר שהתשלום נכשל — תיתכן שהוא בדרכו ומיד יירשם. מומלץ לרענן את הדף בעוד כמה דקות, או לפנות אלינו."
            : "הסליקה ב-iCount לא הושלמה. ייתכן שהכרטיס נדחה ע\"י הבנק, או שסגרתם את חלון הסליקה לפני האישור הסופי."}
        </p>
        <GlassCard className="p-6 mb-8 text-right">
          <p className="text-white/80 text-sm leading-relaxed">
            אפשר לנסות שוב עם כרטיס אחר, או לפנות אלינו במייל
            <a href="mailto:anathemell@gmail.com" className="text-gold mx-1 underline-offset-4 hover:underline">
              anathemell@gmail.com
            </a>
            לקבלת לינק תשלום ידני.
          </p>
        </GlassCard>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={() => navigate("/pricing")}
            className="bg-gold text-[#06101F] px-6 py-3 rounded-lg font-semibold hover:bg-gold-light transition"
          >
            לנסות שוב
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="bg-white/10 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/20 border border-white/20 transition"
          >
            חזרה לדשבורד
          </button>
        </div>
      </div>
    </CinematicShell>
  );
}
