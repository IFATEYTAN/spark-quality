import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

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
  // AUTH
  // ========================================================
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
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
          plan: z.enum(["trial", "basic", "premium", "enterprise"]).optional(),
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
          plan: input.plan ?? "trial",
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
});

export type AppRouter = typeof appRouter;
