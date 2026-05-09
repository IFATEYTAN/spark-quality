// Pure-logic tests for the AnalyzingStage gating decision.
// We replicate the predicate to lock the contract: guests advance after the
// canned animation ends; admins running a real file must wait for the LLM
// to either succeed (`done`) or fail (`error`) before advancing.
import { describe, it, expect } from "vitest";

type LlmStatus = "idle" | "running" | "done" | "error";

function shouldAdvance(opts: {
  stepsDone: boolean;
  hasRealFile: boolean;
  llmStatus: LlmStatus;
}): boolean {
  if (!opts.stepsDone) return false;
  const llmReady = !opts.hasRealFile || opts.llmStatus === "done" || opts.llmStatus === "error";
  return llmReady;
}

describe("AnalyzingStage gating", () => {
  it("never advances before the canned animation finishes", () => {
    expect(shouldAdvance({ stepsDone: false, hasRealFile: false, llmStatus: "idle" })).toBe(false);
    expect(shouldAdvance({ stepsDone: false, hasRealFile: true, llmStatus: "done" })).toBe(false);
  });

  it("advances guests as soon as steps are done, regardless of llm status", () => {
    expect(shouldAdvance({ stepsDone: true, hasRealFile: false, llmStatus: "idle" })).toBe(true);
    expect(shouldAdvance({ stepsDone: true, hasRealFile: false, llmStatus: "running" })).toBe(true);
  });

  it("waits for admins until LLM resolves, then advances on done or error", () => {
    expect(shouldAdvance({ stepsDone: true, hasRealFile: true, llmStatus: "running" })).toBe(false);
    expect(shouldAdvance({ stepsDone: true, hasRealFile: true, llmStatus: "idle" })).toBe(false);
    expect(shouldAdvance({ stepsDone: true, hasRealFile: true, llmStatus: "done" })).toBe(true);
    expect(shouldAdvance({ stepsDone: true, hasRealFile: true, llmStatus: "error" })).toBe(true);
  });
});
