import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { Analysis } from "@/lib/schema";
import type { Conventions } from "@/lib/conventions";

/**
 * Tables live in the `public` schema. RLS is enabled with no policies, so the
 * Supabase Data API (anon / authenticated roles) can't read them at all.
 * The app reads and writes only from the server through DATABASE_URL.
 *
 * `userId` is the Supabase Auth user id (auth.users.id).
 */

export const analyses = pgTable(
  "analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    ticketId: text("ticket_id").notNull().default(""),
    title: text("title").notNull().default(""),
    module: text("module").notNull().default(""),
    changeId: text("change_id").notNull().default(""),
    fsdVersion: text("fsd_version").notNull().default(""),
    description: text("description").notNull(),
    code: text("code").notNull().default(""),
    spec: text("spec").notNull().default(""),
    result: jsonb("result").$type<Analysis>().notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("analyses_user_created_idx").on(t.userId, t.createdAt.desc())],
).enableRLS();

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id").primaryKey(),
  conventions: jsonb("conventions").$type<Conventions>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}).enableRLS();

export type AnalysisRow = typeof analyses.$inferSelect;
