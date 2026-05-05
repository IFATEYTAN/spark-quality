// SPARK AI · Upload Report - מסך העלאת דוח שורנס במערכת ה-SaaS
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { parseShorensReport, type ParsedReport } from "@/lib/parseReport";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

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
    if (!loading && !isAuthenticated) window.location.href = "/";
  }, [loading, isAuthenticated]);

  const saveReport = trpc.reports.save.useMutation({
    onSuccess: data => {
      setImportedCount(data.importedCount);
      setState("done");
      toast.success(`הדוח נשמר! ${data.importedCount} לקוחות יובאו לתיק`);
      utils.clients.list.invalidate();
      utils.reports.list.invalidate();
    },
    onError: err => {
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

      // Send to server with extracted client list
      const clientRows = result.customers
        .map(c => ({
          idNumber: String(c.id ?? "").trim(),
          fullName: c.name ?? null,
          email: c.email ?? null,
          phone: c.phone ?? null,
        }))
        .filter(c => c.idNumber.length > 0);

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
      <div className="min-h-screen flex items-center justify-center bg-navy-deep">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-deep text-white">
      <header className="border-b border-white/10">
        <div className="container mx-auto py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-gold" />
            <span className="font-serif text-lg text-gold">SPARK AI</span>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-white/70">
              <ArrowRight className="h-4 w-4 ml-1" />
              לדשבורד
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto py-12 max-w-2xl">
        <h1 className="text-3xl font-serif text-white mb-2">העלאת דוח שורנס</h1>
        <p className="text-white/60 mb-8">
          טעינת קובץ XLSX יחיד שמתפצל אוטומטית: לקוחות, פוליסות, AUM, פרמיות
          ודגלים לפעולה
        </p>

        {state === "idle" && (
          <Card
            className="p-12 bg-white/5 border-2 border-dashed border-white/20 hover:border-gold/50 transition-all cursor-pointer text-center"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <Upload className="h-16 w-16 text-gold mx-auto mb-4" />
            <h3 className="text-xl font-serif text-white mb-2">
              לחץ או גרור קובץ לכאן
            </h3>
            <p className="text-sm text-white/50">
              קבצי XLSX/XLS · עד 10MB · עיבוד אוטומטי
            </p>
          </Card>
        )}

        {state === "parsing" && (
          <Card className="p-12 bg-white/5 border-gold/30 text-center">
            <Loader2 className="h-12 w-12 text-gold mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-serif text-white mb-2">
              מנתח את הדוח...
            </h3>
            <p className="text-sm text-white/60">
              זיהוי גליונות, מיפוי עמודות, חישוב AUM ופרמיות
            </p>
          </Card>
        )}

        {state === "saving" && (
          <Card className="p-12 bg-white/5 border-gold/30 text-center">
            <Loader2 className="h-12 w-12 text-gold mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-serif text-white mb-2">
              שומר במערכת...
            </h3>
            <p className="text-sm text-white/60">
              {parsed?.stats.totalCustomers} לקוחות מועברים לתיק שלך
            </p>
          </Card>
        )}

        {state === "done" && parsed && (
          <Card className="p-8 bg-white/5 border-green-500/30">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-400" />
              <div>
                <h3 className="text-2xl font-serif text-white">
                  הדוח עובד בהצלחה!
                </h3>
                <p className="text-sm text-white/60">
                  {importedCount} לקוחות נוספו / עודכנו בתיק שלך
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <Stat label="לקוחות" value={parsed.stats.totalCustomers} />
              <Stat
                label="AUM"
                value={`₪${(parsed.stats.totalAUM / 1_000_000).toFixed(1)}M`}
              />
              <Stat
                label="פרמיה חודשית"
                value={`₪${parsed.stats.monthlyPremium.toLocaleString()}`}
              />
              <Stat label="דגלים" value={parsed.stats.riskFlags} />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setState("idle");
                  setParsed(null);
                  setImportedCount(null);
                }}
                className="border-white/20 text-white hover:bg-white/10"
              >
                העלאת דוח נוסף
              </Button>
              <Button
                onClick={() => navigate("/clients")}
                className="bg-gold text-navy-deep hover:bg-gold/90 flex-1"
              >
                <FileSpreadsheet className="h-4 w-4 ml-2" />
                לתיק הלקוחות
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white/5 rounded p-3 text-center border border-white/5">
      <div className="text-xs text-white/50 mb-1">{label}</div>
      <div className="text-lg font-serif text-gold">{value}</div>
    </div>
  );
}
