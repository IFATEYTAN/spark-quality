// Editorial Fintech | דשבורד תוצאות
import { useState } from "react";
import { AlertTriangle, TrendingUp, Calendar, Mail, Gift, Sparkles, ArrowLeft, Download, Mail as MailIcon, MessageSquare } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, PieChart, Pie, Tooltip } from "recharts";
import { CUSTOMERS, STATS, INSURER_BREAKDOWN, AGE_GROUPS_NO_PENSION, formatCurrency } from "@/lib/demoData";
import type { Customer } from "@/lib/demoData";
import { AnimatedNumber } from "./AnimatedNumber";
import { AIComposerModal } from "./AIComposerModal";

interface DashboardStageProps {
  onAction: () => void;
}

const TRIGGER_CARDS = [
  { id: "risk", name: "ריסק זמני", value: STATS.riskFlags, sub: "דורש פעולה מיידית", icon: AlertTriangle, accent: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
  { id: "pension", name: "ללא פנסיה", value: STATS.noPension, sub: "הזדמנות אאפסל", icon: TrendingUp, accent: "text-gold", bg: "bg-gold/10", border: "border-gold/30" },
  { id: "discount", name: "תום הנחה", value: STATS.endingDiscount, sub: "סיכון נטישה", icon: Calendar, accent: "text-navy-deep", bg: "bg-navy/5", border: "border-navy/20" },
  { id: "email", name: "ללא מייל", value: STATS.noEmail, sub: `${STATS.noEmailPercent}% מהתיק`, icon: Mail, accent: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200" },
  { id: "birthday", name: "יום הולדת", value: STATS.upcomingBirthdays, sub: "בחודש הקרוב", icon: Gift, accent: "text-navy-deep", bg: "bg-navy/5", border: "border-navy/20" },
  { id: "crosssell", name: "קרוס-סייל", value: STATS.crossSellOpps, sub: "הזדמנויות מכירה", icon: Sparkles, accent: "text-gold", bg: "bg-gold/10", border: "border-gold/30" },
];

export function DashboardStage({ onAction }: DashboardStageProps) {
  const insurerData = INSURER_BREAKDOWN.map(d => ({ name: d.name, customers: d.customers }));
  const [composerCustomer, setComposerCustomer] = useState<Customer | null>(null);
  const [composerChannel, setComposerChannel] = useState<"email" | "whatsapp" | null>(null);

  const openComposer = (customer: Customer, channel: "email" | "whatsapp") => {
    setComposerCustomer(customer);
    setComposerChannel(channel);
  };
  const closeComposer = () => {
    setComposerCustomer(null);
    setComposerChannel(null);
  };

  return (
    <div className="h-[calc(100vh-7rem)] w-full overflow-y-auto animate-fade-in">
      {/* Page header */}
      <div className="border-b border-border/40 bg-card/60 backdrop-blur-sm">
        <div className="container py-8">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
            <div className="animate-fade-up">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px w-12 bg-gold" />
                <span className="label-tag text-gold">תוצאות הניתוח · דוח_מוצרים_בניהול.xlsx</span>
              </div>
              <h1 className="font-display text-4xl font-bold leading-tight text-navy-deep lg:text-5xl">
                תיק הלקוחות שלכם<br />
                <span className="text-muted-foreground">בזווית חדשה.</span>
              </h1>
              <p className="mt-3 max-w-xl text-muted-foreground">
                המערכת זיהתה <span className="font-semibold text-navy-deep">1,071 דגלים</span> שדורשים תשומת לב.
                להלן סיכום התובנות והפעולות המומלצות.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 rounded-sm border border-border bg-card px-5 py-3 text-sm font-semibold text-navy-deep transition-all hover:border-gold hover:text-gold">
                <Download className="h-4 w-4" strokeWidth={2} />
                ייצוא PDF
              </button>
              <button
                onClick={onAction}
                className="group flex items-center gap-2 rounded-sm bg-navy-deep px-6 py-3 text-sm font-semibold text-cream transition-all hover:bg-navy hover:shadow-lg"
              >
                הפעל פעולות אוטומטיות
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-10">
        {/* Hero KPIs - editorial layout */}
        <div className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 animate-fade-up">
            <div className="glass-card relative overflow-hidden rounded-sm p-8">
              <div className="label-tag text-gold mb-3">סך נכסים בניהול (AUM)</div>
              <div className="display-number text-7xl font-bold text-navy-deep">
                <AnimatedNumber value={487} duration={1800} />
                <span className="text-3xl font-semibold text-gold mr-2">M ₪</span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-6 border-t border-border/40 pt-6">
                <div>
                  <div className="label-tag text-[10px] text-muted-foreground">לקוחות</div>
                  <div className="font-display text-2xl font-bold text-navy-deep">
                    <AnimatedNumber value={STATS.totalCustomers} />
                  </div>
                </div>
                <div>
                  <div className="label-tag text-[10px] text-muted-foreground">מוצרים פעילים</div>
                  <div className="font-display text-2xl font-bold text-navy-deep">
                    <AnimatedNumber value={STATS.activeProducts} />
                  </div>
                </div>
              </div>
              <div className="absolute -left-12 -top-12 h-48 w-48 rounded-full bg-gold/10 blur-3xl" />
            </div>
          </div>

          <div className="lg:col-span-7 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <div className="glass-card relative overflow-hidden rounded-sm p-8 h-full">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="label-tag text-gold mb-2">פוטנציאל הכנסה מהפעולות שזוהו</div>
                  <div className="display-number text-6xl font-bold text-navy-deep">
                    {formatCurrency(STATS.potentialRevenue)}
                  </div>
                </div>
                <div className="text-left">
                  <div className="label-tag text-[10px] text-muted-foreground">חיסכון בזמן</div>
                  <div className="font-display text-3xl font-bold text-gold">
                    <AnimatedNumber value={STATS.timesSaved} />h
                  </div>
                  <div className="text-xs text-muted-foreground">בחודש</div>
                </div>
              </div>
              {/* Mini progress bars */}
              <div className="space-y-3">
                {[
                  { label: "אאפסל פנסיה", value: 1_640_000, max: 2_840_000, color: "bg-gold" },
                  { label: "שימור לקוחות", value: 820_000, max: 2_840_000, color: "bg-navy-deep" },
                  { label: "חידוש כיסויים", value: 380_000, max: 2_840_000, color: "bg-emerald-700" },
                ].map((b, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-navy-deep">{b.label}</span>
                      <span className="text-muted-foreground">{formatCurrency(b.value)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden bg-muted rounded-full">
                      <div className={`h-full ${b.color} transition-all duration-1000`} style={{ width: `${(b.value / b.max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Trigger cards - 6 in a row */}
        <div className="mb-12">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-bold text-navy-deep">דגלים שזוהו · 6 קטגוריות</h2>
            <div className="gold-divider flex-1 mx-6" />
            <span className="label-tag text-muted-foreground">סה״כ 1,071 התראות</span>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {TRIGGER_CARDS.map((card, i) => (
              <div
                key={card.id}
                className={`group relative overflow-hidden rounded-sm border ${card.border} ${card.bg} p-5 transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer animate-fade-up`}
                style={{ animationDelay: `${0.05 * i + 0.2}s` }}
              >
                <card.icon className={`h-5 w-5 ${card.accent} mb-3`} strokeWidth={1.5} />
                <div className="display-number text-4xl font-bold text-navy-deep">
                  <AnimatedNumber value={card.value} duration={1200 + i * 100} />
                </div>
                <div className="mt-2 text-sm font-semibold text-navy-deep">{card.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{card.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Charts row */}
        <div className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Insurer breakdown */}
          <div className="lg:col-span-7 animate-fade-up">
            <div className="glass-card rounded-sm p-6">
              <div className="mb-5 flex items-baseline justify-between">
                <div>
                  <div className="label-tag text-gold mb-1">פילוח לקוחות</div>
                  <h3 className="font-display text-xl font-bold text-navy-deep">לפי יצרן ביטוח</h3>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={insurerData} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      orientation="right"
                      tick={{ fontSize: 12, fontFamily: "Heebo", fill: "#0A1628" }}
                      axisLine={false}
                      tickLine={false}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{ background: "#0A1628", border: "none", borderRadius: 4, color: "#F5F1EA", fontFamily: "Heebo" }}
                      cursor={{ fill: "rgba(201, 169, 97, 0.1)" }}
                      formatter={(v: number) => [`${v} לקוחות`, ""]}
                    />
                    <Bar dataKey="customers" radius={[0, 2, 2, 0]}>
                      {insurerData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? "#C9A961" : i < 3 ? "#1F3A5F" : "#0A1628"} fillOpacity={1 - i * 0.08} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Age groups - no pension */}
          <div className="lg:col-span-5 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <div className="glass-card rounded-sm p-6">
              <div className="mb-5">
                <div className="label-tag text-gold mb-1">148 לקוחות ללא פנסיה</div>
                <h3 className="font-display text-xl font-bold text-navy-deep">פילוח לפי גיל</h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={AGE_GROUPS_NO_PENSION}
                      dataKey="count"
                      nameKey="group"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {AGE_GROUPS_NO_PENSION.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#0A1628", border: "none", borderRadius: 4, color: "#F5F1EA", fontFamily: "Heebo", fontSize: 12 }}
                      formatter={(v: number, _: string, p: { payload?: { group?: string } }) => [`${v} לקוחות`, `גיל ${p.payload?.group ?? ""}`]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {AGE_GROUPS_NO_PENSION.map((g) => (
                  <div key={g.group} className="text-center">
                    <div className="h-1 w-full mb-1" style={{ background: g.color }} />
                    <div className="text-[10px] text-muted-foreground">{g.group}</div>
                    <div className="text-xs font-bold text-navy-deep">{g.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Customer table - priority list */}
        <div className="animate-fade-up">
          <div className="mb-5 flex items-baseline justify-between">
            <div>
              <div className="label-tag text-gold mb-1">רשימת פעולה</div>
              <h2 className="font-display text-2xl font-bold text-navy-deep">לקוחות בעדיפות גבוהה</h2>
            </div>
            <button className="text-sm font-semibold text-navy-deep hover:text-gold flex items-center gap-1">
              ראה את כל 1,071 הלקוחות
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="glass-card rounded-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-border/40 bg-navy-deep/[0.02]">
                    <th className="label-tag text-[10px] text-muted-foreground p-4">לקוח</th>
                    <th className="label-tag text-[10px] text-muted-foreground p-4">מוצר</th>
                    <th className="label-tag text-[10px] text-muted-foreground p-4">סטטוס</th>
                    <th className="label-tag text-[10px] text-muted-foreground p-4">דגל</th>
                    <th className="label-tag text-[10px] text-muted-foreground p-4">צבירה</th>
                    <th className="label-tag text-[10px] text-muted-foreground p-4">פעולה מומלצת</th>
                    <th className="label-tag text-[10px] text-muted-foreground p-4 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {CUSTOMERS.map((c, i) => (
                    <tr key={c.id} className="border-b border-border/30 transition-colors hover:bg-gold/[0.04]" style={{ animationDelay: `${0.05 * i}s` }}>
                      <td className="p-4">
                        <div className="font-display font-bold text-navy-deep">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.age} · {c.city}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-semibold text-navy-deep">{c.product}</div>
                        <div className="text-xs text-muted-foreground">{c.insurer}</div>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="p-4 text-xs text-muted-foreground max-w-[180px]">
                        {c.flag}
                      </td>
                      <td className="p-4">
                        <div className="font-display font-bold text-navy-deep">{formatCurrency(c.accumulation)}</div>
                      </td>
                      <td className="p-4 text-xs text-foreground/80 max-w-[220px]">
                        {c.recommendation}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1.5">
                          {c.email ? (
                            <button
                              onClick={() => openComposer(c, "email")}
                              className="group flex items-center gap-1.5 rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-navy-deep transition-all hover:border-gold hover:bg-gold/10 hover:text-gold hover:shadow-md"
                              title="נסח מייל ב-AI"
                            >
                              <Sparkles className="h-3 w-3 text-gold" />
                              <MailIcon className="h-3 w-3" />
                            </button>
                          ) : (
                            <span className="rounded-md bg-muted px-2 py-1.5 text-[10px] text-muted-foreground/60" title="אין מייל">—</span>
                          )}
                          <button
                            onClick={() => openComposer(c, "whatsapp")}
                            className="group flex items-center gap-1.5 rounded-md border border-border bg-white px-2.5 py-1.5 text-[11px] font-bold text-navy-deep transition-all hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-md"
                            title="נסח הודעת WhatsApp ב-AI"
                          >
                            <Sparkles className="h-3 w-3 text-emerald-600" />
                            <MessageSquare className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* AI Composer Modal */}
      <AIComposerModal
        customer={composerCustomer}
        channel={composerChannel}
        onClose={closeComposer}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "ריסק זמני": "bg-red-50 text-red-700 border-red-200",
    "תום הנחה": "bg-amber-50 text-amber-700 border-amber-200",
    "ללא פנסיה": "bg-gold/10 text-gold border-gold/30",
    "ללא מייל": "bg-slate-50 text-slate-700 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center rounded-sm border px-2 py-1 text-[11px] font-semibold ${map[status] || "bg-muted"}`}>
      {status}
    </span>
  );
}
