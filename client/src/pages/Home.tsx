// Editorial Fintech | אורקסטרציה ראשית של הדמו
import { useState } from "react";
import { Header } from "@/components/Header";
import { UploadStage } from "@/components/UploadStage";
import { AnalyzingStage } from "@/components/AnalyzingStage";
import { DashboardStage } from "@/components/DashboardStage";
import { ActionsStage } from "@/components/ActionsStage";
import { SummaryStage } from "@/components/SummaryStage";
import type { Stage } from "@/lib/demoData";

const STAGE_LABELS: Record<Stage, string> = {
  upload: "1 / 5 · העלאת דוח",
  analyzing: "2 / 5 · ניתוח AI",
  dashboard: "3 / 5 · תוצאות",
  actions: "4 / 5 · פעולות אוטומטיות",
  summary: "5 / 5 · סיכום",
};

export default function Home() {
  const [stage, setStage] = useState<Stage>("upload");

  const reset = () => setStage("upload");

  return (
    <div className="min-h-screen flex flex-col">
      <Header stage={STAGE_LABELS[stage]} onReset={reset} />

      <main className="flex-1">
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
