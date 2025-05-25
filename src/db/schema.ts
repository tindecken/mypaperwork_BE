import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Start -- betterAuth schema --
export const usersTable = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  isEmailVerified: integer("isEmailVerified", { mode: "boolean" }).notNull(),
  userType: text("userType").notNull().default("free"),
  image: text("image"),
  avatar: text("avatar"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  isDeleted: integer("isDeleted").default(0),
});

export const sessionsTable = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
});

export const accountsTable = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const verificationsTable = sqliteTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

// End -- betterAuth schema --

// Removed usersFilesTable as it references the removed filesTable

export const usersSettingsTable = sqliteTable("usersSettings", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  settingId: text("userId")
    .notNull()
    .references(() => settingsTable.id, { onDelete: "cascade" }),
  createdAt: text('createdAt')
  .default(sql`(CURRENT_TIMESTAMP)`)
  .notNull(),
  createdBy: text('createdBy'),
  updatedAt: text('updatedAt').$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
  updatedBy: text("updatedBy"),
});

export const usersThemesTable = sqliteTable("usersThemes", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  themeId: text("themeId")
    .notNull()
    .references(() => themesTable.id, { onDelete: "cascade" }),
  createdAt: text('createdAt')
  .default(sql`(CURRENT_TIMESTAMP)`)
  .notNull(),
  createdBy: text('createdBy'),
  updatedAt: text('updatedAt').$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
  updatedBy: text("updatedBy"),
});

export const categoriesTable = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    icon: text("icon"),
    name: text("name").notNull(),
    note: text("note"),
    createdAt: text('createdAt')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
    createdBy: text("createdBy"),
    updatedAt: text('updatedAt').$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
    updatedBy: text("updatedBy"),
    isDeleted: integer("isDeleted").notNull().default(0),
  },
  (t) => ({
    uniqueUserandName: uniqueIndex("userId_name").on(t.userId, t.name),
  })
);

export const paperworksTable = sqliteTable("paperworks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  note: text("note"),
  customFields: text({ mode: 'json' }).$type<{ foo: string }>(),
  issuedAt: text("issuedAt"),
  createdAt: text('createdAt')
  .default(sql`(CURRENT_TIMESTAMP)`)
  .notNull(),
  createdBy: text("createdBy"),
  sharedLink: text("sharedLink"),
  updatedAt: text('updatedAt').$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
  updatedBy: text("updatedBy"),
  isDeleted: integer("isDeleted").notNull().default(0),
});

export const paperworksCategoriesTable = sqliteTable("paperworksCategories", {
  id: text("id").primaryKey(),
  paperworkId: text("paperworkId")
    .notNull()
    .references(() => paperworksTable.id, { onDelete: "cascade" }),
  categoryId: text("categoryId")
    .notNull()
    .references(() => categoriesTable.id, { onDelete: "cascade" }),
  createdAt: text('createdAt')
  .default(sql`(CURRENT_TIMESTAMP)`)
  .notNull(),
  createdBy: text("createdBy"),
  updatedAt: text('updatedAt').$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
  updatedBy: text("updatedBy"),
  isDeleted: integer("isDeleted").notNull().default(0),
});

export const documentsTable = sqliteTable("documents", {
  id: text("id").primaryKey(),
  paperworkId: text("paperworkId")
    .notNull()
    .references(() => paperworksTable.id, { onDelete: "cascade" }),
  fileName: text("fileName").notNull(),
  fileSize: real("fileSize").notNull(),
  filePath: text("filePath").notNull(),
  reducedImageSizeFilePath: text("reducedFilePath"),
  reducedImageFileSize: real("reducedImageFileSize"),
  coverPath: text("coverPath"),
  createdAt: text('createdAt')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  createdBy: text("createdBy"),
  updatedAt: text('updatedAt').$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
  updatedBy: text("updatedBy"),
  isCover: integer("isCover").notNull().default(0),
  isDeleted: integer("isDeleted").notNull().default(0),
});

export const logsTable = sqliteTable("logs", {
  id: text("id").primaryKey(),
  actionType: text("actionType"),
  method: text("method"),
  request: text("request"),
  message: text("message"),
  oldData: text("oldData"),
  newData: text("newData"),
  actionBy: text("actionBy"),
  ipaddress: text("ipaddress"),
  createdAt: text('createdAt')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export const settingsTable = sqliteTable("settings", {
  id: text("id").primaryKey(),
  key: text("key").unique().notNull(),
  value: text("value").notNull(),
  description: text("description"),
  createdAt: text('createdAt')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  createdBy: text("createdBy"),
  updatedAt: text('updatedAt').$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
  updatedBy: text("updatedBy"),
  isDeleted: integer("isDeleted").notNull().default(0),
});

export const themesTable = sqliteTable("themes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  value: text("value").notNull(),
  description: text("description"),
  createdAt: text('createdAt')
  .default(sql`(CURRENT_TIMESTAMP)`)
  .notNull(),
  createdBy: text("createdBy"),
  updatedAt: text('updatedAt').$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
  updatedBy: text("updatedBy"),
  isDeleted: integer("isDeleted").notNull().default(0),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

// File and UsersFiles types removed since their tables were removed

export type InsertCategory = typeof categoriesTable.$inferInsert;
export type SelectCategory = typeof categoriesTable.$inferSelect;

export type InsertPaperwork = typeof paperworksTable.$inferInsert;

export type InsertPaperworksCategories =
  typeof paperworksCategoriesTable.$inferInsert;
export type InsertDocument = typeof documentsTable.$inferInsert;

export type InsertLog = typeof logsTable.$inferInsert;

export type SelectPaperwork = typeof paperworksTable.$inferSelect;
export type SelectPaperworkWithCategory = SelectPaperwork & {
  categories: string[];
  coverBase64?: string | null;
  coverFileName?: string | null;
  documentCount: number | null;
};

export type InsertTheme = typeof themesTable.$inferInsert;
