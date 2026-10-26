import { createClient } from "@libsql/client";
import nextEnv from "@next/env";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
nextEnv.loadEnvConfig(process.cwd());
export async function migrate(client) {
  await client.execute("CREATE TABLE IF NOT EXISTS __nimani_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)");
  const journal = JSON.parse(await readFile(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"));
  for (const { tag } of journal.entries) {
    const sql = await readFile(new URL(`../drizzle/${tag}.sql`, import.meta.url), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const prior = await client.execute({ sql: "SELECT checksum FROM __nimani_migrations WHERE name=?", args: [tag] });
    if (prior.rows.length) {
      if (prior.rows[0].checksum !== checksum) throw new Error(`Previously applied migration changed: ${tag}`);
      continue;
    }
    await client.batch([
      ...sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean),
      { sql: "INSERT INTO __nimani_migrations VALUES (?,?,?)", args: [tag, checksum, new Date().toISOString()] },
    ], "write");
    console.log(`Applied ${tag}`);
  }
}
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.TURSO_DATABASE_URL) throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local or the environment");
  const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
  try { await migrate(client); console.log("Database schema is current"); } finally { client.close(); }
}
