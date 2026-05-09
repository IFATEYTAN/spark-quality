import { GlassCard } from "@/components/CinematicShell";
import { Button } from "@/components/ui/button";
import { Crown, ArrowUpCircle, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";

type Plan = "basic" | "pro" | "premium";

const PLAN_META: Record<Plan, { label: string; clientLimit: number; flagsQuota: number; color: string }> = {
  basic: { label: "Base", clientLimit: 300, flagsQuota: 50, color: "text-blue-300" },
  pro: { label: "Pro", clientLimit: 1000, flagsQuota: 200, color: "text-purple-300" },
  premium: { label: "Premium", clientLimit: -1, flagsQuota: -1, color: "text-gold" },
};

type Props = {
  plan: Plan;
  totalClients: number;
  activeFlags?: number;
};

export function PlanCard({ plan, totalClients, activeFlags = 0 }: Props) {
  const [, navigate] = useLocation();
  const meta = PLAN_META[plan];
  const isUnlimited = meta.clientLimit === -1;
  const clientPercent = isUnlimited ? 0 : Math.min(100, Math.round((totalClients / meta.clientLimit) * 100));
  const flagsPercent =
    meta.flagsQuota === -1 ? 0 : Math.min(100, Math.round((activeFlags / meta.flagsQuota) * 100));

  const isNearLimit = clientPercent >= 80 || flagsPercent >= 80;
  const canUpgrade = plan !== "premium";

  return (
    <GlassCard className="p-5 sm:p-6 col-span-2 lg:col-span-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={`h-11 w-11 rounded-md bg-gold/15 border border-gold/30 flex items-center justify-center ${meta.color}`}>
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-white/45">התוכנית הנוכחית שלכם</div>
            <div className="font-display text-xl sm:text-2xl font-bold text-white">
              תוכנית <span className={meta.color}>{meta.label}</span>
              {plan === "premium" && <CheckCircle2 className="inline h-5 w-5 text-gold mr-2" />}
            </div>
          </div>
        </div>
        {canUpgrade && (
          <Button
            type="button"
            onClick={() => navigate("/pricing")}
            className={`${
              isNearLimit
                ? "bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] hover:scale-[1.02] hover:shadow-lg hover:shadow-gold/30 font-bold animate-pulse"
                : "bg-white/10 hover:bg-gold/20 text-white border border-gold/30"
            }`}
          >
            <ArrowUpCircle className="h-4 w-4 ml-1.5" />
            {isNearLimit ? "שדרגו עכשיו" : "שדרוג תוכנית"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Clients usage */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-white/65">לקוחות בתיק</span>
            <span className="text-white font-medium">
              {totalClients.toLocaleString("he-IL")} / {isUnlimited ? "∞" : meta.clientLimit.toLocaleString("he-IL")}
            </span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
            <div
              className={`h-full transition-all ${
                clientPercent >= 90
                  ? "bg-rose-400"
                  : clientPercent >= 80
                  ? "bg-gold"
                  : "bg-emerald-400/70"
              }`}
              style={{ width: `${isUnlimited ? 6 : clientPercent}%` }}
            />
          </div>
          {clientPercent >= 80 && !isUnlimited && (
            <div className="text-[11px] text-gold mt-1.5">
              ⚠️ ניצלת {clientPercent}% מהמכסה — מומלץ לשדרג לפני שתגיע לתקרה.
            </div>
          )}
        </div>

        {/* Flags usage */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-white/65">דגלים פעילים</span>
            <span className="text-white font-medium">
              {activeFlags.toLocaleString("he-IL")} / {meta.flagsQuota === -1 ? "∞" : meta.flagsQuota}
            </span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
            <div
              className={`h-full transition-all ${
                flagsPercent >= 90 ? "bg-rose-400" : flagsPercent >= 80 ? "bg-gold" : "bg-emerald-400/70"
              }`}
              style={{ width: `${meta.flagsQuota === -1 ? 6 : flagsPercent}%` }}
            />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
