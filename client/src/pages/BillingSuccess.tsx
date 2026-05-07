import { useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { CinematicShell } from "@/components/CinematicShell";
import { GlassCard, GoldEyebrow } from "@/components/CinematicShell";

export default function BillingSuccess() {
  const [, navigate] = useLocation();
  useEffect(() => {
    const t = setTimeout(() => navigate("/dashboard"), 6000);
    return () => clearTimeout(t);
  }, [navigate]);
  return (
    <CinematicShell heroAsset="hero" overlayStrength={90} showSidebar={false}>
      <div className="container max-w-2xl py-24 text-center">
        <div className="flex justify-center mb-4">
          <GoldEyebrow>הוראת קבע פעילה</GoldEyebrow>
        </div>
        <CheckCircle2 className="h-20 w-20 text-gold mx-auto mb-6" />
        <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
          הגישה ל-SPARK Quality <span className="text-gold">פעילה</span>
        </h1>
        <p className="text-white/70 text-lg leading-relaxed mb-8">
          הוראת הקבע אושרה ב-iCount. חשבונית מס דיגיטלית נשלחה למייל הסוכנות,
          והגישה המלאה למערכת פתוחה כעת.
        </p>
        <GlassCard className="p-6 mb-8 text-right" goldAccent>
          <ul className="text-white/85 space-y-2 text-sm">
            <li>· החיוב הבא יבוצע אוטומטית במחזור הקרוב</li>
            <li>· חשבונית מס/קבלה דיגיטלית בכל מחזור — בעלת תוקף משפטי מלא</li>
            <li>· אפשר לעדכן או לבטל בכל עת מאזור החשבון בתפריט</li>
          </ul>
        </GlassCard>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-2 bg-gold text-[#06101F] px-6 py-3 rounded-lg font-semibold hover:bg-gold-light transition shadow-[0_0_24px_rgba(201,169,97,0.35)]"
        >
          לדשבורד
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>
    </CinematicShell>
  );
}
