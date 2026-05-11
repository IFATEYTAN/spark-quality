import {
  bigint,
  boolean,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * SPARK AI - Multi-Tenant SaaS Schema
 * 
 * Architecture:
 * - workspaces: Each agency or solo agent gets a workspace (tenant)
 * - users: Belong to one workspace, with role inside it (admin/agent)
 * - clients: Insurance clients, scoped to workspace + assigned to specific agent
 * - policies: Multiple policies per client (one-to-many)
 * - reports: Uploaded Excel reports (Shorens, etc.)
 * - actionItems: Auto-generated tasks (retention, expired discount, etc.)
 * - invitations: Pending invites for new users to join a workspace
 * 
 * Data Isolation Rule (CRITICAL):
 * Every business query MUST filter by workspaceId. Agents see only their
 * own clients (where ownerUserId = ctx.user.id), Admins see all clients
 * within their workspace.
 */

// ============================================================
// WORKSPACES (Tenants) - בית סוכן או סוכן עצמאי
// ============================================================
export const workspaces = mysqlTable("workspaces", {
  id: int("id").autoincrement().primaryKey(),
  /** Display name, e.g. "קסם" או "ביטוח דניאל" */
  name: varchar("name", { length: 200 }).notNull(),
  /** Legal identifier on tax invoices: 9-digit Israeli company number (ח.פ) or 9-digit Israeli ID (ת״ז) for sole proprietors. Validated with the Israeli check-digit algorithm before insert. Required for issuing tax-compliant invoices via iCount. */
  taxId: varchar("taxId", { length: 20 }),
  /** "company" (ח.פ / עוסק מורשה) or "individual" (ת״ז – עוסק פטור / עצמאי) — drives the invoice header and VAT logic. */
  taxIdType: mysqlEnum("taxIdType", ["company", "individual"]),
  /** Primary contact phone in E.164-friendly format ("+972…" or "05…"). Used for billing alerts, account-recovery SMS in the future, and operational outreach by the SPARK team. */
  contactPhone: varchar("contactPhone", { length: 32 }),
  /** Subscription plan: basic | pro | premium | enterprise. Trial removed in Round 33 — every workspace is paid from day one. "trial" kept in enum only for legacy rows that will be migrated to "basic" by db:push. */
  plan: mysqlEnum("plan", ["trial", "basic", "pro", "premium", "enterprise"]).default("basic").notNull(),
  /** Billing period of the active subscription. "yearly" gets a discount (charged once a year up-front). "monthly" is full price every month. */
  billingPeriod: mysqlEnum("billingPeriod", ["monthly", "yearly"]).default("yearly").notNull(),
  /** Payment method on file. "standing_order" (הוראת קבע) is the default; "installments" is intentionally NOT supported. "manual" is used for invoiced/iCount clients. */
  paymentMethod: mysqlEnum("paymentMethod", ["standing_order", "manual"]).default("manual").notNull(),
  /**
   * Operational subscription status, independent of `plan`:
   *  - active        — paid, full access
   *  - past_due      — last charge failed, inside the 3-day grace window (still has access, sees banner)
   *  - suspended     — grace expired, full block screen + suspension email sent
   *  - cancelled     — cancelled by user / admin (no access)
   * Default "active" so existing tenants keep working until billing logic kicks in.
   */
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["pending_payment", "active", "past_due", "suspended", "cancelled"]).default("pending_payment").notNull(),
  /** Timestamp of the last successful charge (any period). NULL until first invoice. */
  lastPaymentAt: timestamp("lastPaymentAt"),
  /** When the next charge is due (renewal). Used to schedule the dunning job. */
  nextChargeAt: timestamp("nextChargeAt"),
  /** When the current billing cycle started failing. NULL when status is `active`. Drives the 3-day grace window. */
  pastDueSince: timestamp("pastDueSince"),
  /** When the suspension email was sent (so we don’t spam). NULL until suspension fires. */
  suspensionEmailSentAt: timestamp("suspensionEmailSentAt"),
  /** VIP threshold in ILS - clients with total balance above this are auto-flagged as VIP. Default 1,000,000. */
  vipThreshold: decimal("vipThreshold", { precision: 14, scale: 2 }).default("1000000.00").notNull(),
  /** Trial ends at this date (null after upgrade) */
  trialEndsAt: timestamp("trialEndsAt"),
  /** Active subscription end date (null if no active sub) */
  subscriptionEndsAt: timestamp("subscriptionEndsAt"),
  /** Soft delete */
  isActive: boolean("isActive").default(true).notNull(),
  /** When set, the workspace is suspended (super-admin action). */
  suspendedAt: timestamp("suspendedAt"),
  /** Free-form note from super-admin (e.g. reason for suspension). */
  adminNote: text("adminNote"),
  /** iCount client (לקוח) ID — set on first standing-order signup. */
  iCountClientId: varchar("iCountClientId", { length: 64 }),
  /** iCount standing-order (הוראת קבע) ID returned by iCount after card capture. Used to cancel/update via API. */
  iCountSubscriptionId: varchar("iCountSubscriptionId", { length: 64 }),
  /** Last iCount document (chashbonit) ID issued for this workspace. */
  iCountLastInvoiceId: varchar("iCountLastInvoiceId", { length: 64 }),
  quotaWarningSentAt: timestamp("quotaWarningSentAt"),
  /**
   * Round 114 — מזהה את היוזר שיצר את ה-workspace (זה שעתיד לקבל תפקיד "owner"
   * מיד עם אישור התשלום ראשון). מוגדר כ-רכה ל֠-undefined ל-rows קיימים. לא FK ל-users.id
   * כי אם מסירים את המשתמש מ-DB תפקיד "owner" לא אמור לה֠תפגן.
   */
  createdByUserId: int("createdByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  // Round 113 — enforce one workspace per tax ID (ח.פ / ת.ז). שלוש סוכנויות
  // שנרשמו על אותה ה-037216298 נמחקו לפני המיגרציה. NULL נשמר מותר על-ידי MySQL גם עם UNIQUE.
  uniqueTaxId: unique("uq_workspaces_taxid").on(table.taxId),
}));
export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = typeof workspaces.$inferInsert;

// ============================================================
// USERS - סוכנים (כל משתמש שייך ל-workspace אחד)
// ============================================================
export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    /** Manus OAuth identifier (openId) returned from the OAuth callback */
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    /** Workspace this user belongs to. NULL only for users mid-onboarding */
    workspaceId: int("workspaceId").references(() => workspaces.id),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 32 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    /**
     * Global role (only used for system-level admins).
     * Most users will be "user" here; their *workspace* role is in workspaceRole.
     */
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    /** Cross-workspace super-admin (SPARK AI staff). Bypasses all workspace scoping. */
    isSuperAdmin: boolean("isSuperAdmin").default(false).notNull(),
    /** When set, user cannot login (set by super-admin). */
    suspendedAt: timestamp("suspendedAt"),
    /**
     * Role inside the workspace:
     * - owner: created the workspace, full control + billing
     * - admin: like the admin at the agency - sees all clients, manages team
     * - agent: regular agent, sees only their own clients
     */
    workspaceRole: mysqlEnum("workspaceRole", ["owner", "admin", "agent"]).default("agent").notNull(),
    /** Israeli broker license number. Required during onboarding for any workspace owner. Unique to prevent duplicates. */
    licenseNumber: varchar("licenseNumber", { length: 64 }),
    /** Storage key of the uploaded license proof (image/pdf). */
    licenseFileKey: varchar("licenseFileKey", { length: 255 }),
    /** Set after SPARK staff verifies the license. */
    licenseVerifiedAt: timestamp("licenseVerifiedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  table => ({
    workspaceIdx: index("users_workspace_idx").on(table.workspaceId),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================
// INVITATIONS - הזמנת סוכן חדש לבית הסוכן
// ============================================================
export const invitations = mysqlTable(
  "invitations",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").references(() => workspaces.id).notNull(),
    /** Email of the invited person */
    email: varchar("email", { length: 320 }).notNull(),
    /** Role they'll have when they accept */
    workspaceRole: mysqlEnum("workspaceRole", ["admin", "agent"]).default("agent").notNull(),
    /** Random token for the invite link */
    token: varchar("token", { length: 64 }).notNull().unique(),
    /** User who created the invite */
    invitedByUserId: int("invitedByUserId").references(() => users.id).notNull(),
    /** Status: pending | accepted | expired | revoked */
    status: mysqlEnum("status", ["pending", "accepted", "expired", "revoked"]).default("pending").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    acceptedAt: timestamp("acceptedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    workspaceIdx: index("invitations_workspace_idx").on(table.workspaceId),
    emailIdx: index("invitations_email_idx").on(table.email),
  })
);

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = typeof invitations.$inferInsert;

// ============================================================
// CLIENTS - לקוחות הקצה של הסוכנים
// ============================================================
export const clients = mysqlTable(
  "clients",
  {
    id: int("id").autoincrement().primaryKey(),
    /** Tenant scoping - critical for data isolation */
    workspaceId: int("workspaceId").references(() => workspaces.id).notNull(),
    /** The agent who owns this client (for sub-tenant filtering) */
    ownerUserId: int("ownerUserId").references(() => users.id).notNull(),
    /** Israeli ID number (תעודת זהות) - external unique identifier per tenant */
    idNumber: varchar("idNumber", { length: 32 }).notNull(),
    /** Full name (might be empty for some Shorens entries) */
    fullName: varchar("fullName", { length: 200 }),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 32 }),
    /** Date of birth */
    birthDate: timestamp("birthDate"),
    /** Notes free text */
    notes: text("notes"),
    /** VIP / strategic client flag */
    isVip: boolean("isVip").default(false).notNull(),
    /**
     * Auto-classified financial flag from parser. Examples:
     * - liquid_fund (השתלמות נזילה)
     * - tikun_190 (תיקון 190)
     * - high_fees (דמי ניהול גבוהים)
     * - regular
     */
    flagStatus: varchar("flagStatus", { length: 32 }).default("regular").notNull(),
    /** Total balance / AUM in ILS (denormalized cache from policies for fast dashboard queries) */
    totalBalance: decimal("totalBalance", { precision: 14, scale: 2 }).default("0").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    workspaceIdx: index("clients_workspace_idx").on(table.workspaceId),
    ownerIdx: index("clients_owner_idx").on(table.ownerUserId),
    idNumberIdx: index("clients_idnumber_idx").on(table.idNumber),
    /** A client (by ID number) is unique per workspace */
    uniqueIdPerWorkspace: unique("uq_client_id_per_workspace").on(table.workspaceId, table.idNumber),
  })
);

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ============================================================
// POLICIES - פוליסות (לכל לקוח יכולות להיות מספר פוליסות)
// ============================================================
export const policies = mysqlTable(
  "policies",
  {
    id: int("id").autoincrement().primaryKey(),
    /** Tenant scoping (denormalized for fast queries) */
    workspaceId: int("workspaceId").references(() => workspaces.id).notNull(),
    /** Foreign key to client */
    clientId: int("clientId").references(() => clients.id).notNull(),
    /** Policy/product type: pension, savings, risk, health, elementary, etc. */
    productType: varchar("productType", { length: 100 }),
    /** Insurance company: מגדל, הראל, מנורה, פניקס, כלל, etc. */
    company: varchar("company", { length: 100 }),
    /** Policy number / unique identifier from the insurance company */
    policyNumber: varchar("policyNumber", { length: 100 }),
    /** Annual premium in ILS */
    annualPremium: decimal("annualPremium", { precision: 12, scale: 2 }),
    /** Monthly premium in ILS */
    monthlyPremium: decimal("monthlyPremium", { precision: 12, scale: 2 }),
    /** Accumulated balance / AUM in ILS */
    balance: decimal("balance", { precision: 14, scale: 2 }),
    /** Policy start date */
    startDate: timestamp("startDate"),
    /** Policy end date (for risk policies, discount expiration, etc.) */
    endDate: timestamp("endDate"),
    /** Status: active | inactive | cancelled | expired */
    status: mysqlEnum("status", ["active", "inactive", "cancelled", "expired"]).default("active").notNull(),
    /** Free-form metadata from the source report */
    metadata: json("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    workspaceIdx: index("policies_workspace_idx").on(table.workspaceId),
    clientIdx: index("policies_client_idx").on(table.clientId),
  })
);

export type Policy = typeof policies.$inferSelect;
export type InsertPolicy = typeof policies.$inferInsert;

// ============================================================
// REPORTS - דוחות שהועלו (היסטוריה של כל ייבוא)
// ============================================================
export const reports = mysqlTable(
  "reports",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").references(() => workspaces.id).notNull(),
    /** User who uploaded the report */
    uploadedByUserId: int("uploadedByUserId").references(() => users.id).notNull(),
    /** Original filename */
    fileName: varchar("fileName", { length: 500 }).notNull(),
    /** S3 storage key */
    fileKey: varchar("fileKey", { length: 500 }).notNull(),
    /** File size in bytes */
    fileSize: bigint("fileSize", { mode: "number" }),
    /** Report source: shorens | manual | api */
    source: mysqlEnum("source", ["shorens", "manual", "api"]).default("shorens").notNull(),
    /** Processing status: pending | processing | done | failed */
    status: mysqlEnum("status", ["pending", "processing", "done", "failed"]).default("pending").notNull(),
    /** Summary metrics computed at parse time (JSON) */
    summary: json("summary"),
    /** LLM analysis output from surense-analyzer skill (Prompt 2). Stored once per report. */
    llmAnalysis: json("llmAnalysis"),
    /** Detected report type from Prompt 1 classification (surense | roeto | unknown) */
    reportType: varchar("reportType", { length: 32 }),
    /** Number of clients found */
    clientCount: int("clientCount"),
    /** Total AUM in this report */
    totalAum: decimal("totalAum", { precision: 16, scale: 2 }),
    /** Error message if status=failed */
    errorMessage: text("errorMessage"),
    uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
    processedAt: timestamp("processedAt"),
  },
  table => ({
    workspaceIdx: index("reports_workspace_idx").on(table.workspaceId),
    uploaderIdx: index("reports_uploader_idx").on(table.uploadedByUserId),
  })
);

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

// ============================================================
// ACTION ITEMS - משימות שימור ופעולה אוטומטיות
// ============================================================
export const actionItems = mysqlTable(
  "action_items",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").references(() => workspaces.id).notNull(),
    /** The client this action relates to */
    clientId: int("clientId").references(() => clients.id).notNull(),
    /** Assigned agent (usually the client's owner) */
    assignedToUserId: int("assignedToUserId").references(() => users.id),
    /**
     * Type of action:
     * - missing_email | missing_pension | missing_phone
     * - discount_expiring | risk_expiring | policy_renewal
     * - cross_sell_opportunity | retention_risk | birthday
     */
    type: varchar("type", { length: 50 }).notNull(),
    /** Priority: low | medium | high | urgent */
    priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
    /** Status: open | in_progress | done | dismissed */
    status: mysqlEnum("status", ["open", "in_progress", "done", "dismissed"]).default("open").notNull(),
    /** Action title (Hebrew) */
    title: varchar("title", { length: 300 }).notNull(),
    /** Detailed description */
    description: text("description"),
    /** Suggested due date (e.g. discount expires in 30 days) */
    dueDate: timestamp("dueDate"),
    /** When user marked as done */
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    workspaceIdx: index("actions_workspace_idx").on(table.workspaceId),
    clientIdx: index("actions_client_idx").on(table.clientId),
    assigneeIdx: index("actions_assignee_idx").on(table.assignedToUserId),
    statusIdx: index("actions_status_idx").on(table.status),
  })
);

export type ActionItem = typeof actionItems.$inferSelect;
export type InsertActionItem = typeof actionItems.$inferInsert;
// ============================================================
// CONTACT SUBMISSIONS - פניות מטופס צור קשר ב- Landing
// ============================================================
export const contactSubmissions = mysqlTable(
  "contact_submissions",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    message: text("message").notNull(),
    /** Where the submission came from (e.g. "SPARK Quality Demo · ContactModal") */
    source: varchar("source", { length: 120 }),
    /** new | read | replied | archived */
    status: mysqlEnum("status", ["new", "read", "replied", "archived"]).default("new").notNull(),
    /** Whether notifyOwner reported successful delivery */
    notified: boolean("notified").default(false).notNull(),
    /** Optional internal note added by an admin while triaging */
    adminNote: text("adminNote"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    statusIdx: index("contact_status_idx").on(table.status),
    createdIdx: index("contact_created_idx").on(table.createdAt),
  })
);
export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertContactSubmission = typeof contactSubmissions.$inferInsert;
// ============================================================
// AUDIT LOG - תיעוד פעולות super-admin / אדמין סוכנות
// ============================================================
export const auditLog = mysqlTable(
  "audit_log",
  {
    id: int("id").autoincrement().primaryKey(),
    /** User who performed the action (NULL for system events) */
    actorUserId: int("actorUserId").references(() => users.id),
    /** Workspace context (NULL for super-admin / cross-tenant actions) */
    workspaceId: int("workspaceId").references(() => workspaces.id),
    /** Short machine-readable action key (e.g. "workspace.suspend", "user.role.change") */
    action: varchar("action", { length: 100 }).notNull(),
    /** Affected entity type, e.g. "workspace" | "user" | "contact_submission" */
    entityType: varchar("entityType", { length: 50 }),
    entityId: int("entityId"),
    /** Optional human-readable detail in Hebrew */
    detail: text("detail"),
    /** Free-form metadata (before/after values, etc.) */
    metadata: json("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    actorIdx: index("audit_actor_idx").on(table.actorUserId),
    workspaceIdx: index("audit_workspace_idx").on(table.workspaceId),
    actionIdx: index("audit_action_idx").on(table.action),
    createdIdx: index("audit_created_idx").on(table.createdAt),
  })
);
export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;


// ============================================================
// PAYMENT ATTEMPTS - מעקב אחר בקשות תשלום שנשלחו ל-Make
// ============================================================
//
// כל קריאה ל-billing.startCheckoutViaMake יוצרת רשומה כאן עם status=pending.
// כשה-callback מ-Make מגיע ל-/api/billing/activate אנחנו מעדכנים ל-succeeded.
// Watchdog שרץ כל דקה מאתר רשומות pending מעל 15 דקות, מסמן abandoned
// ושולח מייל RTL לבעלת המערכת (anathemell@gmail.com) לטיפול ידני.
export const paymentAttempts = mysqlTable(
  "payment_attempts",
  {
    id: int("id").autoincrement().primaryKey(),
    /** מזהה ייחודי שגם נשלח ל-Make וגם חוזר ב-callback */
    requestId: varchar("requestId", { length: 64 }).notNull().unique(),
    workspaceId: int("workspaceId").references(() => workspaces.id).notNull(),
    /** מי שלחץ "בחר תוכנית" */
    initiatedByUserId: int("initiatedByUserId").references(() => users.id).notNull(),
    plan: mysqlEnum("plan", ["basic", "pro", "premium"]).notNull(),
    billingPeriod: mysqlEnum("billingPeriod", ["monthly", "yearly"]).notNull(),
    /** סכום כולל מע"מ בש"ח */
    amount: int("amount").notNull(),
    /** סטטוס המעקב */
    status: mysqlEnum("status", [
      "pending",
      "succeeded",
      "failed",
      "abandoned",
    ]).default("pending").notNull(),
    /** סנפשוט של פרטי הלקוח בזמן השליחה (טלפון/מייל/שם), כדי שה-watchdog יוכל לכתוב מייל אישי גם אם המשתמש שינה פרטים בינתיים */
    customerSnapshot: json("customerSnapshot"),
    /** ה-paymentUrl שהוחזר מ-Make (אם הוחזר) — שימושי לאיתור עגלות נטושות */
    paymentUrl: text("paymentUrl"),
    /** מזהה החשבונית מ-iCount (מגיע ב-callback) */
    invoiceId: varchar("invoiceId", { length: 100 }),
    /** מזהה הוראת הקבע מ-iCount (מגיע ב-callback) */
    subscriptionId: varchar("subscriptionId", { length: 100 }),
    /** תאריך שה-callback הגיע */
    callbackAt: timestamp("callbackAt"),
    /** תאריך שמייל נטישת-עגלה נשלח (כדי לא לשלוח פעמיים) */
    abandonedNotifiedAt: timestamp("abandonedNotifiedAt"),
    /** הודעת שגיאה אם status=failed */
    errorMessage: text("errorMessage"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    workspaceIdx: index("payment_attempts_workspace_idx").on(table.workspaceId),
    statusIdx: index("payment_attempts_status_idx").on(table.status),
    createdIdx: index("payment_attempts_created_idx").on(table.createdAt),
  }),
);
export type PaymentAttempt = typeof paymentAttempts.$inferSelect;
export type InsertPaymentAttempt = typeof paymentAttempts.$inferInsert;


// ============================================================
// MESSAGE GENERATIONS (Round 92 — WhatsApp Composer history)
// Each row = one Claude composeVariants call. variantsJson is an array
// of 3 strings (Hebrew WhatsApp messages). selectedIndex is set when the
// agent picks one of the variants in the modal. Optional clientId lets the
// per-client history view list past messages for that customer.
// ============================================================
export const messageGenerations = mysqlTable(
  "messageGenerations",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").references(() => workspaces.id).notNull(),
    /** Optional — null when composer is opened without a specific client (free-form preview) */
    clientId: int("clientId").references(() => clients.id),
    /** Trigger key (e.g. "vip", "risk_zmani", "tikun_190", or any free-form key) */
    triggerKey: varchar("triggerKey", { length: 64 }).notNull(),
    /** "warm" | "professional" | "urgent" — Hebrew labels stored as enum-like strings */
    tone: varchar("tone", { length: 32 }).notNull(),
    /** Optional free-form context the agent typed in the form */
    freeFormContext: text("freeFormContext"),
    /** JSON array of 3 strings */
    variantsJson: json("variantsJson").notNull(),
    /** 0 / 1 / 2 once the agent picks one; null if they bailed */
    selectedIndex: int("selectedIndex"),
    /** Snapshot of which user generated it */
    createdByUserId: int("createdByUserId").references(() => users.id).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    workspaceIdx: index("msggen_workspace_idx").on(table.workspaceId),
    clientIdx: index("msggen_client_idx").on(table.clientId),
    triggerIdx: index("msggen_trigger_idx").on(table.triggerKey),
    createdIdx: index("msggen_created_idx").on(table.createdAt),
  }),
);
export type MessageGeneration = typeof messageGenerations.$inferSelect;
export type InsertMessageGeneration = typeof messageGenerations.$inferInsert;

// ============================================================
// TRIGGER HANDLED (Round 93 — Interactive Triggers Dashboard)
// One row per (clientId, triggerKey) inside a workspace once the agent
// clicks "טפלתי". Used to compute progress bars (handled / total). Optional
// note lets the agent jot down what they did.
// ============================================================
export const triggerHandled = mysqlTable(
  "triggerHandled",
  {
    id: int("id").autoincrement().primaryKey(),
    workspaceId: int("workspaceId").references(() => workspaces.id).notNull(),
    clientId: int("clientId").references(() => clients.id).notNull(),
    triggerKey: varchar("triggerKey", { length: 64 }).notNull(),
    handledByUserId: int("handledByUserId").references(() => users.id).notNull(),
    handledAt: timestamp("handledAt").defaultNow().notNull(),
    note: text("note"),
  },
  table => ({
    workspaceIdx: index("trighandled_workspace_idx").on(table.workspaceId),
    clientIdx: index("trighandled_client_idx").on(table.clientId),
    triggerIdx: index("trighandled_trigger_idx").on(table.triggerKey),
    /** A given (client, trigger) pair can only be marked handled once per workspace */
    uniqueClientTriggerPerWorkspace: unique("uq_trighandled_client_trigger_per_ws").on(
      table.workspaceId,
      table.clientId,
      table.triggerKey,
    ),
  }),
);
export type TriggerHandled = typeof triggerHandled.$inferSelect;
export type InsertTriggerHandled = typeof triggerHandled.$inferInsert;
