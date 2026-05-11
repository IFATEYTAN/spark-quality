/**
 * Behavior contract for the abandoned-cart watchdog.
 *
 * Because this handler depends on real DB + Resend, the unit tests here mock
 * the four collaborators (`sdk.authenticateRequest`, `findAbandonedPaymentAttempts`,
 * `markPaymentAttemptAbandoned`, and `sendEmail`) and assert ONLY the orchestration:
 *
 *   1. cron-only auth — non-cron callers get 403 and nothing is processed.
 *   2. happy path — every abandoned attempt is emailed AND marked.
 *   3. partial failure — when sendEmail fails, the row stays `pending` so the
 *      next cron run will retry. We never mark a row `abandoned` without first
 *      sending its email.
 *   4. zero rows — handler still returns ok with processed:0.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

vi.mock("../_core/sdk", () => ({
  sdk: { authenticateRequest: vi.fn() },
}));
vi.mock("../db", () => ({
  findAbandonedPaymentAttempts: vi.fn(),
  markPaymentAttemptAbandoned: vi.fn(),
}));
vi.mock("../email", () => ({
  sendEmail: vi.fn(),
}));
// renderBrandedEmail is pure — we let the real one run so we exercise the
// template too. It returns { subject, html, text } strings.

import { sdk } from "../_core/sdk";
import {
  findAbandonedPaymentAttempts,
  markPaymentAttemptAbandoned,
} from "../db";
import { sendEmail } from "../email";
import { abandonedCartsHandler } from "./abandonedCarts";

type MockResponse = Response & {
  _status: number;
  _body: unknown;
};

function makeRes(): MockResponse {
  const res = {
    _status: 200,
    _body: undefined as unknown,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(body: unknown) {
      this._body = body;
      return this;
    },
  } as unknown as MockResponse;
  return res;
}

function makeReq(): Request {
  return {
    originalUrl: "/api/scheduled/abandonedCarts",
    headers: {},
  } as unknown as Request;
}

function makeAttempt(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    requestId: "req_abc",
    workspaceId: 60002,
    plan: "basic",
    billingPeriod: "monthly",
    amount: 150,
    currency: "ILS",
    customerSnapshot: {
      name: "אנת ל.",
      email: "anat@example.com",
      phone: "0501234567",
      taxId: "123456789",
    },
    status: "pending",
    paymentUrl: "https://icount.example/pay/x",
    initiatedByUserId: 1,
    invoiceId: null,
    subscriptionId: null,
    errorMessage: null,
    abandonedNotifiedAt: null,
    succeededAt: null,
    failedAt: null,
    createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 min ago
    updatedAt: new Date(Date.now() - 20 * 60 * 1000),
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(sdk.authenticateRequest).mockReset();
  vi.mocked(findAbandonedPaymentAttempts).mockReset();
  vi.mocked(markPaymentAttemptAbandoned).mockReset();
  vi.mocked(sendEmail).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("abandonedCartsHandler", () => {
  it("rejects non-cron callers with 403 and never queries the DB", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValue({
      id: 1,
      isCron: false,
    } as never);

    const req = makeReq();
    const res = makeRes();
    await abandonedCartsHandler(req, res);

    expect(res._status).toBe(403);
    expect(findAbandonedPaymentAttempts).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("returns processed:0 when there is nothing to notify", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValue({
      id: -1,
      isCron: true,
      taskUid: "task_x",
    } as never);
    vi.mocked(findAbandonedPaymentAttempts).mockResolvedValue([]);

    const req = makeReq();
    const res = makeRes();
    await abandonedCartsHandler(req, res);

    expect(res._status).toBe(200);
    expect(res._body).toEqual({ ok: true, processed: 0 });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(markPaymentAttemptAbandoned).not.toHaveBeenCalled();
  });

  it("emails the owner and marks each abandoned attempt on the happy path", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValue({
      id: -1,
      isCron: true,
      taskUid: "task_x",
    } as never);
    const attempts = [
      makeAttempt({ requestId: "req_1" }),
      makeAttempt({ requestId: "req_2" }),
    ];
    vi.mocked(findAbandonedPaymentAttempts).mockResolvedValue(
      attempts as never,
    );
    vi.mocked(sendEmail).mockResolvedValue({ ok: true, id: "msg_x" });
    vi.mocked(markPaymentAttemptAbandoned).mockResolvedValue();

    const req = makeReq();
    const res = makeRes();
    await abandonedCartsHandler(req, res);

    expect(res._status).toBe(200);
    expect(res._body).toEqual({
      ok: true,
      processed: 2,
      emailed: 2,
      failed: 0,
    });
    expect(sendEmail).toHaveBeenCalledTimes(2);
    // Both rows must end up marked.
    expect(markPaymentAttemptAbandoned).toHaveBeenCalledTimes(2);
    expect(markPaymentAttemptAbandoned).toHaveBeenCalledWith("req_1");
    expect(markPaymentAttemptAbandoned).toHaveBeenCalledWith("req_2");
    // Owner email must contain the customer name and the requestId so we can
    // hand-correlate it back to the iCount log.
    const firstCall = vi.mocked(sendEmail).mock.calls[0][0];
    expect(firstCall.to).toBe("anathemell@gmail.com");
    expect(firstCall.subject).toContain("נטישת עגלה");
    expect(firstCall.html ?? "").toContain("req_1");
  });

  it("does NOT mark the row when sendEmail fails (keeps it pending for retry)", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValue({
      id: -1,
      isCron: true,
      taskUid: "task_x",
    } as never);
    vi.mocked(findAbandonedPaymentAttempts).mockResolvedValue(
      [makeAttempt({ requestId: "req_will_fail" })] as never,
    );
    vi.mocked(sendEmail).mockResolvedValue({
      ok: false,
      error: "resend-down",
    });
    vi.mocked(markPaymentAttemptAbandoned).mockResolvedValue();

    const req = makeReq();
    const res = makeRes();
    await abandonedCartsHandler(req, res);

    expect(res._status).toBe(200);
    expect(res._body).toEqual({
      ok: true,
      processed: 1,
      emailed: 0,
      failed: 1,
    });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    // CRITICAL: we did not mark abandoned, so the next cron tick will retry.
    expect(markPaymentAttemptAbandoned).not.toHaveBeenCalled();
  });
});
