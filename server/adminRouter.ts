import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { router, superAdminProcedure } from "./_core/trpc";

/**
 * Admin router - cross-workspace operations for SPARK AI staff.
 * All procedures require `ctx.user.isSuperAdmin === true`.
 */
export const adminRouter = router({
  // ============================================================
  // Dashboard
  // ============================================================
  dashboard: superAdminProcedure.query(async () => {
    return db.getGlobalDashboardStats();
  }),

  // ============================================================
  // Workspaces
  // ============================================================
  listWorkspaces: superAdminProcedure.query(async () => {
    return db.listAllWorkspacesWithStats();
  }),

  setWorkspaceSuspended: superAdminProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        suspended: z.boolean(),
        adminNote: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.setWorkspaceSuspended(input.workspaceId, input.suspended, input.adminNote);
      await db.writeAudit({
        actorUserId: ctx.user.id,
        workspaceId: input.workspaceId,
        action: input.suspended ? "workspace.suspend" : "workspace.unsuspend",
        entityType: "workspace",
        entityId: input.workspaceId,
        detail: input.adminNote,
      });
      return { ok: true } as const;
    }),

  setWorkspacePlan: superAdminProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        plan: z.enum(["trial", "basic", "premium", "enterprise"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.setWorkspacePlan(input.workspaceId, input.plan);
      await db.writeAudit({
        actorUserId: ctx.user.id,
        workspaceId: input.workspaceId,
        action: "workspace.plan.change",
        entityType: "workspace",
        entityId: input.workspaceId,
        detail: `plan -> ${input.plan}`,
      });
      return { ok: true } as const;
    }),

  // ============================================================
  // Users
  // ============================================================
  listUsers: superAdminProcedure.query(async () => {
    return db.listAllUsersWithWorkspace();
  }),

  setUserSuperAdmin: superAdminProcedure
    .input(z.object({ userId: z.number(), value: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id && !input.value) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "אי אפשר לבטל את הרשאת ה-Super-Admin של עצמך.",
        });
      }
      await db.setUserSuperAdmin(input.userId, input.value);
      await db.writeAudit({
        actorUserId: ctx.user.id,
        action: input.value ? "user.superadmin.grant" : "user.superadmin.revoke",
        entityType: "user",
        entityId: input.userId,
      });
      return { ok: true } as const;
    }),

  setUserSuspended: superAdminProcedure
    .input(z.object({ userId: z.number(), suspended: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "אי אפשר להשעות את עצמך.",
        });
      }
      await db.setUserSuspended(input.userId, input.suspended);
      await db.writeAudit({
        actorUserId: ctx.user.id,
        action: input.suspended ? "user.suspend" : "user.unsuspend",
        entityType: "user",
        entityId: input.userId,
      });
      return { ok: true } as const;
    }),

  setUserWorkspaceRole: superAdminProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["owner", "admin", "agent"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.setUserWorkspaceRole(input.userId, input.role);
      await db.writeAudit({
        actorUserId: ctx.user.id,
        action: "user.role.change",
        entityType: "user",
        entityId: input.userId,
        detail: `workspaceRole -> ${input.role}`,
      });
      return { ok: true } as const;
    }),

  // ============================================================
  // Contact Inbox
  // ============================================================
  listContactSubmissions: superAdminProcedure
    .input(
      z
        .object({
          status: z.enum(["new", "read", "replied", "archived"]).optional(),
          limit: z.number().int().min(1).max(500).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return db.listContactSubmissions(input);
    }),

  updateContactSubmissionStatus: superAdminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["new", "read", "replied", "archived"]),
        adminNote: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.updateContactSubmissionStatus(input.id, input.status, input.adminNote);
      await db.writeAudit({
        actorUserId: ctx.user.id,
        action: "contact.status.change",
        entityType: "contact_submission",
        entityId: input.id,
        detail: `status -> ${input.status}`,
      });
      return { ok: true } as const;
    }),

  // ============================================================
  // Audit Log
  // ============================================================
  listAuditLog: superAdminProcedure
    .input(
      z
        .object({
          workspaceId: z.number().optional(),
          limit: z.number().int().min(1).max(500).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return db.listAuditLog(input);
    }),
});
