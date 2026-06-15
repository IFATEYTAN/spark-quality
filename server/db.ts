import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  clientActivities,
  clientReminders,
  clients,
  type InsertClient,
  type InsertClientActivity,
  type InsertClientReminder,
  type InsertInvitation,
  type InsertReport,
  type InsertUser,
  type InsertWorkspace,
  invitations,
  policies,
  reports,
  users,
  workspaces,
  messageTemplates,
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

/**
 * Look up an existing workspace by its tax ID (ח.פ / ת.ז, digits only).
 * Used by workspaces.create to give a friendly Hebrew CONFLICT error instead
 * of relying on the bare MySQL ER_DUP_ENTRY error (Round 113). Pass the
 * already-stripped digit string — the caller does the normalization.
 */
export async function getWorkspaceByTaxId(taxId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workspaces).where(eq(workspaces.taxId, taxId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getWorkspaceMembers(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.workspaceId, workspaceId));
}

/**
 * Round 114 — מקדמת ה-creator לתפקיד "owner" רק אם ה-workspace מסומן כ-active.
 *
 * מדיניות המוצר: כל יוזר נפתח לתפקיד "agent". רק כאשר ה-subscriptionStatus
 * של ה-workspace הופך ל-"active" לראשונה (מתוך makeRoutes / iCountRoutes / billing.activate),
 * ה-creator המקורי מתוג workspaces.createdByUserId מקודם אוטומטית ל-"owner".
 *
 * מוגן ל-no-op אם אין createdByUserId (רשומה קיימת מלפ֠י Round 114), אם האתר
 * אינו עדיין פעיל, ואם ה-creator כבר עזב את ה-workspace.
 */
export async function promoteCreatorToOwnerIfActive(workspaceId: number) {
  const db = await getDb();
  if (!db) return { promoted: false as const, reason: "no_db" as const };
  const ws = await getWorkspaceById(workspaceId);
  if (!ws) return { promoted: false as const, reason: "no_workspace" as const };
  if (ws.subscriptionStatus !== "active") {
    return { promoted: false as const, reason: "not_active" as const };
  }
  if (!ws.createdByUserId) {
    return { promoted: false as const, reason: "no_creator" as const };
  }
  const [creator] = await db
    .select()
    .from(users)
    .where(eq(users.id, ws.createdByUserId))
    .limit(1);
  if (!creator || creator.workspaceId !== workspaceId) {
    return { promoted: false as const, reason: "creator_left_workspace" as const };
  }
  if (creator.workspaceRole === "owner") {
    return { promoted: false as const, reason: "already_owner" as const };
  }
  await db
    .update(users)
    .set({ workspaceRole: "owner" })
    .where(eq(users.id, creator.id));
  return { promoted: true as const, userId: creator.id };
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

/**
 * Fetch a set of clients by id with the same role isolation as listClients.
 * Agents only get their own clients; ids outside the workspace/role are dropped.
 */
export async function getClientsByIds(opts: {
  workspaceId: number;
  userId: number;
  workspaceRole: "owner" | "admin" | "agent";
  ids: number[];
}) {
  const db = await getDb();
  if (!db || opts.ids.length === 0) return [];
  const base = and(
    eq(clients.workspaceId, opts.workspaceId),
    inArray(clients.id, opts.ids),
  );
  const cond = opts.workspaceRole === "agent"
    ? and(base, eq(clients.ownerUserId, opts.userId))
    : base;
  return db
    .select({ id: clients.id, fullName: clients.fullName, email: clients.email })
    .from(clients)
    .where(cond);
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

export async function updateReportLlmAnalysis(
  reportId: number,
  workspaceId: number,
  analysis: unknown,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(reports)
    .set({ llmAnalysis: analysis as never })
    .where(and(eq(reports.id, reportId), eq(reports.workspaceId, workspaceId)));
  return true;
}

export async function getReportById(reportId: number, workspaceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, reportId), eq(reports.workspaceId, workspaceId)))
    .limit(1);
  return rows.length > 0 ? rows[0] : undefined;
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
    birthDate?: string | null;
    notes?: string | null;
    flagStatus?: "vip" | "liquid_fund" | "tikun_190" | "high_fees" | "risk_ending" | "coverage_gaps" | "regular";
    isVip?: boolean;
    totalBalance?: number;
  }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (opts.rows.length === 0) return 0;

  function parseDate(v: string | null | undefined): Date | null {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Insert with ON DUPLICATE KEY UPDATE (idNumber+workspaceId is unique)
  const values = opts.rows.map(row => ({
    workspaceId: opts.workspaceId,
    ownerUserId: opts.ownerUserId,
    idNumber: row.idNumber,
    fullName: row.fullName ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    birthDate: parseDate(row.birthDate),
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
        birthDate: sql`COALESCE(VALUES(\`birthDate\`), \`birthDate\`)`,
        flagStatus: sql`VALUES(\`flagStatus\`)`,
        isVip: sql`VALUES(\`isVip\`)`,
        totalBalance: sql`VALUES(\`totalBalance\`)`,
      },
    });
    total += batch.length;
  }
  return total;
}

/**
 * Replace all policies for the clients referenced in `rows` (matched by
 * idNumber within the workspace). Existing policies for those clients are
 * deleted first so re-uploading a report does not duplicate rows. Policies
 * whose idNumber has no matching client are skipped.
 */
export async function bulkReplacePolicies(opts: {
  workspaceId: number;
  rows: Array<{
    idNumber: string;
    productType?: string | null;
    company?: string | null;
    policyNumber?: string | null;
    monthlyPremium?: number | null;
    annualPremium?: number | null;
    balance?: number | null;
    startDate?: string | null;
    endDate?: string | null;
    status?: "active" | "inactive" | "cancelled" | "expired";
    metadata?: Record<string, unknown> | null;
  }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (opts.rows.length === 0) return 0;

  function parseDate(v: string | null | undefined): Date | null {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  function dec(v: number | null | undefined): string | null {
    return v == null ? null : v.toString();
  }

  // Map idNumber -> clientId for this workspace.
  const idNumbers = Array.from(new Set(opts.rows.map(r => r.idNumber)));
  const clientRows = await db
    .select({ id: clients.id, idNumber: clients.idNumber })
    .from(clients)
    .where(and(eq(clients.workspaceId, opts.workspaceId), inArray(clients.idNumber, idNumbers)));
  const idToClient = new Map(clientRows.map(c => [c.idNumber, c.id]));
  const clientIds = clientRows.map(c => c.id);
  if (clientIds.length === 0) return 0;

  // Clear existing policies for these clients, then insert fresh.
  await db
    .delete(policies)
    .where(and(eq(policies.workspaceId, opts.workspaceId), inArray(policies.clientId, clientIds)));

  const values = opts.rows
    .map(row => {
      const clientId = idToClient.get(row.idNumber);
      if (clientId == null) return null;
      return {
        workspaceId: opts.workspaceId,
        clientId,
        productType: row.productType ?? null,
        company: row.company ?? null,
        policyNumber: row.policyNumber ?? null,
        monthlyPremium: dec(row.monthlyPremium),
        annualPremium: dec(row.annualPremium),
        balance: dec(row.balance),
        startDate: parseDate(row.startDate),
        endDate: parseDate(row.endDate),
        status: row.status ?? "active",
        metadata: row.metadata ?? null,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  const BATCH = 500;
  let total = 0;
  for (let i = 0; i < values.length; i += BATCH) {
    const batch = values.slice(i, i + BATCH);
    await db.insert(policies).values(batch);
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
/**
 * Extended workspace metrics: returns the legacy 6-bucket fields PLUS the 16
 * trigger counts (P0–P4) consumed by PriorityActionGroups. Most fine-grained
 * triggers are heuristic placeholders (0) until the upstream classifier writes
 * dedicated `flagStatus` values — they are surfaced here so the frontend type
 * surface stays accurate and stable while the backfill rolls out.
 */
export async function getWorkspaceMetrics(opts: {
  workspaceId: number;
  userId: number;
  workspaceRole: "owner" | "admin" | "agent";
}) {
  const db = await getDb();
  const empty = {
    // Legacy fields (kept for backwards compatibility)
    totalClients: 0,
    vipClients: 0,
    liquidFunds: 0,
    tikun190Candidates: 0,
    highFees: 0,
    riskEnding: 0,
    coverageGaps: 0,
    totalAum: 0,
    // 16 priority trigger counts (P0–P4)
    poaExpired: 0,
    poaExpiring90d: 0,
    riskTemporary: 0,
    coverageEnding: 0,
    savingsNoInsurance: 0,
    noActivePension: 0,
    age46NoLongTermCare: 0,
    aumFrozen: 0,
    trackMismatch: 0,
    selfEmployedNoDeposit: 0,
    concentrationRisk: 0,
    birthdayMilestone: 0,
    birthdayThisMonth: 0,
    vipGoldPremium: 0,
    noEmail: 0,
    distinctClientsWithAnyTrigger: 0,
  };
  if (!db) return empty;

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

  // ----- 16 priority triggers ---------------------------------------------
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const in90Days = new Date(today);
  in90Days.setDate(in90Days.getDate() + 90);

  // P4 · Soft signals derivable directly from the client row
  const noEmail = rows.filter(r => !r.email || r.email.trim() === "").length;
  const vipGoldPremium = vipClients;

  let birthdayMilestone = 0;
  let birthdayThisMonth = 0;
  let age46NoLongTermCare = 0;

  for (const r of rows) {
    if (!r.birthDate) continue;
    const dob = new Date(r.birthDate);
    if (Number.isNaN(dob.getTime())) continue;
    const age = now.getFullYear() - dob.getFullYear() -
      (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
    const milestoneAges = new Set([18, 30, 40, 50, 60, 67, 70, 80]);
    // Milestone birthday upcoming this month or already this month
    if (milestoneAges.has(age + 1) && dob.getMonth() === now.getMonth()) {
      birthdayMilestone++;
    }
    if (dob.getMonth() === now.getMonth()) {
      birthdayThisMonth++;
    }
    if (age >= 46 && age < 60) {
      // Heuristic: age band where long-term care is most relevant; refined later
      // when policies join is wired in.
      age46NoLongTermCare++;
    }
  }

  // Pull policies once for derivations that require coverage info.
  const policyRows = await db
    .select()
    .from(policies)
    .where(eq(policies.workspaceId, opts.workspaceId));

  const policiesByClient = new Map<number, typeof policyRows>();
  for (const p of policyRows) {
    const arr = policiesByClient.get(p.clientId) ?? [];
    arr.push(p);
    policiesByClient.set(p.clientId, arr);
  }

  let riskTemporary = 0;
  let coverageEnding = 0;
  let savingsNoInsurance = 0;
  let noActivePension = 0;
  let aumFrozen = 0;
  let trackMismatch = 0;
  let selfEmployedNoDeposit = 0;
  let concentrationRisk = 0;

  for (const r of rows) {
    const ps = policiesByClient.get(r.id) ?? [];
    const active = ps.filter(p => p.status === "active");
    const hasPension = active.some(
      p => (p.productType ?? "").toLowerCase().includes("pension") ||
        (p.productType ?? "").includes("פנס")
    );
    const hasInsurance = active.some(
      p => (p.productType ?? "").toLowerCase().match(/risk|health|life|elementary/) ||
        (p.productType ?? "").match(/ריסק|בריאות|חיים|סיעוד/)
    );
    const hasSavings = active.some(
      p => (p.productType ?? "").toLowerCase().match(/saving|gemel|hishtalmut/) ||
        (p.productType ?? "").match(/חיסכון|גמל|השתלמות/)
    );

    if (!hasPension) noActivePension++;
    if (hasSavings && !hasInsurance) savingsNoInsurance++;

    // Risk policies expiring within 90 days
    const riskEndingSoon = active.some(p => {
      if (!p.endDate) return false;
      const t = (p.productType ?? "").toLowerCase();
      const isRisk = t.includes("risk") || (p.productType ?? "").includes("ריסק");
      if (!isRisk) return false;
      const end = new Date(p.endDate);
      return end >= today && end <= in90Days;
    });
    if (riskEndingSoon) riskTemporary++;

    // Any active policy with end date in the next 90 days (coverage ending)
    const anyEndingSoon = active.some(p => {
      if (!p.endDate) return false;
      const end = new Date(p.endDate);
      return end >= today && end <= in90Days;
    });
    if (anyEndingSoon) coverageEnding++;

    // AUM frozen: client has savings but no premium activity
    const noPremium = active.every(
      p => Number(p.monthlyPremium ?? 0) === 0 && Number(p.annualPremium ?? 0) === 0
    );
    if (active.length > 0 && noPremium && Number(r.totalBalance ?? 0) > 0) {
      aumFrozen++;
    }

    // Track mismatch heuristic: VIP without diversification (1 product type)
    const productTypes = new Set(active.map(p => p.productType ?? ""));
    if (r.isVip && productTypes.size === 1 && Number(r.totalBalance ?? 0) > 100_000) {
      trackMismatch++;
    }

    // Concentration risk: >70% of AUM in a single policy
    const totalBal = active.reduce((s, p) => s + Number(p.balance ?? 0), 0);
    if (totalBal > 0) {
      const maxBal = Math.max(...active.map(p => Number(p.balance ?? 0)));
      if (maxBal / totalBal > 0.7 && totalBal > 50_000) concentrationRisk++;
    }

    // Self-employed without deposit: pension exists but no monthly premium
    if (hasPension) {
      const pensionPolicies = active.filter(
        p => (p.productType ?? "").toLowerCase().includes("pension") ||
          (p.productType ?? "").includes("פנס")
      );
      const allPensionsZero = pensionPolicies.every(
        p => Number(p.monthlyPremium ?? 0) === 0
      );
      if (allPensionsZero) selfEmployedNoDeposit++;
    }
  }

  // P0 · Power of Attorney expiry — not yet modelled in schema.
  // Heuristic placeholder: derive from notes containing "ייפוי כוח".
  let poaExpired = 0;
  let poaExpiring90d = 0;
  for (const r of rows) {
    if (!r.notes) continue;
    const n = r.notes.toLowerCase();
    if (n.includes("ייפוי כוח פג") || n.includes("poa expired")) poaExpired++;
    else if (n.includes("ייפוי כוח") || n.includes("poa")) poaExpiring90d++;
  }

  // Distinct count of clients that have at least one trigger active —
  // honest "opportunities" headline number that does not double-count clients
  // appearing in multiple triggers.
  let distinctClientsWithAnyTrigger = 0;
  for (const r of rows) {
    const ps = policiesByClient.get(r.id) ?? [];
    const active = ps.filter(p => p.status === "active");
    const hasPension = active.some(
      p => (p.productType ?? "").toLowerCase().includes("pension") ||
        (p.productType ?? "").includes("פנס")
    );
    const hasInsurance = active.some(
      p => (p.productType ?? "").toLowerCase().match(/risk|health|life|elementary/) ||
        (p.productType ?? "").match(/ריסק|בריאות|חיים|סיעוד/)
    );
    const hasSavings = active.some(
      p => (p.productType ?? "").toLowerCase().match(/saving|gemel|hishtalmut/) ||
        (p.productType ?? "").match(/חיסכון|גמל|השתלמות/)
    );
    let age = -1;
    if (r.birthDate) {
      const dob = new Date(r.birthDate);
      if (!Number.isNaN(dob.getTime())) {
        age = now.getFullYear() - dob.getFullYear() -
          (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
      }
    }
    const hasAnyTrigger =
      r.flagStatus !== "none" ||
      r.isVip ||
      !r.email ||
      !hasPension ||
      (hasSavings && !hasInsurance) ||
      (age >= 46 && age < 60);
    if (hasAnyTrigger) distinctClientsWithAnyTrigger++;
  }

  return {
    // Legacy fields
    totalClients,
    vipClients,
    liquidFunds,
    tikun190Candidates,
    highFees,
    riskEnding,
    coverageGaps,
    totalAum,
    // 16 priority trigger counts
    poaExpired,
    poaExpiring90d,
    riskTemporary,
    coverageEnding,
    savingsNoInsurance,
    noActivePension,
    age46NoLongTermCare,
    aumFrozen,
    trackMismatch,
    selfEmployedNoDeposit,
    concentrationRisk,
    birthdayMilestone,
    birthdayThisMonth,
    vipGoldPremium,
    noEmail,
    // Honest distinct-clients KPI — number of clients with at least one active trigger.
    distinctClientsWithAnyTrigger,
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

/**
 * Counts clients in a workspace. Used by the plan-quota check before insert.
 */
export async function countClientsInWorkspace(workspaceId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ c: sql`count(*)` })
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId));
  return Number((rows[0] as any)?.c ?? 0);
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
      // Round 112: surface the workspace's payment status so super-admin can
      // see at-a-glance who actually paid vs who only opened an account but
      // never completed checkout (subscriptionStatus === 'pending_payment').
      workspaceSubscriptionStatus: workspaces.subscriptionStatus,
      workspacePlan: workspaces.plan,
      workspaceSuspendedAt: workspaces.suspendedAt,
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

// ============================================================
// LEADS — תצוגה מאוחדת לפאנל אדמין (ניסיונות תשלום פתוחים)
// ============================================================
/**
 * Returns abandoned/failed/pending checkout attempts joined with the
 * workspace + initiating user, so the admin "Leads" tab can show real
 * leads that almost completed payment but didn't.
 *
 * succeeded attempts are NOT returned — those are paying customers.
 */
export async function listOpenPaymentAttempts(opts?: {
  status?: "pending" | "abandoned" | "failed" | "all_open";
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const limit = opts?.limit ?? 200;
  const status = opts?.status ?? "all_open";
  const { inArray } = await import("drizzle-orm");

  const baseSelect = db
    .select({
      id: paymentAttempts.id,
      requestId: paymentAttempts.requestId,
      workspaceId: paymentAttempts.workspaceId,
      workspaceName: workspaces.name,
      initiatedByUserId: paymentAttempts.initiatedByUserId,
      initiatedByName: users.name,
      initiatedByEmail: users.email,
      plan: paymentAttempts.plan,
      billingPeriod: paymentAttempts.billingPeriod,
      amount: paymentAttempts.amount,
      status: paymentAttempts.status,
      customerSnapshot: paymentAttempts.customerSnapshot,
      paymentUrl: paymentAttempts.paymentUrl,
      errorMessage: paymentAttempts.errorMessage,
      abandonedNotifiedAt: paymentAttempts.abandonedNotifiedAt,
      createdAt: paymentAttempts.createdAt,
      updatedAt: paymentAttempts.updatedAt,
    })
    .from(paymentAttempts)
    .leftJoin(workspaces, eq(paymentAttempts.workspaceId, workspaces.id))
    .leftJoin(users, eq(paymentAttempts.initiatedByUserId, users.id));

  if (status === "all_open") {
    return baseSelect
      .where(inArray(paymentAttempts.status, ["pending", "abandoned", "failed"]))
      .orderBy(desc(paymentAttempts.createdAt))
      .limit(limit);
  }
  return baseSelect
    .where(eq(paymentAttempts.status, status))
    .orderBy(desc(paymentAttempts.createdAt))
    .limit(limit);
}

/**
 * Admin marks an open payment attempt as handled. The status enum doesn't
 * have a dedicated "archived" value, so we mark it as `abandoned` and set
 * abandonedNotifiedAt so the watchdog skips it and the admin UI can treat
 * it as triaged.
 */
export async function adminArchivePaymentAttempt(requestId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(paymentAttempts)
    .set({
      status: "abandoned",
      abandonedNotifiedAt: new Date(),
    })
    .where(eq(paymentAttempts.requestId, requestId));
}


// ============================================================
// MESSAGE GENERATIONS (Round 92 — WhatsApp Composer history)
// ============================================================
import {
  messageGenerations,
  triggerHandled,
  clientFlags,
  type InsertMessageGeneration,
  type InsertTriggerHandled,
  type InsertClientFlag,
} from "../drizzle/schema";

/** Persist a Claude composeVariants call. Returns the new row id. */
export async function createMessageGeneration(
  data: InsertMessageGeneration,
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.insert(messageGenerations).values(data);
  return Number((result as unknown as { insertId?: number }).insertId ?? 0);
}

/** Set selectedIndex on a generation row (after the agent picks one). */
export async function markMessageGenerationSelected(opts: {
  workspaceId: number;
  generationId: number;
  selectedIndex: number;
  /** When provided, persists the (possibly edited) variants over the originals. */
  variantsJson?: unknown[];
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const set: { selectedIndex: number; variantsJson?: unknown[] } = {
    selectedIndex: opts.selectedIndex,
  };
  if (opts.variantsJson !== undefined) set.variantsJson = opts.variantsJson;
  await db
    .update(messageGenerations)
    .set(set)
    .where(
      and(
        eq(messageGenerations.id, opts.generationId),
        eq(messageGenerations.workspaceId, opts.workspaceId),
      ),
    );
}

/** Last N generations for a specific client (per workspace). */
export async function listMessageGenerationsForClient(opts: {
  workspaceId: number;
  clientId: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(messageGenerations)
    .where(
      and(
        eq(messageGenerations.workspaceId, opts.workspaceId),
        eq(messageGenerations.clientId, opts.clientId),
      ),
    )
    .orderBy(desc(messageGenerations.createdAt))
    .limit(opts.limit ?? 20);
}

/** Recent generations across the workspace (history strip on dashboard). */
export async function listMessageGenerationsForWorkspace(opts: {
  workspaceId: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(messageGenerations)
    .where(eq(messageGenerations.workspaceId, opts.workspaceId))
    .orderBy(desc(messageGenerations.createdAt))
    .limit(opts.limit ?? 50);
}

// ============================================================
// TRIGGER HANDLED (Round 93 — Interactive Triggers Dashboard)
// ============================================================

/**
 * Mark a (client, trigger) pair as handled. Idempotent via UNIQUE +
 * ON DUPLICATE KEY UPDATE so re-marking just refreshes handledAt/note.
 */
export async function markTriggerHandled(
  data: InsertTriggerHandled,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(triggerHandled)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        handledByUserId: data.handledByUserId,
        handledAt: data.handledAt ?? new Date(),
        note: data.note ?? null,
      },
    });
}

/** Remove a handled mark. */
export async function unmarkTriggerHandled(opts: {
  workspaceId: number;
  clientId: number;
  triggerKey: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(triggerHandled)
    .where(
      and(
        eq(triggerHandled.workspaceId, opts.workspaceId),
        eq(triggerHandled.clientId, opts.clientId),
        eq(triggerHandled.triggerKey, opts.triggerKey),
      ),
    );
}

/** Count handled rows per triggerKey for a workspace. */
export async function countHandledByTrigger(opts: {
  workspaceId: number;
}): Promise<Record<string, number>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db
    .select({
      triggerKey: triggerHandled.triggerKey,
      n: sql<number>`count(*)`,
    })
    .from(triggerHandled)
    .where(eq(triggerHandled.workspaceId, opts.workspaceId))
    .groupBy(triggerHandled.triggerKey);
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.triggerKey] = Number(row.n);
  }
  return result;
}

/**
 * List the clients in a workspace that match a trigger key. Uses the
 * existing flagStatus column + isVip flag — no recomputation. Each client
 * gets a `handled` boolean (joined from triggerHandled).
 *
 * Recognized triggerKeys:
 *   vip, liquid_fund, tikun_190, high_fees, risk_ending, coverage_gaps, regular
 *
 * Sub-tenant filtering: agent users see only their own clients; admins
 * see the whole workspace (mirrors clients.list).
 */
export async function listClientsForTrigger(opts: {
  workspaceId: number;
  triggerKey: string;
  userId: number;
  workspaceRole: "owner" | "admin" | "agent" | null | undefined;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const limit = opts.limit ?? 500;
  const isAgent = opts.workspaceRole === "agent";

  const triggerFilter =
    opts.triggerKey === "vip"
      ? eq(clients.isVip, true)
      : eq(clients.flagStatus, opts.triggerKey);

  const whereClauses = [
    eq(clients.workspaceId, opts.workspaceId),
    triggerFilter,
    ...(isAgent ? [eq(clients.ownerUserId, opts.userId)] : []),
  ];

  const handledRows = await db
    .select({ clientId: triggerHandled.clientId })
    .from(triggerHandled)
    .where(
      and(
        eq(triggerHandled.workspaceId, opts.workspaceId),
        eq(triggerHandled.triggerKey, opts.triggerKey),
      ),
    );
  const handledSet = new Set(handledRows.map(r => r.clientId));

  const clientRows = await db
    .select()
    .from(clients)
    .where(and(...whereClauses))
    .orderBy(desc(clients.totalBalance))
    .limit(limit);

  return clientRows.map(c => ({ ...c, handled: handledSet.has(c.id) }));
}

// ============================================================
// CLIENT FLAGS (Round 128 — Multi-flag per client)
// ------------------------------------------------------------
// `getWorkspaceMetrics` historically computed the 16 trigger counts in
// memory by re-deriving each rule from clients + policies + birthDate +
// notes. The dashboard cards therefore showed correct numbers, but
// `listClientsForTrigger` filtered by the legacy `flagStatus` column
// (which can hold only ONE value per client and only knows 6 legacy
// triggers). The result: counts > 0 but the modal list was empty.
//
// The new model:
//   • `client_flags` is a join table — one row per (client, triggerKey).
//   • `computeWorkspaceFlags` runs the SAME 16 rules and writes one row
//     per matching trigger per client. Counts and lists now share the
//     same source of truth.
//   • Called from the upload pipeline (reports.save) and from a manual
//     "recompute" procedure so existing data can be backfilled without
//     re-uploading.
// ============================================================

/**
 * Compute the full 16-trigger set for every client in the workspace and
 * persist them to `client_flags`. Replaces all existing flags for the
 * workspace (full refresh — cheaper and safer than diff-then-merge).
 *
 * Returns: per-trigger insert counts, plus distinctClients with any flag.
 */
export async function computeWorkspaceFlags(opts: {
  workspaceId: number;
}): Promise<{
  totalFlagsWritten: number;
  byTrigger: Record<string, number>;
  distinctClients: number;
}> {
  const db = await getDb();
  if (!db) {
    return { totalFlagsWritten: 0, byTrigger: {}, distinctClients: 0 };
  }

  const allClients = await db
    .select()
    .from(clients)
    .where(eq(clients.workspaceId, opts.workspaceId));

  const policyRows = await db
    .select()
    .from(policies)
    .where(eq(policies.workspaceId, opts.workspaceId));

  const policiesByClient = new Map<number, typeof policyRows>();
  for (const p of policyRows) {
    const arr = policiesByClient.get(p.clientId) ?? [];
    arr.push(p);
    policiesByClient.set(p.clientId, arr);
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const in90Days = new Date(today);
  in90Days.setDate(in90Days.getDate() + 90);

  const milestoneAges = new Set([18, 30, 40, 50, 60, 67, 70, 80]);
  const flaggedClients = new Set<number>();
  const rowsToInsert: InsertClientFlag[] = [];

  function addFlag(clientId: number, triggerKey: string) {
    rowsToInsert.push({
      workspaceId: opts.workspaceId,
      clientId,
      triggerKey,
    });
    flaggedClients.add(clientId);
  }

  // Sentinel productType emitted by the parser for investment-track rows
  // ("מסלול השקעה"). Used only by the track-mismatch trigger and excluded from
  // every other derivation. Must match INVESTMENT_TRACK_PRODUCT_TYPE in
  // client/src/lib/parseReport.ts.
  const INVESTMENT_TRACK = "מסלול השקעה";
  const metaOf = (p: { metadata?: unknown }): Record<string, unknown> =>
    (p.metadata && typeof p.metadata === "object" ? (p.metadata as Record<string, unknown>) : {});

  for (const r of allClients) {
    const allPs = policiesByClient.get(r.id) ?? [];
    const trackPs = allPs.filter(p => (p.productType ?? "") === INVESTMENT_TRACK);
    const ps = allPs.filter(p => (p.productType ?? "") !== INVESTMENT_TRACK);
    const active = ps.filter(p => p.status === "active");
    const hasPension = active.some(
      p => (p.productType ?? "").toLowerCase().includes("pension") ||
        (p.productType ?? "").includes("פנס")
    );
    const hasInsurance = active.some(
      p => (p.productType ?? "").toLowerCase().match(/risk|health|life|elementary/) ||
        (p.productType ?? "").match(/ריסק|בריאות|חיים|סיעוד/)
    );
    const hasSavings = active.some(
      p => (p.productType ?? "").toLowerCase().match(/saving|gemel|hishtalmut/) ||
        (p.productType ?? "").match(/חיסכון|גמל|השתלמות/)
    );

    // Age computation
    let age = -1;
    if (r.birthDate) {
      const dob = new Date(r.birthDate);
      if (!Number.isNaN(dob.getTime())) {
        age = now.getFullYear() - dob.getFullYear() -
          (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
      }
    }

    // VIP / soft signals
    if (r.isVip) addFlag(r.id, "vipGoldPremium");
    if (!r.email || r.email.trim() === "") addFlag(r.id, "noEmail");

    // Birthday triggers
    if (r.birthDate) {
      const dob = new Date(r.birthDate);
      if (!Number.isNaN(dob.getTime())) {
        if (dob.getMonth() === now.getMonth()) addFlag(r.id, "birthdayThisMonth");
        if (milestoneAges.has(age + 1) && dob.getMonth() === now.getMonth()) {
          addFlag(r.id, "birthdayMilestone");
        }
      }
    }
    if (age >= 46 && age < 60) addFlag(r.id, "age46NoLongTermCare");

    // Pension / insurance / savings rules
    if (!hasPension) addFlag(r.id, "noActivePension");
    if (hasSavings && !hasInsurance) addFlag(r.id, "savingsNoInsurance");

    // Temporary risk — primary signal is the Shorens product STATUS
    // "ריסק זמני" (carried in metadata.riskTemporary); fall back to a risk
    // product whose end date is within 90 days.
    const hasRiskZmani = active.some(p => metaOf(p).riskTemporary === true);
    const riskEndingSoon = active.some(p => {
      if (!p.endDate) return false;
      const t = (p.productType ?? "").toLowerCase();
      const isRisk = t.includes("risk") || (p.productType ?? "").includes("ריסק");
      if (!isRisk) return false;
      const end = new Date(p.endDate);
      return end >= today && end <= in90Days;
    });
    if (hasRiskZmani || riskEndingSoon) addFlag(r.id, "riskTemporary");

    // Any active policy ending soon
    const anyEndingSoon = active.some(p => {
      if (!p.endDate) return false;
      const end = new Date(p.endDate);
      return end >= today && end <= in90Days;
    });
    if (anyEndingSoon) addFlag(r.id, "coverageEnding");

    // AUM frozen
    const noPremium = active.every(
      p => Number(p.monthlyPremium ?? 0) === 0 && Number(p.annualPremium ?? 0) === 0
    );
    if (active.length > 0 && noPremium && Number(r.totalBalance ?? 0) > 0) {
      addFlag(r.id, "aumFrozen");
    }

    // Track mismatch — real signal from the investment-tracks sheet: an older
    // client (55+) holding an active equity-heavy track. Falls back to the
    // legacy heuristic (VIP with a single product type) when no track data.
    const productTypes = new Set(active.map(p => p.productType ?? ""));
    const inEquityTrackOld =
      age >= 55 &&
      trackPs.some(p => p.status === "active" && metaOf(p).equityTrack === true);
    const legacyTrackHeuristic =
      trackPs.length === 0 &&
      r.isVip && productTypes.size === 1 && Number(r.totalBalance ?? 0) > 100_000;
    if (inEquityTrackOld || legacyTrackHeuristic) {
      addFlag(r.id, "trackMismatch");
    }

    // Concentration risk
    const totalBal = active.reduce((s, p) => s + Number(p.balance ?? 0), 0);
    if (totalBal > 0) {
      const maxBal = Math.max(...active.map(p => Number(p.balance ?? 0)));
      if (maxBal / totalBal > 0.7 && totalBal > 50_000) {
        addFlag(r.id, "concentrationRisk");
      }
    }

    // Self-employed without deposit
    if (hasPension) {
      const pensionPolicies = active.filter(
        p => (p.productType ?? "").toLowerCase().includes("pension") ||
          (p.productType ?? "").includes("פנס")
      );
      const allPensionsZero = pensionPolicies.every(
        p => Number(p.monthlyPremium ?? 0) === 0
      );
      if (allPensionsZero) addFlag(r.id, "selfEmployedNoDeposit");
    }

    // Power of attorney — the real Shorens report has no POA expiry date, but it
    // does carry "מיופה כוח אחרון" (the authorized agent) per product. An active
    // product with NO POA holder = no active authorization = legal exposure (P0).
    // Falls back to the notes heuristic only when there is no policy data at all.
    let poaResolved = false;
    if (active.length > 0) {
      const anyPoaHolder = active.some(p => {
        const h = metaOf(p).poaHolder;
        return typeof h === "string" && h.trim().length > 0;
      });
      if (!anyPoaHolder) {
        addFlag(r.id, "poaExpired");
      }
      poaResolved = true;
    }
    if (!poaResolved && r.notes) {
      const n = r.notes.toLowerCase();
      if (n.includes("ייפוי כוח פג") || n.includes("poa expired")) {
        addFlag(r.id, "poaExpired");
      } else if (n.includes("ייפוי כוח") || n.includes("poa")) {
        addFlag(r.id, "poaExpiring90d");
      }
    }

    // High fees — data-driven from real management-fee rates on active policies.
    // Thresholds calibrated against real data (0.7% over-flagged ~93%): a fee is
    // "high" at >1% from accumulation (מצבירה) or >2% from deposits (מהפקדה).
    const highFeeByData = active.some(p => {
      const m = metaOf(p);
      const dmT = Number(m.dmTzvirah ?? 0);
      const dmH = Number(m.dmHafkada ?? 0);
      return dmT > 0.01 || dmH > 0.02;
    });
    if (highFeeByData || r.flagStatus === "high_fees") {
      addFlag(r.id, "highFees");
    }
  }

  // Replace all flags for this workspace atomically
  await db
    .delete(clientFlags)
    .where(eq(clientFlags.workspaceId, opts.workspaceId));

  if (rowsToInsert.length > 0) {
    const BATCH = 1000;
    for (let i = 0; i < rowsToInsert.length; i += BATCH) {
      const batch = rowsToInsert.slice(i, i + BATCH);
      // ON DUPLICATE KEY ignore (uniqueWorkspaceClientTrigger constraint).
      // Since we just deleted all flags for the workspace, duplicates within
      // a single batch should not occur — but guard anyway.
      await db
        .insert(clientFlags)
        .values(batch)
        .onDuplicateKeyUpdate({
          set: { triggerKey: sql`VALUES(\`triggerKey\`)` },
        });
    }
  }

  const byTrigger: Record<string, number> = {};
  for (const row of rowsToInsert) {
    byTrigger[row.triggerKey] = (byTrigger[row.triggerKey] ?? 0) + 1;
  }

  return {
    totalFlagsWritten: rowsToInsert.length,
    byTrigger,
    distinctClients: flaggedClients.size,
  };
}

/**
 * v2 of listClientsForTrigger that reads from the new clientFlags join table.
 * Falls back to the legacy `flagStatus` / `isVip` columns ONLY if the
 * workspace has zero flags persisted yet (i.e. an old upload that has not
 * been backfilled). This keeps the upgrade non-breaking.
 */
export async function listClientsForTriggerV2(opts: {
  workspaceId: number;
  triggerKey: string;
  userId: number;
  workspaceRole: "owner" | "admin" | "agent" | null | undefined;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const limit = opts.limit ?? 500;
  const isAgent = opts.workspaceRole === "agent";

  // Fast path: read from clientFlags
  const flagged = await db
    .select({ clientId: clientFlags.clientId })
    .from(clientFlags)
    .where(
      and(
        eq(clientFlags.workspaceId, opts.workspaceId),
        eq(clientFlags.triggerKey, opts.triggerKey),
      ),
    );

  const flaggedIds = flagged.map(r => r.clientId);

  if (flaggedIds.length > 0) {
    const whereClauses = [
      eq(clients.workspaceId, opts.workspaceId),
      inArray(clients.id, flaggedIds),
      ...(isAgent ? [eq(clients.ownerUserId, opts.userId)] : []),
    ];
    const handledRows = await db
      .select({ clientId: triggerHandled.clientId })
      .from(triggerHandled)
      .where(
        and(
          eq(triggerHandled.workspaceId, opts.workspaceId),
          eq(triggerHandled.triggerKey, opts.triggerKey),
        ),
      );
    const handledSet = new Set(handledRows.map(r => r.clientId));
    const clientRows = await db
      .select()
      .from(clients)
      .where(and(...whereClauses))
      .orderBy(desc(clients.totalBalance))
      .limit(limit);
    return clientRows.map(c => ({ ...c, handled: handledSet.has(c.id) }));
  }

  // Fallback: legacy filter when no flags have been computed yet
  return listClientsForTrigger(opts);
}

/** Helper for tests / admin tools */
export async function countClientFlags(opts: {
  workspaceId: number;
}): Promise<Record<string, number>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db
    .select({
      triggerKey: clientFlags.triggerKey,
      n: sql<number>`count(*)`,
    })
    .from(clientFlags)
    .where(eq(clientFlags.workspaceId, opts.workspaceId))
    .groupBy(clientFlags.triggerKey);
  const out: Record<string, number> = {};
  for (const row of rows) out[row.triggerKey] = Number(row.n);
  return out;
}


// ============================================================
// ROUND 131 — CLIENT JOURNEY HELPERS
// Activities (call/whatsapp/email/meeting/note logs), reminders
// (snoozes), and the unified client-detail aggregate. All helpers
// take the same workspaceId + userId + workspaceRole tuple so an
// agent can never see another agent's data, and no row from any
// other workspace can ever leak in or out.
// ============================================================

type WorkspaceRole = "owner" | "admin" | "agent";

/**
 * Internal: assert the (clientId, workspaceId) pair is visible to the caller.
 * Throws if the agent does not own the client or the client is in a different workspace.
 * Returns the resolved client row so callers can reuse it without a second query.
 */
async function assertClientVisible(opts: {
  clientId: number;
  workspaceId: number;
  userId: number;
  workspaceRole: WorkspaceRole;
}) {
  const row = await getClientById({
    clientId: opts.clientId,
    workspaceId: opts.workspaceId,
    userId: opts.userId,
    workspaceRole: opts.workspaceRole,
  });
  if (!row) {
    throw new Error("Client not visible to caller (workspace or owner mismatch).");
  }
  return row;
}

/**
 * Insert a new activity row (call / whatsapp / email / meeting / note / sms).
 * The workspaceId on the row is derived from the visibility check, so a caller
 * cannot smuggle a foreign workspaceId.
 */
export async function insertClientActivity(opts: {
  clientId: number;
  workspaceId: number;
  userId: number;
  workspaceRole: WorkspaceRole;
  type: "call" | "whatsapp" | "email" | "meeting" | "note" | "sms";
  outcome?: string | null;
  content?: string | null;
  triggerKey?: string | null;
  scheduledFor?: Date | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await assertClientVisible({
    clientId: opts.clientId,
    workspaceId: opts.workspaceId,
    userId: opts.userId,
    workspaceRole: opts.workspaceRole,
  });

  const insertable: InsertClientActivity = {
    workspaceId: opts.workspaceId,
    clientId: opts.clientId,
    type: opts.type,
    outcome: opts.outcome ?? null,
    content: opts.content ?? null,
    triggerKey: opts.triggerKey ?? null,
    scheduledFor: opts.scheduledFor ?? null,
    createdBy: opts.userId,
  };
  const result = await db.insert(clientActivities).values(insertable);
  const insertId =
    (result as unknown as { insertId?: number }).insertId ??
    (result as unknown as Array<{ insertId?: number }>)[0]?.insertId;
  if (typeof insertId !== "number" || !Number.isFinite(insertId) || insertId <= 0) {
    throw new Error(
      `Failed to read insertId from insertClientActivity result. Raw: ${JSON.stringify(result)}`,
    );
  }
  return insertId;
}

/**
 * List activities for a single client (newest first), strictly scoped.
 */
export async function listActivitiesForClient(opts: {
  clientId: number;
  workspaceId: number;
  userId: number;
  workspaceRole: WorkspaceRole;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  await assertClientVisible({
    clientId: opts.clientId,
    workspaceId: opts.workspaceId,
    userId: opts.userId,
    workspaceRole: opts.workspaceRole,
  });

  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  return db
    .select()
    .from(clientActivities)
    .where(
      and(
        eq(clientActivities.workspaceId, opts.workspaceId),
        eq(clientActivities.clientId, opts.clientId),
      ),
    )
    .orderBy(desc(clientActivities.createdAt))
    .limit(limit);
}

/**
 * Create a snooze / follow-up reminder for a client.
 */
export async function createClientReminder(opts: {
  clientId: number;
  workspaceId: number;
  userId: number;
  workspaceRole: WorkspaceRole;
  remindAt: Date;
  triggerKey?: string | null;
  note?: string | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await assertClientVisible({
    clientId: opts.clientId,
    workspaceId: opts.workspaceId,
    userId: opts.userId,
    workspaceRole: opts.workspaceRole,
  });

  const insertable: InsertClientReminder = {
    workspaceId: opts.workspaceId,
    clientId: opts.clientId,
    triggerKey: opts.triggerKey ?? null,
    note: opts.note ?? null,
    remindAt: opts.remindAt,
    status: "pending",
    createdBy: opts.userId,
  };
  const result = await db.insert(clientReminders).values(insertable);
  const insertId =
    (result as unknown as { insertId?: number }).insertId ??
    (result as unknown as Array<{ insertId?: number }>)[0]?.insertId;
  if (typeof insertId !== "number" || !Number.isFinite(insertId) || insertId <= 0) {
    throw new Error(
      `Failed to read insertId from createClientReminder result. Raw: ${JSON.stringify(result)}`,
    );
  }
  return insertId;
}

/**
 * List due/pending reminders for the caller's workspace, oldest first.
 * Agents only see reminders for clients they own; admins/owners see all.
 */
export async function listDueReminders(opts: {
  workspaceId: number;
  userId: number;
  workspaceRole: WorkspaceRole;
  onlyPending?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];

  const onlyPending = opts.onlyPending ?? true;

  // For agents we restrict to clients they own by joining clients.
  const baseJoin = db
    .select({
      reminder: clientReminders,
      clientName: clients.fullName,
      clientPhone: clients.phone,
      clientEmail: clients.email,
      clientOwnerUserId: clients.ownerUserId,
    })
    .from(clientReminders)
    .innerJoin(clients, eq(clientReminders.clientId, clients.id));

  const whereCond = opts.workspaceRole === "agent"
    ? and(
        eq(clientReminders.workspaceId, opts.workspaceId),
        eq(clients.ownerUserId, opts.userId),
        ...(onlyPending ? [eq(clientReminders.status, "pending")] : []),
      )
    : and(
        eq(clientReminders.workspaceId, opts.workspaceId),
        ...(onlyPending ? [eq(clientReminders.status, "pending")] : []),
      );

  return baseJoin
    .where(whereCond)
    .orderBy(clientReminders.remindAt)
    .limit(200);
}

/**
 * Mark a reminder as dismissed (or any status). Idempotent.
 */
export async function updateReminderStatus(opts: {
  reminderId: number;
  workspaceId: number;
  userId: number;
  workspaceRole: WorkspaceRole;
  status: "pending" | "fired" | "dismissed" | "cancelled";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Make sure the reminder belongs to this workspace.
  const existing = await db
    .select()
    .from(clientReminders)
    .where(
      and(
        eq(clientReminders.id, opts.reminderId),
        eq(clientReminders.workspaceId, opts.workspaceId),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    throw new Error("Reminder not found in this workspace.");
  }

  // Agents may only update reminders they themselves created.
  if (opts.workspaceRole === "agent" && existing[0].createdBy !== opts.userId) {
    throw new Error("Agents can only modify reminders they created.");
  }

  await db
    .update(clientReminders)
    .set({ status: opts.status })
    .where(eq(clientReminders.id, opts.reminderId));
  return { ok: true } as const;
}

/**
 * Aggregate client detail: profile + matching trigger keys + recent activities + open reminders.
 * The single call the ClientDetail UI panel will make.
 */
export async function getClientDetail(opts: {
  clientId: number;
  workspaceId: number;
  userId: number;
  workspaceRole: WorkspaceRole;
}) {
  const db = await getDb();
  if (!db) return null;

  const client = await getClientById({
    clientId: opts.clientId,
    workspaceId: opts.workspaceId,
    userId: opts.userId,
    workspaceRole: opts.workspaceRole,
  });
  if (!client) return null;

  // Note: clientFlags / clientActivities / clientReminders are imported elsewhere
  // in this file; we re-import here as a defensive measure for the symbol scope.
  const flagsRows = await db
    .select()
    .from(clientFlagsTable())
    .where(
      and(
        eq(clientFlagsTable().workspaceId, opts.workspaceId),
        eq(clientFlagsTable().clientId, opts.clientId),
      ),
    );

  const activities = await listActivitiesForClient({
    clientId: opts.clientId,
    workspaceId: opts.workspaceId,
    userId: opts.userId,
    workspaceRole: opts.workspaceRole,
    limit: 50,
  });

  const reminders = await db
    .select()
    .from(clientReminders)
    .where(
      and(
        eq(clientReminders.workspaceId, opts.workspaceId),
        eq(clientReminders.clientId, opts.clientId),
      ),
    )
    .orderBy(desc(clientReminders.createdAt))
    .limit(50);

  return {
    client,
    triggers: flagsRows.map(f => f.triggerKey),
    activities,
    reminders,
  };
}

// Helper to access the clientFlags table without re-declaring.
// `clientFlags` is exported from drizzle/schema and already imported via the
// computeWorkspaceFlags region; we expose a tiny accessor so getClientDetail
// can be appended without touching the import block.
import { clientFlags as _clientFlagsTableImport } from "../drizzle/schema";
function clientFlagsTable() {
  return _clientFlagsTableImport;
}

/**
 * Reassign a client to another agent. Workspace admins/owners only.
 * The new owner must belong to the same workspace.
 */
export async function reassignClient(opts: {
  clientId: number;
  workspaceId: number;
  callerUserId: number;
  callerRole: WorkspaceRole;
  newOwnerUserId: number;
}) {
  if (opts.callerRole !== "owner" && opts.callerRole !== "admin") {
    throw new Error("Only workspace owners/admins can reassign clients.");
  }
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify the new owner belongs to this workspace.
  const newOwner = await db
    .select()
    .from(users)
    .where(and(eq(users.id, opts.newOwnerUserId), eq(users.workspaceId, opts.workspaceId)))
    .limit(1);
  if (newOwner.length === 0) {
    throw new Error("Target user does not belong to this workspace.");
  }

  // Verify the client lives in this workspace.
  const existing = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, opts.clientId), eq(clients.workspaceId, opts.workspaceId)))
    .limit(1);
  if (existing.length === 0) {
    throw new Error("Client not found in this workspace.");
  }

  await db
    .update(clients)
    .set({ ownerUserId: opts.newOwnerUserId })
    .where(eq(clients.id, opts.clientId));
  return { ok: true } as const;
}

// ============================================================
// MESSAGE TEMPLATES (Round 135)
// Workspace-shared. Anyone in the workspace can list/create; update & delete
// are restricted to the template creator or a workspace admin/owner.
// ============================================================
export async function listMessageTemplates(opts: {
  workspaceId: number;
  channel?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  const cond = opts.channel
    ? and(eq(messageTemplates.workspaceId, opts.workspaceId), eq(messageTemplates.channel, opts.channel))
    : eq(messageTemplates.workspaceId, opts.workspaceId);
  return db
    .select()
    .from(messageTemplates)
    .where(cond)
    .orderBy(desc(messageTemplates.updatedAt));
}

export async function createMessageTemplate(opts: {
  workspaceId: number;
  createdBy: number;
  name: string;
  channel: string;
  subject?: string | null;
  body: string;
  triggerKey?: string | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const res = await db.insert(messageTemplates).values({
    workspaceId: opts.workspaceId,
    createdBy: opts.createdBy,
    name: opts.name,
    channel: opts.channel,
    subject: opts.subject ?? null,
    body: opts.body,
    triggerKey: opts.triggerKey ?? null,
  });
  return Number((res as unknown as { insertId: number }).insertId ?? 0);
}

/** Returns true if the requester may modify/delete the template. */
async function assertTemplateWritable(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  opts: { id: number; workspaceId: number; requesterId: number; requesterRole: WorkspaceRole },
): Promise<void> {
  const rows = await db
    .select({ createdBy: messageTemplates.createdBy })
    .from(messageTemplates)
    .where(and(eq(messageTemplates.id, opts.id), eq(messageTemplates.workspaceId, opts.workspaceId)));
  const tpl = rows[0];
  if (!tpl) throw new Error("Template not found");
  const isAdmin = opts.requesterRole === "admin" || opts.requesterRole === "owner";
  if (!isAdmin && tpl.createdBy !== opts.requesterId) {
    throw new Error("Not allowed to modify this template");
  }
}

export async function updateMessageTemplate(opts: {
  id: number;
  workspaceId: number;
  requesterId: number;
  requesterRole: WorkspaceRole;
  name?: string;
  subject?: string | null;
  body?: string;
  triggerKey?: string | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await assertTemplateWritable(db, opts);
  const set: Partial<{ name: string; subject: string | null; body: string; triggerKey: string | null }> = {};
  if (opts.name !== undefined) set.name = opts.name;
  if (opts.subject !== undefined) set.subject = opts.subject;
  if (opts.body !== undefined) set.body = opts.body;
  if (opts.triggerKey !== undefined) set.triggerKey = opts.triggerKey;
  if (Object.keys(set).length === 0) return;
  await db
    .update(messageTemplates)
    .set(set)
    .where(and(eq(messageTemplates.id, opts.id), eq(messageTemplates.workspaceId, opts.workspaceId)));
}

export async function deleteMessageTemplate(opts: {
  id: number;
  workspaceId: number;
  requesterId: number;
  requesterRole: WorkspaceRole;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await assertTemplateWritable(db, opts);
  await db
    .delete(messageTemplates)
    .where(and(eq(messageTemplates.id, opts.id), eq(messageTemplates.workspaceId, opts.workspaceId)));
}

// ============================================================
// ANALYTICS (Round 136) — honest aggregates from data already collected:
// the activity journal, reminders. Trigger totals/handled come from the
// existing metrics + countHandledByTrigger helpers on the caller side.
// ============================================================
export async function getAnalyticsOverview(opts: {
  workspaceId: number;
  userId: number;
  workspaceRole: WorkspaceRole;
  sinceDays: number;
}) {
  const db = await getDb();
  if (!db) {
    return {
      activities: { total: 0, byType: {} as Record<string, number> },
      reminders: { pending: 0, fired: 0, dismissed: 0 },
      rangeDays: opts.sinceDays,
    };
  }
  const since = new Date(Date.now() - opts.sinceDays * 24 * 60 * 60 * 1000);
  const isAgent = opts.workspaceRole === "agent";

  const actRows = await db
    .select({ type: clientActivities.type, count: sql<number>`count(*)` })
    .from(clientActivities)
    .innerJoin(clients, eq(clientActivities.clientId, clients.id))
    .where(
      isAgent
        ? and(
            eq(clientActivities.workspaceId, opts.workspaceId),
            eq(clients.ownerUserId, opts.userId),
            sql`${clientActivities.createdAt} >= ${since}`,
          )
        : and(
            eq(clientActivities.workspaceId, opts.workspaceId),
            sql`${clientActivities.createdAt} >= ${since}`,
          ),
    )
    .groupBy(clientActivities.type);

  const byType: Record<string, number> = {};
  let total = 0;
  for (const r of actRows) {
    const n = Number(r.count) || 0;
    byType[r.type] = n;
    total += n;
  }

  const remRows = await db
    .select({ status: clientReminders.status, count: sql<number>`count(*)` })
    .from(clientReminders)
    .innerJoin(clients, eq(clientReminders.clientId, clients.id))
    .where(
      isAgent
        ? and(eq(clientReminders.workspaceId, opts.workspaceId), eq(clients.ownerUserId, opts.userId))
        : eq(clientReminders.workspaceId, opts.workspaceId),
    )
    .groupBy(clientReminders.status);

  const reminders = { pending: 0, fired: 0, dismissed: 0 };
  for (const r of remRows) {
    const n = Number(r.count) || 0;
    if (r.status === "pending") reminders.pending = n;
    else if (r.status === "fired") reminders.fired = n;
    else if (r.status === "dismissed") reminders.dismissed = n;
  }

  return { activities: { total, byType }, reminders, rangeDays: opts.sinceDays };
}

// ============================================================
// FOLLOW-UP SEQUENCES (Round 137)
// Enrolling clients in a sequence schedules one reminder per step (offset in
// days) so the cadence surfaces in "My Tasks Today". No background worker —
// the agent is prompted at the right day and acts (consistent with the app's
// agent-initiated sending model). Role-isolated via getClientsByIds.
// ============================================================
export async function enrollSequence(opts: {
  workspaceId: number;
  userId: number;
  workspaceRole: WorkspaceRole;
  clientIds: number[];
  steps: Array<{ offsetDays: number; channel: string; note: string }>;
}): Promise<{ enrolledClients: number; remindersCreated: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (opts.clientIds.length === 0 || opts.steps.length === 0) {
    return { enrolledClients: 0, remindersCreated: 0 };
  }

  // Role-isolated resolution: agents only enroll their own clients.
  const visible = await getClientsByIds({
    workspaceId: opts.workspaceId,
    userId: opts.userId,
    workspaceRole: opts.workspaceRole,
    ids: opts.clientIds,
  });
  if (visible.length === 0) return { enrolledClients: 0, remindersCreated: 0 };

  const now = Date.now();
  const rows: InsertClientReminder[] = [];
  for (const c of visible) {
    for (const step of opts.steps) {
      rows.push({
        workspaceId: opts.workspaceId,
        clientId: c.id,
        triggerKey: `sequence:${step.channel}`,
        note: step.note,
        remindAt: new Date(now + step.offsetDays * 24 * 60 * 60 * 1000),
        status: "pending",
        createdBy: opts.userId,
      });
    }
  }

  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.insert(clientReminders).values(rows.slice(i, i + BATCH));
  }
  return { enrolledClients: visible.length, remindersCreated: rows.length };
}
