// Editorial Fintech | אורקסטרציה ראשית של הדמו
import { useState } from "react";
import { Header } from "@/components/Header";
import { IntroStage } from "@/components/IntroStage";
import { UploadStage } from "@/components/UploadStage";
import { AnalyzingStage } from "@/components/AnalyzingStage";
import { DashboardStage } from "@/components/DashboardStage";
import { ActionsStage } from "@/components/ActionsStage";
import { SummaryStage } from "@/components/SummaryStage";
import type { Stage } from "@/lib/demoData";

const STAGE_LABELS: Record<Stage, string> = {
  intro: "0 / 5 · פתיחה",
  upload: "1 / 5 · העלאת דוח",
  analyzing: "2 / 5 · ניתוח AI",
  dashboard: "3 / 5 · תוצאות",
  actions: "4 / 5 · פעולות אוטומטיות",
  summary: "5 / 5 · סיכום",
};

export default function Home() {
  const [stage, setStage] = useState<Stage>("intro");

  const reset = () => setStage("intro");

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-navy-deep">
      <Header stage={STAGE_LABELS[stage]} onReset={reset} />

      <main className="flex-1 overflow-hidden">
        {stage === "intro" && (
          <IntroStage onContinue={() => setStage("upload")} />
        )}
        {stage === "upload" && (
          <UploadStage onUpload={() => setStage("analyzing")} />
        )}
        {stage === "analyzing" && (
          <AnalyzingStage onComplete={() => setStage("dashboard")} />
        )}
        {stage === "dashboard" && (
          <DashboardStage onAction={() => setStage("actions")} />
        )}
        {stage === "actions" && (
          <ActionsStage onComplete={() => setStage("summary")} />
        )}
        {stage === "summary" && (
          <SummaryStage onReset={reset} />
        )}
      </main>
    </div>
  );
}
