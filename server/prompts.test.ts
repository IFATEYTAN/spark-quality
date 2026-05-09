import { describe, expect, it } from "vitest";
import {
  buildAnalysisSystem,
  ANALYSIS_JSON_SCHEMA,
  COMPOSER_SYSTEM,
  buildComposerUserPrompt,
  BRIEFING_SYSTEM,
  buildBriefingUserPrompt,
  CLIENT_SUMMARY_SYSTEM,
  buildClientSummaryUserPrompt,
  QA_SYSTEM,
  buildQaUserPrompt,
} from "./prompts";

describe("Surense Skill prompts", () => {
  it("builds an analysis system prompt that mentions the date", () => {
    const sys = buildAnalysisSystem("2026-05-09");
    expect(sys).toContain("2026-05-09");
    expect(sys.length).toBeGreaterThan(200);
  });

  it("exposes a strict JSON schema with kpis, critical, urgent, summary_he", () => {
    expect(ANALYSIS_JSON_SCHEMA).toBeTruthy();
    expect(ANALYSIS_JSON_SCHEMA.name).toMatch(/surense/i);
    const props = (ANALYSIS_JSON_SCHEMA.schema as { properties: Record<string, unknown> }).properties;
    expect(props.kpis).toBeTruthy();
    expect(props.critical).toBeTruthy();
    expect(props.urgent).toBeTruthy();
    expect(props.summary_he).toBeTruthy();
  });

  it("composer prompt includes channel + first name + agent name", () => {
    const u = buildComposerUserPrompt({
      flag: "190",
      channel: "whatsapp",
      firstName: "דני",
      age: 65,
      detail: "צבירה 1.2M",
      agentName: "יפעת",
    });
    expect(u).toContain("דני");
    expect(u).toContain("יפעת");
    // The composer prompt translates the channel into Hebrew before sending it to Claude.
    expect(u).toMatch(/וואטסאפ|whatsapp/i);
    expect(COMPOSER_SYSTEM.length).toBeGreaterThan(50);
  });

  it("briefing/client-summary/qa prompts produce non-empty user payloads", () => {
    const b = buildBriefingUserPrompt({
      analysis: { kpis: { total_clients: 10 } },
      agentName: "יפעת",
      date: "2026-05-09",
    });
    expect(b).toContain("יפעת");

    const cs = buildClientSummaryUserPrompt({
      client: { name: "ש. כ.", age: 67 },
      analysisContext: { kpis: { total_clients: 10 } },
    });
    expect(cs.length).toBeGreaterThan(20);

    const qa = buildQaUserPrompt({
      question: "כמה לקוחות מעל גיל 70?",
      analysis: { kpis: { total_clients: 10 } },
    });
    expect(qa).toContain("כמה לקוחות");

    expect(BRIEFING_SYSTEM.length).toBeGreaterThan(20);
    expect(CLIENT_SUMMARY_SYSTEM.length).toBeGreaterThan(20);
    expect(QA_SYSTEM.length).toBeGreaterThan(20);
  });
});
