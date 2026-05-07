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
          email: z.string().trim().email().max(200),
          phone: z.string().trim().min(7).max(40).optional().or(z.literal("")),
          message: z.string().trim().min(5).max(2000),
          source: z.string().trim().max(80).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const phoneLine = input.phone && input.phone.length > 0 ? `טלפון: ${input.phone}\n` : "";
        const sourceLine = input.source ? `מקור: ${input.source}\n` : "";
        const title = `✨ בקשת פגישה חדשה — ${input.name}`;
        const content = `מילוא טופס צור קשר בדמו של SPARK Quality:\n\nשם: ${input.name}\nמייל: ${input.email}\n${phoneLine}${sourceLine}\n---\n${input.message}`;
        const delivered = await notifyOwner({ title, content });

        // Real email to Anat via Resend (best-effort, do not block on failure).
        const html = `<div dir="rtl" style="font-family:Heebo,Arial,sans-serif;line-height:1.7;color:#1f2233">
          <h2 style="margin:0 0 12px 0;color:#1f2233">✨ בקשת פגישה חדשה — SPARK Quality</h2>
          <p><strong>שם:</strong> ${escapeHtml(input.name)}</p>
          <p><strong>מייל:</strong> <a href="mailto:${encodeURIComponent(input.email)}">${escapeHtml(input.email)}</a></p>
          ${input.phone ? `<p><strong>טלפון:</strong> ${escapeHtml(input.phone)}</p>` : ""}
          ${input.source ? `<p><strong>מקור:</strong> ${escapeHtml(input.source)}</p>` : ""}
          <hr style="border:none;border-top:1px solid #c8a96a33;margin:16px 0"/>
          <p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>
          <p style="margin-top:24px;font-size:12px;color:#6b6f80">נשלח אוטומטית מ-SPARK Quality Demo</p>
        </div>`;
        const emailResult = await sendEmail({
          to: "anathemell@gmail.com",
          subject: title,
          html,
          replyTo: input.email,
        });
        if (!emailResult.ok) {
          console.warn("[contact.send] Resend failed:", emailResult.error);
        }

        try {
          await db.createContactSubmission({
            name: input.name,
            email: input.email,
            phone: input.phone || null,
            message: input.message,
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
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.workspaceId) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User already belongs to a workspace.",
          });
        }
        const workspaceId = await db.createWorkspace({
          name: input.name,
          plan: input.plan ?? "basic",
        });
        await db.updateUserWorkspace(ctx.user.id, workspaceId, "owner");
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
                flagStatus: z.enum(["vip", "liquid_fund", "tikun_190", "high_fees", "risk_ending", "coverage_gaps", "regular"]).optional(),
                isVip: z.boolean().optional(),
                totalBalance: z.number().optional(),
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

        return { id: reportId, importedCount };
      }),
  }),

  admin: adminRouter,

  billing: billingRouter,
});

export type AppRouter = typeof appRouter;
