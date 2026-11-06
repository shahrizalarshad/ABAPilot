import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DB = PostgresJsDatabase<typeof schema>;

declare global {
  var __abapilotDb: DB | undefined;
}

/**
 * Lazily connect on first use, so builds and pages that don't touch the
 * database work without DATABASE_URL. One pool per server instance.
 */
export function getDb(): DB {
  if (globalThis.__abapilotDb) return globalThis.__abapilotDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  // Supabase's transaction pooler (port 6543) doesn't support prepared statements.
  const sql = postgres(url, { prepare: false, max: 5 });
  globalThis.__abapilotDb = drizzle(sql, { schema });
  return globalThis.__abapilotDb;
}
