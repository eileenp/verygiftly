import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { lists, listItems, claims, contributions, listAccess } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { hashPassword, verifyPassword, timingSafeEqualString } from "./lib/password";
import { checkRateLimit } from "./lib/rateLimit";

function getClientIp(req: Request): string {
  return (
    req.headers.get("CF-Connecting-IP") ||
    req.headers.get("X-Forwarded-For")?.split(",")[0].trim() ||
    "unknown"
  );
}

export const viewerRouter = createRouter({
  // Get a list by ID for public viewing — verifies password, excludes hash from response
  getList: publicQuery
    .input(z.object({
      id: z.number(),
      password: z.string().min(1).max(255),
    }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const ip = getClientIp(ctx.req);
      if (!checkRateLimit(`getList:${input.id}:${ip}`, 10, 15 * 60 * 1000)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Try again later." });
      }

      const listForAuth = await db.query.lists.findFirst({
        where: eq(lists.id, input.id),
        columns: { id: true, password: true },
      });
      if (!listForAuth) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid list or password" });

      const valid = await verifyPassword(input.password, listForAuth.password);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid list or password" });

      // Transparently upgrade legacy plaintext passwords on successful auth
      if (!listForAuth.password.startsWith("pbkdf2:")) {
        await db.update(lists)
          .set({ password: await hashPassword(input.password) })
          .where(eq(lists.id, listForAuth.id));
      }

      const list = await db.query.lists.findFirst({
        where: eq(lists.id, input.id),
        columns: { password: false },
        with: {
          owner: { columns: { id: true, name: true } },
          items: { with: { claims: true, contributions: true } },
          coOwners: { columns: { id: true } },
        },
      });
      if (!list) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid list or password" });

      // Sanitize claims/contributions: viewers must never see other people's
      // identity (name/email) or their secret management tokens. We deliberately
      // do NOT expose a "mine" flag derived from a caller-supplied email — that
      // would be an oracle letting any viewer confirm whether a given email
      // claimed an item. Callers identify their own claims via the management
      // tokens issued at claim time (stored client-side).
      return {
        ...list,
        items: list.items.map((item) => ({
          ...item,
          claims: item.claims.map((c) => ({
            id: c.id,
            itemId: c.itemId,
            purchased: c.purchased,
            createdAt: c.createdAt,
          })),
          contributions: item.contributions.map((c) => ({
            id: c.id,
            itemId: c.itemId,
            amount: c.amount,
            paid: c.paid,
            createdAt: c.createdAt,
          })),
        })),
      };
    }),

  // Verify password only (for the access gate page)
  verifyPassword: publicQuery
    .input(z.object({ id: z.number(), password: z.string().min(1).max(255) }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const ip = getClientIp(ctx.req);
      if (!checkRateLimit(`verifyPwd:${input.id}:${ip}`, 5, 15 * 60 * 1000)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Try again in 15 minutes." });
      }

      const list = await db.query.lists.findFirst({
        where: eq(lists.id, input.id),
        columns: { id: true, title: true, password: true },
      });
      if (!list) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid password" });

      const valid = await verifyPassword(input.password, list.password);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid password" });

      if (!list.password.startsWith("pbkdf2:")) {
        await db.update(lists)
          .set({ password: await hashPassword(input.password) })
          .where(eq(lists.id, list.id));
      }

      return { valid: true, listId: list.id, title: list.title };
    }),

  verifyPasswordMutation: publicQuery
    .input(z.object({ id: z.number(), password: z.string().min(1).max(255) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const ip = getClientIp(ctx.req);
      if (!checkRateLimit(`verifyPwd:${input.id}:${ip}`, 5, 15 * 60 * 1000)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Try again in 15 minutes." });
      }

      const list = await db.query.lists.findFirst({
        where: eq(lists.id, input.id),
        columns: { id: true, title: true, password: true },
      });
      if (!list) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid password" });

      const valid = await verifyPassword(input.password, list.password);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid password" });

      if (!list.password.startsWith("pbkdf2:")) {
        await db.update(lists)
          .set({ password: await hashPassword(input.password) })
          .where(eq(lists.id, list.id));
      }

      return { valid: true, listId: list.id, title: list.title };
    }),

  // Claim an item — generates a management token returned to the caller
  claim: publicQuery
    .input(
      z.object({
        itemId: z.number(),
        name: z.string().min(1).max(255),
        email: z.string().email(),
        password: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const ip = getClientIp(ctx.req);
      if (!checkRateLimit(`claim:${ip}`, 10, 15 * 60 * 1000)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Try again later." });
      }
      const item = await db.query.listItems.findFirst({
        where: eq(listItems.id, input.itemId),
        with: { list: true, claims: true },
      });
      if (!item) throw new Error("Item not found");
      // Require the list password — prevents enumerating item IDs to write claims
      const pwOk = await verifyPassword(input.password, item.list.password);
      if (!pwOk) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid list or password" });
      const claimedCount = item.claims.length;
      if (claimedCount >= item.quantity) throw new Error("Item already fully claimed");

      const token = nanoid(32);
      const result = await db.insert(claims).values({
        itemId: input.itemId,
        name: input.name,
        email: input.email,
        token,
      }).returning({ id: claims.id });
      const insertedId = result[0].id;

      const existingAccess = await db.query.listAccess.findFirst({
        where: and(eq(listAccess.listId, item.listId), eq(listAccess.email, input.email)),
      });
      if (!existingAccess) {
        await db.insert(listAccess).values({
          listId: item.listId,
          email: input.email,
          name: input.name,
        });
      }

      return db.query.claims.findFirst({ where: eq(claims.id, insertedId) });
    }),

  // Unclaim — requires the management token issued at claim time
  unclaim: publicQuery
    .input(z.object({ claimId: z.number(), token: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const claim = await db.query.claims.findFirst({
        where: eq(claims.id, input.claimId),
      });
      if (!claim) throw new Error("Claim not found");
      if (!claim.token || !timingSafeEqualString(claim.token, input.token)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      }
      await db.delete(claims).where(eq(claims.id, input.claimId));
      return { success: true };
    }),

  // Mark item as purchased — requires the management token
  markPurchased: publicQuery
    .input(z.object({ claimId: z.number(), token: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const claim = await db.query.claims.findFirst({
        where: eq(claims.id, input.claimId),
      });
      if (!claim) throw new Error("Claim not found");
      if (!claim.token || !timingSafeEqualString(claim.token, input.token)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      }
      await db.update(claims).set({ purchased: true }).where(eq(claims.id, input.claimId));
      return { success: true };
    }),

  // Contribute to a group gift — generates a management token returned to the caller
  contribute: publicQuery
    .input(
      z.object({
        itemId: z.number(),
        name: z.string().min(1).max(255),
        email: z.string().email(),
        amount: z.number().positive(),
        paid: z.boolean().default(false),
        password: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const ip = getClientIp(ctx.req);
      if (!checkRateLimit(`contribute:${ip}`, 10, 15 * 60 * 1000)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Try again later." });
      }
      const item = await db.query.listItems.findFirst({
        where: eq(listItems.id, input.itemId),
        with: { list: true },
      });
      if (!item) throw new Error("Item not found");
      // Require the list password — prevents enumerating item IDs to write contributions
      const pwOk = await verifyPassword(input.password, item.list.password);
      if (!pwOk) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid list or password" });

      const token = nanoid(32);
      const result = await db.insert(contributions).values({
        itemId: input.itemId,
        name: input.name,
        email: input.email,
        amount: String(input.amount),
        paid: input.paid,
        token,
      }).returning({ id: contributions.id });
      const insertedId = result[0].id;

      const existingAccess = await db.query.listAccess.findFirst({
        where: and(eq(listAccess.listId, item.listId), eq(listAccess.email, input.email)),
      });
      if (!existingAccess) {
        await db.insert(listAccess).values({
          listId: item.listId,
          email: input.email,
          name: input.name,
        });
      }

      return db.query.contributions.findFirst({ where: eq(contributions.id, insertedId) });
    }),

  // Update a contribution — requires the management token
  updateContribution: publicQuery
    .input(
      z.object({
        contributionId: z.number(),
        token: z.string(),
        amount: z.number().positive(),
        paid: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const contrib = await db.query.contributions.findFirst({
        where: eq(contributions.id, input.contributionId),
      });
      if (!contrib) throw new Error("Contribution not found");
      if (!contrib.token || !timingSafeEqualString(contrib.token, input.token)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      }
      await db
        .update(contributions)
        .set({ amount: String(input.amount), paid: input.paid })
        .where(eq(contributions.id, input.contributionId));
      return { success: true };
    }),

  // Delete a contribution — requires the management token
  deleteContribution: publicQuery
    .input(z.object({ contributionId: z.number(), token: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const contrib = await db.query.contributions.findFirst({
        where: eq(contributions.id, input.contributionId),
      });
      if (!contrib) throw new Error("Contribution not found");
      if (!contrib.token || !timingSafeEqualString(contrib.token, input.token)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      }
      await db.delete(contributions).where(eq(contributions.id, input.contributionId));
      return { success: true };
    }),
});
