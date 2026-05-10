// Verify parseShorensReport against the user's real xlsx.
// Run: node scripts/verifyParser.mjs /home/ubuntu/upload/<filename>.xlsx
import { readFileSync } from "node:fs";
import { argv } from "node:process";
import * as XLSX from "xlsx";

const filePath = argv[2];
if (!filePath) {
  console.error("Usage: node scripts/verifyParser.mjs <path-to-xlsx>");
  process.exit(1);
}

const buf = readFileSync(filePath);
const wb = XLSX.read(buf, { type: "buffer", cellDates: true });

console.log("Sheets in workbook:");
for (const name of wb.SheetNames) {
  const sheet = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
  console.log(`  - ${name} (${rows.length} rows, ${rows[0]?.length ?? 0} cols)`);
}

// Mimic detectSheets logic
function pick() {
  let savings = null, insurance = null, coverage = null;
  for (const name of wb.SheetNames) {
    if (name.includes("מסכם") || name.includes("מסלול")) continue;
    const isCov = name.includes("כיסוי");
    const isIns = !isCov && name.includes("ביטוח");
    const isSav = !isIns && !isCov && (
      name.includes("חיסכון") || name.includes("חסכון") ||
      name.includes("פנסיה") || name.includes("גמל") || name.includes("השתלמות")
    );
    if (isSav && !savings) savings = name;
    if (isIns && !insurance) insurance = name;
    if (isCov && !coverage) coverage = name;
  }
  return { savings, insurance, coverage };
}
const { savings, insurance, coverage } = pick();
console.log("\nDetected sheets:");
console.log("  savings:  ", savings);
console.log("  insurance:", insurance);
console.log("  coverage: ", coverage);

if (savings) {
  const headers = XLSX.utils.sheet_to_json(wb.Sheets[savings], { header: 1, raw: false, defval: "" })[0];
  console.log("\nSavings columns:");
  headers.forEach((h, i) => console.log(`  [${i}] ${h}`));
}
if (insurance) {
  const headers = XLSX.utils.sheet_to_json(wb.Sheets[insurance], { header: 1, raw: false, defval: "" })[0];
  console.log("\nInsurance columns:");
  headers.forEach((h, i) => console.log(`  [${i}] ${h}`));
}
