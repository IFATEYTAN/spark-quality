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

    // Auto-grant Super-Admin to the workspace owner + hard-coded SPARK staff
    const SPARK_SUPERADMIN_EMAILS = new Set([
      "anathemell@gmail.com",
    ]);
    const emailLower = (user.email ?? "").trim().toLowerCase();
    const shouldBeSuperAdmin =
      user.openId === ENV.ownerOpenId || (emailLower && SPARK_SUPERADMIN_EMAILS.has(emailLower));
    if (shouldBeSuperAdmin) {
      values.isSuperAdmin = true;
      updateSet.isSuperAdmin = true;
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

/**
 * Find a user by exact insurance-license number (used to detect duplicates
 * before assigning a license to another user).
 */
export async function getUserByLicenseNumber(licenseNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.licenseNumber, licenseNumber))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Persist the agent's broker-license number + uploaded license file (storage key).
 * Sets licenseVerifiedAt to NOW so the back-office knows when it was captured.
 */
export async function setUserLicense(
  userId: number,
  data: { licenseNumber: string; licenseFileKey: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({
      licenseNumber: data.licenseNumber,
      licenseFileKey: data.licenseFileKey,
      licenseVerifiedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

// ============================================================
// WORKSPACES
// ============================================================
export async function createWorkspace(data: InsertWorkspace) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Trial removed (Round 33). Workspaces start with the plan they pay for; trialEndsAt stays null.
  const raw = await db.insert(workspaces).values(data);
  // MySQL2 driver returns [ResultSetHeader, undefined]; drizzle wraps it as
  // either an array or { insertId, ... }. Be defensive and crash loudly if it
  // is missing so we never silently return undefined and orphan a workspace.
  const insertId =
    (raw as unknown as { insertId?: number }).insertId ??
    ((raw as unknown as Array<{ insertId?: number }>)[0]?.insertId);
  if (typeof insertId !== "number" || !Number.isFinite(insertId)) {
    throw new Error(
      `Failed to read insertId from createWorkspace result. Raw: ${JSON.stringify(raw)}`,
    );
  }
  return insertId;
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

export async function updateClient(opts: {
  clientId: number;
  workspaceId: number;
  isVip?: boolean;
  notes?: string;
  flagStatus?:
    | "regular"
    | "liquid_fund"
    | "tikun_190"
    | "high_fees"
    | "risk_ending"
    | "coverage_gaps";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const patch: Partial<InsertClient> = {};
  if (opts.isVip !== undefined) patch.isVip = opts.isVip;
  if (opts.notes !== undefined) patch.notes = opts.notes;
  if (opts.flagStatus !== undefined) patch.flagStatus = opts.flagStatus;
  if (Object.keys(patch).length === 0) return;
  patch.updatedAt = new Date();
  await db
    .update(clients)
    .set(patch)
    .where(and(eq(clients.id, opts.clientId), eq(clients.workspaceId, opts.workspaceId)));
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

export async function getInvitationById(invitationId: number, workspaceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.id, invitationId), eq(invitations.workspaceId, workspaceId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function revokeInvitation(invitationId: number, workspaceId: number) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(invitations)
    .set({ status: "revoked" })
    .where(and(eq(invitations.id, invitationId), eq(invitations.workspaceId, workspaceId)));
  return true;
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
    flagStatus?: "vip" | "liquid_fund" | "tikun_190" | "high_fees" | "risk_ending" | "coverage_gaps" | "regular";
    isVip?: boolean;
    totalBalance?: number;
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
    flagStatus: row.flagStatus ?? "regular",
    isVip: row.isVip ?? false,
    totalBalance: row.totalBalance != null ? row.totalBalance.toString() : "0",
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
        flagStatus: sql`VALUES(\`flagStatus\`)`,
        isVip: sql`VALUES(\`isVip\`)`,
        totalBalance: sql`VALUES(\`totalBalance\`)`,
      },
    });
    total += batch.length;
  }
  return total;
}

// ============================================================
// FINANCIAL / VIP HELPERS
// ============================================================

/** Update workspace billing details (taxId + phone) */
export async function updateWorkspaceBillingDetails(
  workspaceId: number,
  details: { taxId: string; taxIdType: "company" | "individual"; contactPhone: string }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(workspaces)
    .set({
      taxId: details.taxId,
      taxIdType: details.taxIdType,
      contactPhone: details.contactPhone,
    })
    .where(eq(workspaces.id, workspaceId));
}

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
      highFees: 0,
      riskEnding: 0,
      coverageGaps: 0,
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
  const highFees = rows.filter(r => r.flagStatus === "high_fees").length;
  const riskEnding = rows.filter(r => r.flagStatus === "risk_ending").length;
  const coverageGaps = rows.filter(r => r.flagStatus === "coverage_gaps").length;
  const totalAum = rows.reduce(
    (sum, r) => sum + Number(r.totalBalance ?? 0),
    0
  );
  return {
    totalClients,
    vipClients,
    liquidFunds,
    tikun190Candidates,
    highFees,
    riskEnding,
    coverageGaps,
    totalAum,
  };
}

// ============================================================
// SUPER-ADMIN HELPERS
// ============================================================

import {
  contactSubmissions,
  auditLog,
  type InsertContactSubmission,
  type InsertAuditLog,
} from "../drizzle/schema";

/** Insert a new contact submission and return the inserted row id. */
export async function createContactSubmission(data: InsertContactSubmission) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(contactSubmissions).values(data);
  return Number((result as unknown as { insertId?: number }).insertId ?? 0);
}

/** List all contact submissions, newest first, with optional status filter. */
export async function listContactSubmissions(opts?: {
  status?: "new" | "read" | "replied" | "archived";
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const limit = opts?.limit ?? 200;
  if (opts?.status) {
    return db
      .select()
      .from(contactSubmissions)
      .where(eq(contactSubmissions.status, opts.status))
      .orderBy(desc(contactSubmissions.createdAt))
      .limit(limit);
  }
  return db
    .select()
    .from(contactSubmissions)
    .orderBy(desc(contactSubmissions.createdAt))
    .limit(limit);
}

export async function updateContactSubmissionStatus(
  id: number,
  status: "new" | "read" | "replied" | "archived",
  adminNote?: string
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(contactSubmissions)
    .set({ status, ...(adminNote !== undefined ? { adminNote } : {}) })
    .where(eq(contactSubmissions.id, id));
}

/** Append an audit-log entry. Best-effort. */
export async function writeAudit(entry: InsertAuditLog) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(auditLog).values(entry);
  } catch (err) {
    console.error("[audit] failed to write entry", err);
  }
}

export async function listAuditLog(opts?: { limit?: number; workspaceId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const limit = opts?.limit ?? 200;
  const cols = {
    id: auditLog.id,
    actorUserId: auditLog.actorUserId,
    actorName: users.name,
    actorEmail: users.email,
    workspaceId: auditLog.workspaceId,
    action: auditLog.action,
    entityType: auditLog.entityType,
    entityId: auditLog.entityId,
    detail: auditLog.detail,
    metadata: auditLog.metadata,
    createdAt: auditLog.createdAt,
  };
  if (opts?.workspaceId) {
    return db
      .select(cols)
      .from(auditLog)
      .leftJoin(users, eq(auditLog.actorUserId, users.id))
      .where(eq(auditLog.workspaceId, opts.workspaceId))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  }
  return db
    .select(cols)
    .from(auditLog)
    .leftJoin(users, eq(auditLog.actorUserId, users.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

export async function listAllWorkspacesWithStats() {
  const db = await getDb();
  if (!db) return [];
  const allWorkspaces = await db
    .select()
    .from(workspaces)
    .orderBy(desc(workspaces.createdAt));

  const stats = await Promise.all(
    allWorkspaces.map(async ws => {
      const memberCount = await db
        .select({ c: sql`count(*)` })
        .from(users)
        .where(eq(users.workspaceId, ws.id));
      const clientCount = await db
        .select({ c: sql`count(*)` })
        .from(clients)
        .where(eq(clients.workspaceId, ws.id));
      const reportCount = await db
        .select({ c: sql`count(*)` })
        .from(reports)
        .where(eq(reports.workspaceId, ws.id));
      const aumRows = await db
        .select({ totalBalance: clients.totalBalance })
        .from(clients)
        .where(eq(clients.workspaceId, ws.id));
      const totalAum = aumRows.reduce((s, r) => s + Number(r.totalBalance ?? 0), 0);
      return {
        ...ws,
        memberCount: Number((memberCount[0] as any)?.c ?? 0),
        clientCount: Number((clientCount[0] as any)?.c ?? 0),
        reportCount: Number((reportCount[0] as any)?.c ?? 0),
        totalAum,
      };
    })
  );
  return stats;
}

export async function listAllUsersWithWorkspace() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      isSuperAdmin: users.isSuperAdmin,
      suspendedAt: users.suspendedAt,
      workspaceId: users.workspaceId,
      workspaceRole: users.workspaceRole,
      workspaceName: workspaces.name,
      lastSignedIn: users.lastSignedIn,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(workspaces, eq(users.workspaceId, workspaces.id))
    .orderBy(desc(users.lastSignedIn));
}

export async function setUserSuperAdmin(userId: number, value: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isSuperAdmin: value }).where(eq(users.id, userId));
}

export async function setUserSuspended(userId: number, suspended: boolean) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ suspendedAt: suspended ? new Date() : null })
    .where(eq(users.id, userId));
}

export async function setUserWorkspaceRole(
  userId: number,
  role: "owner" | "admin" | "agent"
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ workspaceRole: role }).where(eq(users.id, userId));
}

export async function setWorkspaceSuspended(
  workspaceId: number,
  suspended: boolean,
  adminNote?: string
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(workspaces)
    .set({
      suspendedAt: suspended ? new Date() : null,
      ...(adminNote !== undefined ? { adminNote } : {}),
    })
    .where(eq(workspaces.id, workspaceId));
}

export async function setWorkspacePlan(
  workspaceId: number,
  plan: "trial" | "basic" | "pro" | "premium" | "enterprise"
) {
  const db = await getDb();
  if (!db) return;
  await db.update(workspaces).set({ plan }).where(eq(workspaces.id, workspaceId));
}

export async function getGlobalDashboardStats() {
  const db = await getDb();
  if (!db) {
    return {
      workspaces: { total: 0, active: 0 },
      users: 0,
      clients: 0,
      reports: 0,
      contactsNew: 0,
      aum: 0,
    };
  }
  const [wsTotal] = await db.select({ c: sql`count(*)` }).from(workspaces);
  const [wsActive] = await db
    .select({ c: sql`count(*)` })
    .from(workspaces)
    .where(and(eq(workspaces.isActive, true), sql`${workspaces.suspendedAt} IS NULL`));
  const [usersTotal] = await db.select({ c: sql`count(*)` }).from(users);
  const [clientsTotal] = await db.select({ c: sql`count(*)` }).from(clients);
  const [reportsTotal] = await db.select({ c: sql`count(*)` }).from(reports);
  const [contactsNew] = await db
    .select({ c: sql`count(*)` })
    .from(contactSubmissions)
    .where(eq(contactSubmissions.status, "new"));
  const [aumSum] = await db
    .select({ s: sql`coalesce(sum(${clients.totalBalance}), 0)` })
    .from(clients);

  return {
    workspaces: {
      total: Number((wsTotal as any)?.c ?? 0),
      active: Number((wsActive as any)?.c ?? 0),
    },
    users: Number((usersTotal as any)?.c ?? 0),
    clients: Number((clientsTotal as any)?.c ?? 0),
    reports: Number((reportsTotal as any)?.c ?? 0),
    contactsNew: Number((contactsNew as any)?.c ?? 0),
    aum: Number((aumSum as any)?.s ?? 0),
  };
}


// ============================================================
// PAYMENT ATTEMPTS — מעקב אחר ניסיונות תשלום ועגלות נטושות
// ============================================================
import { paymentAttempts } from "../drizzle/schema";

export async function createPaymentAttempt(input: {
  requestId: string;
  workspaceId: number;
  initiatedByUserId: number;
  plan: "basic" | "pro" | "premium";
  billingPeriod: "monthly" | "yearly";
  amount: number;
  customerSnapshot: { name: string; email: string; phone: string; taxId: string };
  paymentUrl?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(paymentAttempts).values({
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    initiatedByUserId: input.initiatedByUserId,
    plan: input.plan,
    billingPeriod: input.billingPeriod,
    amount: input.amount,
    status: "pending",
    customerSnapshot: input.customerSnapshot,
    paymentUrl: input.paymentUrl ?? null,
  });
}

export async function getPaymentAttemptByRequestId(
  requestId: string,
): Promise<typeof paymentAttempts.$inferSelect | null> {
  const db = await getDb();
  if (!db) return null;
  const { eq } = await import("drizzle-orm");
  const rows = await db
    .select()
    .from(paymentAttempts)
    .where(eq(paymentAttempts.requestId, requestId))
    .limit(1);
  return rows[0] ?? null;
}

export async function markPaymentAttemptSucceeded(input: {
  requestId: string;
  invoiceId?: string;
  subscriptionId?: string;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const { eq } = await import("drizzle-orm");
  const result = await db
    .update(paymentAttempts)
    .set({
      status: "succeeded",
      invoiceId: input.invoiceId ?? null,
      subscriptionId: input.subscriptionId ?? null,
      callbackAt: new Date(),
    })
    .where(eq(paymentAttempts.requestId, input.requestId));
  // mysql2 result is a header packet; treat truthy result as success.
  return Boolean(result);
}

export async function markPaymentAttemptFailed(input: {
  requestId: string;
  errorMessage: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { eq } = await import("drizzle-orm");
  await db
    .update(paymentAttempts)
    .set({
      status: "failed",
      errorMessage: input.errorMessage,
      callbackAt: new Date(),
    })
    .where(eq(paymentAttempts.requestId, input.requestId));
}

/**
 * Find pending payment attempts older than `maxAgeMs` that haven't been
 * notified yet. Used by the abandoned-cart watchdog (see jobs/abandonedCarts.ts).
 */
export async function findAbandonedPaymentAttempts(
  maxAgeMs: number,
): Promise<Array<typeof paymentAttempts.$inferSelect>> {
  const db = await getDb();
  if (!db) return [];
  const { and, eq, lt, isNull } = await import("drizzle-orm");
  const cutoff = new Date(Date.now() - maxAgeMs);
  return db
    .select()
    .from(paymentAttempts)
    .where(
      and(
        eq(paymentAttempts.status, "pending"),
        lt(paymentAttempts.createdAt, cutoff),
        isNull(paymentAttempts.abandonedNotifiedAt),
      ),
    );
}

export async function markPaymentAttemptAbandoned(
  requestId: string,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { eq } = await import("drizzle-orm");
  await db
    .update(paymentAttempts)
    .set({
      status: "abandoned",
      abandonedNotifiedAt: new Date(),
    })
    .where(eq(paymentAttempts.requestId, requestId));
}
