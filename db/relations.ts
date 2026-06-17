import { relations } from "drizzle-orm";
import { users, lists, listItems, claims, contributions, listAccess, coOwners, coOwnerInvites, masterItems } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  lists: many(lists),
  coOwnedLists: many(coOwners),
}));

export const listsRelations = relations(lists, ({ one, many }) => ({
  owner: one(users, { fields: [lists.ownerId], references: [users.id] }),
  items: many(listItems),
  accessRecords: many(listAccess),
  coOwners: many(coOwners),
}));

export const listItemsRelations = relations(listItems, ({ one, many }) => ({
  list: one(lists, { fields: [listItems.listId], references: [lists.id] }),
  claims: many(claims),
  contributions: many(contributions),
}));

export const claimsRelations = relations(claims, ({ one }) => ({
  item: one(listItems, { fields: [claims.itemId], references: [listItems.id] }),
}));

export const contributionsRelations = relations(contributions, ({ one }) => ({
  item: one(listItems, { fields: [contributions.itemId], references: [listItems.id] }),
}));

export const listAccessRelations = relations(listAccess, ({ one }) => ({
  list: one(lists, { fields: [listAccess.listId], references: [lists.id] }),
}));

export const coOwnersRelations = relations(coOwners, ({ one }) => ({
  list: one(lists, { fields: [coOwners.listId], references: [lists.id] }),
  user: one(users, { fields: [coOwners.userId], references: [users.id] }),
}));

export const coOwnerInvitesRelations = relations(coOwnerInvites, ({ one }) => ({
  list: one(lists, { fields: [coOwnerInvites.listId], references: [lists.id] }),
  invitedBy: one(users, { fields: [coOwnerInvites.invitedByUserId], references: [users.id] }),
}));

export const masterItemsRelations = relations(masterItems, ({ one }) => ({
  owner: one(users, { fields: [masterItems.ownerId], references: [users.id] }),
}));
