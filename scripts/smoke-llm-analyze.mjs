// Smoke test: hit the same Forge endpoint that invokeLLM uses, with the
// Surense system prompt and a tiny synthetic ParsedReport, and print the
// structured response so we can verify the LLM path end-to-end.
import "dotenv/config";

const url = process.env.BUILT_IN_FORGE_API_URL;
const key = process.env.BUILT_IN_FORGE_API_KEY;

if (!url || !key) {
  console.error("Missing BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY");
  process.exit(2);
}

const today = new Date().toISOString().slice(0, 10);
const system = `You are a senior pension/insurance analyst. Today is ${today}. Return STRICT JSON: {"kpis": {"aum": number, "customers": number, "vipCount": number}, "summary_he": string}. Hebrew where relevant.`;

const parsed = {
  customers: [
    { id: "c1", firstName: "דנה", lastName: "כ.", age: 62, aum: 2_400_000, vip: true, products: ["פנסיה", "השתלמות"], flags: ["ללא בריאות"] },
    { id: "c2", firstName: "יוסי", lastName: "ל.", age: 58, aum: 1_100_000, vip: false, products: ["גמל"], flags: [] },
  ],
  totals: { aum: 3_500_000, customers: 2 },
};

const payload = {
  messages: [
    { role: "system", content: system },
    { role: "user", content: JSON.stringify(parsed) },
  ],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "smoke_kpis",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["kpis", "summary_he"],
        properties: {
          kpis: {
            type: "object",
            additionalProperties: false,
            required: ["aum", "customers", "vipCount"],
            properties: {
              aum: { type: "number" },
              customers: { type: "number" },
              vipCount: { type: "number" },
            },
          },
          summary_he: { type: "string" },
        },
      },
    },
  },
};

const start = Date.now();
const resp = await fetch(`${url.replace(/\/$/, "")}/v1/chat/completions`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  },
  body: JSON.stringify(payload),
});
const elapsed = Date.now() - start;
console.log(`HTTP ${resp.status} in ${elapsed}ms`);

const body = await resp.text();
console.log("---raw body (first 800 chars)---");
console.log(body.slice(0, 800));

try {
  const j = JSON.parse(body);
  const content = j?.choices?.[0]?.message?.content;
  console.log("---message.content---");
  console.log(typeof content === "string" ? content.slice(0, 800) : JSON.stringify(content).slice(0, 800));
} catch {
  // body wasn't JSON — already printed above
}
