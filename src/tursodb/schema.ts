import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, real, blob } from 'drizzle-orm/sqlite-core';

export const usersTable = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  userName: text('userName').unique().notNull(),
  email: text('email').unique().notNull(),
  password: text('password').notNull(),
  systemRole: text('systemRole').notNull().default('user'),
  type: text('type').notNull().default('free'),
  isDeleted: integer('isDeleted').notNull().default(0),
});

export const usersFilesTable = sqliteTable('userFiles', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  fileId: text('fileId')
    .notNull()
    .references(() => filesTable.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  isSelected: integer('isSelected').notNull().default(0),
  createdAt: text('createdAt')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  createdBy: text('createdBy'),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$onUpdate(() => new Date()),
  updatedBy: text('updatedBy'),
});

export const usersSettingsTable = sqliteTable('usersSettings', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  settingId: text('userId')
    .notNull()
    .references(() => settingsTable.id, { onDelete: 'cascade' }),
  createdAt: text('createdAt')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  createdBy: text('createdBy'),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$onUpdate(() => new Date()),
  updatedBy: text('updatedBy'),
});

export const filesTable = sqliteTable('files', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('createdAt')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  createdBy: text('createdBy'),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$onUpdate(() => new Date()),
  updatedBy: text('updatedBy'),
  isDeleted: integer('isDeleted').notNull().default(0),
});

export const categoriesTable = sqliteTable('categories', {
  id: text('id').primaryKey(),
  fileId: text('fileId')
    .notNull()
    .references(() => filesTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('createdAt')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  createdBy: text('createdBy'),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$onUpdate(() => new Date()),
  updatedBy: text('updatedBy'),
  isDeleted: integer('isDeleted').notNull().default(0),
});

export const paperworksTable = sqliteTable('paperworks', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  issuedAt: integer('issuedAt', { mode: 'timestamp' }),
  price: real('price'),
  priceCurrency: text('priceCurrency'),
  createdAt: text('createdAt')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  createdBy: text('createdBy'),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$onUpdate(() => new Date()),
  updatedBy: text('updatedBy'),
  isDeleted: integer('isDeleted').notNull().default(0),
});

export const paperworksCategoriesTable = sqliteTable('paperworksCategories', {
  id: text('id').primaryKey(),
  paperworkId: text('paperworkId')
    .notNull()
    .references(() => paperworksTable.id, { onDelete: 'cascade' }),
  categoryId: text('categoryId')
    .notNull()
    .references(() => categoriesTable.id, { onDelete: 'cascade' }),
  createdAt: text('createdAt')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  createdBy: text('createdBy'),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$onUpdate(() => new Date()),
  updatedBy: text('updatedBy'),
  isDeleted: integer('isDeleted').notNull().default(0),
});

export const documentsTable = sqliteTable('documents', {
  id: text('id').primaryKey(),
  paperworkId: text('paperworkId')
    .notNull()
    .references(() => paperworksTable.id, { onDelete: 'cascade' }),
  fileName: text('fileName').notNull(),
  fileSize: real('fileSize').notNull(),
  fileBlob: blob('fileBlob').notNull(),
  createdAt: text('createdAt')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  createdBy: text('createdBy'),
  isDeleted: integer('isDeleted').notNull().default(0),
});

export const logsTable = sqliteTable('logs', {
  id: integer('id').primaryKey(),
  actionType: text('actionType'),
  method: text('method'),
  message: text('message'),
  oldData: text('oldData'),
  newData: text('newData'),
  actionBy: text('actionBy'),
  ipaddress: text('ipaddress'),
  createdAt: text('createdAt')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export const settingsTable = sqliteTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').unique().notNull(),
  value: text('value').notNull(),
  createdAt: text('createdAt')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  createdBy: text('createdBy'),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$onUpdate(() => new Date()),
  updatedBy: text('updatedBy'),
  isDeleted: integer('isDeleted').notNull().default(0),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

export type InsertFile = typeof filesTable.$inferInsert;
export type SelectFile = typeof filesTable.$inferSelect;

export type InsertUsersFiles = typeof usersFilesTable.$inferInsert;
export type SelectUsersFiles = typeof usersFilesTable.$inferSelect;
