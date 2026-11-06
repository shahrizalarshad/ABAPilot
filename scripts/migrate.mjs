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

/** Describe the target without leaking the password. */
function describe(raw) {
  try {
    const u = new URL(raw);
    return `${u.protocol}//${decodeURIComponent(u.username)}:****@${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "(DATABASE_URL is not a valid URL — check for spaces, quotes or unencoded special characters in the password)";
  }
}

/** Turn common Supabase connection errors into a concrete fix. */
function hint(err, raw) {
  const msg = `${err?.code ?? ""} ${err?.message ?? ""}`;
  // "postgresql://user:pa@ss#1@host..." — an @ or # in the password breaks the URL.
  const afterScheme = raw.replace(/^[a-z]+:\/\//i, "");
  if ((afterScheme.match(/@/g) ?? []).length > 1 || /#/.test(afterScheme.split("@").slice(0, -1).join("@")))
    return "The password seems to contain @ or # which breaks the connection string. Reset the database password to one with only letters and numbers (Project Settings → Database), then update DATABASE_URL.";
  let host = "", port = "", user = "";
  try {
    const u = new URL(raw);
    host = u.hostname; port = u.port; user = decodeURIComponent(u.username);
  } catch {}
  if (/^db\.[a-z0-9]+\.supabase\.co$/.test(host) || /ENETUNREACH|EHOSTUNREACH|EAI_AGAIN|ENOTFOUND/.test(msg))
    return "This looks like the *Direct connection* (IPv6 only, not reachable from Vercel). In Supabase: Connect → Transaction pooler, and use that string (…pooler.supabase.com:6543).";
  if (/password authentication failed|28P01/.test(msg))
    return "Wrong database password. Use the current password (Project Settings → Database → Reset database password) in place of [YOUR-PASSWORD]. If it contains @ : / # ? or %, reset it to one with only letters and numbers.";
  if (/Tenant or user not found|XX000/.test(msg))
    return `The pooler doesn't recognise the user "${user}". With the pooler the user must be "postgres.<project-ref>" — copy the full string from Supabase → Connect → Transaction pooler.`;
  if (/ECONNREFUSED|ETIMEDOUT|timeout/i.test(msg))
    return `Could not reach ${host}:${port}. Check the host and that the port is 6543 (Transaction pooler).`;
  if (/self.signed|certificate/i.test(msg)) return "TLS problem connecting to the database.";
  return "";
}

const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {}, connect_timeout: 15 });
try {
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  console.log("[migrate] Database is up to date.");
} catch (err) {
  // Drizzle wraps the driver error; the useful part is in `cause`.
  const root = err?.cause ?? err;
  console.error("[migrate] Migration failed.");
  console.error("[migrate] Target:", describe(url));
  console.error("[migrate] Cause:", root?.code ? `${root.code} ` : "", root?.message ?? String(root));
  const h = hint(root, url);
  if (h) console.error("[migrate] Fix:", h);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 }).catch(() => {});
}
