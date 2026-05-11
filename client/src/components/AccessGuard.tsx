// AccessGuard — מציג באנר תקופת חסד או מסך חסימה מלא בהתאם לסטטוס המנוי.
//
// משולב בתוך CinematicShell כך שכל מסך מוגן (showSidebar=true) מקבל את הלוגיקה
// הזו אוטומטית. מסכים פתוחים (Landing, Pricing, Onboarding, Legal) משאירים
// את showAccessGuard=false כדי לא לחסום משתמשים בתהליך תשלום.

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertTriangle, Lock, Mail } from "lucide-react";
import { Link } from "wouter";
import { GlassCard, GoldEyebrow } from "./CinematicShell";

type AccessStatus = "active" | "grace" | "blocked" | "cancelled";

type AccessData = {
  status: AccessStatus;
  daysRemaining: number;
  graceEndsAt: Date | null;
  plan: "basic" | "pro" | "premium" | "enterprise";
  billingPeriod: "monthly" | "yearly";
  paymentMethod: "standing_order" | "manual";
  hasNeverPaid?: boolean;
};

type AccessGuardProps = {
  children: React.ReactNode;
};

export function AccessGuard({ children }: AccessGuardProps) {
  const { isAuthenticated } = useAuth();
  const enabled = isAuthenticated;

  const { data } = trpc.billing.myAccessStatus.useQuery(undefined, {
    enabled,
    refetchInterval: 60_000, // קצב שיחזור — דקה
    refetchOnWindowFocus: true,
  });

  if (!enabled || !data) {
    return <>{children}</>;
  }

  const access = data as AccessData;

  if (access.status === "blocked" || access.status === "cancelled") {
    return <BlockedScreen access={access} />;
  }

  if (access.status === "grace") {
    return (
      <>
        <GraceBanner access={access} />
        {children}
      </>
    );
  }

  return <>{children}</>;
}

function GraceBanner({ access }: { access: AccessData }) {
  const days = access.daysRemaining;
  const dayWord = days === 1 ? "יום" : "ימים";
  return (
    <div className="sticky top-0 z-40 border-b border-amber-400/40 bg-gradient-to-l from-amber-500/15 via-amber-400/10 to-amber-500/5 backdrop-blur">
      <div className="container">
        <div className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3 md:items-center">
            <div className="mt-0.5 rounded-full bg-amber-400/20 p-2 md:mt-0">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold text-amber-100">
                החיוב האחרון לא הושלם — נשארו {days} {dayWord} להסדרה
              </div>
              <div className="text-xs text-amber-100/80">
                לאחר מכן הגישה למערכת תושעה אוטומטית עד להסדרת התשלום. הנתונים שלכם שמורים במלואם.
              </div>
            </div>
          </div>
          <Link
            href="/pricing"
            className="inline-flex shrink-0 items-center justify-center rounded-md bg-amber-400 px-4 py-2 text-xs font-bold text-amber-950 transition hover:bg-amber-300"
          >
            הסדרת תשלום
          </Link>
        </div>
      </div>
    </div>
  );
}

function BlockedScreen({ access }: { access: AccessData }) {
  const isCancelled = access.status === "cancelled";
  const isFirstTime = !!access.hasNeverPaid;
  const heading = isCancelled
    ? "המנוי בוטל"
    : isFirstTime
      ? "רק רגע — נדרשת הפעלת מנוי כדי להיכנס למערכת"
      : "הגישה למערכת SPARK Quality מושעית עד להסדרת התשלום";
  const body = isCancelled
    ? "המנוי שלכם בוטל. ניתן לחדש את המנוי בכל עת — הנתונים שלכם נשמרים במלואם."
    : isFirstTime
      ? "ההרשמה הושלמה בהצלחה. כדי להתחיל לעבוד עם SPARK Quality, יש להפעיל הוראת קבע באשראי בעמוד התמחור. בעת אישור התשלום הגישה תיפתח באופן מיידי."
      : "ניסיון החיוב האחרון לא הושלם, ותקופת החסד של 3 ימים הסתיימה. הנתונים שלכם שמורים במלואם — מיד עם השלמת התשלום הגישה תיפתח אוטומטית.";
  const eyebrow = isFirstTime ? "הפעלת מנוי" : "הגישה הושעתה";
  return (
    <div className="relative z-30 flex min-h-screen items-center justify-center bg-[#06101F] px-4 py-16">
      <div className={`absolute inset-0 ${isFirstTime ? "bg-gradient-to-b from-amber-950/30" : "bg-gradient-to-b from-red-950/30"} via-[#06101F] to-[#06101F]`} aria-hidden />
      <GlassCard goldAccent className="relative w-full max-w-2xl p-10 text-center">
        <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${isFirstTime ? "border border-amber-400/40 bg-amber-500/10" : "border border-red-400/40 bg-red-500/10"}`}>
          <Lock className={`h-7 w-7 ${isFirstTime ? "text-amber-300" : "text-red-300"}`} />
        </div>
        <GoldEyebrow>{eyebrow}</GoldEyebrow>
        <h1 className="mt-3 font-display text-3xl font-extrabold text-white md:text-4xl">
          {heading}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/75">
          {body}
        </p>
        <div className="mx-auto mt-8 max-w-md rounded-xl border border-white/10 bg-white/5 p-5 text-right">
          <div className="text-[11px] uppercase tracking-[0.3em] text-gold/80">סטטוס נוכחי</div>
          <div className="mt-1 font-display text-xl font-bold text-white">
            תוכנית {planLabel(access.plan)} · חיוב {access.billingPeriod === "yearly" ? "שנתי" : "חודשי"}
          </div>
          <div className="mt-1 text-sm text-white/60">
            אמצעי תשלום: {access.paymentMethod === "standing_order" ? "הוראת קבע" : "חשבונית ידנית"}
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-lg bg-gold px-6 py-3 text-sm font-bold text-[#06101F] shadow-[0_0_24px_rgba(201,169,97,0.35)] transition hover:bg-gold-light"
          >
            הסדרת תשלום והחזרת הגישה
          </Link>
          <a
            href="mailto:anathemell@gmail.com"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <Mail className="h-4 w-4" />
            יצירת קשר עם SPARK
          </a>
        </div>
        <p className="mt-8 text-xs text-white/45">
          הודעה זו נשלחה גם במייל מצוות SPARK Quality. במידה ויש מחלוקת על החיוב — אנחנו זמינים לסייע.
        </p>
      </GlassCard>
    </div>
  );
}

function planLabel(plan: AccessData["plan"]): string {
  switch (plan) {
    case "basic":
      return "Base";
    case "pro":
      return "Pro";
    case "premium":
      return "Premium";
    default:
      return "Enterprise";
  }
}
