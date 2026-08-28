import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

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

export const matches = sqliteTable(
  "matches",
  {
    id: text("id").primaryKey(),
    matchDate: text("match_date").notNull(),
    matchTime: text("match_time"),
    homeName: text("home_name").notNull(),
    homeMark: text("home_mark").notNull(),
    homeCrest: text("home_crest"),
    awayName: text("away_name").notNull(),
    awayMark: text("away_mark").notNull(),
    awayCrest: text("away_crest"),
    score: text("score").notNull(),
    result: text("result").notNull(),
    link: text("link"),
    formation: text("formation"),
    sortOrder: integer("sort_order").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_matches_sort_order").on(table.sortOrder)],
);

export const matchLineups = sqliteTable(
  "match_lineups",
  {
    id: text("id").primaryKey(),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: text("player_id").notNull(),
    playerName: text("player_name").notNull(),
    jerseyNumber: integer("jersey_number").notNull(),
    position: text("position").notNull(),
    lineupRole: text("lineup_role").notNull(),
    x: integer("x").notNull().default(0),
    y: integer("y").notNull().default(0),
    goals: integer("goals").notNull().default(0),
    assists: integer("assists").notNull().default(0),
    rating: real("rating"),
    slotOrder: integer("slot_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("idx_match_lineups_match_player").on(
      table.matchId,
      table.playerId,
    ),
  ],
);

export const matchEvents = sqliteTable(
  "match_events",
  {
    id: text("id").primaryKey(),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    minute: text("minute").notNull(),
    type: text("type").notNull(),
    team: text("team").notNull(),
    playerName: text("player_name").notNull(),
    assistPlayerName: text("assist_player_name"),
    scoreSnapshot: text("score_snapshot").notNull(),
    detail: text("detail"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_match_events_match_id").on(table.matchId)],
);

export const matchEvaluations = sqliteTable(
  "match_evaluations",
  {
    id: text("id").primaryKey(),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    playerName: text("player_name").notNull(),
    goals: integer("goals").notNull().default(0),
    assists: integer("assists").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at"),
  },
  (table) => [
    uniqueIndex("idx_match_evaluations_match_user").on(
      table.matchId,
      table.userId,
    ),
  ],
);

export const matchEvaluationRatings = sqliteTable(
  "match_evaluation_ratings",
  {
    id: text("id").primaryKey(),
    evaluationId: text("evaluation_id")
      .notNull()
      .references(() => matchEvaluations.id, { onDelete: "cascade" }),
    targetKey: text("target_key").notNull(),
    rating: real("rating").notNull(),
  },
  (table) => [
    uniqueIndex("idx_match_evaluation_ratings_eval_target").on(
      table.evaluationId,
      table.targetKey,
    ),
  ],
);
