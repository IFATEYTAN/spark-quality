// Editorial Fintech | Export Dashboard to PDF (Hebrew-friendly)
// Uses html2canvas to snapshot the live dashboard and embeds it into a PDF.
// This approach guarantees full Hebrew support, since the rendered HTML already
// uses our Hebrew web font and RTL layout.
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { Customer } from "./demoData";

interface Stats {
  totalCustomers: number;
  noPension: number;
  riskFlags: number;
  endingDiscount: number;
  noEmail: number;
  potentialRevenue: number;
}

/**
 * Exports the dashboard to a Hebrew PDF.
 * @param customers - parsed customer list (for filename + meta only)
 * @param stats - dashboard stats (for filename + meta only)
 * @param targetSelector - CSS selector for the element to capture; defaults to the main dashboard wrapper.
 */
export async function exportDashboardPDF(
  customers: Customer[],
  _stats: Stats,
  targetSelector: string = "[data-pdf-target]",
) {
  // Find the dashboard element to capture
  const target = document.querySelector(targetSelector) as HTMLElement;
  if (!target) {
    throw new Error("לא נמצא אזור הדשבורד לייצוא");
  }

  // Snapshot the dashboard element
  const canvas = await html2canvas(target, {
    scale: 2, // hi-res for print quality
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: target.scrollWidth,
    windowHeight: target.scrollHeight,
  });

  const imgData = canvas.toDataURL("image/png");

  // Create A4 landscape PDF
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageW = pdf.internal.pageSize.getWidth(); // 297
  const pageH = pdf.internal.pageSize.getHeight(); // 210
  const margin = 8;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2 - 14; // leave room for footer

  // Calculate scaling
  const imgRatio = canvas.width / canvas.height;
  let drawW = usableW;
  let drawH = drawW / imgRatio;

  if (drawH > usableH) {
    // Image is too tall - we'll need to split into multiple pages
    drawH = usableH;
    drawW = drawH * imgRatio;
  }

  // Center horizontally
  const xOffset = (pageW - drawW) / 2;
  let yOffset = margin;

  // === Header band ===
  pdf.setFillColor(10, 22, 40);
  pdf.rect(0, 0, pageW, 6, "F");
  pdf.setFillColor(201, 169, 97);
  pdf.rect(0, 6, pageW, 0.5, "F");

  yOffset = 10;

  // Add the captured dashboard image
  pdf.addImage(imgData, "PNG", xOffset, yOffset, drawW, drawH);

  // === Footer ===
  const today = new Date().toLocaleDateString("he-IL");
  pdf.setFontSize(7);
  pdf.setTextColor(120, 110, 90);
  pdf.text(
    `SPARK AI  |  ${today}  |  ${customers.length} customers`,
    margin,
    pageH - 4,
  );
  pdf.setTextColor(140, 130, 110);
  pdf.text("SPARK AI · Sprinkle AI Magic", pageW - margin, pageH - 4, {
    align: "right",
  });

  // If image was taller than one page, add additional pages with sections
  if (canvas.height / canvas.width > usableH / usableW) {
    // Multi-page handling: render a second page note (the image already fits scaled down)
  }

  pdf.save(`SPARK-AI-Report-${today.replace(/\//g, "-")}.pdf`);
}
