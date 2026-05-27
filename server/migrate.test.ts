// Verifies that applyMigrationsIfConfigured no-ops when DATABASE_URL is
// missing or when AUTO_MIGRATE_ON_START=false, so local dev / tests /
// out-of-band-managed environments don't hit the migrator.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Spy on mysql2's createConnection so we can assert the migrator never
// reaches the DB in the skip-paths.
const mockCreateConnection = vi.fn();
vi.mock("mysql2/promise", () => ({
  default: {
    createConnection: (...args: unknown[]) => mockCreateConnection(...args),
  },
  createConnection: (...args: unknown[]) => mockCreateConnection(...args),
}));

import { applyMigrationsIfConfigured } from "./_core/migrate";

describe("applyMigrationsIfConfigured", () => {
  const originalUrl = process.env.DATABASE_URL;
  const originalFlag = process.env.AUTO_MIGRATE_ON_START;

  beforeEach(() => {
    mockCreateConnection.mockReset();
    delete process.env.DATABASE_URL;
    delete process.env.AUTO_MIGRATE_ON_START;
  });

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalUrl;
    }
    if (originalFlag === undefined) {
      delete process.env.AUTO_MIGRATE_ON_START;
    } else {
      process.env.AUTO_MIGRATE_ON_START = originalFlag;
    }
  });

  it("returns without touching the DB when DATABASE_URL is unset", async () => {
    await expect(applyMigrationsIfConfigured()).resolves.toBeUndefined();
    expect(mockCreateConnection).not.toHaveBeenCalled();
  });

  it("returns without touching the DB when AUTO_MIGRATE_ON_START is 'false'", async () => {
    process.env.DATABASE_URL = "mysql://x:x@localhost:3306/x";
    process.env.AUTO_MIGRATE_ON_START = "false";
    await expect(applyMigrationsIfConfigured()).resolves.toBeUndefined();
    expect(mockCreateConnection).not.toHaveBeenCalled();
  });

  it("calls mysql2.createConnection with the configured URL when enabled", async () => {
    process.env.DATABASE_URL = "mysql://user:pass@db.example.com:3306/spark";
    // Connection.end() returns a Promise; the migrator step will throw because
    // there's no real DB, which is fine — we only want to assert that we
    // attempted to connect with the right URL in the happy-path branch.
    mockCreateConnection.mockRejectedValue(new Error("dial failed (expected in test)"));
    await expect(applyMigrationsIfConfigured()).rejects.toThrow(/dial failed/);
    expect(mockCreateConnection).toHaveBeenCalledWith(
      "mysql://user:pass@db.example.com:3306/spark"
    );
  });
});
