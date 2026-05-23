import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { listItems, lists, masterItems } from "@db/schema";
import { eq, inArray } from "drizzle-orm";

export const itemRouter = createRouter({
  // Create an item
  create: authedQuery
    .input(
      z.object({
        listId: z.number(),
        name: z.string().min(1).max(255),
        price: z.number().optional(),
        quantity: z.number().min(1).default(1),
        notes: z.string().optional(),
        purchaseUrl: z.string().optional(),
        imageUrl: z.string().optional(),
        isGroupGift: z.boolean().default(false),
        targetPrice: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const list = await db.query.lists.findFirst({
        where: eq(lists.id, input.listId),
        with: { coOwners: true },
      });
      if (!list) throw new Error("List not found");
      const isOwner = list.ownerId === ctx.user.id;
      const isCoOwner = list.coOwners.some((c) => c.userId === ctx.user.id);
      if (!isOwner && !isCoOwner) throw new Error("Unauthorized");

      const result = await db.insert(listItems).values({
        listId: input.listId,
        name: input.name,
        price: input.price ? String(input.price) : null,
        quantity: input.quantity,
        notes: input.notes || null,
        purchaseUrl: input.purchaseUrl || null,
        imageUrl: input.imageUrl || null,
        isGroupGift: input.isGroupGift,
        targetPrice: input.targetPrice ? String(input.targetPrice) : null,
      }).returning({ id: listItems.id });

      // Mirror to master list (persists even if removed from shared list)
      await db.insert(masterItems).values({
        ownerId: ctx.user.id,
        name: input.name,
        price: input.price ? String(input.price) : null,
        quantity: input.quantity,
        notes: input.notes || null,
        purchaseUrl: input.purchaseUrl || null,
        imageUrl: input.imageUrl || null,
        isGroupGift: input.isGroupGift,
        targetPrice: input.targetPrice ? String(input.targetPrice) : null,
        sourceListId: input.listId,
        sourceListName: list.title,
      });

      return db.query.listItems.findFirst({
        where: eq(listItems.id, result[0].id),
        with: { claims: true, contributions: true },
      });
    }),

  // Update an item
  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        price: z.number().optional(),
        quantity: z.number().min(1).optional(),
        notes: z.string().optional(),
        purchaseUrl: z.string().optional(),
        imageUrl: z.string().optional(),
        isGroupGift: z.boolean().optional(),
        targetPrice: z.number().optional(),
        listId: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const item = await db.query.listItems.findFirst({
        where: eq(listItems.id, input.id),
        with: { list: { with: { coOwners: true } } },
      });
      if (!item) throw new Error("Item not found");
      const isOwner = item.list.ownerId === ctx.user.id;
      const isCoOwner = item.list.coOwners.some((c) => c.userId === ctx.user.id);
      if (!isOwner && !isCoOwner) throw new Error("Unauthorized");

      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.price !== undefined) updateData.price = input.price ? String(input.price) : null;
      if (input.quantity !== undefined) updateData.quantity = input.quantity;
      if (input.notes !== undefined) updateData.notes = input.notes || null;
      if (input.purchaseUrl !== undefined) updateData.purchaseUrl = input.purchaseUrl || null;
      if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl || null;
      if (input.isGroupGift !== undefined) updateData.isGroupGift = input.isGroupGift;
      if (input.targetPrice !== undefined) updateData.targetPrice = input.targetPrice ? String(input.targetPrice) : null;
      if (input.listId !== undefined && input.listId !== item.listId) {
        const targetList = await db.query.lists.findFirst({
          where: eq(lists.id, input.listId),
          with: { coOwners: true },
        });
        if (!targetList) throw new Error("Target list not found");
        const isTargetOwner = targetList.ownerId === ctx.user.id;
        const isTargetCoOwner = targetList.coOwners.some((c) => c.userId === ctx.user.id);
        if (!isTargetOwner && !isTargetCoOwner) throw new Error("Unauthorized");
        updateData.listId = input.listId;
      }

      await db.update(listItems).set(updateData).where(eq(listItems.id, input.id));
      return db.query.listItems.findFirst({
        where: eq(listItems.id, input.id),
        with: { claims: true, contributions: true },
      });
    }),

  // Delete an item
  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const item = await db.query.listItems.findFirst({
        where: eq(listItems.id, input.id),
        with: { list: { with: { coOwners: true } } },
      });
      if (!item) throw new Error("Item not found");
      const isOwner = item.list.ownerId === ctx.user.id;
      const isCoOwner = item.list.coOwners.some((c) => c.userId === ctx.user.id);
      if (!isOwner && !isCoOwner) throw new Error("Unauthorized");

      await db.delete(listItems).where(eq(listItems.id, input.id));
      return { success: true };
    }),

  // Move multiple items to another list
  move: authedQuery
    .input(z.object({ itemIds: z.array(z.number()), targetListId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // Verify ownership of target list
      const targetList = await db.query.lists.findFirst({
        where: eq(lists.id, input.targetListId),
        with: { coOwners: true },
      });
      if (!targetList) throw new Error("Target list not found");
      const isTargetOwner = targetList.ownerId === ctx.user.id;
      const isTargetCoOwner = targetList.coOwners.some((c) => c.userId === ctx.user.id);
      if (!isTargetOwner && !isTargetCoOwner) throw new Error("Unauthorized");

      // Verify ownership of every source item
      const sourceItems = await db.query.listItems.findMany({
        where: inArray(listItems.id, input.itemIds),
        with: { list: { with: { coOwners: true } } },
      });
      for (const item of sourceItems) {
        const isSourceOwner = item.list.ownerId === ctx.user.id;
        const isSourceCoOwner = item.list.coOwners.some((c) => c.userId === ctx.user.id);
        if (!isSourceOwner && !isSourceCoOwner) throw new Error("Unauthorized");
      }

      await db
        .update(listItems)
        .set({ listId: input.targetListId })
        .where(inArray(listItems.id, input.itemIds));
      return { success: true };
    }),

  // Delete multiple items at once
  bulkDelete: authedQuery
    .input(z.object({ itemIds: z.array(z.number()) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const items = await db.query.listItems.findMany({
        where: inArray(listItems.id, input.itemIds),
        with: { list: { with: { coOwners: true } } },
      });
      for (const item of items) {
        const isOwner = item.list.ownerId === ctx.user.id;
        const isCoOwner = item.list.coOwners.some((c) => c.userId === ctx.user.id);
        if (!isOwner && !isCoOwner) throw new Error("Unauthorized");
      }
      await db.delete(listItems).where(inArray(listItems.id, input.itemIds));
      return { success: true };
    }),

  // Copy multiple items to another list
  copy: authedQuery
    .input(z.object({ itemIds: z.array(z.number()), targetListId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // Verify ownership of target list
      const targetList = await db.query.lists.findFirst({
        where: eq(lists.id, input.targetListId),
        with: { coOwners: true },
      });
      if (!targetList) throw new Error("Target list not found");
      const isTargetOwner = targetList.ownerId === ctx.user.id;
      const isTargetCoOwner = targetList.coOwners.some((c) => c.userId === ctx.user.id);
      if (!isTargetOwner && !isTargetCoOwner) throw new Error("Unauthorized");

      // Verify ownership of every source item
      const items = await db.query.listItems.findMany({
        where: inArray(listItems.id, input.itemIds),
        with: { list: { with: { coOwners: true } } },
      });
      for (const item of items) {
        const isSourceOwner = item.list.ownerId === ctx.user.id;
        const isSourceCoOwner = item.list.coOwners.some((c) => c.userId === ctx.user.id);
        if (!isSourceOwner && !isSourceCoOwner) throw new Error("Unauthorized");
      }

      for (const item of items) {
        await db.insert(listItems).values({
          listId: input.targetListId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes,
          purchaseUrl: item.purchaseUrl,
          imageUrl: item.imageUrl,
          isGroupGift: item.isGroupGift,
          targetPrice: item.targetPrice,
        });
      }
      return { success: true };
    }),
});
