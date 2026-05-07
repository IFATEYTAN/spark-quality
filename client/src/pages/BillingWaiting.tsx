import { useEffect } from "react";
import { useLocation } from "wouter";
import { CinematicShell } from "@/components/CinematicShell";
import { GlassCard, GoldEyebrow } from "@/components/CinematicShell";
import { ShieldCheck, Loader2, CreditCard } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * Shown after the user is bounced to iCount in a new tab. We poll the access
 * status every 3 seconds — once iCount confirms via /api/icount/callback,
 * subscriptionStatus becomes "active" and we redirect to the dashboard.
 */
export default function BillingWaiting() {
  const [, navigate] = useLocation();
  const accessQuery = trpc.billing.myAccessStatus.useQuery(undefined, {
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (accessQuery.data?.status === "active") {
      navigate("/billing/success?confirmed=1");
    }
  }, [accessQuery.data?.status, navigate]);

  return (
    <CinematicShell heroAsset="hero" overlayStrength={88} showSidebar={false}>
      <div className="container max-w-3xl py-24">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <GoldEyebrow>תשלום מאובטח · iCount</GoldEyebrow>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            פתחו את חלון הסליקה <span className="text-gold">בלשונית הצדדית</span>
          </h1>
          <p className="text-lg text-white/70 max-w-xl mx-auto leading-relaxed">
            עמוד התשלום של iCount נפתח בלשונית חדשה. הזינו את פרטי הכרטיס לפתיחת
            הוראת קבע — לא יבוצע חיוב חד-פעמי, רק אישור הכרטיס לחיוב חודשי / שנתי.
          </p>
        </div>

        <GlassCard className="p-8 space-y-6" goldAccent>
          <div className="flex items-center gap-4">
            <Loader2 className="h-6 w-6 text-gold animate-spin" />
            <div>
              <div className="text-white font-semibold">ממתינים לאישור הסליקה…</div>
              <div className="text-white/60 text-sm">
                המסך יתעדכן אוטומטית ברגע שהוראת הקבע תאושר ב-iCount.
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-gold text-sm font-medium mb-1">
                <ShieldCheck className="h-4 w-4" /> אבטחה ו-PCI
              </div>
              <p className="text-white/70 text-xs leading-relaxed">
                פרטי הכרטיס מאובטחים בדף הסליקה של iCount בלבד. SPARK Quality
                לעולם לא רואה ולא שומרת את פרטי האשראי.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-gold text-sm font-medium mb-1">
                <CreditCard className="h-4 w-4" /> חשבונית מס דיגיטלית
              </div>
              <p className="text-white/70 text-xs leading-relaxed">
                בכל מחזור חיוב תופק חשבונית מס/קבלה דיגיטלית מאומתת ע"י רו"ח
                ותישלח אוטומטית למייל הסוכנות.
              </p>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => navigate("/pricing")}
              className="text-white/50 hover:text-white text-sm underline-offset-4 hover:underline"
            >
              חזרה לתמחור
            </button>
          </div>
        </GlassCard>
      </div>
    </CinematicShell>
  );
}
