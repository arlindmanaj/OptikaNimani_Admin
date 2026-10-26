import { createClient } from "@libsql/client";
import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import { migrate } from "./migrate-turso.mjs";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const tables = ["customers", "prescriptions", "families", "aftercare", "purchases", "attachments", "audit", "staff"];
const canonical = rows => JSON.stringify(rows.map(row => Object.fromEntries(Object.keys(row).sort().map(k => [k, row[k]]))).sort((a,b) => String(a.id).localeCompare(String(b.id))));
export async function importRecords(client, backup) {
  assert.equal(backup.format, "nimani-records-v1");
  assert(tables.every(t => Array.isArray(backup.tables[t])), "Incomplete backup");
  assert.equal(backup.tables.attachments.length, 0, "This import requires a separate attachment transfer when files exist");
  await migrate(client);
  const tx = await client.transaction("write");
  try {
    for (const table of tables) {
      assert.equal(Number((await tx.execute(`SELECT count(*) AS n FROM ${table}`)).rows[0].n), 0, `Target ${table} is not empty. Refusing to overwrite data.`);
      const columns = new Set((await tx.execute(`PRAGMA table_info(${table})`)).rows.map(r => r.name));
      for (const row of backup.tables[table]) {
        const keys = Object.keys(row);
        assert(keys.length && keys.every(k => columns.has(k)), `Unknown or invalid columns in ${table}`);
        await tx.execute({ sql: `INSERT INTO ${table} (${keys.map(k => '"'+k+'"').join(",")}) VALUES (${keys.map(() => "?").join(",")})`, args: keys.map(k => row[k]) });
      }
      const actual = (await tx.execute(`SELECT * FROM ${table}`)).rows.map(r => ({...r}));
      assert.equal(canonical(actual), canonical(backup.tables[table]), `Verification mismatch in ${table}`);
    }
    assert.equal((await tx.execute("PRAGMA foreign_key_check")).rows.length, 0, "Broken record relationships");
    await tx.commit();
    return Object.fromEntries(tables.map(t => [t, backup.tables[t].length]));
  } catch (e) { await tx.rollback(); throw e; } finally { tx.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  nextEnv.loadEnvConfig(process.cwd());
  assert(process.argv[2] && process.argv.includes("--apply"), "Usage: node scripts/import-records.mjs /absolute/private-backup.json --apply");
  assert(process.env.TURSO_DATABASE_URL, "Set the target TURSO_DATABASE_URL and TURSO_AUTH_TOKEN");
  const backup = JSON.parse(await readFile(process.argv[2], "utf8"));
  const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
  try { console.log("Imported and verified record counts:", await importRecords(client, backup)); }
  finally { client.close(); }
}
