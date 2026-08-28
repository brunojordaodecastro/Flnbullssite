import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    fullName: text("full_name").notNull(),
    playerName: text("player_name").notNull(),
    playerNameNormalized: text("player_name_normalized").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordSalt: text("password_salt").notNull(),
    jerseyNumber: integer("jersey_number").notNull(),
    position: text("position").notNull(),
    secondaryPosition: text("secondary_position"),
    dominantFoot: text("dominant_foot"),
    avatarKey: text("avatar_key"),
    role: text("role").notNull().default("user"),
    rosterStatus: text("roster_status").notNull().default("not_requested"),
    rosterRequestedAt: integer("roster_requested_at"),
    rosterReviewedAt: integer("roster_reviewed_at"),
    rosterReviewedBy: text("roster_reviewed_by"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at"),
  },
  (table) => [
    uniqueIndex("idx_users_player_name_normalized").on(
      table.playerNameNormalized,
    ),
    index("idx_users_roster_status").on(table.rosterStatus),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_sessions_expires_at").on(table.expiresAt),
    index("idx_sessions_user_id").on(table.userId),
  ],
);

export const authRateLimits = sqliteTable("auth_rate_limits", {
  key: text("key").primaryKey(),
  action: text("action").notNull(),
  subjectHash: text("subject_hash").notNull(),
  clientHash: text("client_hash").notNull(),
  attemptCount: integer("attempt_count").notNull().default(0),
  windowStartedAt: integer("window_started_at").notNull(),
  blockedUntil: integer("blocked_until"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
