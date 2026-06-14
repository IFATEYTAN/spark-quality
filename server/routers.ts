import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { sendEmail } from "./email";
import { systemRouter } from "./_core/systemRouter";
import { adminRouter } from "./adminRouter";
import { billingRouter } from "./billing";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { requireClientQuota, requireFeature } from "./featureGate";
import { isValidIsraeliTaxId, normalizeIsraeliMobile } from "@shared/ilValidators";
import { invokeLLM } from "./_core/llm";
import {
  buildAnalysisSystem,
  ANALYSIS_JSON_SCHEMA,
  COMPOSER_SYSTEM,
  buildComposerUserPrompt,
  BRIEFING_SYSTEM,
  buildBriefingUserPrompt,
  CLIENT_SUMMARY_SYSTEM,
  buildClientSummaryUserPrompt,
  QA_SYSTEM,
  buildQaUserPrompt,
  VARIANTS_3_SYSTEM,
  buildVariants3UserPrompt,
  EMAIL_VARIANTS_3_SYSTEM,
  buildEmailVariants3UserPrompt,
} from "./prompts";
import { buildRelevantClientsContext } from "./aiContextEnricher";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * workspaceProcedure: Ensures the current user belongs to a workspace.
 * After this middleware, ctx.user is guaranteed to have workspaceId.
 */
const workspaceProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user.workspaceId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "User has not joined a workspace yet. Complete onboarding first.",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user as typeof ctx.user & { workspaceId: number },
    },
  });
});

/**
 * workspaceAdminProcedure: Only admins/owners of a workspace can call this.
 */
const workspaceAdminProcedure = workspaceProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.workspaceRole !== "admin" && ctx.user.workspaceRole !== "owner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only workspace admins can perform this action.",
    });
  }
  return next({ ctx });
});

/**
 * workspaceActiveProcedure: Round 98 export-lock.
 * Gates a procedure to subscriptions in `active` or `past_due` (grace) state.
 * `pending_payment`, `suspended`, and `cancelled` are blocked with a clear Hebrew
 * message so the agent knows export is reserved for live subscribers.
 */
const workspaceActiveProcedure = workspaceProcedure.use(async ({ ctx, next }) => {
  const ws = await db.getWorkspaceById(ctx.user.workspaceId);
  if (!ws) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found." });
  }
  if (ws.subscriptionStatus !== "active" && ws.subscriptionStatus !== "past_due") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "ייצוא נתונים זמין רק למנוי פעיל. הפעילו מנוי לדשבורד / חשבונות וחיוב.",
    });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  // ========================================================
  // CONTACT (Public - landing page contact form)
  // ========================================================
  contact: router({
    /** Send a contact-request to the workspace owner (Manus-side notification) */
    send: publicProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(120),
          email: z.string().trim().email().max(200).optional().or(z.literal("")),
          phone: z.string().trim().min(7).max(40),
          contactMethod: z.string().trim().max(50).optional(),
          interest: z.string().trim().max(200).optional(),
          message: z.string().trim().max(2000).optional().or(z.literal("")),
          source: z.string().trim().max(80).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const phoneLine = `טלפון: ${input.phone}\n`;
        const emailLine = input.email ? `מייל: ${input.email}\n` : "";
        const methodLine = input.contactMethod ? `איך נוח לדבר: ${input.contactMethod}\n` : "";
        const interestLine = input.interest ? `מעניין אותם: ${input.interest}\n` : "";
        const sourceLine = input.source ? `מקור: ${input.source}\n` : "";
        const messageLine = input.message ? `\n---\n${input.message}` : "";
        
        const title = `✨ בקשת שיחת היכרות — ${input.name}`;
        const content = `מילוא טופס צור קשר בדמו של SPARK Quality:\n\nשם: ${input.name}\n${phoneLine}${emailLine}${methodLine}${interestLine}${sourceLine}${messageLine}`;
        const delivered = await notifyOwner({ title, content });

        // Real email to Anat via Resend (best-effort, do not block on failure).
        const html = `<div dir="rtl" style="font-family:Heebo,Arial,sans-serif;line-height:1.7;color:#1f2233">
          <h2 style="margin:0 0 12px 0;color:#1f2233">✨ בקשת שיחת היכרות — SPARK Quality</h2>
          <p><strong>שם:</strong> ${escapeHtml(input.name)}</p>
          <p><strong>טלפון:</strong> ${escapeHtml(input.phone)}</p>
          ${input.email ? `<p><strong>מייל:</strong> <a href="mailto:${encodeURIComponent(input.email)}">${escapeHtml(input.email)}</a></p>` : ""}
          ${input.contactMethod ? `<p><strong>איך נוח לדבר:</strong> ${escapeHtml(input.contactMethod)}</p>` : ""}
          ${input.interest ? `<p><strong>מעניין אותם:</strong> ${escapeHtml(input.interest)}</p>` : ""}
          ${input.source ? `<p><strong>מקור:</strong> ${escapeHtml(input.source)}</p>` : ""}
          ${input.message ? `<hr style="border:none;border-top:1px solid #c8a96a33;margin:16px 0"/><p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>` : ""}
          <p style="margin-top:24px;font-size:12px;color:#6b6f80">נשלח אוטומטית מ-SPARK Quality Demo</p>
        </div>`;
        const emailResult = await sendEmail({
          to: "anathemell@gmail.com",
          subject: title,
          html,
          replyTo: input.email || undefined,
        });
        if (!emailResult.ok) {
          console.warn("[contact.send] Resend failed:", emailResult.error);
        }

        try {
          await db.createContactSubmission({
            name: input.name,
            email: input.email || "no-email@provided.com",
            phone: input.phone,
            message: `${input.contactMethod ? `[${input.contactMethod}] ` : ""}${input.interest ? `[${input.interest}] ` : ""}${input.message || ""}`,
            source: input.source || "SPARK Quality Demo",
            notified: !!delivered,
          });
        } catch (err) {
          console.error("[contact.send] failed to persist submission", err);
        }
        return { ok: true, delivered, emailed: emailResult.ok } as const;
      }),
  }),

  // ========================================================
  // AUTH
  // ========================================================
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    /**
     * Capture broker-license number + file in one tRPC call.
     * Frontend sends fileBase64 (data URL or raw base64) + filename + mimeType.
     * Server uploads to S3 and persists licenseNumber + licenseFileKey on user row.
     * Enforces uniqueness on licenseNumber to prevent duplicate / fraudulent accounts.
     */
    setLicense: protectedProcedure
      .input(
        z.object({
          licenseNumber: z
            .string()
            .trim()
            .regex(/^[0-9A-Za-z-]{4,20}$/, "מספר רישיון אינו תקין (4–20 תווים)"),
          fileBase64: z.string().min(50).max(15_000_000),
          fileName: z.string().trim().min(1).max(200),
          mimeType: z
            .string()
            .regex(/^(image\/(png|jpeg|jpg|webp)|application\/pdf)$/, "הקובץ חייב להיות PNG / JPG / PDF"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const license = input.licenseNumber.trim();
        const existing = await db.getUserByLicenseNumber(license);
        if (existing && existing.id !== ctx.user.id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "מספר רישיון זה כבר רשום במערכת תחת משתמש אחר.",
          });
        }

        // Strip optional data:URL prefix
        const rawBase64 = input.fileBase64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(rawBase64, "base64");
        if (buffer.length < 100 || buffer.length > 10 * 1024 * 1024) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "גודל הקובץ חייב להיות בין 100B ל-10MB.",
          });
        }

        const ext = input.fileName.includes(".")
          ? input.fileName.split(".").pop()!.toLowerCase()
          : input.mimeType === "application/pdf"
            ? "pdf"
            : "png";
        const safeKey = `licenses/user-${ctx.user.id}/${Date.now()}.${ext}`;
        const { key } = await storagePut(safeKey, buffer, input.mimeType);

        await db.setUserLicense(ctx.user.id, {
          licenseNumber: license,
          licenseFileKey: key,
        });
        return { success: true, licenseFileKey: key } as const;
      }),
  }),

  // ========================================================
  // WORKSPACES (Onboarding + Management)
  // ========================================================
  workspaces: router({
    /** Create a new workspace and become its owner */
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2).max(200),
          plan: z.enum(["basic", "pro", "premium", "enterprise"]).optional(),
          taxId: z.string().min(9).max(20),
          taxIdType: z.enum(["company", "individual"]),
          contactPhone: z.string().min(9).max(32),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.workspaceId) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User already belongs to a workspace.",
          });
        }

        // Validate Israeli check-digit on tax ID and Israeli mobile.
        if (!isValidIsraeliTaxId(input.taxId, input.taxIdType)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              input.taxIdType === "company"
                ? "מספר ח.פ אינו תקין. יש להזין 9 ספרות ללא מקף או רווח."
                : "מספר ת״ז שהוזן אינו תקין (תקלת ספרת ביקורת).",
          });
        }
        const phoneNorm = normalizeIsraeliMobile(input.contactPhone);
        if (!phoneNorm) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "מספר טלפון נייד לא תקין. לדוגמה: 05X-XXXXXXX.",
          });
        }

        // Round 113 — global uniqueness on workspace taxId. The DB has a UNIQUE
        // index too (uq_workspaces_taxid), but we surface a Hebrew CONFLICT
        // before hitting MySQL so the UI can show a clean message.
        const normalizedTaxId = input.taxId.replace(/\D+/g, "");
        const existingByTaxId = await db.getWorkspaceByTaxId(normalizedTaxId);
        if (existingByTaxId) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              input.taxIdType === "company"
                ? `מספר ח.פ ${normalizedTaxId} כבר רשום במערכת על שם סוכנות קיימת. אם זו הסוכנות שלך, יש להתחבר לחשבון הקיים.`
                : `מספר ת״ז ${normalizedTaxId} כבר רשום במערכת על שם סוכנות קיימת. אם זו הסוכנות שלך, יש להתחבר לחשבון הקיים.`,
          });
        }

        const workspaceId = await db.createWorkspace({
          name: input.name,
          plan: input.plan ?? "basic",
          taxId: normalizedTaxId,
          taxIdType: input.taxIdType,
          contactPhone: phoneNorm,
          createdByUserId: ctx.user.id,
        });
        // Round 114 — מדיניות המוצר:
        //   * כל יוזר חדש נפתח לתפקיד "סוכן" (agent), לעולם לא "בעלים" (owner).
        //   * תפקיד "בעלים" מוקצה רק לאחר ש-subscriptionStatus הופך ל-"active"
        //     (זה קורה אוטומטית ב-promoteCreatorToOwnerIfActive() ב-server/db.ts).
        await db.updateUserWorkspace(ctx.user.id, workspaceId, "agent");
        return { workspaceId };
      }),

    /** Get current workspace details */
    current: workspaceProcedure.query(async ({ ctx }) => {
      const workspace = await db.getWorkspaceById(ctx.user.workspaceId);
      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      }
      return workspace;
    }),

    /** List all members in current workspace (admins only) */
    listMembers: workspaceAdminProcedure.query(async ({ ctx }) => {
      return db.getWorkspaceMembers(ctx.user.workspaceId);
    }),

    /** Invite a new user (admin only) */
    invite: workspaceAdminProcedure
      .input(
        z.object({
          email: z.string().email(),
          workspaceRole: z.enum(["admin", "agent"]).default("agent"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const token = nanoid(48);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        const invitationId = await db.createInvitation({
          workspaceId: ctx.user.workspaceId,
          email: input.email,
          workspaceRole: input.workspaceRole,
          token,
          invitedByUserId: ctx.user.id,
          expiresAt,
        });
        return { invitationId, token };
      }),

    /** List pending invitations */
    listInvitations: workspaceAdminProcedure.query(async ({ ctx }) => {
      return db.listWorkspaceInvitations(ctx.user.workspaceId);
    }),

    /** Revoke (cancel) a pending invitation */
    revokeInvitation: workspaceAdminProcedure
      .input(z.object({ invitationId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const invitation = await db.getInvitationById(input.invitationId, ctx.user.workspaceId);
        if (!invitation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" });
        }
        await db.revokeInvitation(input.invitationId, ctx.user.workspaceId);
        return { ok: true as const };
      }),

    /** Send the invitation link by email (Resend, best-effort) */
    sendInvitationEmail: workspaceAdminProcedure
      .input(z.object({
        invitationId: z.number().int().positive(),
        origin: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const invitation = await db.getInvitationById(input.invitationId, ctx.user.workspaceId);
        if (!invitation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" });
        }
        if (invitation.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation no longer pending" });
        }
        const inviteUrl = `${input.origin.replace(/\/+$/, "")}/onboarding?invite=${invitation.token}`;
        const inviterName = ctx.user.name || "צוות SPARK Quality";
        const result = await sendEmail({
          to: invitation.email,
          subject: `הוזמנתם להצטרף לסוכנות ב-SPARK Quality`,
          html: `<!doctype html><html lang="he" dir="rtl"><body style="font-family:system-ui,Segoe UI,Arial,sans-serif;background:#06101F;color:#0E1B33;padding:24px">
            <div style="max-width:560px;margin:0 auto;background:#FFF8E5;border-radius:8px;padding:32px;border:1px solid #C8A24A33">
              <h2 style="font-family:Georgia,serif;color:#0E1B33;margin:0 0 12px;font-size:22px">הוזמנתם להצטרף לסוכנות ב-SPARK Quality</h2>
              <p style="line-height:1.7;margin:0 0 12px">${escapeHtml(inviterName)} הזמינו אתכם להצטרף כסוכן/ת בסביבה משותפת ב-SPARK Quality.</p>
              <p style="line-height:1.7;margin:0 0 18px">לחצו על הכפתור והתחברו עם החשבון שלכם כדי להשלים את ההצטרפות. הקישור פעיל ל-7 ימים.</p>
              <p style="text-align:center;margin:24px 0">
                <a href="${inviteUrl}" style="display:inline-block;background:#C8A24A;color:#06101F;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:700">קבלת ההזמנה</a>
              </p>
              <p style="font-size:12px;color:#475569;margin:18px 0 0">אם הכפתור לא עובד, העתיקו את הקישור הבא:<br><span style="word-break:break-all">${inviteUrl}</span></p>
            </div>
          </body></html>`,
          text: `הוזמנתם להצטרף לסוכנות ב-SPARK Quality.\nקישור הצטרפות (פעיל 7 ימים): ${inviteUrl}`,
        });
        if (!result.ok) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
        }
        return { ok: true as const, id: result.id };
      }),

    /** Complete billing details (taxId + phone) for legacy workspaces missing them */
    completeBillingDetails: workspaceAdminProcedure
      .input(
        z.object({
          taxId: z.string().min(9).max(20),
          taxIdType: z.enum(["company", "individual"]),
          contactPhone: z.string().min(9).max(32),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!isValidIsraeliTaxId(input.taxId, input.taxIdType)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              input.taxIdType === "company"
                ? "מספר ח.פ אינו תקין. יש להזין 9 ספרות ללא מקף או רווח."
                : "מספר ת”ז שהוזן אינו תקין (תקלת ספרת ביקורת).",
          });
        }
        const phoneNorm = normalizeIsraeliMobile(input.contactPhone);
        if (!phoneNorm) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "מספר טלפון נייד לא תקין. לדוגמה: 05X-XXXXXXX.",
          });
        }
        await db.updateWorkspaceBillingDetails(ctx.user.workspaceId, {
          taxId: input.taxId.replace(/\D+/g, ""),
          taxIdType: input.taxIdType,
          contactPhone: phoneNorm,
        });
        return { ok: true as const };
      }),

    /** Update VIP threshold (owner/admin only) - clients with totalBalance >= threshold are auto-flagged VIP */
    updateVipThreshold: workspaceAdminProcedure
      .input(z.object({ vipThreshold: z.number().int().min(0).max(100_000_000) }))
      .mutation(async ({ ctx, input }) => {
        await db.updateWorkspaceVipThreshold(ctx.user.workspaceId, input.vipThreshold);
        // Re-classify all clients in this workspace based on the new threshold
        const updated = await db.reclassifyClientVipStatus(ctx.user.workspaceId, input.vipThreshold);
        return { ok: true, reclassified: updated };
      }),

    /** Dashboard metrics: real numbers from DB (VIP count, liquid funds, etc.) */
    metrics: workspaceProcedure.query(async ({ ctx }) => {
      return db.getWorkspaceMetrics({
        workspaceId: ctx.user.workspaceId,
        userId: ctx.user.id,
        workspaceRole: ctx.user.workspaceRole,
      });
    }),

    /** Accept an invitation (any logged-in user) */
    acceptInvite: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.workspaceId) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Already in a workspace.",
          });
        }
        const invitation = await db.getInvitationByToken(input.token);
        if (!invitation) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" });
        }
        if (invitation.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation no longer valid" });
        }
        if (invitation.expiresAt < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation expired" });
        }
        await db.updateUserWorkspace(
          ctx.user.id,
          invitation.workspaceId,
          invitation.workspaceRole as "admin" | "agent"
        );
        return { workspaceId: invitation.workspaceId };
      }),
  }),

  // ========================================================
  // CLIENTS (Filtered by workspace + role)
  // ========================================================
  clients: router({
    list: workspaceProcedure.query(async ({ ctx }) => {
      return db.listClients({
        workspaceId: ctx.user.workspaceId,
        userId: ctx.user.id,
        workspaceRole: ctx.user.workspaceRole,
      });
    }),

    get: workspaceProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const client = await db.getClientById({
          clientId: input.id,
          workspaceId: ctx.user.workspaceId,
          userId: ctx.user.id,
          workspaceRole: ctx.user.workspaceRole,
        });
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Client not found or no access" });
        }
        const policies = await db.getClientPolicies(input.id, ctx.user.workspaceId);
        return { client, policies };
      }),

    create: workspaceProcedure
      .input(
        z.object({
          idNumber: z.string().min(5).max(32),
          fullName: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requireClientQuota(ctx);
        const id = await db.createClient({
          workspaceId: ctx.user.workspaceId,
          ownerUserId: ctx.user.id,
          idNumber: input.idNumber,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          notes: input.notes,
        });
        return { id };
      }),

    update: workspaceProcedure
      .input(
        z.object({
          clientId: z.number(),
          isVip: z.boolean().optional(),
          notes: z.string().max(2000).optional(),
          flagStatus: z
            .enum([
              "regular",
              "liquid_fund",
              "tikun_190",
              "high_fees",
              "risk_ending",
              "coverage_gaps",
            ])
            .optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Make sure caller can access this client (workspace + role check)
        const target = await db.getClientById({
          clientId: input.clientId,
          workspaceId: ctx.user.workspaceId,
          userId: ctx.user.id,
          workspaceRole: ctx.user.workspaceRole,
        });
        if (!target) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "הלקוח לא נמצא או לא שייך לסוכנות שלך.",
          });
        }
        await db.updateClient({
          clientId: input.clientId,
          workspaceId: ctx.user.workspaceId,
          isVip: input.isVip,
          notes: input.notes,
          flagStatus: input.flagStatus,
        });
        return { ok: true as const };
      }),
  }),

  // ========================================================
  // REPORTS
  // ========================================================
  reports: router({
    list: workspaceProcedure.query(async ({ ctx }) => {
      return db.listReports({
        workspaceId: ctx.user.workspaceId,
        userId: ctx.user.id,
        workspaceRole: ctx.user.workspaceRole,
      });
    }),

    /**
     * Save a parsed report (with extracted clients) to the database.
     * Client-side parses the file, sends summary + client rows.
     */
    save: workspaceProcedure
      .input(
        z.object({
          fileName: z.string(),
          fileKey: z.string().optional(),
          fileSize: z.number().optional(),
          summary: z.any().optional(),
          clientCount: z.number().optional(),
          totalAum: z.number().optional(),
          clients: z
            .array(
              z.object({
                idNumber: z.string(),
                fullName: z.string().nullable().optional(),
                email: z.string().nullable().optional(),
                phone: z.string().nullable().optional(),
                birthDate: z.string().nullable().optional(),
                flagStatus: z.enum(["vip", "liquid_fund", "tikun_190", "high_fees", "risk_ending", "coverage_gaps", "regular"]).optional(),
                isVip: z.boolean().optional(),
                totalBalance: z.number().optional(),
              })
            )
            .optional(),
          policies: z
            .array(
              z.object({
                idNumber: z.string(),
                productType: z.string().nullable().optional(),
                company: z.string().nullable().optional(),
                policyNumber: z.string().nullable().optional(),
                monthlyPremium: z.number().nullable().optional(),
                annualPremium: z.number().nullable().optional(),
                balance: z.number().nullable().optional(),
                startDate: z.string().nullable().optional(),
                endDate: z.string().nullable().optional(),
                status: z.enum(["active", "inactive", "cancelled", "expired"]).optional(),
              })
            )
            .optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const reportId = await db.createReport({
          workspaceId: ctx.user.workspaceId,
          uploadedByUserId: ctx.user.id,
          fileName: input.fileName,
          fileKey: input.fileKey ?? "",
          fileSize: input.fileSize,
          source: "shorens",
          status: "done",
          summary: input.summary,
          clientCount: input.clientCount,
          totalAum: input.totalAum?.toString(),
          processedAt: new Date(),
        });

        let importedCount = 0;
        if (input.clients && input.clients.length > 0) {
          importedCount = await db.bulkUpsertClients({
            workspaceId: ctx.user.workspaceId,
            ownerUserId: ctx.user.id,
            reportId,
            rows: input.clients,
          });
        }

        // Persist per-policy rows so the trigger engine has real coverage /
        // premium / balance data. Scoped + replaced per workspace.
        if (input.policies && input.policies.length > 0) {
          try {
            await db.bulkReplacePolicies({
              workspaceId: ctx.user.workspaceId,
              rows: input.policies,
            });
          } catch (err) {
            console.warn("[reports.save] bulkReplacePolicies failed (non-fatal)", err);
          }
        }

        // Round 128 — immediately compute multi-flag triggers so the modal
        // lists per category are never empty after an upload. Scoped to the
        // caller's workspace; other tenants are not touched.
        try {
          await db.computeWorkspaceFlags({ workspaceId: ctx.user.workspaceId });
        } catch (err) {
          console.warn("[reports.save] computeWorkspaceFlags failed (non-fatal)", err);
        }

        return { id: reportId, importedCount };
      }),

    /**
     * LLM Analysis (Surense Skill v2.0)
     * Receives anonymized parsed JSON, calls Claude with the skill prompt,
     * returns structured JSON and persists it on the report row.
     */
    analyze: workspaceProcedure
      .input(
        z.object({
          reportId: z.number().optional(),
          parsed: z.any(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const today = new Date().toISOString().slice(0, 10);
        const userPayload = JSON.stringify(input.parsed).slice(0, 60_000);

        const completion = await invokeLLM({
          messages: [
            { role: "system", content: buildAnalysisSystem(today) },
            { role: "user", content: userPayload },
          ],
          response_format: {
            type: "json_schema",
            json_schema: ANALYSIS_JSON_SCHEMA,
          },
        });

        const raw = completion?.choices?.[0]?.message?.content ?? "{}";
        let analysis: unknown = {};
        try {
          analysis = typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch (err) {
          console.warn("[reports.analyze] JSON.parse failed, returning raw", err);
          analysis = { raw, parseError: true };
        }

        if (input.reportId) {
          try {
            await db.updateReportLlmAnalysis(input.reportId, ctx.user.workspaceId, analysis);
          } catch (err) {
            console.warn("[reports.analyze] failed to persist analysis", err);
          }
        }

        return { analysis };
      }),

    /**
     * AI Composer — generate WhatsApp / Email / SMS for a specific trigger
     */
    compose: workspaceProcedure
      .input(
        z.object({
          flag: z.string(),
          channel: z.enum(["whatsapp", "email", "sms"]),
          firstName: z.string(),
          age: z.number().optional(),
          detail: z.string().optional(),
          agentName: z.string(),
          productName: z.string().optional(),
          company: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requireFeature(ctx, "ai.composer");
        const completion = await invokeLLM({
          messages: [
            { role: "system", content: COMPOSER_SYSTEM },
            { role: "user", content: buildComposerUserPrompt(input) },
          ],
        });
        const message = completion?.choices?.[0]?.message?.content ?? "";
        return { message };
      }),

    /**
     * Daily morning briefing — based on stored analysis
     */
    briefing: workspaceProcedure
      .input(z.object({ analysis: z.any(), agentName: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await requireFeature(ctx, "ai.briefing");
        const completion = await invokeLLM({
          messages: [
            { role: "system", content: BRIEFING_SYSTEM },
            {
              role: "user",
              content: buildBriefingUserPrompt({
                analysis: input.analysis,
                agentName: input.agentName,
                date: new Date().toISOString().slice(0, 10),
              }),
            },
          ],
        });
        return { briefing: completion?.choices?.[0]?.message?.content ?? "" };
      }),

    /**
     * Client meeting prep summary
     */
    clientSummary: workspaceProcedure
      .input(z.object({ client: z.any(), analysisContext: z.any().optional() }))
      .mutation(async ({ ctx, input }) => {
        await requireFeature(ctx, "ai.briefing");
        const completion = await invokeLLM({
          messages: [
            { role: "system", content: CLIENT_SUMMARY_SYSTEM },
            { role: "user", content: buildClientSummaryUserPrompt(input) },
          ],
        });
        return { summary: completion?.choices?.[0]?.message?.content ?? "" };
      }),

    /**
     * Q&A — free-form question on the analysis JSON.
     * Round 129: when the question mentions a known trigger (VIP, ללא פנסיה, כספים נזילים, דמי ניהול...),
     * we pull real client rows from clientFlags (workspace + role isolated) and attach
     * them so the LLM can answer with actual names instead of "אין שמות".
     */
    qa: workspaceProcedure
      .input(z.object({ question: z.string(), analysis: z.any() }))
      .mutation(async ({ ctx, input }) => {
        await requireFeature(ctx, "ai.smartQA");
        const relevantClients = await buildRelevantClientsContext({
          workspaceId: ctx.user.workspaceId,
          userId: ctx.user.id,
          workspaceRole: ctx.user.workspaceRole,
          question: input.question,
        });
        const completion = await invokeLLM({
          messages: [
            { role: "system", content: QA_SYSTEM },
            {
              role: "user",
              content: buildQaUserPrompt({
                question: input.question,
                analysis: input.analysis,
                relevantClients,
              }),
            },
          ],
        });
        return {
          answer: completion?.choices?.[0]?.message?.content ?? "",
          relevantClients,
        };
      }),

    /**
     * Smart Suggestions — generate 3-4 proactive questions based on the data
     */
    smartSuggestions: workspaceProcedure
      .input(z.object({ analysis: z.any() }))
      .mutation(async ({ ctx, input }) => {
        await requireFeature(ctx, "ai.smartQA");
        const completion = await invokeLLM({
          messages: [
            { 
              role: "system", 
              content: "You are an AI assistant for an insurance agent. Based on the provided data, suggest 3-4 short, actionable questions the agent could ask you to get insights. Return ONLY a JSON array of strings. Example: [\"מי הלקוחות עם הצבירה הגבוהה ביותר?\", \"איפה יש הזדמנויות לניוד קרנות השתלמות?\"]" 
            },
            { 
              role: "user", 
              content: JSON.stringify(input.analysis).slice(0, 2000) 
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "suggestions",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["suggestions"],
                additionalProperties: false
              }
            }
          }
        });
        
        try {
          const content = completion?.choices?.[0]?.message?.content;
          if (!content) return { suggestions: [] };
          const text = typeof content === "string" ? content : JSON.stringify(content);
          const parsed = JSON.parse(text);
          return { suggestions: parsed.suggestions || [] };
        } catch (e) {
          return { suggestions: [] };
        }
      }),

    /**
     * Round 92 — WhatsApp Composer: ask Claude for 3 distinct variants in one shot,
     * persist to messageGenerations, and return them with the new generation id.
     */
    composeVariants: workspaceProcedure
      .input(
        z.object({
          clientId: z.number().int().positive().nullable().optional(),
          triggerKey: z.string().min(1).max(64),
          triggerLabel: z.string().min(1).max(120),
          triggerHint: z.string().max(400).optional(),
          firstName: z.string().min(1).max(80),
          age: z.number().int().min(0).max(130).optional(),
          productOrCompany: z.string().max(120).optional(),
          context: z.string().max(800).optional(),
          tone: z.enum(["warm", "professional", "urgent"]),
          agentName: z.string().min(1).max(120),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await requireFeature(ctx, "ai.composer");
        const toneHebrew = ({ warm: "חם ואישי", professional: "מקצועי", urgent: "דחוף" } as const)[input.tone];
        const completion = await invokeLLM({
          messages: [
            { role: "system", content: VARIANTS_3_SYSTEM },
            { role: "user", content: buildVariants3UserPrompt({ ...input, toneHebrew }) },
          ],
        });
        const rawContent = completion?.choices?.[0]?.message?.content ?? "";
        const raw = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
        const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
        let parsed: { v1?: string; v2?: string; v3?: string } = {};
        try {
          parsed = JSON.parse(cleaned);
        } catch (err) {
          console.warn("[composeVariants] JSON.parse failed, using raw text as v1", err);
          parsed = { v1: raw, v2: "", v3: "" };
        }
        const variants = [parsed.v1 ?? "", parsed.v2 ?? "", parsed.v3 ?? ""];
        const generationId = await db.createMessageGeneration({
          workspaceId: ctx.user.workspaceId,
          clientId: input.clientId ?? null,
          triggerKey: input.triggerKey,
          tone: input.tone,
          freeFormContext: input.context ?? null,
          variantsJson: variants,
          createdByUserId: ctx.user.id,
        });
        return { generationId, variants } as const;
      }),

    /** Round 92 — mark which of the 3 variants the agent picked. */
    markVariantSelected: workspaceProcedure
      .input(
        z.object({
          generationId: z.number().int().positive(),
          selectedIndex: z.number().int().min(0).max(2),
          /** Optional edited variants to persist over the originals. */
          variantsJson: z.array(z.string()).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await db.markMessageGenerationSelected({
          workspaceId: ctx.user.workspaceId,
          generationId: input.generationId,
          selectedIndex: input.selectedIndex,
          variantsJson: input.variantsJson,
        });
        return { ok: true } as const;
      }),

    /** Round 92 — history of generations for one client (per workspace). */
    listGenerationsForClient: workspaceProcedure
      .input(z.object({ clientId: z.number().int().positive(), limit: z.number().int().min(1).max(100).optional() }))
      .query(async ({ ctx, input }) => {
        return db.listMessageGenerationsForClient({
          workspaceId: ctx.user.workspaceId,
          clientId: input.clientId,
          limit: input.limit,
        });
      }),

    /** Round 92 — recent generations across the workspace (dashboard strip). */
    listGenerationsForWorkspace: workspaceProcedure
      .input(z.object({ limit: z.number().int().min(1).max(200).optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.listMessageGenerationsForWorkspace({
          workspaceId: ctx.user.workspaceId,
          limit: input?.limit,
        });
      }),
  }),

  // ========================================================
  // TRIGGERS (Round 93 — Interactive Triggers Dashboard)
  // ========================================================
  triggers: router({
    /** List clients matching a trigger key (e.g. 'high_fees', 'vip', 'liquid_fund') */
    listClients: workspaceProcedure
      .input(z.object({ triggerKey: z.string().min(1).max(64) }))
      .query(async ({ ctx, input }) => {
        // Round 128 — v2 reads from the multi-flag clientFlags table so a
        // single client can appear in EVERY trigger list relevant to them.
        // Falls back to the legacy single-flag column only when the
        // workspace has not been backfilled yet.
        return db.listClientsForTriggerV2({
          workspaceId: ctx.user.workspaceId,
          triggerKey: input.triggerKey,
          userId: ctx.user.id,
          workspaceRole: ctx.user.workspaceRole,
        });
      }),
    /**
     * Round 128 — Recompute all per-client triggers for the caller's workspace.
     * Re-derives the 16 priority triggers and writes one row per match into
     * `client_flags`. Tenant-isolated by workspaceId.
     */
    recompute: workspaceAdminProcedure.mutation(async ({ ctx }) => {
      const result = await db.computeWorkspaceFlags({
        workspaceId: ctx.user.workspaceId,
      });
      return { ok: true as const, ...result };
    }),
    /** Mark a (clientId, triggerKey) pair as handled by the current user. Idempotent. */
    markHandled: workspaceProcedure
      .input(
        z.object({
          clientId: z.number().int().positive(),
          triggerKey: z.string().min(1).max(64),
          note: z.string().max(2000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await db.markTriggerHandled({
          workspaceId: ctx.user.workspaceId,
          clientId: input.clientId,
          triggerKey: input.triggerKey,
          handledByUserId: ctx.user.id,
          handledAt: new Date(),
          note: input.note ?? null,
        });
        return { ok: true } as const;
      }),
    /** Undo a handled mark. */
    unmarkHandled: workspaceProcedure
      .input(
        z.object({
          clientId: z.number().int().positive(),
          triggerKey: z.string().min(1).max(64),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await db.unmarkTriggerHandled({
          workspaceId: ctx.user.workspaceId,
          clientId: input.clientId,
          triggerKey: input.triggerKey,
        });
        return { ok: true } as const;
      }),
    /** Map of triggerKey → handled count for the workspace (drives progress bars). */
    handledCounts: workspaceProcedure.query(async ({ ctx }) => {
      return db.countHandledByTrigger({ workspaceId: ctx.user.workspaceId });
    }),
  }),

  // ========================================================
  // EXPORTS (Round 98 — gated by workspaceActiveProcedure)
  // Every export procedure is locked to an active paying subscription. The
  // moment a workspace falls into pending_payment / suspended / cancelled, the
  // procedures throw FORBIDDEN with a Hebrew message — preventing a customer
  // from extracting bulk client/report data outside the paid window.
  // ========================================================
  exports: router({
    /** Whether the caller's workspace can currently export (cheap pre-flight). */
    status: workspaceProcedure.query(async ({ ctx }) => {
      const ws = await db.getWorkspaceById(ctx.user.workspaceId);
      const status = ws?.subscriptionStatus ?? "pending_payment";
      const allowed = status === "active" || status === "past_due";
      return {
        allowed,
        subscriptionStatus: status,
        reason: allowed
          ? null
          : ("ייצוא נתונים זמין רק למנוי פעיל. הפעילו מנוי לדשבורד / חשבונות וחיוב." as const),
      };
    }),

    /** CSV of every client in the workspace (agent → own clients only). */
    clientsCsv: workspaceActiveProcedure.query(async ({ ctx }) => {
      const rows = await db.listClients({
        workspaceId: ctx.user.workspaceId,
        userId: ctx.user.id,
        workspaceRole: ctx.user.workspaceRole,
      });
      // Build a UTF-8 CSV with BOM so Excel opens Hebrew correctly.
      const headers = [
        "שם מלא",
        "ת״ז",
        "גיל",
        "טלפון",
        "מייל",
        "דגל פעיל",
        "VIP",
        "AUM",
        "הערות",
      ];
      const escapeCell = (v: unknown): string => {
        if (v === null || v === undefined) return "";
        const s = String(v);
        return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const today = new Date();
      const lines: string[] = [headers.join(",")];
      for (const r of rows) {
        const age = r.birthDate
          ? Math.floor((today.getTime() - new Date(r.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))
          : "";
        lines.push(
          [
            escapeCell(r.fullName),
            escapeCell(r.idNumber),
            escapeCell(age),
            escapeCell(r.phone ?? ""),
            escapeCell(r.email ?? ""),
            escapeCell(r.flagStatus ?? ""),
            escapeCell(r.isVip ? "VIP" : ""),
            escapeCell(r.totalBalance ?? ""),
            escapeCell(r.notes ?? ""),
          ].join(","),
        );
      }
      const csvBody = "\ufeff" + lines.join("\r\n");
      return {
        filename: `spark-quality-clients-${today.toISOString().slice(0, 10)}.csv`,
        contentType: "text/csv; charset=utf-8",
        csv: csvBody,
        rowCount: rows.length,
      };
    }),
  }),

  // ========================================================
  // ROUND 131 — CLIENT JOURNEY ROUTER
  // Activity log, reminders, full client detail, agent reassign.
  // Every procedure is workspace-scoped via workspaceProcedure;
  // mutations that modify ownership go through workspaceAdminProcedure.
  // ========================================================
  clientJourney: router({
    /** Aggregate detail for the client-detail panel. */
    getDetail: workspaceProcedure
      .input(z.object({ clientId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        return db.getClientDetail({
          clientId: input.clientId,
          workspaceId: ctx.user.workspaceId,
          userId: ctx.user.id,
          workspaceRole: ctx.user.workspaceRole,
        });
      }),
    /** Append an activity (call/whatsapp/email/meeting/note/sms). */
    logActivity: workspaceProcedure
      .input(
        z.object({
          clientId: z.number().int().positive(),
          type: z.enum(["call", "whatsapp", "email", "meeting", "note", "sms"]),
          outcome: z.string().max(64).optional(),
          content: z.string().max(4000).optional(),
          triggerKey: z.string().max(64).optional(),
          scheduledFor: z.date().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.insertClientActivity({
          clientId: input.clientId,
          workspaceId: ctx.user.workspaceId,
          userId: ctx.user.id,
          workspaceRole: ctx.user.workspaceRole,
          type: input.type,
          outcome: input.outcome ?? null,
          content: input.content ?? null,
          triggerKey: input.triggerKey ?? null,
          scheduledFor: input.scheduledFor ?? null,
        });
        return { id, ok: true } as const;
      }),
    /** List activities for a single client (newest first). */
    listActivities: workspaceProcedure
      .input(
        z.object({
          clientId: z.number().int().positive(),
          limit: z.number().int().min(1).max(200).optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        return db.listActivitiesForClient({
          clientId: input.clientId,
          workspaceId: ctx.user.workspaceId,
          userId: ctx.user.id,
          workspaceRole: ctx.user.workspaceRole,
          limit: input.limit,
        });
      }),
    /** Snooze: remind me about this client at a future date. */
    createReminder: workspaceProcedure
      .input(
        z.object({
          clientId: z.number().int().positive(),
          remindAt: z.date(),
          triggerKey: z.string().max(64).optional(),
          note: z.string().max(2000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createClientReminder({
          clientId: input.clientId,
          workspaceId: ctx.user.workspaceId,
          userId: ctx.user.id,
          workspaceRole: ctx.user.workspaceRole,
          remindAt: input.remindAt,
          triggerKey: input.triggerKey ?? null,
          note: input.note ?? null,
        });
        return { id, ok: true } as const;
      }),
    /** Pending/due reminders for the caller. */
    listDueReminders: workspaceProcedure.query(async ({ ctx }) => {
      return db.listDueReminders({
        workspaceId: ctx.user.workspaceId,
        userId: ctx.user.id,
        workspaceRole: ctx.user.workspaceRole,
      });
    }),
    /** Dismiss / cancel / mark a reminder as fired. */
    setReminderStatus: workspaceProcedure
      .input(
        z.object({
          reminderId: z.number().int().positive(),
          status: z.enum(["pending", "fired", "dismissed", "cancelled"]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return db.updateReminderStatus({
          reminderId: input.reminderId,
          workspaceId: ctx.user.workspaceId,
          userId: ctx.user.id,
          workspaceRole: ctx.user.workspaceRole,
          status: input.status,
        });
      }),
    /**
     * Round 132 — Email Composer: ask Claude for 3 distinct subject+body variants in one shot,
     * persist to messageGenerations, and return them with the new generation id.
     */
    generateEmail: workspaceProcedure
      .input(
        z.object({
          clientId: z.number().int().positive().nullable().optional(),
          triggerKey: z.string().min(1).max(64),
          triggerLabel: z.string().min(1).max(120),
          triggerHint: z.string().max(400).optional(),
          firstName: z.string().min(1).max(80),
          age: z.number().int().min(0).max(130).optional(),
          productOrCompany: z.string().max(120).optional(),
          context: z.string().max(800).optional(),
          tone: z.enum(["warm", "professional", "urgent"]),
          agentName: z.string().min(1).max(120),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const toneHebrew = ({ warm: "חם ואישי", professional: "מקצועי", urgent: "דחוף" } as const)[input.tone];
        const completion = await invokeLLM({
          messages: [
            { role: "system", content: EMAIL_VARIANTS_3_SYSTEM },
            { role: "user", content: buildEmailVariants3UserPrompt({ ...input, toneHebrew }) },
          ],
        });
        const rawContent = completion?.choices?.[0]?.message?.content ?? "";
        const raw = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
        const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
        type V = { subject?: string; body?: string };
        let parsed: { v1?: V; v2?: V; v3?: V } = {};
        try {
          parsed = JSON.parse(cleaned);
        } catch (err) {
          console.warn("[generateEmail] JSON.parse failed, using raw text as v1.body", err);
          parsed = { v1: { subject: input.triggerLabel, body: raw }, v2: {}, v3: {} };
        }
        const variants = [
          { subject: parsed.v1?.subject ?? input.triggerLabel, body: parsed.v1?.body ?? "" },
          { subject: parsed.v2?.subject ?? input.triggerLabel, body: parsed.v2?.body ?? "" },
          { subject: parsed.v3?.subject ?? input.triggerLabel, body: parsed.v3?.body ?? "" },
        ];
        // Persist as JSON strings so we reuse the same messageGenerations table.
        const variantsJson = variants.map(v => JSON.stringify(v));
        const generationId = await db.createMessageGeneration({
          workspaceId: ctx.user.workspaceId,
          clientId: input.clientId ?? null,
          triggerKey: `email::${input.triggerKey}`,
          tone: input.tone,
          freeFormContext: input.context ?? null,
          variantsJson,
          createdByUserId: ctx.user.id,
        });
        return { generationId, variants } as const;
      }),

    /** Reassign a client to another agent in the same workspace (admins/owners only). */
    reassign: workspaceAdminProcedure
      .input(
        z.object({
          clientId: z.number().int().positive(),
          newOwnerUserId: z.number().int().positive(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return db.reassignClient({
          clientId: input.clientId,
          workspaceId: ctx.user.workspaceId,
          callerUserId: ctx.user.id,
          callerRole: ctx.user.workspaceRole,
          newOwnerUserId: input.newOwnerUserId,
        });
      }),
  }),

  admin: adminRouter,

  billing: billingRouter,
});

export type AppRouter = typeof appRouter;
