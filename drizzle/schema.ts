import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const filmGrabBenchmarks = mysqlTable("filmGrabBenchmarks", {
  id: int("id").autoincrement().primaryKey(),
  filmTitle: varchar("filmTitle", { length: 255 }).notNull(),
  sourcePage: varchar("sourcePage", { length: 512 }).notNull().unique(),
  imageUrls: text("imageUrls").notNull(),
  palette: text("palette").notNull(),
  analysis: text("analysis").notNull(),
  sourceUpdatedAt: timestamp("sourceUpdatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FilmGrabBenchmark = typeof filmGrabBenchmarks.$inferSelect;
export type InsertFilmGrabBenchmark = typeof filmGrabBenchmarks.$inferInsert;

export const characterPromptBenchmarks = mysqlTable("characterPromptBenchmarks", {
  id: int("id").autoincrement().primaryKey(),
  caseName: varchar("caseName", { length: 128 }).notNull().unique(),
  platform: varchar("platform", { length: 64 }).notNull(),
  strength: varchar("strength", { length: 64 }).notNull(),
  inputFields: text("inputFields").notNull(),
  outputPrompts: text("outputPrompts").notNull(),
  sourceLabel: varchar("sourceLabel", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CharacterPromptBenchmark = typeof characterPromptBenchmarks.$inferSelect;
export type InsertCharacterPromptBenchmark = typeof characterPromptBenchmarks.$inferInsert;
