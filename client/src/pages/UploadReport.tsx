// SPARK AI · Upload Report — בסגנון הסינמטי של הדמו
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CinematicShell, GlassCard, GoldEyebrow } from "@/components/CinematicShell";
import { ActionCenter } from "@/components/ActionCenter";
import { parseShorensReport, type ParsedReport } from "@/lib/parseReport";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type UploadState = "idle" | "parsing" | "saving" | "done";

export default function UploadReport() {
  const { loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [parsed, setParsed] = useState<ParsedReport | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/", { replace: true });
  }, [loading, isAuthenticated, navigate]);

  const saveReport = trpc.reports.save.useMutation({
    onSuccess: (data) => {
      setImportedCount(data.importedCount);
      setState("done");
      toast.success(`הדוח נשמר! ${data.importedCount} לקוחות יובאו לתיק`);
      utils.clients.list.invalidate();
      utils.reports.list.invalidate();
    },
    onError: (err) => {
      toast.error("שגיאה בשמירת הדוח", { description: err.message });
      setState("idle");
    },
  });

  const handleFile = async (file: File) => {
    setState("parsing");
    try {
      const result = await parseShorensReport(file);
      setParsed(result);
      setState("saving");

      const clientRows = result.customers
        .map((c) => ({
          idNumber: String(c.id ?? "").trim(),
          fullName: c.name ?? null,
          email: c.email ?? null,
          phone: c.phone ?? null,
          flagStatus: (c as any).flagStatus ?? "regular",
          isVip: !!(c as any).isVip,
          totalBalance: Number(c.accumulation ?? 0),
        }))
        .filter((c) => c.idNumber.length > 0);

      await saveReport.mutateAsync({
        fileName: file.name,
        fileSize: file.size,
        summary: {
          totalCustomers: result.stats.totalCustomers,
          totalAUM: result.stats.totalAUM,
          monthlyPremium: result.stats.monthlyPremium,
          riskFlags: result.stats.riskFlags,
          noPension: result.stats.noPension,
          noEmail: result.stats.noEmail,
        },
        clientCount: result.stats.totalCustomers,
        totalAum: result.stats.totalAUM,
        clients: clientRows,
      });
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בקריאת הקובץ", {
        description: err instanceof Error ? err.message : "פורמט לא נתמך",
      });
      setState("idle");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06101F]">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <CinematicShell showHero={false} showSidebar>
      <div className="container py-6 sm:py-10 lg:py-14 max-w-3xl">
        <div className="mb-10 animate-fade-up">
          <GoldEyebrow>שלב 1 / 5 · העלאת דוח</GoldEyebrow>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter leading-[1.1]">
            העלאת דוח <span className="text-gold">מוצרים בניהול</span>
          </h1>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base lg:text-lg text-white/70 max-w-2xl leading-relaxed">
            טעינת דוח "מוצרים בניהול" ממערכת surense — קובץ XLSX יחיד שמתפצל אוטומטית: לקוחות, פוליסות, AUM, פרמיות
            ודגלים לפעולה.
          </p>
        </div>

        {state === "idle" && (
          <GlassCard
            className="p-8 sm:p-12 lg:p-16 border-dashed border-2 border-white/20 hover:border-gold/50 hover:bg-white/[0.07] transition-all cursor-pointer text-center animate-fade-up"
            goldAccent={false}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-gold/30 to-gold/5 border border-gold/40 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(201,169,97,0.2)]">
                <Upload className="h-9 w-9 text-gold" />
              </div>
              <h3 className="font-display text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight mb-3">
                לחצו או גררו קובץ לכאן
              </h3>
              <p className="text-sm text-white/60 mb-6">
                קבצי XLSX / XLS · עד 10MB · עיבוד אוטומטי
              </p>
              <span className="inline-flex items-center gap-2 rounded-md bg-gradient-to-br from-gold to-[#B89346] px-6 py-3 text-sm font-bold text-[#06101F] shadow-lg shadow-gold/30">
                בחירת קובץ
              </span>
            </button>
          </GlassCard>
        )}

        {state === "parsing" && (
          <GlassCard goldAccent className="p-8 sm:p-12 lg:p-16 text-center">
            <Loader2 className="h-14 w-14 text-gold mx-auto mb-6 animate-spin" />
            <h3 className="font-display text-2xl font-black text-white tracking-tight mb-3">
              מנתח את הדוח...
            </h3>
            <p className="text-sm text-white/65">
              זיהוי גליונות, מיפוי עמודות, חישוב AUM ופרמיות
            </p>
          </GlassCard>
        )}

        {state === "saving" && (
          <GlassCard goldAccent className="p-8 sm:p-12 lg:p-16 text-center">
            <Loader2 className="h-14 w-14 text-gold mx-auto mb-6 animate-spin" />
            <h3 className="font-display text-2xl font-black text-white tracking-tight mb-3">
              שומר במערכת...
            </h3>
            <p className="text-sm text-white/65">
              {parsed?.stats.totalCustomers} לקוחות מועברים לתיק שלכם
            </p>
          </GlassCard>
        )}

        {state === "done" && parsed && (
          <GlassCard
            className="p-8 lg:p-10 animate-fade-up"
            goldAccent
          >
            <div className="flex items-center gap-4 mb-7">
              <div className="h-14 w-14 rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-display text-2xl lg:text-3xl font-black text-white tracking-tight">
                  הדוח עובד בהצלחה!
                </h3>
                <p className="text-sm text-white/65 mt-1">
                  {importedCount} לקוחות נוספו / עודכנו בתיק שלכם
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <Stat label="לקוחות" value={parsed.stats.totalCustomers.toLocaleString("he-IL")} />
              <Stat
                label="AUM"
                value={`₪${(parsed.stats.totalAUM / 1_000_000).toFixed(1)}M`}
              />
              <Stat
                label="פרמיה / חודש"
                value={`₪${parsed.stats.monthlyPremium.toLocaleString("he-IL")}`}
              />
              <Stat label="דגלים" value={parsed.stats.riskFlags.toLocaleString("he-IL")} />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setState("idle");
                  setParsed(null);
                  setImportedCount(null);
                }}
                className="border-white/25 bg-white/5 text-white hover:bg-white/10"
              >
                העלאת דוח נוסף
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="border-gold/40 bg-transparent text-gold hover:bg-gold/10"
              >
                דשבורד
              </Button>
              <Button
                onClick={() => navigate("/clients")}
                className="bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] hover:scale-[1.02] hover:shadow-lg hover:shadow-gold/30 flex-1 font-bold"
              >
                <FileSpreadsheet className="h-4 w-4 ml-2" />
                לתיק הלקוחות
              </Button>
            </div>
          </GlassCard>
        )}

        {state === "done" && parsed && (
          <div className="mt-8">
            <ActionCenter
              counts={{
                vipClients: parsed.customers.filter((c) => (c as { isVip?: boolean }).isVip).length,
                liquidFunds: parsed.customers.filter(
                  (c) => (c as { flagStatus?: string }).flagStatus === "liquid_fund"
                ).length,
                tikun190Candidates: parsed.customers.filter(
                  (c) => (c as { flagStatus?: string }).flagStatus === "tikun_190"
                ).length,
                highFees: parsed.customers.filter(
                  (c) => (c as { flagStatus?: string }).flagStatus === "high_fees"
                ).length,
                riskEnding: parsed.customers.filter(
                  (c) => (c as { flagStatus?: string }).flagStatus === "risk_ending"
                ).length,
                coverageGaps: parsed.customers.filter(
                  (c) => (c as { flagStatus?: string }).flagStatus === "coverage_gaps"
                ).length,
              }}
              showWhenEmpty
              eyebrow="מרכז הפעולות · מה לעשות עכשיו"
              title={<>המהלכים הבאים שלך</>}
              subtitle="זיהינו אוטומטית את הלקוחות בתיק — לחצו על כל קטגוריה כדי לראות את התרשים האוטומטי ואת הצעד הבא."
            />
          </div>
        )}
      </div>
    </CinematicShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-white/5 border border-white/10 p-4 text-center">
      <div className="text-[10px] tracking-[0.2em] uppercase text-white/50 mb-2">
        {label}
      </div>
      <div className="font-display text-xl lg:text-2xl font-black text-gold">
        {value}
      </div>
    </div>
  );
}
