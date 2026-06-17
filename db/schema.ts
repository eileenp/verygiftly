import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  text,
  numeric,
  boolean,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  emailVerified: boolean("emailVerified").notNull().default(false),
  avatar: text("avatar"),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export const lists = pgTable("lists", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  ownerId: integer("ownerId").notNull(),
  zelle: varchar("zelle", { length: 255 }),
  venmo: varchar("venmo", { length: 255 }),
  paypal: varchar("paypal", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const listItems = pgTable("list_items", {
  id: serial("id").primaryKey(),
  listId: integer("listId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
  purchaseUrl: text("purchaseUrl"),
  imageUrl: text("imageUrl"),
  isGroupGift: boolean("isGroupGift").notNull().default(false),
  targetPrice: numeric("targetPrice", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const claims = pgTable("claims", {
  id: serial("id").primaryKey(),
  itemId: integer("itemId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  purchased: boolean("purchased").notNull().default(false),
  token: varchar("token", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const contributions = pgTable("contributions", {
  id: serial("id").primaryKey(),
  itemId: integer("itemId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paid: boolean("paid").notNull().default(false),
  token: varchar("token", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const listAccess = pgTable("list_access", {
  id: serial("id").primaryKey(),
  listId: integer("listId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 255 }),
  saved: boolean("saved").notNull().default(false),
  removedAt: timestamp("removedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const coOwners = pgTable("co_owners", {
  id: serial("id").primaryKey(),
  listId: integer("listId").notNull(),
  userId: integer("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  // One co-owner row per (list, user) — guards against concurrent invite accepts.
  uniqueListUser: unique("co_owners_list_user_unique").on(t.listId, t.userId),
}));

// Pending co-owner invitations. The owner generates a token (capability link);
// the invitee accepts while authenticated. No user lookup at invite time, so
// invitations don't reveal whether an email is registered.
export const coOwnerInvites = pgTable("co_owner_invites", {
  id: serial("id").primaryKey(),
  listId: integer("listId").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  // Optional restriction: if set, only a logged-in user with this email may accept.
  email: varchar("email", { length: 320 }),
  invitedByUserId: integer("invitedByUserId").notNull(),
  accepted: boolean("accepted").notNull().default(false),
  acceptedByUserId: integer("acceptedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
});

export const masterItems = pgTable("master_items", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
  purchaseUrl: text("purchaseUrl"),
  imageUrl: text("imageUrl"),
  isGroupGift: boolean("isGroupGift").notNull().default(false),
  targetPrice: numeric("targetPrice", { precision: 10, scale: 2 }),
  sourceListId: integer("sourceListId"),
  sourceListName: varchar("sourceListName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  notifyClaim: boolean("notifyClaim").notNull().default(true),
  notifyContribution: boolean("notifyContribution").notNull().default(true),
  notifyNewItem: boolean("notifyNewItem").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type MasterItem = typeof masterItems.$inferSelect;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type List = typeof lists.$inferSelect;
export type ListItem = typeof listItems.$inferSelect;
export type Claim = typeof claims.$inferSelect;
export type Contribution = typeof contributions.$inferSelect;
export type ListAccess = typeof listAccess.$inferSelect;
export type CoOwner = typeof coOwners.$inferSelect;
export type CoOwnerInvite = typeof coOwnerInvites.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
