
import {
  pgTable,
  pgSchema,
  uuid,
  text,
  integer,
  date,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  check,
  jsonb
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Reference Supabase's existing auth.users table.
// Drizzle must not create or modify this table.
const auth = pgSchema("auth");

const authUsers = auth.table("users", {
  id: uuid("id").primaryKey(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),

  username: text("username").unique(),

  displayName: text("display_name").notNull(),

  avatarUrl: text("avatar_url"),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).defaultNow().notNull(),
});

export const gameSessions = pgTable(
  "game_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),

    puzzleId: integer("puzzle_id").notNull(),

    puzzleDate: date("puzzle_date").notNull(),

    status: text("status").default("in_progress").notNull(),

    completedAt: timestamp("completed_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_player_daily_game").on(
      table.userId,
      table.puzzleDate
    ),
    index("game_sessions_user_idx").on(table.userId),
    check(
      "valid_game_status",
      sql`${table.status} IN ('in_progress', 'won')`
    ),
  ]
);

export const gameGuesses = pgTable(
  "game_guesses",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    sessionId: uuid("session_id")
      .notNull()
      .references(() => gameSessions.id, { onDelete: "cascade" }),

    guess: text("guess").notNull(),

    rank: integer("rank").notNull(),

    isHint: boolean("is_hint").default(false).notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("unique_guess_per_game").on(
      table.sessionId,
      table.guess
    ),
    index("game_guesses_session_idx").on(table.sessionId),
    check("positive_guess_rank", sql`${table.rank} >= 1`),
  ]
);


export const dailyPuzzles = pgTable(
  "daily_puzzles",
  {
    id: integer("id").primaryKey(),

    puzzleDate: date("puzzle_date")
      .notNull()
      .unique(),

    answer: text("answer").notNull(),

    totalWords: integer("total_words").notNull(),

    rankings: jsonb("rankings")
      .$type<Record<string, number>>()
      .notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "daily_puzzles_positive_total_words",
      sql`${table.totalWords} > 0`
    ),
  ]
);

