// client/src/pages/AccountBilling.tsx
// ----------------------------------------------------------------------------
// Unified Billing Settings page (/account/billing).
//
// Sections:
//   1) Current plan card — plan label + billing period + status pill
//   2) Usage meters — clients / active flags / triggers vs. quota
//   3) Plan management — link to /pricing for changes (downgrade is blocked
//      server-side if usage exceeds the target plan's quota)
//   4) Billing history — last 25 payment attempts (status, amount, invoice link)
// ----------------------------------------------------------------------------

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import {
  PLAN_LABEL,
  PLAN_QUOTAS,
  type PlanKey,
} from "@shared/planFeatures";
import { useLocation } from "wouter";
import {
  CreditCard,
  ExternalLink,
  Receipt,
  TrendingUp,
  Users,
  Flag,
} from "lucide-react";

const isPlanKey = (raw: unknown): raw is PlanKey =>
  raw === "basic" || raw === "pro" || raw === "premium" || raw === "enterprise";

const STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  succeeded: { label: "שולם", className: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30" },
  pending: { label: "ממתין", className: "bg-amber-500/15 text-amber-300 border-amber-400/30" },
  failed: { label: "נכשל", className: "bg-red-500/15 text-red-300 border-red-400/30" },
  abandoned: { label: "נטוש", className: "bg-white/5 text-white/50 border-white/15" },
};

const PLAN_BADGE: Record<PlanKey, string> = {
  basic: "Base",
  pro: "Pro",
  premium: "Premium",
  enterprise: "Enterprise",
};

const PERIOD_LABEL: Record<string, string> = {
  monthly: "חודשי",
  yearly: "שנתי",
};

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("he-IL", { year: "numeric", month: "short", day: "numeric" });
}

function UsageMeter({
  icon,
  label,
  used,
  max,
}: {
  icon: React.ReactNode;
  label: string;
  used: number;
  max: number;
}) {
  const unlimited = max === -1;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(max, 1)) * 100));
  const danger = !unlimited && pct >= 90;
  const warning = !unlimited && pct >= 75 && !danger;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <span
          className={`text-sm font-medium ${
            danger ? "text-red-500" : warning ? "text-amber-500" : "text-muted-foreground"
          }`}
        >
          {used.toLocaleString("he-IL")}
          {unlimited ? " (ללא הגבלה)" : ` / ${max.toLocaleString("he-IL")}`}
        </span>
      </div>
      {!unlimited && (
        <Progress
          value={pct}
          className={`h-2 ${danger ? "[&>div]:bg-red-500" : warning ? "[&>div]:bg-amber-500" : ""}`}
        />
      )}
    </div>
  );
}

export default function AccountBilling() {
  const [, navigate] = useLocation();

  const accessQuery = trpc.billing.myAccessStatus.useQuery();
  const metricsQuery = trpc.workspaces.metrics.useQuery();
  const historyQuery = trpc.billing.history.useQuery();

  const accessData = accessQuery.data as
    | { plan?: string; billingPeriod?: string | null; status?: string; paymentMethod?: string | null }
    | undefined;
  const plan: PlanKey = isPlanKey(accessData?.plan) ? accessData!.plan! : "basic";
  const billingPeriod = accessData?.billingPeriod ?? "yearly";
  const status = accessData?.status ?? "active";
  const quota = PLAN_QUOTAS[plan];

  // The metrics endpoint returns 16 priority trigger counts but no aggregate
  // "activeFlags". Sum them client-side so the meter stays consistent with the
  // dashboard cards.
  const metrics = metricsQuery.data as Record<string, number> | undefined;
  const totalClients = metrics?.totalClients ?? 0;
  const TRIGGER_KEYS = [
    "poaExpired",
    "poaExpiring90d",
    "riskTemporary",
    "coverageEnding",
    "savingsNoInsurance",
    "noActivePension",
    "age46NoLongTermCare",
    "aumFrozen",
    "highFees",
    "trackMismatch",
    "selfEmployedNoDeposit",
    "concentrationRisk",
    "birthdayMilestone",
    "birthdayThisMonth",
    "vipGoldPremium",
    "noEmail",
  ] as const;
  const activeFlags = metrics
    ? TRIGGER_KEYS.reduce((sum, k) => sum + (metrics[k] ?? 0), 0)
    : 0;

  const history = (historyQuery.data ?? []) as Array<{
    id: number;
    requestId: string;
    plan: string;
    billingPeriod: string;
    amount: number;
    status: string;
    invoiceId: string | null;
    paymentUrl: string | null;
    callbackAt: string | Date | null;
    createdAt: string | Date;
  }>;

  return (
    <DashboardLayout>
      <div className="container max-w-5xl py-8 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-primary" />
              הגדרות חיוב
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              ניהול תוכנית, מעקב שימוש ועסקאות חיוב.
            </p>
          </div>
          <Button onClick={() => navigate("/pricing")} variant="default">
            שינוי תוכנית
          </Button>
        </header>

        {/* Section 1 — Current plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">התוכנית הנוכחית</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  תוכנית
                </div>
                <div className="text-2xl font-semibold flex items-center gap-2">
                  {PLAN_BADGE[plan]}
                  {status === "active" ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                      פעילה
                    </Badge>
                  ) : status === "grace" ? (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                      בתקופת חסד
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
                      חסומה
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  מחזור חיוב
                </div>
                <div className="text-base font-medium">
                  {PERIOD_LABEL[billingPeriod] ?? billingPeriod}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  אמצעי תשלום
                </div>
                <div className="text-base font-medium capitalize">
                  {accessData?.paymentMethod === "standing_order"
                    ? "הוראת קבע"
                    : accessData?.paymentMethod === "manual"
                      ? "ידני"
                      : "—"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2 — Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              שימוש מול מכסה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsageMeter
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              label="לקוחות בתיק"
              used={totalClients}
              max={quota.maxClients}
            />
            <UsageMeter
              icon={<Flag className="h-4 w-4 text-muted-foreground" />}
              label="דגלים פעילים"
              used={activeFlags}
              max={quota.maxActiveFlags}
            />
            <div className="text-xs text-muted-foreground border-t border-border pt-3">
              התוכנית הנוכחית מאפשרת עד {quota.maxTriggerKeys === -1 ? "כל" : quota.maxTriggerKeys} טריגרים מתוך 16. שדרוג ל-Premium פותח את כל הטריגרים כולל ימי הולדת, VIP ולקוחות ללא מייל.
            </div>
            {(quota.maxClients !== -1 && totalClients >= quota.maxClients * 0.9) && (
              <div className="text-xs rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 p-3">
                התקרבת למכסת הלקוחות של תוכנית {PLAN_LABEL[plan]}. שדרוג עכשיו ימנע חסימה כשיתווסף הלקוח הבא.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3 — Billing history */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              היסטוריית חיוב
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyQuery.isPending ? (
              <div className="text-sm text-muted-foreground py-8 text-center">טוען היסטוריה…</div>
            ) : history.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                אין עדיין רשומות חיוב.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="text-right py-2 px-3">תאריך</th>
                      <th className="text-right py-2 px-3">תוכנית</th>
                      <th className="text-right py-2 px-3">מחזור</th>
                      <th className="text-right py-2 px-3">סכום</th>
                      <th className="text-right py-2 px-3">סטטוס</th>
                      <th className="text-right py-2 px-3">חשבונית</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(row => {
                      const badge = STATUS_BADGE[row.status] ?? STATUS_BADGE.pending;
                      return (
                        <tr key={row.id} className="border-b border-border/50 last:border-b-0">
                          <td className="py-3 px-3 whitespace-nowrap">{formatDate(row.callbackAt ?? row.createdAt)}</td>
                          <td className="py-3 px-3 capitalize">{PLAN_BADGE[row.plan as PlanKey] ?? row.plan}</td>
                          <td className="py-3 px-3">{PERIOD_LABEL[row.billingPeriod] ?? row.billingPeriod}</td>
                          <td className="py-3 px-3 font-medium">
                            ₪{row.amount.toLocaleString("he-IL")}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${badge.className}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {row.invoiceId ? (
                              <span className="text-xs text-muted-foreground">{row.invoiceId}</span>
                            ) : row.paymentUrl ? (
                              <a
                                href={row.paymentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
                              >
                                לעמוד התשלום <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
