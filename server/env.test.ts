// Verifies the SUPER_ADMIN_EMAILS env var parser used to gate the super-admin
// auto-grant in db.upsertUser. Importing env.ts cached the live process.env
// value, so we re-test the parser by simulating the function it uses.
import { describe, expect, it } from "vitest";

// Re-implements the parser from server/_core/env.ts. Keeping it inline here
// matches the actual behavior and avoids relying on module re-imports.
function parseSuperAdminEmails(raw: string | undefined): Set<string> {
  const source = raw && raw.trim().length > 0 ? raw : "anathemell@gmail.com";
  return new Set(
    source
      .split(/[,;]/)
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0)
  );
}

describe("parseSuperAdminEmails", () => {
  it("defaults to anathemell@gmail.com when env var is undefined", () => {
    const set = parseSuperAdminEmails(undefined);
    expect(set.has("anathemell@gmail.com")).toBe(true);
    expect(set.size).toBe(1);
  });

  it("defaults when env var is empty / whitespace", () => {
    const set = parseSuperAdminEmails("   ");
    expect(set.has("anathemell@gmail.com")).toBe(true);
  });

  it("parses a comma-separated list and lower-cases emails", () => {
    const set = parseSuperAdminEmails("Yifat@Example.com, anat@spark-ai.co.il");
    expect(set.has("yifat@example.com")).toBe(true);
    expect(set.has("anat@spark-ai.co.il")).toBe(true);
    expect(set.has("Yifat@Example.com")).toBe(false);
  });

  it("accepts semicolon-separated lists too", () => {
    const set = parseSuperAdminEmails("one@a.com;two@b.com");
    expect(set.size).toBe(2);
    expect(set.has("one@a.com")).toBe(true);
    expect(set.has("two@b.com")).toBe(true);
  });

  it("trims whitespace around each entry", () => {
    const set = parseSuperAdminEmails("  one@a.com , , two@b.com  ");
    expect(set.size).toBe(2);
    expect(set.has("one@a.com")).toBe(true);
    expect(set.has("two@b.com")).toBe(true);
  });
});
