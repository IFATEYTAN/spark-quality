import { describe, it, expect } from "vitest";
import {
  COMPOSER_SYSTEM,
  buildComposerUserPrompt,
  BRIEFING_SYSTEM,
  buildBriefingUserPrompt,
  QA_SYSTEM,
  buildQaUserPrompt,
} from "./prompts";

describe("LLM endpoint prompts", () => {
  it("composer system prompt is non-empty Hebrew", () => {
    expect(COMPOSER_SYSTEM.length).toBeGreaterThan(50);
  });

  it("composer user prompt includes flag, channel, firstName", () => {
    const prompt = buildComposerUserPrompt({
      flag: "ריסק זמני",
      channel: "whatsapp",
      firstName: "דני",
      agentName: "יפעת",
    });
    expect(prompt).toContain("ריסק זמני");
    expect(prompt).toContain("דני");
    expect(prompt).toContain("יפעת");
  });

  it("briefing user prompt embeds analysis and date", () => {
    const prompt = buildBriefingUserPrompt({
      analysis: { kpis: { total_clients: 5 } },
      agentName: "יפעת",
      date: "2026-05-09",
    });
    expect(prompt).toContain("יפעת");
    expect(prompt).toContain("2026-05-09");
    expect(prompt).toContain("total_clients");
  });

  it("qa system prompt mentions Hebrew + analysis context", () => {
    expect(QA_SYSTEM).toMatch(/עברית|JSON/);
  });

  it("qa user prompt embeds the question", () => {
    const prompt = buildQaUserPrompt({
      analysis: { kpis: {} },
      question: "כמה לקוחות VIP יש?",
    });
    expect(prompt).toContain("כמה לקוחות VIP יש");
  });
});
