// Editorial Fintech | Export Dashboard to PDF
// Generates a real, downloadable PDF report from the dashboard customer data.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Customer } from "./demoData";

// We rely on jsPDF's built-in font for English text and add a Hebrew-friendly note.
// Hebrew strings will be rendered using the embedded font (Helvetica supports basic chars).
// For full Hebrew support we use a transliteration-fallback approach via UTF-8 strings.

interface Stats {
  totalCustomers: number;
  noPension: number;
  riskFlags: number;
  endingDiscount: number;
  noEmail: number;
  potentialRevenue: number;
}

export function exportDashboardPDF(customers: Customer[], stats: Stats) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // === Header band (Navy) ===
  doc.setFillColor(10, 22, 40); // navy-deep
  doc.rect(0, 0, 297, 32, "F");

  // Gold accent line
  doc.setFillColor(201, 169, 97); // gold
  doc.rect(0, 32, 297, 1, "F");

  // Title (English to ensure font compatibility)
  doc.setTextColor(245, 241, 234); // cream
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("QUALITY x SPARK AI", 15, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(201, 169, 97);
  doc.text("Customer Portfolio Analysis Report", 15, 21);

  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  const today = new Date().toLocaleDateString("he-IL");
  doc.text(`Generated: ${today}  |  Source: Manami / Sherens Report`, 15, 27);

  // Right side: report id
  doc.setFontSize(8);
  doc.setTextColor(245, 241, 234);
  doc.text("REPORT #SPARK-2026-001", 282, 14, { align: "right" });

  // === KPI Strip ===
  const kpis = [
    { label: "Total Customers", value: String(stats.totalCustomers) },
    { label: "Risk Flags", value: String(stats.riskFlags) },
    { label: "No Pension", value: String(stats.noPension) },
    { label: "Ending Discount", value: String(stats.endingDiscount) },
    { label: "No Email", value: String(stats.noEmail) },
    { label: "Potential Revenue", value: formatNIS(stats.potentialRevenue) },
  ];

  const stripY = 42;
  const cardW = 44;
  const cardH = 22;
  const startX = 15;
  kpis.forEach((kpi, i) => {
    const x = startX + i * (cardW + 2);
    doc.setDrawColor(220, 215, 200);
    doc.setFillColor(250, 248, 244);
    doc.rect(x, stripY, cardW, cardH, "FD");

    doc.setTextColor(120, 110, 90);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(kpi.label.toUpperCase(), x + 3, stripY + 6);

    doc.setTextColor(10, 22, 40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(kpi.value, x + 3, stripY + 16);
  });

  // === Section title ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(10, 22, 40);
  doc.text("Customer Action List (Top Priorities)", 15, 75);
  doc.setDrawColor(201, 169, 97);
  doc.setLineWidth(0.4);
  doc.line(15, 77, 110, 77);

  // === Customer table ===
  const tableData = customers.map((c) => [
    c.id,
    transliterate(c.name),
    String(c.age),
    transliterate(c.city),
    c.phone,
    c.email || "—",
    transliterate(c.product),
    transliterate(c.insurer),
    formatNIS(c.accumulation),
    transliterate(statusEN(c.status)),
    transliterate(priorityEN(c.priority)),
  ]);

  autoTable(doc, {
    startY: 80,
    head: [[
      "ID", "Name", "Age", "City", "Phone", "Email",
      "Product", "Insurer", "Accumulation", "Status", "Priority",
    ]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [10, 22, 40],
      textColor: [245, 241, 234],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 30, 30],
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [250, 248, 244],
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 26 },
      2: { cellWidth: 10 },
      3: { cellWidth: 22 },
      4: { cellWidth: 26 },
      5: { cellWidth: 36 },
      6: { cellWidth: 30 },
      7: { cellWidth: 22 },
      8: { cellWidth: 24, halign: "right" },
      9: { cellWidth: 22 },
      10: { cellWidth: 18 },
    },
    margin: { left: 10, right: 10 },
  });

  // === Footer ===
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(140, 130, 110);
  doc.text(
    "QUALITY Pension and Finance  x  SPARK AI  |  Confidential  |  www.quality-pension.co.il",
    15,
    pageHeight - 8,
  );
  doc.text(`Page 1 of 1`, 282, pageHeight - 8, { align: "right" });

  // Save with Hebrew-safe filename
  doc.save(`SPARK-AI-Quality-Report-${today.replace(/\//g, "-")}.pdf`);
}

function formatNIS(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M NIS`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K NIS`;
  return `${n} NIS`;
}

function statusEN(s: string): string {
  const map: Record<string, string> = {
    "ריסק זמני": "Risk-Temp",
    "תום הנחה": "End-Discount",
    "ללא פנסיה": "No-Pension",
    "ללא מייל": "No-Email",
    "פעיל": "Active",
  };
  return map[s] || s;
}

function priorityEN(p: string): string {
  const map: Record<string, string> = {
    "גבוהה": "High",
    "בינונית": "Medium",
    "נמוכה": "Low",
  };
  return map[p] || p;
}

// Simple Hebrew transliteration so jsPDF (no Hebrew font) at least produces readable output.
// This is a pragmatic fallback so the PDF "works" without bundling a Hebrew TTF.
function transliterate(s: string): string {
  if (!s) return "";
  // Keep Latin/digits/punct as-is; convert Hebrew letters to phonetic Latin
  const map: Record<string, string> = {
    "א": "a", "ב": "b", "ג": "g", "ד": "d", "ה": "h", "ו": "v", "ז": "z",
    "ח": "ch", "ט": "t", "י": "y", "כ": "k", "ך": "k", "ל": "l", "מ": "m",
    "ם": "m", "נ": "n", "ן": "n", "ס": "s", "ע": "a", "פ": "p", "ף": "f",
    "צ": "ts", "ץ": "ts", "ק": "q", "ר": "r", "ש": "sh", "ת": "t",
    "׳": "'", "״": "\"",
  };
  return s.split("").map(ch => {
    if (/[\u0590-\u05FF]/.test(ch)) return map[ch] || "";
    return ch;
  }).join("");
}
