// Applies pending SQL migrations from ./drizzle before `next build`.
// Skipped when DATABASE_URL is not set (e.g. preview builds without a database).
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] DATABASE_URL not set — skipping migrations.");
  process.exit(0);
}

const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
try {
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  console.log("[migrate] Database is up to date.");
} catch (err) {
  console.error("[migrate] Migration failed:", err?.message ?? err);
  if (String(err?.message ?? "").match(/ENETUNREACH|EHOSTUNREACH|ENOTFOUND|getaddrinfo/)) {
    console.error(
      "[migrate] Hint: use Supabase's *Transaction pooler* connection string (…pooler.supabase.com:6543), not the direct db.<ref>.supabase.co address.",
    );
  }
  process.exitCode = 1;
} finally {
  await sql.end();
}
