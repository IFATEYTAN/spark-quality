import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  clients,
  type InsertClient,
  type InsertInvitation,
  type InsertReport,
  type InsertUser,
  type InsertWorkspace,
  invitations,
  policies,
  reports,
  users,
  workspaces,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================
// USERS
// ============================================================
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserWorkspace(
  userId: number,
  workspaceId: number,
  workspaceRole: "owner" | "admin" | "agent"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ workspaceId, workspaceRole })
    .where(eq(users.id, userId));
}

// ============================================================
// WORKSPACES
// ============================================================
export async function createWorkspace(data: InsertWorkspace) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Set 14-day trial by default
  const trialEndsAt = data.trialEndsAt ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const result = await db.insert(workspaces).values({ ...data, trialEndsAt });
  return (result as unknown as { insertId: number }).insertId;
}

export async function getWorkspaceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getWorkspaceMembers(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.workspaceId, workspaceId));
}

// ============================================================
// CLIENTS (Multi-tenant + role-based filtering)
// ============================================================

/**
 * List clients with proper data isolation:
 * - Admins/Owners see ALL clients in their workspace
 * - Agents see only THEIR OWN clients (where ownerUserId = userId)
 */
export async function listClients(opts: {
  workspaceId: number;
  userId: number;
  workspaceRole: "owner" | "admin" | "agent";
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = opts.workspaceRole === "agent"
    ? and(eq(clients.workspaceId, opts.workspaceId), eq(clients.ownerUserId, opts.userId))
    : eq(clients.workspaceId, opts.workspaceId);

  return db.select().from(clients).where(conditions).orderBy(desc(clients.createdAt));
}

export async function getClientById(opts: {
  clientId: number;
  workspaceId: number;
  userId: number;
  workspaceRole: "owner" | "admin" | "agent";
}) {
  const db = await getDb();
  if (!db) return undefined;

  const conditions = opts.workspaceRole === "agent"
    ? and(
        eq(clients.id, opts.clientId),
        eq(clients.workspaceId, opts.workspaceId),
        eq(clients.ownerUserId, opts.userId)
      )
    : and(eq(clients.id, opts.clientId), eq(clients.workspaceId, opts.workspaceId));

  const result = await db.select().from(clients).where(conditions).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values(data);
  return (result as unknown as { insertId: number }).insertId;
}

export async function getClientPolicies(clientId: number, workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(policies)
    .where(and(eq(policies.clientId, clientId), eq(policies.workspaceId, workspaceId)));
}

// ============================================================
// REPORTS
// ============================================================
export async function listReports(opts: {
  workspaceId: number;
  userId: number;
  workspaceRole: "owner" | "admin" | "agent";
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = opts.workspaceRole === "agent"
    ? and(eq(reports.workspaceId, opts.workspaceId), eq(reports.uploadedByUserId, opts.userId))
    : eq(reports.workspaceId, opts.workspaceId);

  return db.select().from(reports).where(conditions).orderBy(desc(reports.uploadedAt));
}

export async function createReport(data: InsertReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reports).values(data);
  return (result as unknown as { insertId: number }).insertId;
}

// ============================================================
// INVITATIONS
// ============================================================
export async function createInvitation(data: InsertInvitation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(invitations).values(data);
  return (result as unknown as { insertId: number }).insertId;
}

export async function getInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(invitations).where(eq(invitations.token, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listWorkspaceInvitations(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(invitations)
    .where(eq(invitations.workspaceId, workspaceId))
    .orderBy(desc(invitations.createdAt));
}


// ============================================================
// BULK CLIENT IMPORT (used after report parsing)
// ============================================================
/**
 * Upsert multiple clients from a parsed report.
 * Returns the count of inserted/updated rows.
 * Uses idNumber + workspaceId as the unique key for de-duplication.
 */
export async function bulkUpsertClients(opts: {
  workspaceId: number;
  ownerUserId: number;
  reportId: number;
  rows: Array<{
    idNumber: string;
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
  }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (opts.rows.length === 0) return 0;

  // Insert with ON DUPLICATE KEY UPDATE (idNumber+workspaceId is unique)
  const values = opts.rows.map(row => ({
    workspaceId: opts.workspaceId,
    ownerUserId: opts.ownerUserId,
    idNumber: row.idNumber,
    fullName: row.fullName ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    notes: row.notes ?? null,
    sourceReportId: opts.reportId,
  }));

  // Insert in batches of 500 to avoid query size limits
  const BATCH = 500;
  let total = 0;
  for (let i = 0; i < values.length; i += BATCH) {
    const batch = values.slice(i, i + BATCH);
    await db.insert(clients).values(batch).onDuplicateKeyUpdate({
      set: {
        fullName: sql`COALESCE(VALUES(\`fullName\`), \`fullName\`)`,
        email: sql`COALESCE(VALUES(\`email\`), \`email\`)`,
        phone: sql`COALESCE(VALUES(\`phone\`), \`phone\`)`,
      },
    });
    total += batch.length;
  }
  return total;
}

// ============================================================
// FINANCIAL / VIP HELPERS
// ============================================================

/** Update the VIP threshold (in ILS) for a workspace */
export async function updateWorkspaceVipThreshold(
  workspaceId: number,
  vipThreshold: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(workspaces)
    .set({ vipThreshold: String(vipThreshold) })
    .where(eq(workspaces.id, workspaceId));
}

/**
 * Re-classify all clients in a workspace based on the new VIP threshold.
 * Sets isVip=true where totalBalance >= threshold; isVip=false otherwise.
 */
export async function reclassifyClientVipStatus(
  workspaceId: number,
  vipThreshold: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  await db
    .update(clients)
    .set({ isVip: true })
    .where(
      and(
        eq(clients.workspaceId, workspaceId),
        sql`CAST(${clients.totalBalance} AS DECIMAL(14,2)) >= ${vipThreshold}`
      )
    );
  await db
    .update(clients)
    .set({ isVip: false })
    .where(
      and(
        eq(clients.workspaceId, workspaceId),
        sql`CAST(${clients.totalBalance} AS DECIMAL(14,2)) < ${vipThreshold}`
      )
    );
  const all = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId));
  return all.length;
}

/**
 * Aggregate metrics for the dashboard, scoped by role.
 */
export async function getWorkspaceMetrics(opts: {
  workspaceId: number;
  userId: number;
  workspaceRole: "owner" | "admin" | "agent";
}) {
  const db = await getDb();
  if (!db) {
    return {
      totalClients: 0,
      vipClients: 0,
      liquidFunds: 0,
      tikun190Candidates: 0,
      totalAum: 0,
    };
  }
  const condition =
    opts.workspaceRole === "agent"
      ? and(
          eq(clients.workspaceId, opts.workspaceId),
          eq(clients.ownerUserId, opts.userId)
        )
      : eq(clients.workspaceId, opts.workspaceId);

  const rows = await db.select().from(clients).where(condition);
  const totalClients = rows.length;
  const vipClients = rows.filter(r => r.isVip).length;
  const tikun190Candidates = rows.filter(r => r.flagStatus === "tikun_190").length;
  const liquidFunds = rows.filter(r => r.flagStatus === "liquid_fund").length;
  const totalAum = rows.reduce(
    (sum, r) => sum + Number(r.totalBalance ?? 0),
    0
  );
  return {
    totalClients,
    vipClients,
    liquidFunds,
    tikun190Candidates,
    totalAum,
  };
}
