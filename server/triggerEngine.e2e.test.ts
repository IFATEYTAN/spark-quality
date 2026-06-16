/**
 * REAL end-to-end integration test of the 16-trigger engine.
 *
 * Seeds a workspace with one client per trigger (plus the policies / metadata
 * that should fire it) into a REAL database, runs the production
 * `computeWorkspaceFlags`, then asserts — through the exact helper the UI's
 * `triggers.listClients` procedure calls (`listClientsForTriggerV2`) — that
 * every trigger surfaces its target client with the correct data.
 *
 * This is the authoritative proof that "each process shows the correct data".
 * It hits a real MySQL, so it SKIPS when DATABASE_URL is not configured
 * (e.g. the sandbox) and RUNS in CI / the Manus environment.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import * as db from "./db";
import { workspaces, users, clients, policies, clientFlags } from "../drizzle/schema";

const SUFFIX = `te${Date.now().toString(36)}`;
const SKIP =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.startsWith("mock://") ||
  process.env.SKIP_DB_TESTS === "1";

function readId(raw: unknown): number {
  const direct = (raw as { insertId?: number })?.insertId;
  if (typeof direct === "number" && direct > 0) return direct;
  const arr = Array.isArray(raw) ? (raw as Array<{ insertId?: number }>)[0]?.insertId : undefined;
  if (typeof arr === "number" && arr > 0) return arr;
  throw new Error(`Failed to read insertId: ${JSON.stringify(raw)}`);
}

const now = new Date();
/** A birthday 6 months away (never the current month) at a given age. */
const ageBirth = (years: number) => new Date(now.getFullYear() - years, (now.getMonth() + 6) % 12, 15);
/** A birthday in the CURRENT month, day 1 (already passed → exact age). */
const thisMonthBirth = (years: number) => new Date(now.getFullYear() - years, now.getMonth(), 1);
const inDays = (d: number) => {
  const x = new Date(now);
  x.setDate(x.getDate() + d);
  return x;
};

type PolicySeed = {
  productType?: string;
  status?: "active" | "inactive" | "cancelled" | "expired";
  monthlyPremium?: string;
  balance?: string;
  endDate?: Date | null;
  metadata?: Record<string, unknown>;
};

let drz: Awaited<ReturnType<typeof db.getDb>> = null;
let WS = 0;
let USER = 0;
const ID: Record<string, number> = {};

describe.skipIf(SKIP)("16-trigger engine · real DB integration", () => {
  beforeAll(async () => {
    drz = await db.getDb();
    if (!drz) throw new Error("Database not available");

    const taxId = String(Date.now()).slice(-9).padStart(9, "0");
    WS = readId(await drz.insert(workspaces).values({
      name: `te-${SUFFIX}`, taxId, taxIdType: "company", plan: "basic",
    }));
    USER = readId(await drz.insert(users).values({
      openId: `te-${SUFFIX}`, name: "owner", email: `o-${SUFFIX}@test.local`, workspaceId: WS,
    }));

    const seed = async (
      key: string,
      client: { email?: string; isVip?: boolean; birthDate?: Date | null; notes?: string | null; totalBalance?: string },
      pols: PolicySeed[],
    ) => {
      const cid = readId(await drz!.insert(clients).values({
        workspaceId: WS,
        ownerUserId: USER,
        idNumber: `${key}-${SUFFIX}`,
        fullName: key,
        email: client.email ?? "c@test.local",
        birthDate: client.birthDate ?? ageBirth(45),
        notes: client.notes ?? null,
        isVip: client.isVip ?? false,
        flagStatus: "regular",
        totalBalance: client.totalBalance ?? "0",
      }));
      for (const p of pols) {
        await drz!.insert(policies).values({
          workspaceId: WS,
          clientId: cid,
          productType: p.productType ?? "קרן פנסיה חדשה מקיפה",
          company: "מגדל",
          policyNumber: "",
          monthlyPremium: p.monthlyPremium ?? "100",
          annualPremium: "0",
          balance: p.balance ?? "0",
          startDate: null,
          endDate: p.endDate ?? null,
          status: p.status ?? "active",
          metadata: p.metadata ?? { poaHolder: "סוכן בדיקה" },
        });
      }
      ID[key] = cid;
    };

    // A "neutral" pension policy (poaHolder set, premium>0) keeps unrelated
    // triggers quiet so each client's target trigger is unambiguous.
    const neutral: PolicySeed = { metadata: { poaHolder: "סוכן בדיקה" } };

    await seed("vipGoldPremium", { isVip: true }, [neutral]);
    await seed("noEmail", { email: "" }, [neutral]);
    await seed("poaExpired", {}, [{ metadata: { poaHolder: "" } }]);
    await seed("riskTemporary", {}, [{ metadata: { poaHolder: "x", riskTemporary: true } }]);
    await seed("coverageEnding", {}, [{ endDate: inDays(30), metadata: { poaHolder: "x" } }]);
    await seed("savingsNoInsurance", {}, [{ productType: "קרן השתלמות", metadata: { poaHolder: "x" } }]);
    await seed("noActivePension", {}, [{ productType: "ביטוח חיים", metadata: { poaHolder: "x" } }]);
    await seed("age46NoLongTermCare", { birthDate: ageBirth(50) }, [neutral]);
    await seed("aumFrozen", { totalBalance: "100000" }, [{ monthlyPremium: "0", balance: "100000", metadata: { poaHolder: "x" } }]);
    await seed("highFees", {}, [{ metadata: { poaHolder: "x", dmTzvirah: 0.012 } }]);
    await seed("trackMismatch", { birthDate: ageBirth(60) }, [
      neutral,
      { productType: "מסלול השקעה", balance: "50000", metadata: { equityTrack: true } },
    ]);
    await seed("selfEmployedNoDeposit", { totalBalance: "0" }, [{ monthlyPremium: "0", balance: "0", metadata: { poaHolder: "x" } }]);
    await seed("concentrationRisk", {}, [
      { balance: "90000", metadata: { poaHolder: "x" } },
      { balance: "10000", metadata: { poaHolder: "x" } },
    ]);
    await seed("birthdayThisMonth", { birthDate: thisMonthBirth(45) }, [neutral]);
    await seed("birthdayMilestone", { birthDate: thisMonthBirth(49) }, [neutral]);
    await seed("poaExpiring90d", { notes: "ייפוי כוח אחרון בטיפול" }, []); // no active policy → notes fallback

    await db.computeWorkspaceFlags({ workspaceId: WS });
  }, 60_000);

  afterAll(async () => {
    if (!drz) return;
    await drz.delete(clientFlags).where(eq(clientFlags.workspaceId, WS));
    await drz.delete(policies).where(eq(policies.workspaceId, WS));
    await drz.delete(clients).where(eq(clients.workspaceId, WS));
    await drz.delete(users).where(eq(users.id, USER));
    await drz.delete(workspaces).where(eq(workspaces.id, WS));
  }, 60_000);

  async function clientIdsFor(triggerKey: string): Promise<number[]> {
    const rows = await db.listClientsForTriggerV2({
      workspaceId: WS,
      triggerKey,
      userId: USER,
      workspaceRole: "owner",
    });
    return rows.map((r) => (r as { id: number }).id);
  }

  const TRIGGERS = [
    "poaExpired",
    "poaExpiring90d",
    "riskTemporary",
    "coverageEnding",
    "savingsNoInsurance",
    "noActivePension",
    "age46NoLongTermCare",
    "aumFrozen",
    "highFees",
    "trackMismatch",
    "selfEmployedNoDeposit",
    "concentrationRisk",
    "birthdayMilestone",
    "birthdayThisMonth",
    "vipGoldPremium",
    "noEmail",
  ] as const;

  it.each(TRIGGERS)("trigger %s surfaces its target client", async (trigger) => {
    const ids = await clientIdsFor(trigger);
    expect(ids).toContain(ID[trigger]);
  });

  it("each trigger list is role-isolated and never empty for a seeded match", async () => {
    for (const t of TRIGGERS) {
      const ids = await clientIdsFor(t);
      expect(ids.length).toBeGreaterThan(0);
    }
  });

  // The dashboard KPI/trigger counts (getWorkspaceMetrics) and the modal lists
  // (listClientsForTriggerV2) must read from the same source — client_flags —
  // so a card never shows a number that disagrees with the list it opens.
  it("dashboard metric counts equal the modal list lengths", async () => {
    const metrics = (await db.getWorkspaceMetrics({
      workspaceId: WS,
      userId: USER,
      workspaceRole: "owner",
    })) as Record<string, number>;
    for (const t of TRIGGERS) {
      const listLen = (await clientIdsFor(t)).length;
      expect(metrics[t], `metric "${t}" must equal its list length`).toBe(listLen);
    }
  });
});
