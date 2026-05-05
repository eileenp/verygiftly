import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { lists, coOwners, listItems, users } from "@db/schema";
import { eq, and, inArray } from "drizzle-orm";

export const listRouter = createRouter({
  // Create a new list
  create: authedQuery
    .input(
      z.object({
        title: z.string().min(1).max(255),
        password: z.string().min(1).max(255),
        zelle: z.string().max(255).optional(),
        venmo: z.string().max(255).optional(),
        paypal: z.string().max(255).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(lists).values({
        title: input.title,
        password: input.password,
        ownerId: ctx.user.id,
        zelle: input.zelle || null,
        venmo: input.venmo || null,
        paypal: input.paypal || null,
      }).returning({ id: lists.id });
      return db.query.lists.findFirst({ where: eq(lists.id, result[0].id) });
    }),

  // Get all lists owned by the current user
  mine: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const ownedLists = await db.query.lists.findMany({
      where: eq(lists.ownerId, ctx.user.id),
      with: {
        items: { with: { claims: true, contributions: true } },
        accessRecords: true,
      },
    });
    const coOwned = await db.query.coOwners.findMany({
      where: eq(coOwners.userId, ctx.user.id),
      with: { list: { with: { items: { with: { claims: true, contributions: true } }, accessRecords: true } } },
    });
    return { owned: ownedLists, coOwned: coOwned.map((c) => c.list) };
  }),

  // Get a single list by ID (owner or co-owner only)
  get: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const list = await db.query.lists.findFirst({
        where: eq(lists.id, input.id),
        with: {
          items: { with: { claims: true, contributions: true } },
          accessRecords: true,
          coOwners: { with: { user: true } },
        },
      });
      if (!list) throw new Error("List not found");
      const isOwner = list.ownerId === ctx.user.id;
      const isCoOwner = list.coOwners.some((c) => c.userId === ctx.user.id);
      if (!isOwner && !isCoOwner) throw new Error("Unauthorized");
      return list;
    }),

  // Update list settings
  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        password: z.string().min(1).max(255).optional(),
        zelle: z.string().max(255).optional(),
        venmo: z.string().max(255).optional(),
        paypal: z.string().max(255).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db.query.lists.findFirst({
        where: eq(lists.id, input.id),
        with: { coOwners: true },
      });
      if (!existing) throw new Error("List not found");
      const isOwner = existing.ownerId === ctx.user.id;
      const isCoOwner = existing.coOwners.some((c) => c.userId === ctx.user.id);
      if (!isOwner && !isCoOwner) throw new Error("Unauthorized");

      const updateData: Record<string, unknown> = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.password !== undefined) updateData.password = input.password;
      if (input.zelle !== undefined) updateData.zelle = input.zelle || null;
      if (input.venmo !== undefined) updateData.venmo = input.venmo || null;
      if (input.paypal !== undefined) updateData.paypal = input.paypal || null;

      await db.update(lists).set(updateData).where(eq(lists.id, input.id));
      return db.query.lists.findFirst({ where: eq(lists.id, input.id) });
    }),

  // Delete a list
  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db.query.lists.findFirst({
        where: eq(lists.id, input.id),
      });
      if (!existing || existing.ownerId !== ctx.user.id) throw new Error("Unauthorized");
      await db.delete(lists).where(eq(lists.id, input.id));
      return { success: true };
    }),

  // Invite co-owner
  inviteCoOwner: authedQuery
    .input(z.object({ listId: z.number(), email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const list = await db.query.lists.findFirst({
        where: eq(lists.id, input.listId),
      });
      if (!list || list.ownerId !== ctx.user.id) throw new Error("Unauthorized");

      const invitedUser = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });
      if (!invitedUser) throw new Error("User not found");

      const existing = await db.query.coOwners.findFirst({
        where: and(
          eq(coOwners.listId, input.listId),
          eq(coOwners.userId, invitedUser.id),
        ),
      });
      if (existing) throw new Error("Already a co-owner");

      await db.insert(coOwners).values({
        listId: input.listId,
        userId: invitedUser.id,
      });
      return { success: true };
    }),

  // Remove co-owner
  removeCoOwner: authedQuery
    .input(z.object({ listId: z.number(), userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const list = await db.query.lists.findFirst({
        where: eq(lists.id, input.listId),
      });
      if (!list || list.ownerId !== ctx.user.id) throw new Error("Unauthorized");

      await db
        .delete(coOwners)
        .where(
          and(
            eq(coOwners.listId, input.listId),
            eq(coOwners.userId, input.userId),
          ),
        );
      return { success: true };
    }),

  // Get all items across all lists (for master view)
  allItems: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userLists = await db.query.lists.findMany({
      where: eq(lists.ownerId, ctx.user.id),
      columns: { id: true },
    });
    const listIds = userLists.map((l) => l.id);
    if (listIds.length === 0) return [];

    return db.query.listItems.findMany({
      where: inArray(listItems.listId, listIds),
      with: {
        list: true,
        claims: true,
        contributions: true,
      },
    });
  }),
});
