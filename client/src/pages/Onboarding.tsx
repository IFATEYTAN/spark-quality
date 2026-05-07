// SPARK AI · Onboarding — תהליך מלווה עם פיית SPARK + הסכמה משפטית מלאה
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CinematicShell, GlassCard, GoldEyebrow } from "@/components/CinematicShell";
import { FairyMascot } from "@/components/FairyMascot";
import { trpc } from "@/lib/trpc";
import {
  Accessibility,
  ArrowRight,
  Building2,
  Check,
  Crown,
  FileText,
  Loader2,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type Mode = "choose" | "create" | "join" | "billing";
type BillingPeriod = "monthly" | "yearly";
type PaidPlan = "basic" | "pro" | "premium";

export default function Onboarding() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("choose");
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteToken, setInviteToken] = useState("");

  // Legal consent checkboxes (required by Israeli law)
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeAccessibility, setAgreeAccessibility] = useState(false);

  const allLegalAgreed = agreeTerms && agreePrivacy && agreeAccessibility;

  // Billing step state — set after a successful workspace.create. Trial is the
  // default plan on the workspace, so picking it here just sends the user on.
  const [createdWorkspaceName, setCreatedWorkspaceName] = useState("");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("yearly");

  const utils = trpc.useUtils();
  const createWorkspace = trpc.workspaces.create.useMutation({
    onSuccess: async (_data, variables) => {
      toast.success("הסוכנות נוצרה בהצלחה!", {
        description: "✨ נשאר רק לבחור תוכנית ואת בפנים",
      });
      setCreatedWorkspaceName(variables.name);
      await utils.auth.me.refetch();
      setMode("billing");
    },
    onError: (err) => {
      toast.error("שגיאה ביצירת הסוכנות", { description: err.message });
    },
  });

  const requestCheckout = trpc.billing.requestCheckout.useMutation({
    onSuccess: () => {
      toast.success("הבקשה התקבלה ✨", {
        description: "ענת מצוות SPARK תיצור איתך קשר במייל עם לינק תשלום ב-iCount.",
      });
      window.location.assign("/dashboard");
    },
    onError: (err) => {
      toast.error("שגיאה בשליחת הבקשה", { description: err.message });
    },
  });



  const upgradeTo = (plan: PaidPlan) => {
    requestCheckout.mutate({
      plan,
      period: billingPeriod,
      workspaceName: createdWorkspaceName || undefined,
    });
  };

  const acceptInvite = trpc.workspaces.acceptInvite.useMutation({
    onSuccess: async () => {
      toast.success("הצטרפת לסוכנות בהצלחה!");
      await utils.auth.me.refetch();
      window.location.assign("/dashboard");
    },
    onError: (err) => {
      toast.error("ההזמנה לא תקפה", { description: err.message });
    },
  });

  // Read invite token from URL if exists
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");
    if (token) {
      setInviteToken(token);
      setMode("join");
    }
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = "/";
    }
  }, [loading, isAuthenticated]);

  // If user already has a workspace, redirect to dashboard
  useEffect(() => {
    if (user && (user as { workspaceId?: number }).workspaceId) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06101F]">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  const firstName = user?.name?.split(" ")[0] || "סוכן יקר";

  // Fairy message changes per stage
  const fairyMessage =
    mode === "choose"
      ? `שלום ${firstName}! אני פיית SPARK 🪄 בואו נבחר איך מתחילים.`
      : mode === "create"
        ? "תני לסוכנות שלך שם שיעורר השראה ✨"
        : mode === "billing"
          ? "כל הכבוד! 🎉 בחרי תוכנית כדי להתחיל לעבוד."
          : "הדביקי את קוד ההזמנה שקיבלת";

  return (
    <CinematicShell heroAsset="hero" overlayStrength={88}>
      {/* Floating fairy companion - desktop only */}
      <div className="hidden lg:block fixed top-1/3 left-8 z-30">
        <FairyMascot size="xl" position="right" message={fairyMessage} />
      </div>

      <div className="container py-10 lg:py-20">
        <div className="max-w-3xl mx-auto">
          {/* Mobile fairy at top */}
          <div className="lg:hidden flex justify-center mb-6">
            <FairyMascot size="md" position="right" showDust={true} />
          </div>

          {/* Header */}
          <div className="text-center mb-10 animate-fade-up">
            <GoldEyebrow>SPARK AI · הקמת סביבה</GoldEyebrow>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-6xl font-black text-white tracking-tighter leading-[1.05]">
              ברוכים הבאים,
              <br />
              <span className="text-gold">{firstName}</span>
              <span className="text-gold">.</span>
            </h1>
            <p className="mt-5 text-base lg:text-lg text-white/75 max-w-xl mx-auto leading-relaxed">
              לפני שמתחילים — בואו נחבר אותך לסביבת העבודה הנכונה.
            </p>
          </div>

          {/* Choose mode */}
          {mode === "choose" && (
            <div
              className="grid md:grid-cols-2 gap-5 animate-fade-up"
              style={{ animationDelay: "0.2s" }}
            >
              <GlassCard
                goldAccent
                className="p-7 lg:p-8 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-[0_8px_40px_rgba(201,169,97,0.25)]"
              >
                <button
                  onClick={() => setMode("create")}
                  className="w-full text-right"
                >
                  <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-gold/30 to-gold/10 border border-gold/40 flex items-center justify-center mb-5">
                    <Building2 className="h-6 w-6 text-gold" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-white mb-3 tracking-tight">
                    הקמת סוכנות חדשה
                  </h2>
                  <p className="text-sm text-white/70 leading-relaxed mb-5">
                    אני סוכן עצמאי או מנהל בית-סוכן ורוצה לפתוח סביבת עבודה
                    חדשה.
                  </p>
                  <div className="flex items-center gap-2 text-gold text-sm font-semibold">
                    התחל
                    <ArrowRight className="h-4 w-4 -rotate-180" />
                  </div>
                </button>
              </GlassCard>

              <GlassCard className="p-7 lg:p-8 cursor-pointer transition-all hover:scale-[1.02] hover:border-white/30">
                <button
                  onClick={() => setMode("join")}
                  className="w-full text-right"
                >
                  <div className="h-14 w-14 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center mb-5">
                    <Users className="h-6 w-6 text-white/85" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-white mb-3 tracking-tight">
                    הצטרפות לסוכנות קיימת
                  </h2>
                  <p className="text-sm text-white/70 leading-relaxed mb-5">
                    קיבלתי הזמנה ממנהל בית-הסוכן עם קוד הזמנה.
                  </p>
                  <div className="flex items-center gap-2 text-white/85 text-sm font-semibold">
                    הזן קוד
                    <ArrowRight className="h-4 w-4 -rotate-180" />
                  </div>
                </button>
              </GlassCard>
            </div>
          )}

          {/* Create mode */}
          {mode === "create" && (
            <GlassCard goldAccent className="p-7 lg:p-10 animate-fade-up">
              <GoldEyebrow>פתיחת סוכנות חדשה</GoldEyebrow>
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-white tracking-tight mb-7">
                איך נקרא לסוכנות שלך?
              </h2>
              <div className="space-y-5">
                <div>
                  <Label htmlFor="name" className="text-white/90 mb-2 block text-sm font-semibold">
                    שם הסוכנות
                  </Label>
                  <Input
                    id="name"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder='לדוגמה: "ביטוח דניאל" או "בית-הסוכן הירוק"'
                    className="bg-white/5 border-white/25 text-white placeholder:text-white/40 h-12 text-base"
                  />
                </div>

                {/* Legal Consent Section */}
                <LegalConsentBlock
                  agreeTerms={agreeTerms}
                  setAgreeTerms={setAgreeTerms}
                  agreePrivacy={agreePrivacy}
                  setAgreePrivacy={setAgreePrivacy}
                  agreeAccessibility={agreeAccessibility}
                  setAgreeAccessibility={setAgreeAccessibility}
                />

                <p className="text-xs text-white/55 leading-relaxed">
                  תוכלו להזמין צוות ולנהל את הסוכנות מכל מקום.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setMode("choose")}
                    className="border-white/25 bg-white/5 text-white hover:bg-white/10"
                  >
                    חזרה
                  </Button>
                  <Button
                    onClick={() =>
                      createWorkspace.mutate({ name: workspaceName.trim() })
                    }
                    disabled={
                      workspaceName.trim().length < 2 ||
                      !allLegalAgreed ||
                      createWorkspace.isPending
                    }
                    className="bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] hover:scale-[1.02] hover:shadow-lg hover:shadow-gold/30 flex-1 font-bold disabled:opacity-50"
                  >
                    {createWorkspace.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "יצירת הסוכנות ✨"
                    )}
                  </Button>
                </div>
                {!allLegalAgreed && workspaceName.trim().length >= 2 && (
                  <p className="text-xs text-amber-300/85 text-center">
                    יש לאשר את שלוש ההצהרות המשפטיות לפני יצירת הסוכנות
                  </p>
                )}
              </div>
            </GlassCard>
          )}

          {/* Join mode */}
          {mode === "join" && (
            <GlassCard className="p-7 lg:p-10 animate-fade-up">
              <GoldEyebrow>הצטרפות לסוכנות קיימת</GoldEyebrow>
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-white tracking-tight mb-7">
                הזיני את קוד ההזמנה
              </h2>
              <div className="space-y-5">
                <div>
                  <Label htmlFor="token" className="text-white/90 mb-2 block text-sm font-semibold">
                    קוד הזמנה
                  </Label>
                  <Input
                    id="token"
                    value={inviteToken}
                    onChange={(e) => setInviteToken(e.target.value)}
                    placeholder="הדבק כאן את קוד ההזמנה שקיבלת"
                    className="bg-white/5 border-white/25 text-white placeholder:text-white/40 font-mono h-12 text-base"
                  />
                </div>

                <LegalConsentBlock
                  agreeTerms={agreeTerms}
                  setAgreeTerms={setAgreeTerms}
                  agreePrivacy={agreePrivacy}
                  setAgreePrivacy={setAgreePrivacy}
                  agreeAccessibility={agreeAccessibility}
                  setAgreeAccessibility={setAgreeAccessibility}
                />

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setMode("choose")}
                    className="border-white/25 bg-white/5 text-white hover:bg-white/10"
                  >
                    חזרה
                  </Button>
                  <Button
                    onClick={() =>
                      acceptInvite.mutate({ token: inviteToken.trim() })
                    }
                    disabled={
                      inviteToken.trim().length < 5 ||
                      !allLegalAgreed ||
                      acceptInvite.isPending
                    }
                    className="bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] hover:scale-[1.02] hover:shadow-lg hover:shadow-gold/30 flex-1 font-bold disabled:opacity-50"
                  >
                    {acceptInvite.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "הצטרפות לסוכנות ✨"
                    )}
                  </Button>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Billing mode - shown after workspace.create succeeds */}
          {mode === "billing" && (
            <BillingStep
              workspaceName={createdWorkspaceName}
              period={billingPeriod}
              onPeriodChange={setBillingPeriod}

              onUpgrade={upgradeTo}
              isPending={requestCheckout.isPending}
            />
          )}
        </div>
      </div>
    </CinematicShell>
  );
}

interface BillingStepProps {
  workspaceName: string;
  period: BillingPeriod;
  onPeriodChange: (period: BillingPeriod) => void;

  onUpgrade: (plan: PaidPlan) => void;
  isPending: boolean;
}

function BillingStep({
  workspaceName,
  period,
  onPeriodChange,

  onUpgrade,
  isPending,
}: BillingStepProps) {
  // Source of truth lives in server/billing.ts; mirrored here for SSR-free display.
  const basicPrice = 150;
  const proPrice = 249;
  const premiumPrice = 389;

  return (
    <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
      <GlassCard goldAccent className="p-7 lg:p-10">
        <GoldEyebrow>בחירת תוכנית · {workspaceName || "הסוכנות שלך"}</GoldEyebrow>
        <h2 className="font-display text-2xl lg:text-3xl font-bold text-white tracking-tight mb-3">
          איזו תוכנית מתאימה לך?
        </h2>
        <p className="text-sm text-white/70 leading-relaxed mb-7">
          בחרי את התוכנית שמתאימה לגודל הסוכנות שלך. כל שינוי מתבצע
          בלחיצה — בלי התחייבויות.
        </p>

        {/* Period toggle - mirrors the Pricing page pattern exactly */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <span
            className={`text-sm font-medium ${period === "monthly" ? "text-white" : "text-white/50"}`}
          >
            חודשי
          </span>
          <button
            type="button"
            onClick={() => onPeriodChange(period === "yearly" ? "monthly" : "yearly")}
            className="relative inline-flex h-7 w-14 items-center rounded-full bg-white/10 border border-white/20 transition-colors focus:outline-none"
            aria-label="החלפת תקופת חיוב"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-gold transition-transform ${
                period === "yearly" ? "translate-x-1" : "translate-x-8"
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium ${period === "yearly" ? "text-white" : "text-white/50"}`}
          >
            שנתי{" "}
            <span className="text-gold text-xs">(חיסכון של 16%)</span>
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <PlanCard
            icon={<Building2 className="h-5 w-5 text-gold" />}
            eyebrow="לסוכן עצמאי"
            title="Base"
            priceLabel={`₪${basicPrice}`}
            priceSuffix={period === "yearly" ? "לחודש (חיוב שנתי)" : "לחודש"}
            features={[
              "עד 300 לקוחות פעילים",
              "זיהוי דגלים אוטומטי",
              "דוחות חודשיים + תמיכה במייל",
            ]}
            ctaLabel="בחר Base"
            ctaVariant="outline"
            onClick={() => onUpgrade("basic")}
            disabled={isPending}
          />
          <PlanCard
            icon={<Sparkles className="h-5 w-5 text-gold" />}
            eyebrow="לסוכנות בצמיחה"
            title="Pro"
            priceLabel={`₪${proPrice}`}
            priceSuffix={period === "yearly" ? "לחודש (חיוב שנתי)" : "לחודש"}
            features={[
              "עד 1000 לקוחות פעילים",
              "זיהוי דגלים מורחב",
              "ייצוא נתונים מלא",
            ]}
            ctaLabel="בחר Pro"
            ctaVariant="outline"
            onClick={() => onUpgrade("pro")}
            disabled={isPending}
          />
          <PlanCard
            icon={<Crown className="h-5 w-5 text-[#06101F]" />}
            eyebrow="המומלץ ביותר"
            title="Premium"
            priceLabel={`₪${premiumPrice}`}
            priceSuffix={period === "yearly" ? "לחודש (חיוב שנתי)" : "לחודש"}
            features={[
              "לקוחות ללא הגבלה",
              "זיהוי VIP, תיקון 190, השתלמות",
              "אוטומציות WhatsApp + תמיכה VIP",
            ]}
            ctaLabel="בחר Premium"
            ctaVariant="gold"
            onClick={() => onUpgrade("premium")}
            disabled={isPending}
            highlighted
          />
        </div>

        <p className="text-xs text-white/55 leading-relaxed text-center mt-6">
          * שדרוג בתשלום מועבר כעת לטיפול ידני של צוות SPARK AI עד להפעלת iCount.
          תקבלי מייל עם לינק תשלום מאובטח תוך זמן קצר.
        </p>
      </GlassCard>
    </div>
  );
}

interface PlanCardProps {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  priceLabel: string;
  priceSuffix: string;
  features: string[];
  ctaLabel: string;
  ctaVariant: "ghost" | "outline" | "gold";
  onClick: () => void;
  disabled?: boolean;
  highlighted?: boolean;
}

function PlanCard({
  icon,
  eyebrow,
  title,
  priceLabel,
  priceSuffix,
  features,
  ctaLabel,
  ctaVariant,
  onClick,
  disabled,
  highlighted,
}: PlanCardProps) {
  return (
    <div
      className={`relative rounded-xl p-5 flex flex-col gap-4 border transition-all ${
        highlighted
          ? "bg-gradient-to-br from-gold/15 to-gold/5 border-gold/50 shadow-[0_8px_28px_rgba(201,169,97,0.18)]"
          : "bg-white/5 border-white/15 hover:border-white/25"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`h-9 w-9 rounded-lg flex items-center justify-center ${
            highlighted
              ? "bg-gold border border-gold/60"
              : "bg-white/10 border border-white/20"
          }`}
        >
          {icon}
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gold/85">
          {eyebrow}
        </span>
      </div>

      <div>
        <h3 className="font-display text-xl font-bold text-white tracking-tight mb-1">
          {title}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl font-bold text-white">
            {priceLabel}
          </span>
          <span className="text-xs text-white/60">{priceSuffix}</span>
        </div>
      </div>

      <ul className="space-y-2 flex-1">
        {features.map(feature => (
          <li
            key={feature}
            className="flex items-start gap-2 text-xs text-white/80 leading-relaxed"
          >
            <Check className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={onClick}
        disabled={disabled}
        variant={ctaVariant === "gold" ? "default" : ctaVariant === "outline" ? "outline" : "ghost"}
        className={`w-full font-bold disabled:opacity-50 ${
          ctaVariant === "gold"
            ? "bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] hover:scale-[1.02] hover:shadow-lg hover:shadow-gold/30"
            : ctaVariant === "outline"
              ? "border-white/25 bg-white/5 text-white hover:bg-white/10"
              : "bg-white/10 text-white hover:bg-white/15 border border-white/15"
        }`}
      >
        {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : ctaLabel}
      </Button>
    </div>
  );
}

interface LegalConsentBlockProps {
  agreeTerms: boolean;
  setAgreeTerms: (v: boolean) => void;
  agreePrivacy: boolean;
  setAgreePrivacy: (v: boolean) => void;
  agreeAccessibility: boolean;
  setAgreeAccessibility: (v: boolean) => void;
}

function LegalConsentBlock({
  agreeTerms,
  setAgreeTerms,
  agreePrivacy,
  setAgreePrivacy,
  agreeAccessibility,
  setAgreeAccessibility,
}: LegalConsentBlockProps) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/15 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="h-4 w-4 text-gold" />
        <span className="text-sm font-semibold text-white">הצהרות משפטיות חובה</span>
      </div>

      <label className="flex items-start gap-3 cursor-pointer group">
        <Checkbox
          checked={agreeTerms}
          onCheckedChange={(v) => setAgreeTerms(v === true)}
          className="mt-0.5 border-gold/50 data-[state=checked]:bg-gold data-[state=checked]:text-[#06101F]"
        />
        <span className="text-xs text-white/80 leading-relaxed">
          קראתי ואני מסכים/ה ל
          <a href="/legal/terms" target="_blank" className="text-gold underline mx-1 hover:text-gold-light">
            <FileText className="inline h-3 w-3 ml-0.5" />
            תנאי השימוש
          </a>
          ולמדיניות החיוב של SPARK Quality.
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer group">
        <Checkbox
          checked={agreePrivacy}
          onCheckedChange={(v) => setAgreePrivacy(v === true)}
          className="mt-0.5 border-gold/50 data-[state=checked]:bg-gold data-[state=checked]:text-[#06101F]"
        />
        <span className="text-xs text-white/80 leading-relaxed">
          אני מאשר/ת את
          <a href="/legal/privacy" target="_blank" className="text-gold underline mx-1 hover:text-gold-light">
            <Shield className="inline h-3 w-3 ml-0.5" />
            מדיניות הפרטיות
          </a>
          לרבות איסוף ועיבוד מידע על-פי חוק הגנת הפרטיות התשמ"א-1981 וסעיף 13 לחוק
          (אבטחת מידע ברמה גבוהה).
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer group">
        <Checkbox
          checked={agreeAccessibility}
          onCheckedChange={(v) => setAgreeAccessibility(v === true)}
          className="mt-0.5 border-gold/50 data-[state=checked]:bg-gold data-[state=checked]:text-[#06101F]"
        />
        <span className="text-xs text-white/80 leading-relaxed">
          קראתי את
          <a href="/legal/accessibility" target="_blank" className="text-gold underline mx-1 hover:text-gold-light">
            <Accessibility className="inline h-3 w-3 ml-0.5" />
            הצהרת הנגישות
          </a>
          ואני מתחייב/ת לשמור על דיני סודיות הלקוחות בעת שימוש במערכת.
        </span>
      </label>
    </div>
  );
}
