import { put, get, del } from "@vercel/blob";
import { databaseClient, sqliteDatabase } from "./sqlite-adapter";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";

function localBucket() {
  const dir = process.env.NIMANI_LOCAL_FILE_DIR;
  if (!dir || process.env.VERCEL || !process.env.TURSO_DATABASE_URL?.startsWith("file:")) return undefined;
  const target = (key: string) => {
    if (!/^nimani\/[a-zA-Z0-9-]+$/.test(key)) throw new Error("Invalid attachment key");
    return path.join(dir, key);
  };
  return {
    async put(key: string, bytes: Uint8Array) { const file = target(key); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, bytes); },
    async get(key: string) { try { return { body: new Uint8Array(await readFile(target(key))) }; } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return null; throw e; } },
    async delete(keys: string | string[]) { for (const key of [keys].flat()) await rm(target(key), { force: true }); },
  };
}

let database: ReturnType<typeof sqliteDatabase> | undefined;
export const env = {
  get DB() { return database ??= sqliteDatabase(databaseClient()); },
  get NIMANI_ADMIN_EMAIL() { return process.env.NIMANI_ADMIN_EMAIL; },
  get NIMANI_INITIAL_ADMIN_HASH() { return process.env.NIMANI_INITIAL_ADMIN_HASH; },
  get BUCKET() {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return localBucket();
    return {
      async put(key: string, bytes: Uint8Array, options: { httpMetadata: { contentType: string } }) {
        await put(key, Buffer.from(bytes), { access: "private", addRandomSuffix: false, contentType: options.httpMetadata.contentType });
      },
      async get(key: string) {
        const object = await get(key, { access: "private" });
        return object?.statusCode === 200 ? { body: object.stream } : null;
      },
      async delete(keys: string | string[]) { await del(keys); },
    };
  },
};
