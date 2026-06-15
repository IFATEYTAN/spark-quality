import { describe, expect, it } from "vitest";
import {
  isValidIsraeliId,
  isValidIsraeliCompanyId,
  isValidIsraeliTaxId,
  isValidIsraeliMobile,
  normalizeIsraeliMobile,
} from "../shared/ilValidators";

// Known-valid synthetic IDs that satisfy the official check-digit algorithm.
// These are NOT real people / companies — they were generated for tests.
const VALID_ID = "000000018"; // satisfies the algorithm
const VALID_COMPANY = "500000005"; // 9-digit, passes the check-digit algorithm

describe("isValidIsraeliId", () => {
  it("accepts a valid 9-digit ID", () => {
    expect(isValidIsraeliId(VALID_ID)).toBe(true);
  });
  it("rejects empty / non-numeric", () => {
    expect(isValidIsraeliId("")).toBe(false);
    expect(isValidIsraeliId("abc")).toBe(false);
  });
  it("rejects values > 9 digits", () => {
    expect(isValidIsraeliId("1234567890")).toBe(false);
  });
  it("rejects bad check-digit", () => {
    expect(isValidIsraeliId("123456789")).toBe(false);
  });
});

describe("isValidIsraeliCompanyId", () => {
  it("accepts a valid 9-digit company id", () => {
    expect(isValidIsraeliCompanyId(VALID_COMPANY)).toBe(true);
  });
  it("rejects values that are not exactly 9 digits", () => {
    expect(isValidIsraeliCompanyId("12345678")).toBe(false);
    expect(isValidIsraeliCompanyId("1234567890")).toBe(false);
  });
});

describe("isValidIsraeliTaxId", () => {
  it("accepts both individual and company kinds", () => {
    expect(isValidIsraeliTaxId(VALID_ID, "individual")).toBe(true);
    expect(isValidIsraeliTaxId(VALID_COMPANY, "company")).toBe(true);
  });
  it("rejects mismatched check-digit", () => {
    expect(isValidIsraeliTaxId("000000000", "company")).toBe(true); // edge: all zeros passes
    expect(isValidIsraeliTaxId("123456789", "individual")).toBe(false);
  });
});

describe("normalizeIsraeliMobile", () => {
  it("accepts native 05X-XXXXXXX format", () => {
    expect(normalizeIsraeliMobile("0501234567")).toBe("0501234567");
    expect(normalizeIsraeliMobile("054-1234567")).toBe("0541234567");
  });
  it("normalizes +972 prefix to 05…", () => {
    expect(normalizeIsraeliMobile("+972501234567")).toBe("0501234567");
    expect(normalizeIsraeliMobile("972541234567")).toBe("0541234567");
  });
  it("rejects landlines and short numbers", () => {
    expect(normalizeIsraeliMobile("031234567")).toBeNull();
    expect(normalizeIsraeliMobile("0501234")).toBeNull();
  });
  it("isValidIsraeliMobile mirrors normalize", () => {
    expect(isValidIsraeliMobile("0501234567")).toBe(true);
    expect(isValidIsraeliMobile("031234567")).toBe(false);
  });
});
