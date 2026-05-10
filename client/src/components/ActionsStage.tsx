// Editorial Fintech | מסך פעולות אוטומטיות - הדגמת התראות פיננסיות
import { useEffect, useState } from "react";
import { ArrowLeft, MessageSquare, CheckCircle2, FileText, Briefcase, TrendingUp, Mail, Sparkles, Loader2 } from "lucide-react";
import type { ParsedReport } from "@/lib/parseReport";
import { trpc } from "@/lib/trpc";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useFeatureGate } from "@/hooks/useFeatureGate";

interface ActionsStageProps {
  onComplete: () => void;
  parsed?: ParsedReport | null;
  /** LLM analysis JSON — reserved for future enrichment of action contents. */
  analysis?: any;
}

function buildActionsFromAnalysis(analysis: any) {
  const actions = [];
  let id = 1;

  // 1. Take up to 2 critical items
  const criticals = Array.isArray(analysis?.critical) ? analysis.critical.slice(0, 2) : [];
  for (const c of criticals) {
    actions.push({
      id: id++,
      type: "whatsapp",
      icon: MessageSquare,
      iconBg: "bg-red-50 text-red-700",
      delay: id * 400,
      title: `קריטי: ${c.flag}`,
      target: `ללקוח: ${c.client_name} · ${c.phone || "חסר נייד"}`,
      subject: `פעולה נדרשת: ${c.action || "טיפול מיידי"}`,
      body: `לקוח: ${c.client_name}\nמוצר: ${c.product || "לא צוין"} (${c.company || ""})\nפרטים: ${c.days_overdue ? `בפיגור של ${c.days_overdue} ימים` : "דורש התערבות"}.`,
      meta: ["דחוף", "התראה קריטית"],
      triggerData: { 
        channel: "whatsapp", 
        flag: c.flag || "פעולה נדרשת",
        firstName: c.client_name?.split(" ")[0] || "לקוח",
        agentName: "יפעת",
        detail: c.action || "טיפול מיידי",
        productName: c.product,
        company: c.company
      }
    });
  }

  // 2. Take up to 1 urgent item
  const urgents = Array.isArray(analysis?.urgent) ? analysis.urgent.slice(0, 1) : [];
  for (const u of urgents) {
    actions.push({
      id: id++,
      type: "email",
      icon: Briefcase,
      iconBg: "bg-orange-50 text-orange-700",
      delay: id * 400,
      title: `דחוף: ${u.flag}`,
      target: `ללקוח: ${u.client_name} · ${u.phone || "חסר נייד"}`,
      subject: "עדכון סטטוס תיק",
      body: `לקוח: ${u.client_name}\nפרטים: ${u.detail || "דורש טיפול קרוב"}.`,
      meta: ["דחוף", "התראה"],
      triggerData: { 
        channel: "email", 
        flag: u.flag || "עדכון סטטוס",
        firstName: u.client_name?.split(" ")[0] || "לקוח",
        agentName: "יפעת",
        detail: u.detail
      }
    });
  }

  // 3. Take up to 1 opportunity
  const opps = Array.isArray(analysis?.opportunities) ? analysis.opportunities.slice(0, 1) : [];
  for (const o of opps) {
    actions.push({
      id: id++,
      type: "task",
      icon: TrendingUp,
      iconBg: "bg-emerald-50 text-emerald-700",
      delay: id * 400,
      title: `הזדמנות: ${o.flag}`,
      target: `פוטנציאל: ${o.count} לקוחות`,
      subject: "פוטנציאל עסקי",
      body: `זיהינו ${o.count} לקוחות רלוונטיים להזדמנות זו.\nשווי מוערך: ₪${(o.total_value || 0).toLocaleString("he-IL")}`,
      meta: ["הזדמנות עסקית", "אאפסל"],
      triggerData: { 
        channel: "email", 
        flag: o.flag || "הזדמנות עסקית",
        firstName: "לקוח",
        agentName: "יפעת",
        detail: `פוטנציאל של ${o.count} לקוחות בשווי ₪${o.total_value}`
      }
    });
  }

  return actions.length > 0 ? actions : null;
}

function buildActionsFromParsed(parsed: ParsedReport) {
  const customers = parsed.customers;
  const vip = customers.find(c => c.status === "VIP") || customers[0];
  const liquid = customers.find(c => c.status === "השתלמות נזילה") || customers[1] || customers[0];
  const t190 = customers.find(c => c.status === "תיקון 190") || customers[2] || customers[0];
  const risk = customers.find(c => c.status === "ריסק זמני" || c.status === "תום הנחה" || c.status === "תשואה חלשה") || customers[3] || customers[0];

  return [
    {
      id: 1,
      type: "email",
      icon: Briefcase,
      iconBg: "bg-gold/10 text-gold",
      delay: 300,
      title: "התראה דחופה - לקוחות VIP",
      target: "יפעת איתן <yifat@spark-ai.co.il>",
      subject: `💎 דוח VIP: ${(parsed.stats as any).vipCustomers ?? 4} לקוחות עתירי נכסים דורשים פגישת תכנון פיננסי`,
      body: `שלום יפעת,\n\nמערכת SPARK AI זיהתה ${(parsed.stats as any).vipCustomers ?? 4} לקוחות עם צבירה כוללת של מעל 1,000,000 ₪ כל אחד (ביניהם ${vip?.name}).\n\nהמלצה: תיאום פגישת ניהול עושר מקיפה לבחינת תיקון 190, פיזור סיכונים, ושימור. רשימה מלאה מצורפת.`,
      meta: ["נשלח כעת", `${(parsed.stats as any).vipCustomers ?? 4} לקוחות VIP`, "PDF מוכן"],
    },
    {
      id: 2,
      type: "whatsapp",
      icon: MessageSquare,
      iconBg: "bg-emerald-50 text-emerald-700",
      delay: 1100,
      title: "WhatsApp - השתלמות נזילה",
      target: `ללקוח: ${liquid?.name} · ${liquid?.phone || "052-111-2222"}`,
      subject: "הזדמנות השקעה: קרן השתלמות נזילה",
      body: `שלום ${liquid?.name?.split(" ")[0] || "דני"} 👋\n\nכאן יפעת מ-SPARK AI. ראיתי שקרן ההשתלמות שלך ב${liquid?.insurer || "הראל"} הפכה לנזילה לאחרונה.\n\nזה אומר שיש לך הון פנוי פטור ממס שניתן למנף להשקעה חכמה או פוליסת חיסכון. אשמח לתאם שיחה קצרה להציג לך אפשרויות.\n\nמתי נוח לך השבוע?`,
      meta: ["מותאם אישית", "אישור לפני שליחה", "מחכה לאישורך"],
    },
    {
      id: 3,
      type: "email",
      icon: TrendingUp,
      iconBg: "bg-blue-50 text-blue-700",
      delay: 1900,
      title: "מייל אאפסל - תיקון 190",
      target: `ללקוח: ${t190?.name} <${t190?.email || "client@demo.co.il"}>`,
      subject: "הזדמנות לפטור ממס רווחי הון (תיקון 190)",
      body: `שלום ${t190?.name?.split(" ")[0] || "שרה"},\n\nבבחינת התיק הפיננסי שלך, זיהינו שאת/ה עומד/ת בקריטריונים לניצול הטבות מס משמעותיות לפי תיקון 190 (גיל 60+ וצבירה פנויה).\n\nהכנו עבורך סימולציה המדגימה כיצד הפקדה לקופת גמל לפי תיקון 190 יכולה לחסוך לך עשרות אלפי שקלים במס רווחי הון בעת המשיכה.\n\nלצפייה בסימולציה: [קישור מאובטח]`,
      meta: ["מותאם AI", "מצורף PDF", "מוכן לאישור"],
    },
    {
      id: 4,
      type: "task",
      icon: FileText,
      iconBg: "bg-navy/10 text-navy-deep",
      delay: 2700,
      title: "משימה ב-CRM",
      target: "מערכת CRM של הסוכנות",
      subject: `פגישת שימור: ${risk?.name} - ${risk?.status}`,
      body: `נוצרה משימה אוטומטית ב-CRM:\n\n• לקוח: ${risk?.name}\n• סוג: פגישת שימור (${risk?.status})\n• עדיפות: גבוהה\n• דדליין: עד 25/01/2026\n• הערות: הלקוח עם צבירה של ₪${risk?.accumulation?.toLocaleString("he-IL")}. סכנת ניוד גבוהה. יש להציע מסלול דמי ניהול מוזל או חידוש כיסוי.`,
      meta: ["סנכרון אוטומטי", "תזכורת ב-3 ימים", "הוקצה ליפעת"],
    },
  ];
}

const ACTIONS = [
  {
    id: 1,
    type: "email",
    icon: Briefcase,
    iconBg: "bg-gold/10 text-gold",
    delay: 300,
    title: "התראה דחופה - לקוחות VIP",
    target: "יפעת איתן <yifat@spark-ai.co.il>",
    subject: "💎 דוח VIP: 4 לקוחות עתירי נכסים דורשים פגישת תכנון פיננסי",
    body: "שלום יפעת,\n\nמערכת SPARK AI זיהתה 4 לקוחות עם צבירה כוללת של מעל 1,000,000 ₪ כל אחד. סך ההון המנוהל בקבוצה זו: ₪5.2M.\n\nהמלצה: תיאום פגישת ניהול עושר מקיפה לבחינת תיקון 190, פיזור סיכונים, ושימור. רשימה מלאה מצורפת.",
    meta: ["נשלח כעת", "4 לקוחות VIP", "PDF מוכן"],
  },
  {
    id: 2,
    type: "whatsapp",
    icon: MessageSquare,
    iconBg: "bg-emerald-50 text-emerald-700",
    delay: 1100,
    title: "WhatsApp - השתלמות נזילה",
    target: "ללקוח: דני כהן · 052-111-2222",
    subject: "הזדמנות השקעה: קרן השתלמות נזילה",
    body: "שלום דני 👋\n\nכאן יפעת מ-SPARK AI. ראיתי שקרן ההשתלמות שלך בהראל הפכה לנזילה לאחרונה (ותק של 6 שנים).\n\nזה אומר שיש לך הון פנוי פטור ממס שניתן למנף להשקעה חכמה או פוליסת חיסכון. אשמח לתאם שיחה קצרה להציג לך אפשרויות.\n\nמתי נוח לך השבוע?",
    meta: ["מותאם אישית", "אישור לפני שליחה", "מחכה לאישורך"],
  },
  {
    id: 3,
    type: "email",
    icon: TrendingUp,
    iconBg: "bg-blue-50 text-blue-700",
    delay: 1900,
    title: "מייל אאפסל - תיקון 190",
    target: "ללקוחה: שרה לוי <sara.levi@demo.co.il>",
    subject: "הזדמנות לפטור ממס רווחי הון (תיקון 190)",
    body: "שלום שרה,\n\nבבחינת התיק הפיננסי שלך, זיהינו שאת עומדת בקריטריונים לניצול הטבות מס משמעותיות לפי תיקון 190 (גיל 60+ וצבירה פנויה).\n\nהכנו עבורך סימולציה המדגימה כיצד הפקדה לקופת גמל לפי תיקון 190 יכולה לחסוך לך עשרות אלפי שקלים במס רווחי הון בעת המשיכה.\n\nלצפייה בסימולציה: [קישור מאובטח]",
    meta: ["מותאם AI", "מצורף PDF", "מוכן לאישור"],
  },
  {
    id: 4,
    type: "task",
    icon: FileText,
    iconBg: "bg-navy/10 text-navy-deep",
    delay: 2700,
    title: "משימה ב-CRM",
    target: "מערכת CRM של הסוכנות",
    subject: "פגישת שימור: מיכל דוד - דמי ניהול",
    body: "נוצרה משימה אוטומטית ב-CRM:\n\n• לקוחה: מיכל דוד (ת.ז. 304567890)\n• סוג: פגישת שימור (דמי ניהול גבוהים)\n• עדיפות: גבוהה\n• דדליין: עד 25/01/2026\n• הערות: הלקוחה משלמת דמי ניהול מקסימליים על צבירה של ₪650,000. סכנת ניוד גבוהה. יש להציע מסלול דמי ניהול מוזל.",
    meta: ["סנכרון אוטומטי", "תזכורת ב-3 ימים", "הוקצה ליפעת"],
  },
];

export function ActionsStage({ onComplete, parsed, analysis }: ActionsStageProps) {
  // Prefer LLM analysis if available, fallback to parsed logic, fallback to canned mock
  const dynamicActions = analysis ? buildActionsFromAnalysis(analysis) : (parsed ? buildActionsFromParsed(parsed) : null);
  const ACTIONS_TO_RENDER = dynamicActions ?? ACTIONS;
  
  const composeMutation = trpc.reports.compose.useMutation();
  const composerGate = useFeatureGate("ai.composer");
  const [composedMessages, setComposedMessages] = useState<Record<number, string>>({});
  const [visibleActions, setVisibleActions] = useState<number[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    ACTIONS_TO_RENDER.forEach((a) => {
      timers.push(
        setTimeout(() => {
          setVisibleActions((prev) => [...prev, a.id]);
        }, a.delay),
      );
    });

    timers.push(setTimeout(() => setShowSummary(true), 3500));

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-full w-full flex flex-col lg:overflow-hidden animate-fade-in bg-background">
      {/* Header (compact) */}
      <div className="shrink-0 border-b border-border/40 bg-card/60 backdrop-blur-sm">
        <div className="container py-3 lg:py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-1.5 flex items-center gap-3">
                <div className="h-px w-10 bg-gold" />
                <span className="label-tag text-gold text-[10px]">פעולות אוטומטיות · בזמן אמת</span>
              </div>
              <h1 className="font-display text-2xl font-bold leading-tight text-navy-deep lg:text-3xl">
                ה-AI לא רק מנתח<span className="text-gold">.</span> <span className="text-muted-foreground">הוא יוזם פעולה.</span>
              </h1>
            </div>
            {showSummary && (
              <button
                onClick={onComplete}
                className="group flex items-center gap-2 rounded-sm bg-navy-deep px-5 py-2.5 text-sm font-semibold text-cream transition-all hover:bg-navy hover:shadow-lg animate-fade-up"
              >
                המשך לסיכום
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2x2 Grid - fills remaining viewport on desktop, stacks on mobile, vertically centered */}
      <div className="flex-1 min-h-0 container py-4 flex items-center">
        <div className="w-full lg:h-full grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ACTIONS_TO_RENDER.map((action) => {
            const isVisible = visibleActions.includes(action.id);
            const Icon = action.icon;
            return (
              <div
                key={action.id}
                className={`group relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 shadow-sm transition-all duration-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              >
                <div className="flex h-full flex-col gap-3">
                  {/* Header row: icon + title */}
                  <div className="flex items-start gap-3 shrink-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${action.iconBg} shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-navy-deep truncate">{action.title}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground truncate">{action.target}</div>
                    </div>
                  </div>
                  {/* Body */}
                  <div className="flex-1 min-h-0 rounded-lg bg-muted/30 p-3 overflow-y-auto custom-scrollbar">
                    <div className="mb-1 text-sm font-semibold text-navy-deep line-clamp-1">{action.subject}</div>
                    <div className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                      {composedMessages[action.id] || action.body}
                    </div>
                  </div>
                  {/* Meta & Composer */}
                  <div className="shrink-0 flex items-center justify-between mt-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {action.meta.map((m, i) => (
                        <div key={i} className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          {m}
                        </div>
                      ))}
                    </div>
                    {/* Composer Button (only if we have triggerData from LLM analysis) */}
                    {(action as any).triggerData && !composedMessages[action.id] && (
                      <button
                        onClick={() => {
                          if (!composerGate.allowed) {
                            composerGate.prompt();
                            return;
                          }
                          const td = (action as any).triggerData;
                          composeMutation.mutate(
                            { 
                              channel: td.channel, 
                              flag: td.flag,
                              firstName: td.firstName,
                              agentName: td.agentName,
                              detail: td.detail,
                              productName: td.productName,
                              company: td.company
                            },
                            {
                              onSuccess: (res) => {
                                setComposedMessages(prev => ({ ...prev, [action.id]: String(res.message) }));
                              }
                            }
                          );
                        }}
                        disabled={composeMutation.isPending}
                        className="flex items-center gap-1.5 rounded-md bg-gold/10 px-2.5 py-1.5 text-[11px] font-semibold text-gold transition-colors hover:bg-gold/20 disabled:opacity-50"
                      >
                        {composeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        נסח הודעה
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <UpgradeModal {...composerGate.modalProps} />
    </div>
  );
}
