import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
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

        // Best-effort email to the invitee with the accept link.
        // Origin is taken from the request so the link points at the same host (dev or prod).
        const proto = (ctx.req.headers["x-forwarded-proto"] as string) || ctx.req.protocol || "https";
        const host = (ctx.req.headers["x-forwarded-host"] as string) || (ctx.req.headers.host as string) || "spark-ai.co.il";
        const acceptUrl = `${proto}://${host}/onboarding?invite=${encodeURIComponent(token)}`;
        const workspace = await db.getWorkspaceById(ctx.user.workspaceId);
        const wsName = workspace?.name ?? "סוכנות SPARK";
        const inviterName = ctx.user.name ?? ctx.user.email ?? "מנהל/ת הסוכנות";
        const roleLabel = input.workspaceRole === "admin" ? "מנהל/ת" : "סוכן/ת";
        const html = `<div dir="rtl" style="font-family:Heebo,Arial,sans-serif;line-height:1.7;color:#1f2233;max-width:560px;margin:0 auto">
          <h2 style="color:#0A1628;margin:0 0 12px 0">✨ הוזמנת ל-${escapeHtml(wsName)} ב-SPARK Quality</h2>
          <p>${escapeHtml(inviterName)} הזמין/ה אותך להצטרף כ-<strong>${escapeHtml(roleLabel)}</strong> בסוכנות.</p>
          <p style="margin:24px 0"><a href="${acceptUrl}" style="background:#C9A961;color:#0A1628;padding:12px 24px;border-radius:6px;font-weight:bold;text-decoration:none">קבלת ההזמנה</a></p>
          <p style="font-size:12px;color:#6b6f80">הקישור תקף ל-7 ימים. אם הכפתור לא עובד: <br/><span style="word-break:break-all">${acceptUrl}</span></p>
        </div>`;
        const emailResult = await sendEmail({
          to: input.email,
          subject: `הזמנה ל-${wsName} · SPARK Quality`,
          html,
        });
        if (!emailResult.ok) {
          console.warn("[workspaces.invite] Failed to send invitation email:", emailResult.error);
        }

        return { invitationId, token, emailed: emailResult.ok };
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
        await db.markInvitationAccepted(invitation.id);
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

  // ========================================================
   // AI COMPOSER (LLM-backed message drafting per client)
   // ========================================================
   ai: router({
     /**
      * Draft a personalized email or WhatsApp message for a real client.
      * Uses invokeLLM with a strict JSON schema; falls back to a Hebrew template
      * if the LLM is unavailable so the UI never breaks.
      */
     composeMessage: workspaceProcedure
       .input(
         z.object({
           clientId: z.number().int().positive(),
           channel: z.enum(["email", "whatsapp"]),
         })
       )
       .mutation(async ({ ctx, input }) => {
         const client = await db.getClientById({
           clientId: input.clientId,
           workspaceId: ctx.user.workspaceId,
           userId: ctx.user.id,
           workspaceRole: ctx.user.workspaceRole,
         });
         if (!client) {
           throw new TRPCError({
             code: "NOT_FOUND",
             message: "הלקוח לא נמצא או לא שייך לסוכנות שלך.",
           });
         }

         const flag = (client.flagStatus ?? "regular") as
           | "vip"
           | "tikun_190"
           | "liquid_fund"
           | "high_fees"
           | "risk_ending"
           | "coverage_gaps"
           | "regular";
         const balance = Number(client.totalBalance ?? 0);
         const senderFirstName = ctx.user.name?.split(" ")[0] ?? "סוכן/ת הביטוח שלך";
         const fullName = client.fullName ?? "לקוח/ה יקר/ה";
         const firstName = fullName.split(" ")[0];

         const flagDescription: Record<typeof flag, string> = {
           vip: "לקוח VIP עם צבירה גבוהה — מעל סף ה-VIP של הסוכנות",
           tikun_190: "מועמד פוטנציאלי לתיקון 190 — גיל 60+ עם צבירה מספקת",
           liquid_fund: "בעל קרן השתלמות נזילה (ותק 6+ שנים)",
           high_fees: "בתיק יש דמי ניהול גבוהים או תשואה נמוכה ביחס לתקופה",
           risk_ending: "פוליסת ריסק שעומדת להסתיים בקרוב — דורש טיפול",
           coverage_gaps: "חוסר בכיסוי פנסיוני או חוסר במוצרי חיסכון מרכזיים",
           regular: "לקוח ללא דגלים מיוחדים — פנייה לעדכון תקופתי",
         };
         const flagCta: Record<typeof flag, string> = {
           vip: "פגישת ייעוץ פיננסי מקיפה ותכנון העברה בין-דורית",
           tikun_190: "הצגת סימולציית תיקון 190 והפקדה לפטור ממס",
           liquid_fund: "הצעה להעברה לקרן השקעה / IRA / פוליסת חיסכון",
           high_fees: "פגישת שימור — הפחתת דמי ניהול והתאמת מסלול",
           risk_ending: "תיאום שיחה דחופה לחידוש כיסוי",
           coverage_gaps: "פגישת ייעוץ פנסיוני וקרוס-סייל",
           regular: "סקירה תקופתית של ההתאמה של המוצרים בתיק",
         };

         const channelHint =
           input.channel === "email"
             ? "כתוב/י אימייל מקצועי וחם באורך 4–6 פסקאות עם נושא ברור. פתיחה אישית, הזכרת הדגל הספציפי בעדינות, הצעה לשיחה/פגישה קצרה, חתימה."
             : "כתוב/י הודעת WhatsApp קצרה (2–4 משפטים, מקסימום ~350 תווים), אישית, חמה ומזמינה, עם CTA אחד ברור. אפשר אימוג'י אחד.";

         const userPrompt = `נא לנסח ${input.channel === "email" ? "אימייל" : "הודעת WhatsApp"} ל${fullName}.

פרטי הלקוח:
- שם פרטי: ${firstName}
- שם מלא: ${fullName}
- מצב מזוהה: ${flagDescription[flag]}
- צבירה בתיק: ${balance.toLocaleString("he-IL")} ₪
- VIP: ${client.isVip ? "כן" : "לא"}

המטרה של ההודעה: ${flagCta[flag]}

הנחיות סגנון: ${channelHint}

שולח/ת: ${senderFirstName} — סוכן/ת ביטוח, SPARK AI.

החזר/י תשובה ב-JSON בלבד עם המבנה: { "subject": "...", "body": "..." }.
${input.channel === "whatsapp" ? "ב-WhatsApp, subject חייב להיות מחרוזת ריקה (\"\")." : "ב-email, subject חייב להיות נושא ממוקד באורך עד 80 תווים."}
אל תוסיף/י הסברים מחוץ ל-JSON.`;

         const responseSchema = {
           name: "ComposedMessage",
           schema: {
             type: "object",
             properties: {
               subject: { type: "string", description: "נושא האימייל; ל-WhatsApp להחזיר מחרוזת ריקה" },
               body: { type: "string", description: "גוף ההודעה המלא בעברית" },
             },
             required: ["subject", "body"],
             additionalProperties: false,
           },
           strict: true,
         };

         const fallback = (): { subject: string; body: string; source: "template" } => {
           const subject =
             input.channel === "email"
               ? `${firstName}, עדכון לגבי תיק הביטוח שלך`
               : "";
           const body =
             input.channel === "email"
               ? `שלום ${firstName},\n\nכאן ${senderFirstName} מ-SPARK AI. עברתי על התיק שלך וזיהיתי הזדמנות שחשוב לי לדבר איתך עליה — ${flagCta[flag]}.\n\nאשמח לתאם איתך שיחה קצרה (10–15 דקות) השבוע.\n\nבברכה,\n${senderFirstName}\nSPARK AI`
               : `שלום ${firstName} 👋\n\nכאן ${senderFirstName} מ-SPARK AI. רציתי לתאם איתך שיחה קצרה השבוע — יש לי הצעה שיכולה להתאים לך בדיוק (${flagCta[flag]}).\n\nמתי נוח לך?`;
           return { subject, body, source: "template" };
         };

         let composed: { subject: string; body: string; source: "llm" | "template" };
         try {
           const result = await invokeLLM({
             messages: [
               {
                 role: "system",
                 content:
                   "את/ה עוזר/ת ניסוח לסוכני ביטוח ישראלים. את/ה כותב/ת הודעות בעברית רהוטה, מקצועית, חמה ולא מכירתית-לחוצה. תמיד להחזיר JSON עם השדות subject ו-body בלבד.",
               },
               { role: "user", content: userPrompt },
             ],
             responseFormat: { type: "json_schema", json_schema: responseSchema },
             maxTokens: 1500,
           });

           const rawContent = result.choices[0]?.message?.content;
           const text =
             typeof rawContent === "string"
               ? rawContent
               : Array.isArray(rawContent)
                 ? rawContent.map(p => ("text" in p ? p.text : "")).join("")
                 : "";
           const cleaned = text
             .replace(/^```(?:json)?\s*\n?/i, "")
             .replace(/\n?```\s*$/, "")
             .trim();
           const parsed = JSON.parse(cleaned) as { subject?: string; body?: string };
           if (!parsed.body || typeof parsed.body !== "string") {
             throw new Error("LLM returned empty body");
           }
           composed = {
             subject: input.channel === "email" ? parsed.subject ?? "" : "",
             body: parsed.body,
             source: "llm",
           };
         } catch (err) {
           console.warn("[ai.composeMessage] LLM call failed, using template:", err instanceof Error ? err.message : err);
           composed = fallback();
         }

         // Persist the draft so it shows up in the client's outreach history.
         // Best-effort: errors are logged inside createOutreachMessage; the
         // compose flow never fails because of a DB hiccup.
         const messageId = await db.createOutreachMessage({
           workspaceId: ctx.user.workspaceId,
           clientId: client.id,
           senderUserId: ctx.user.id,
           channel: input.channel,
           subject: composed.subject || null,
           body: composed.body,
           source: composed.source,
           status: "drafted",
           flagAtCompose: flag,
         });

         return { ...composed, messageId: messageId > 0 ? messageId : null };
       }),
   }),

  // ========================================================
  // OUTREACH (AI composer history per client)
  // ========================================================
  outreach: router({
    /** List messages composed for a single client (most recent first). */
    listForClient: workspaceProcedure
      .input(z.object({ clientId: z.number().int().positive(), limit: z.number().int().min(1).max(200).optional() }))
      .query(async ({ ctx, input }) => {
        // Make sure the user can see this client (workspace + role isolation).
        const client = await db.getClientById({
          clientId: input.clientId,
          workspaceId: ctx.user.workspaceId,
          userId: ctx.user.id,
          workspaceRole: ctx.user.workspaceRole,
        });
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "הלקוח לא נמצא או לא שייך לסוכנות שלך.",
          });
        }
        return db.listOutreachForClient({
          clientId: input.clientId,
          workspaceId: ctx.user.workspaceId,
          userId: ctx.user.id,
          workspaceRole: ctx.user.workspaceRole,
          limit: input.limit,
        });
      }),

    /** Mark a drafted message as sent (called after the user clicks Send). */
    markSent: workspaceProcedure
      .input(z.object({ messageId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const ok = await db.markOutreachSent({
          messageId: input.messageId,
          workspaceId: ctx.user.workspaceId,
          senderUserId: ctx.user.id,
        });
        if (!ok) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "ההודעה לא נמצאה או לא שייכת לסוכן/ת המחובר/ת.",
          });
        }
        return { ok: true as const };
      }),
  }),

  admin: adminRouter,

  billing: billingRouter,
});

export type AppRouter = typeof appRouter;
