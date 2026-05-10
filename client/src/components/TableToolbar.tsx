// SPARK AI · TableToolbar — סרגל פעולות אחיד לכל מסכי הטבלאות
// Refresh / Export HTML / Export Excel + extension slot for custom filters
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, Loader2, Lock, RefreshCw } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

export type ExportColumn<T> = {
  key: string;
  label: string;
  format?: (value: unknown, row: T) => string | number;
};

export type TableToolbarProps<T> = {
  /** Function called when refresh is clicked */
  onRefresh?: () => void | Promise<unknown>;
  /** Whether refresh is in flight */
  isRefreshing?: boolean;
  /** Rows that match current filters — what gets exported */
  rows: T[];
  /** Column definitions used by the exporters */
  columns: ExportColumn<T>[];
  /** File name (without extension) for exports */
  fileName: string;
  /** Optional title used in HTML export */
  reportTitle?: string;
  /** Slot for a custom filter trigger (e.g. dropdown menu) */
  filtersSlot?: ReactNode;
  /** Optional summary string showing right next to the actions */
  summaryLabel?: string;
  /** Round 98 export-lock — when false, export buttons surface a toast instead of downloading. */
  exportEnabled?: boolean;
  /** Hebrew reason shown in the toast when exportEnabled is false. */
  exportLockReason?: string;
};

function buildHtml<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  reportTitle: string,
): string {
  const head = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  const body = rows
    .map((row) => {
      const cells = columns
        .map((c) => {
          const raw = (row as Record<string, unknown>)[c.key];
          const value = c.format ? c.format(raw, row) : raw;
          return `<td>${escapeHtml(value == null ? "" : String(value))}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  const generated = new Date().toLocaleString("he-IL");
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(reportTitle)}</title>
  <style>
    body { font-family: 'Heebo', system-ui, sans-serif; background: #06101F; color: #fff; padding: 32px; }
    h1 { font-weight: 900; color: #C9A24A; margin: 0 0 4px; }
    .meta { color: rgba(255,255,255,0.55); font-size: 13px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; background: rgba(255,255,255,0.04); border-radius: 8px; overflow: hidden; }
    th { background: rgba(201,162,74,0.18); color: #C9A24A; text-align: right; font-weight: 700; padding: 12px; border-bottom: 1px solid rgba(201,162,74,0.4); }
    td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; }
    tr:hover td { background: rgba(255,255,255,0.04); }
    .footer { margin-top: 24px; font-size: 11px; color: rgba(255,255,255,0.4); text-align: center; }
  </style>
</head>
<body>
  <h1>${escapeHtml(reportTitle)}</h1>
  <p class="meta">${rows.length.toLocaleString("he-IL")} רשומות · נוצר ב-${escapeHtml(generated)}</p>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>
  <p class="footer">SPARK AI · spark-ai.co.il</p>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function TableToolbar<T>({
  onRefresh,
  isRefreshing,
  rows,
  columns,
  fileName,
  reportTitle = "דוח לקוחות",
  filtersSlot,
  summaryLabel,
  exportEnabled = true,
  exportLockReason,
}: TableToolbarProps<T>) {
  const [exportingHtml, setExportingHtml] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);

  async function exportHtml() {
    if (!exportEnabled) {
      toast.error(exportLockReason ?? "ייצוא נתונים זמין רק למנוי פעיל.");
      return;
    }
    setExportingHtml(true);
    try {
      const html = buildHtml(rows, columns, reportTitle);
      downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${fileName}.html`);
    } finally {
      setExportingHtml(false);
    }
  }

  async function exportXlsx() {
    if (!exportEnabled) {
      toast.error(exportLockReason ?? "ייצוא נתונים זמין רק למנוי פעיל.");
      return;
    }
    setExportingXlsx(true);
    try {
      const XLSX = await import("xlsx");
      const data = rows.map((row) => {
        const out: Record<string, unknown> = {};
        for (const c of columns) {
          const raw = (row as Record<string, unknown>)[c.key];
          out[c.label] = c.format ? c.format(raw, row) : raw;
        }
        return out;
      });
      const ws = XLSX.utils.json_to_sheet(data);
      // Reverse columns for RTL layout
      ws["!cols"] = columns.map(() => ({ wch: 18 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, reportTitle.slice(0, 30));
      const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      downloadBlob(
        new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `${fileName}.xlsx`,
      );
    } finally {
      setExportingXlsx(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2">
        {summaryLabel && (
          <span className="text-xs text-white/55">{summaryLabel}</span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {filtersSlot}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onRefresh()}
            disabled={isRefreshing}
            className="border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:border-gold/40 hover:text-gold gap-2"
          >
            {isRefreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            רענון
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => void exportHtml()}
          disabled={exportingHtml || rows.length === 0}
          className="border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:border-gold/40 hover:text-gold gap-2"
        >
          {exportingHtml ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : exportEnabled ? (
            <FileText className="h-3.5 w-3.5" />
          ) : (
            <Lock className="h-3.5 w-3.5" />
          )}
          ייצוא HTML
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void exportXlsx()}
          disabled={exportingXlsx || rows.length === 0}
          className="border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:border-gold/40 hover:text-gold gap-2"
        >
          {exportingXlsx ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : exportEnabled ? (
            <FileSpreadsheet className="h-3.5 w-3.5" />
          ) : (
            <Lock className="h-3.5 w-3.5" />
          )}
          ייצוא Excel
        </Button>
      </div>
    </div>
  );
}

export const _internalForTests = { buildHtml };
export type { TableToolbarProps as _TableToolbarProps };
export const TableToolbarDownloadIcon = Download;
