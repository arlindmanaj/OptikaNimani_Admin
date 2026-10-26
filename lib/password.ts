import { scrypt, randomBytes, timingSafeEqual, createHash } from "node:crypto";
export const PASSWORD_MIN = 12;
const settings = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
async function derive(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, 64, settings, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}
export async function hashPassword(password: string) {
  const salt = randomBytes(24).toString("base64url");
  const key = await derive(password, salt);
  return `scrypt-v1$${salt}$${key.toString("base64url")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, encoded] = stored.split("$");
  if (scheme !== "scrypt-v1" || !salt || !encoded) return false;
  const expected = Buffer.from(encoded, "base64url");
  const actual = await derive(password, salt);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export const tokenHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const randomToken = () => randomBytes(32).toString("base64url");
