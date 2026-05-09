// Editorial Fintech | דשבורד תוצאות (Slide-Mode, 3 sub-slides: 3א/3ב/3ג)
import { useState } from "react";
import {
  AlertTriangle,
  TrendingUp,
  Calendar,
  Sparkles,
  ArrowLeft,
  Download,
  Mail as MailIcon,
  MessageSquare,
  Briefcase,
  AlertOctagon,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, PieChart, Pie, Tooltip, LabelList } from "recharts";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { CUSTOMERS, STATS, INSURER_BREAKDOWN, AGE_GROUPS_NO_PENSION, formatCurrency } from "@/lib/demoData";
import type { Customer } from "@/lib/demoData";
import { AnimatedNumber } from "./AnimatedNumber";
import { CategoryScenarioModal } from "./CategoryScenarioModal";
import { AIComposerModal } from "./AIComposerModal";
import { exportDashboardPDF } from "@/lib/exportPdf";
import type { ParsedReport } from "@/lib/parseReport";

interface DashboardStageProps {
  onAction: () => void;
  parsed?: ParsedReport | null;
  /**
   * Which of the 3 dashboard sub-slides to render. Defaults to 1 for backwards compat.
   *  1 = KPIs hero + financial breakdown
   *  2 = 6 trigger flags + 2 charts
   *  3 = High-priority customers table + exports
   */
  slide?: 1 | 2 | 3;
}

function buildTriggerCards(stats: typeof STATS) {
  return [
    // 💸 קטגוריות פיננסיות (3)
    { id: "vip", name: "לקוחות VIP", value: 42, sub: "צבירה מעל 1M ₪", icon: Sparkles, accent: "text-gold", bg: "bg-gold/15", border: "border-gold/50" },
    { id: "lowYield", name: "תשואות נמוכות", value: stats.lowYield, sub: "דמי ניהול גבוהים מהממוצע", icon: TrendingUp, accent: "text-gold", bg: "bg-gold/10", border: "border-gold/30" },
    { id: "190", name: "תיקון 190", value: 54, sub: "פטור ממס רווחי הון", icon: Briefcase, accent: "text-gold", bg: "bg-gold/10", border: "border-gold/30" },
    // 🚨 קטגוריות סיכון / שימור (3)
    { id: "risk", name: "ריסק זמני", value: stats.riskFlags, sub: "דורש פעולה מיידית", icon: AlertTriangle, accent: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
    { id: "discount", name: "תום הנחה", value: stats.endingDiscount, sub: "סיכון נטישה", icon: Calendar, accent: "text-navy-deep", bg: "bg-navy/5", border: "border-navy/20" },
    { id: "coverageGaps", name: "חוסרים בכיסויים", value: (stats as any).coverageGaps ?? stats.noPension, sub: "הזדמנות להשלמת תיק", icon: AlertOctagon, accent: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
  ];
}

export function DashboardStage({ onAction, parsed, slide = 1 }: DashboardStageProps) {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  // Use parsed data if a real file was uploaded, otherwise fall back to demo data
  const customers: Customer[] = parsed?.customers ?? CUSTOMERS;
  const stats = parsed?.stats ?? STATS;
  const TRIGGER_CARDS = buildTriggerCards(stats);
  const insurerData = (parsed?.insurerBreakdown ?? INSURER_BREAKDOWN).map((d: { name: string; customers: number }) => ({ name: d.name, customers: d.customers }));
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

  /* ───────── Sub-slide labels (used in the eyebrow strip on top) ───────── */
  const subEyebrows: Record<1 | 2 | 3, { tag: string; counter: string }> = {
    1: { tag: "תוצאות הניתוח · נכסים בניהול", counter: "3א / 3 · נכסים ופוטנציאל" },
    2: { tag: "תוצאות הניתוח · דגלים שזוהו", counter: "3ב / 3 · קטגוריות וגרפים" },
    3: { tag: "תוצאות הניתוח · רשימת פעולה", counter: "3ג / 3 · לקוחות בעדיפות גבוהה" },
  };
  const eyebrow = subEyebrows[slide];

  /* ───────── Shared compact header (visible on all 3 sub-slides) ───────── */
  const HeaderBlock = (
    <div className="flex-shrink-0 border-b border-border/40 bg-card/60 backdrop-blur-sm">
      <div className="container py-3 lg:py-4">
        <div className="flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-end">
          <div className="animate-fade-up">
            <div className="mb-2 flex items-center gap-3">
              <div className="h-px w-12 bg-gold" />
              <span className="label-tag text-gold text-[10px]">{eyebrow.tag}</span>
              <span className="label-tag text-[10px] text-muted-foreground">· {eyebrow.counter}</span>
            </div>
            <h1 className="font-display text-2xl font-bold leading-tight text-navy-deep lg:text-3xl">
              {slide === 1 && (
                <>
                  תיק הלקוחות שלכם <span className="text-muted-foreground">בזווית חדשה.</span>
                </>
              )}
              {slide === 2 && (
                <>
                  6 קטגוריות, <span className="text-muted-foreground">1,071 דגלים.</span>
                </>
              )}
              {slide === 3 && (
                <>
                  לקוחות בעדיפות גבוהה <span className="text-muted-foreground">— מוכנים לפעולה.</span>
                </>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                const t = toast.loading("מכין דוח PDF…");
                try {
                  await exportDashboardPDF(customers, stats);
                  toast.success("הדוח הורד בהצלחה", { id: t });
                } catch (e) {
                  console.error(e);
                  toast.error("שגיאה בהפקת הדוח", { id: t });
                }
              }}
              className="flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 text-xs font-semibold text-navy-deep transition-all hover:border-gold hover:text-gold"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={2} />
              ייצוא PDF
            </button>
            {slide === 3 && (
              <button
                onClick={onAction}
                className="group flex items-center gap-2 rounded-sm bg-navy-deep px-4 py-2 text-xs font-semibold text-cream transition-all hover:bg-navy hover:shadow-lg"
              >
                מעבר לפעולות מיידיות
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  /* ───────── Slide 1: KPIs hero + financial breakdown ───────── */
  const Slide1 = (
    <div className="flex-1 min-h-0 overflow-hidden container py-4 lg:py-6">
      <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-12">
        {/* AUM hero card */}
        <div className="lg:col-span-5 animate-fade-up flex">
          <div className="glass-card relative overflow-hidden rounded-sm p-6 lg:p-8 w-full flex flex-col">
            <div className="label-tag text-gold mb-3">סך נכסים בניהול (AUM)</div>
            <div className="display-number text-6xl lg:text-7xl font-bold text-navy-deep">
              <AnimatedNumber value={487} duration={1800} />
              <span className="text-3xl font-semibold text-gold mr-2">M ₪</span>
            </div>
            <div className="mt-auto pt-6 grid grid-cols-2 gap-6 border-t border-border/40">
              <div>
                <div className="label-tag text-[10px] text-muted-foreground">לקוחות</div>
                <div className="font-display text-2xl font-bold text-navy-deep">
                  <AnimatedNumber value={stats.totalCustomers} />
                </div>
              </div>
              <div>
                <div className="label-tag text-[10px] text-muted-foreground">מוצרים פעילים</div>
                <div className="font-display text-2xl font-bold text-navy-deep">
                  <AnimatedNumber value={stats.activeProducts} />
                </div>
              </div>
            </div>
            <div className="absolute -left-12 -top-12 h-48 w-48 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
          </div>
        </div>

        {/* Revenue potential card */}
        <div className="lg:col-span-7 animate-fade-up flex" style={{ animationDelay: "0.1s" }}>
          <div className="glass-card relative overflow-hidden rounded-sm p-6 lg:p-8 w-full flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="label-tag text-gold mb-2">פוטנציאל הכנסה מהפעולות שזוהו</div>
                <div className="display-number text-5xl lg:text-6xl font-bold text-navy-deep">
                  {formatCurrency(stats.potentialRevenue)}
                </div>
              </div>
              <div className="text-left">
                <div className="label-tag text-[10px] text-muted-foreground">חיסכון בזמן</div>
                <div className="font-display text-3xl font-bold text-gold">
                  <AnimatedNumber value={stats.timesSaved} />h
                </div>
                <div className="text-xs text-muted-foreground">בחודש</div>
              </div>
            </div>
            <div className="mt-auto space-y-3">
              {[
                { label: "תיקון 190 / IRA · VIP", value: 1_220_000, max: 2_840_000, color: "bg-gold" },
                { label: "השתלמויות נזילות · הגדלת הפקדות", value: 720_000, max: 2_840_000, color: "bg-navy-deep" },
                { label: "שימור · דמי ניהול גבוהים", value: 520_000, max: 2_840_000, color: "bg-emerald-700" },
                { label: "חידוש ריסק / תום הנחה", value: 380_000, max: 2_840_000, color: "bg-rose-600" },
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
    </div>
  );

  /* ───────── Slide 2: 6 trigger flags + 2 charts ───────── */
  const Slide2 = (
    <div className="flex-1 min-h-0 overflow-hidden container py-4 lg:py-6 flex flex-col gap-4">
      {/* Trigger cards - 6 in a row */}
      <div className="flex-shrink-0">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg lg:text-xl font-bold text-navy-deep">דגלים שזוהו · 6 קטגוריות</h2>
          <div className="gold-divider flex-1 mx-4" />
          <span className="label-tag text-[10px] text-muted-foreground">סה״כ 1,071 התראות</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {TRIGGER_CARDS.map((card, i) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setActiveScenario(card.id)}
              className={`group relative overflow-hidden rounded-sm border ${card.border} ${card.bg} p-3 lg:p-4 text-right transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer animate-fade-up focus:outline-none focus-visible:ring-2 focus-visible:ring-gold`}
              style={{ animationDelay: `${0.05 * i + 0.2}s` }}
            >
              <card.icon className={`h-4 w-4 ${card.accent} mb-2`} strokeWidth={1.5} />
              <div className="display-number text-2xl lg:text-3xl font-bold text-navy-deep">
                <AnimatedNumber value={card.value} duration={1200 + i * 100} />
              </div>
              <div className="mt-1 text-xs font-semibold text-navy-deep">{card.name}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground line-clamp-2">{card.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Charts row — fills remaining vertical space */}
      <div className="flex-1 min-h-0 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Insurer breakdown */}
        <div className="lg:col-span-7 animate-fade-up min-h-0 flex">
          <div className="glass-card rounded-sm p-4 lg:p-6 w-full flex flex-col min-h-0">
            <div className="mb-3 flex items-baseline justify-between flex-shrink-0">
              <div>
                <div className="label-tag text-gold mb-1 text-[10px]">פילוח לקוחות</div>
                <h3 className="font-display text-base lg:text-lg font-bold text-navy-deep">לפי יצרן ביטוח</h3>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insurerData} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 5 }} barSize={22}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    orientation="right"
                    tick={{ fontSize: 13, fontWeight: 700, fontFamily: "Heebo", fill: "#0A1628" }}
                    axisLine={false}
                    tickLine={false}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{ background: "#0A1628", border: "none", borderRadius: 4, color: "#F5F1EA", fontFamily: "Heebo" }}
                    cursor={{ fill: "rgba(201, 169, 97, 0.1)" }}
                    formatter={(v: number) => [`${v} לקוחות`, ""]}
                  />
                  <Bar dataKey="customers" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="customers" position="insideRight" fill="#FFFFFF" fontSize={12} fontWeight={700} fontFamily="Heebo" formatter={(v: any) => Number(v).toLocaleString("he-IL")} />
                    {insurerData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "#C9A961" : i < 3 ? "#1F3A5F" : "#3B5478"} fillOpacity={1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Age groups - no pension */}
        <div className="lg:col-span-5 animate-fade-up min-h-0 flex" style={{ animationDelay: "0.1s" }}>
          <div className="glass-card rounded-sm p-4 lg:p-6 w-full flex flex-col min-h-0">
            <div className="mb-2 flex-shrink-0">
              <div className="label-tag text-gold mb-1 text-[10px]">148 לקוחות ללא פנסיה</div>
              <h3 className="font-display text-base lg:text-lg font-bold text-navy-deep">פילוח לפי גיל</h3>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={AGE_GROUPS_NO_PENSION}
                    dataKey="count"
                    nameKey="group"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
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
            <div className="mt-1 grid grid-cols-5 gap-2 flex-shrink-0">
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
    </div>
  );

  /* ───────── Slide 3: Customer table + exports ───────── */
  const Slide3 = (
    <div className="flex-1 min-h-0 overflow-hidden container py-4 lg:py-6 flex flex-col">
      <div className="mb-3 flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-baseline flex-shrink-0">
        <div>
          <div className="label-tag text-gold mb-1 text-[10px]">רשימת פעולה</div>
          <h2 className="font-display text-lg lg:text-xl font-bold text-navy-deep">לקוחות בעדיפות גבוהה</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const headers = ["שם", "גיל", "עיר", "מוצר", "חברה", "סטטוס", "דגל", "צבירה", "פעולה"];
              const rows = customers.map((c) => [c.name, String(c.age), c.city, c.product, c.insurer, c.status, c.flag, String(c.accumulation), c.recommendation]);
              const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "לקוחות");
              XLSX.writeFile(wb, `clients-${new Date().toISOString().slice(0, 10)}.xlsx`);
              toast.success("הקובץ הורד בהצלחה");
            }}
            className="rounded-sm border border-border bg-card px-3 py-2 text-xs font-semibold text-navy-deep hover:border-gold hover:text-gold"
          >
            ייצוא Excel
          </button>
          <button
            onClick={() => {
              const html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>רשימת לקוחות</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#0f172a}h1{font-size:20px;margin-bottom:12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd5e1;padding:8px;text-align:right;font-size:12px}th{background:#f1f5f9}</style></head><body><h1>תיק לקוחות &middot; ${new Date().toLocaleDateString("he-IL")}</h1><table><thead><tr><th>שם</th><th>גיל</th><th>עיר</th><th>מוצר</th><th>חברה</th><th>סטטוס</th><th>דגל</th><th>צבירה</th><th>פעולה</th></tr></thead><tbody>${customers.map((c) => `<tr><td>${c.name}</td><td>${c.age}</td><td>${c.city}</td><td>${c.product}</td><td>${c.insurer}</td><td>${c.status}</td><td>${c.flag}</td><td>${formatCurrency(c.accumulation)}</td><td>${c.recommendation}</td></tr>`).join("")}</tbody></table></body></html>`;
              const blob = new Blob([html], { type: "text/html;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `clients-${new Date().toISOString().slice(0, 10)}.html`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success("הקובץ הורד בהצלחה");
            }}
            className="rounded-sm border border-border bg-card px-3 py-2 text-xs font-semibold text-navy-deep hover:border-gold hover:text-gold"
          >
            ייצוא HTML
          </button>
        </div>
      </div>

      {/* Table card — fills remaining height with internal scroll only as a safety net */}
      <div className="glass-card rounded-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-right">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border/40 bg-navy-deep/[0.02]">
                <th className="label-tag text-[10px] text-muted-foreground p-3">לקוח</th>
                <th className="label-tag text-[10px] text-muted-foreground p-3">מוצר</th>
                <th className="label-tag text-[10px] text-muted-foreground p-3">סטטוס</th>
                <th className="label-tag text-[10px] text-muted-foreground p-3">דגל</th>
                <th className="label-tag text-[10px] text-muted-foreground p-3">צבירה</th>
                <th className="label-tag text-[10px] text-muted-foreground p-3">פעולה מומלצת</th>
                <th className="label-tag text-[10px] text-muted-foreground p-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => (
                <tr key={c.id} className="border-b border-border/30 transition-colors hover:bg-gold/[0.04]" style={{ animationDelay: `${0.05 * i}s` }}>
                  <td className="p-3">
                    <div className="font-display font-bold text-navy-deep text-sm">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">{c.age} · {c.city}</div>
                  </td>
                  <td className="p-3">
                    <div className="text-xs font-semibold text-navy-deep">{c.product}</div>
                    <div className="text-[11px] text-muted-foreground">{c.insurer}</div>
                  </td>
                  <td className="p-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="p-3 text-[11px] text-muted-foreground max-w-[180px]">{c.flag}</td>
                  <td className="p-3">
                    <div className="font-display font-bold text-navy-deep text-sm">{formatCurrency(c.accumulation)}</div>
                  </td>
                  <td className="p-3 text-[11px] text-foreground/80 max-w-[220px]">{c.recommendation}</td>
                  <td className="p-3">
                    <div className="flex gap-1.5">
                      {c.email ? (
                        <button
                          onClick={() => openComposer(c, "email")}
                          className="group flex items-center gap-1.5 rounded-md border border-border bg-white px-2 py-1.5 text-[11px] font-bold text-navy-deep transition-all hover:border-gold hover:bg-gold/10 hover:text-gold hover:shadow-md"
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
                        className="group flex items-center gap-1.5 rounded-md border border-border bg-white px-2 py-1.5 text-[11px] font-bold text-navy-deep transition-all hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-md"
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
  );

  return (
    <div data-pdf-target className="h-full w-full overflow-hidden animate-fade-in bg-background flex flex-col">
      {HeaderBlock}
      {slide === 1 && Slide1}
      {slide === 2 && Slide2}
      {slide === 3 && Slide3}

      {/* AI Composer Modal */}
      <AIComposerModal
        customer={composerCustomer}
        channel={composerChannel}
        onClose={closeComposer}
      />
      <CategoryScenarioModal
        categoryId={activeScenario}
        onClose={() => setActiveScenario(null)}
        onActivate={() => {
          setActiveScenario(null);
          onAction();
        }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "ריסק זמני": "bg-red-100 text-red-800 border-red-300",
    "תום הנחה": "bg-amber-100 text-amber-900 border-amber-300",
    "ללא פנסיה": "bg-[#FFF4D6] text-[#7A5C12] border-[#E0C170]",
    "ללא מייל": "bg-slate-200 text-slate-800 border-slate-400",
  };
  return (
    <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-bold ${map[status] || "bg-muted text-foreground"}`}>
      {status}
    </span>
  );
}
