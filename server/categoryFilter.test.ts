/**
 * Round 88 — guards the filterCustomersByCategory helper that drives the
 * guest-mode CategoryPickerStage. If somebody re-spells a status string in
 * demoData (e.g. "ריסק זמני") the filter would silently return zero rows
 * and the dashboard would look empty for the agent.
 */
import { describe, it, expect } from "vitest";
import {
  filterCustomersByCategory,
  CATEGORY_TO_STATUSES,
  CUSTOMERS,
  type Customer,
  type AnalysisCategory,
} from "../client/src/lib/demoData";

describe("filterCustomersByCategory", () => {
  it("returns the full list when category is 'all'", () => {
    expect(filterCustomersByCategory(CUSTOMERS, "all")).toEqual(CUSTOMERS);
  });

  it("returns only customers whose status is in CATEGORY_TO_STATUSES[category]", () => {
    (Object.keys(CATEGORY_TO_STATUSES) as AnalysisCategory[]).forEach((cat) => {
      const allowed = CATEGORY_TO_STATUSES[cat];
      const filtered = filterCustomersByCategory(CUSTOMERS, cat);
      if (!allowed) {
        expect(filtered).toEqual(CUSTOMERS);
        return;
      }
      filtered.forEach((c: Customer) => {
        expect(allowed).toContain(c.status);
      });
    });
  });

  it("preserves input order", () => {
    const filtered = filterCustomersByCategory(CUSTOMERS, "vip");
    const indices = filtered.map((c) => CUSTOMERS.indexOf(c));
    const sorted = [...indices].sort((a, b) => a - b);
    expect(indices).toEqual(sorted);
  });

  it("every category that is not 'all' should match at least one canned customer (sanity check)", () => {
    // This catches typos like "תיקון 190 / עצמאי" vs "תיקון 190".
    const cats: AnalysisCategory[] = [
      "risk_ending",
      "coverage_gaps",
      "tikun_190",
    ];
    cats.forEach((cat) => {
      const filtered = filterCustomersByCategory(CUSTOMERS, cat);
      expect(filtered.length).toBeGreaterThan(0);
    });
  });
});
