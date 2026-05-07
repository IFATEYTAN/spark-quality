// Vitest for auth.setLicense procedure: validation, uniqueness, file persistence.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUserByLicenseNumber = vi.fn();
const mockSetUserLicense = vi.fn();
const mockStoragePut = vi.fn();

vi.mock("./db", () => ({
  getUserByLicenseNumber: (...args: unknown[]) => mockGetUserByLicenseNumber(...args),
  setUserLicense: (...args: unknown[]) => mockSetUserLicense(...args),
}));

vi.mock("./storage", () => ({
  storagePut: (...args: unknown[]) => mockStoragePut(...args),
}));

import { appRouter } from "./routers";

const mockReq = { headers: {}, cookies: {} } as unknown as Parameters<
  typeof appRouter.createCaller
>[0]["req"];
const mockRes = { clearCookie: () => undefined } as unknown as Parameters<
  typeof appRouter.createCaller
>[0]["res"];

function makeCaller(userId = 42) {
  return appRouter.createCaller({
    req: mockReq,
    res: mockRes,
    user: {
      id: userId,
      openId: `open-${userId}`,
      name: "Test Agent",
      email: "agent@example.com",
      role: "user",
      isSuperAdmin: false,
      workspaceId: 1,
      workspaceRole: "owner",
      suspendedAt: null,
      createdAt: new Date(),
      lastSignedIn: new Date(),
      loginMethod: "google",
    } as never,
  });
}

// Build raw base64 of 240 bytes (well above 100B server minimum).
const validBase64 = Buffer.alloc(240, 0x42).toString("base64");

describe("auth.setLicense", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserByLicenseNumber.mockResolvedValue(undefined);
    mockStoragePut.mockResolvedValue({
      key: "licenses/user-42/123.png",
      url: "/manus-storage/licenses/user-42/123.png",
    });
    mockSetUserLicense.mockResolvedValue(undefined);
  });

  it("rejects invalid license number format", async () => {
    const caller = makeCaller();
    await expect(
      caller.auth.setLicense({
        licenseNumber: "ab",
        fileBase64: validBase64,
        fileName: "license.png",
        mimeType: "image/png",
      }),
    ).rejects.toThrow();
  });

  it("rejects unsupported mime types", async () => {
    const caller = makeCaller();
    await expect(
      caller.auth.setLicense({
        licenseNumber: "12345",
        fileBase64: validBase64,
        fileName: "license.exe",
        mimeType: "application/x-msdownload",
      }),
    ).rejects.toThrow();
  });

  it("rejects when license belongs to another user (uniqueness)", async () => {
    mockGetUserByLicenseNumber.mockResolvedValueOnce({ id: 999 });
    const caller = makeCaller(42);
    await expect(
      caller.auth.setLicense({
        licenseNumber: "12345",
        fileBase64: validBase64,
        fileName: "license.png",
        mimeType: "image/png",
      }),
    ).rejects.toThrow(/כבר רשום/);
  });

  it("uploads file + persists license on success", async () => {
    const caller = makeCaller(42);
    const res = await caller.auth.setLicense({
      licenseNumber: "12345",
      fileBase64: validBase64,
      fileName: "license.png",
      mimeType: "image/png",
    });
    expect(res.success).toBe(true);
    expect(mockStoragePut).toHaveBeenCalledTimes(1);
    const [storagePath, , storageMime] = mockStoragePut.mock.calls[0];
    expect(storagePath).toMatch(/^licenses\/user-42\/.+\.png$/);
    expect(storageMime).toBe("image/png");
    expect(mockSetUserLicense).toHaveBeenCalledWith(42, {
      licenseNumber: "12345",
      licenseFileKey: "licenses/user-42/123.png",
    });
  });

  it("allows updating own license (existing record matches userId)", async () => {
    mockGetUserByLicenseNumber.mockResolvedValueOnce({ id: 42 });
    const caller = makeCaller(42);
    const res = await caller.auth.setLicense({
      licenseNumber: "12345",
      fileBase64: validBase64,
      fileName: "license.pdf",
      mimeType: "application/pdf",
    });
    expect(res.success).toBe(true);
    expect(mockSetUserLicense).toHaveBeenCalled();
  });
});
