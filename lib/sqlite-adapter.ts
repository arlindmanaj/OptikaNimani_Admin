import { createClient, type Client, type InValue, type ResultSet } from "@libsql/client";

// Keeps the existing parameterized SQL and atomic, ordered audit writes intact.
export function databaseClient() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN before signing in");
  if (process.env.VERCEL && !url.startsWith("libsql://") && !url.startsWith("https://"))
    throw new Error("Vercel requires a hosted database, never a local SQLite file");
  return createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
}

function result<T>(value: ResultSet) {
  return { results: value.rows.map(row => Object.fromEntries(value.columns.map(column => [column, row[column]]))) as T[],
    meta: { changes: value.rowsAffected }, success: true };
}

class Statement {
  constructor(readonly client: Client, readonly sql: string, readonly args: InValue[] = []) {}
  bind(...args: unknown[]) { return new Statement(this.client, this.sql, args as InValue[]); }
  async first<T>() { return (await this.all<T>()).results[0] ?? null; }
  async all<T>() { return result<T>(await this.client.execute({ sql: this.sql, args: this.args })); }
  async run() { return this.all(); }
}

export function sqliteDatabase(client: Client) {
  return {
    prepare(sql: string) { return new Statement(client, sql); },
    async batch<T>(statements: Statement[]) {
      // libSQL batch uses one transaction/connection, including SQLite changes().
      return (await client.batch(statements.map(s => ({ sql: s.sql, args: s.args })), "write")).map(result<T>);
    },
  };
}
