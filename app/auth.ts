import { cookies } from "next/headers";
import { env } from "cloudflare:workers";
import { redirect } from "next/navigation";
import { tokenHash } from "../lib/password";
export type StaffUser = {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "staff";
  shopId: "nimani";
};
export function authDb() {
  if (!env.DB) throw new Error("Database is not configured");
  return env.DB;
}
export async function getStaffUser(): Promise<StaffUser | null> {
  const jar = await cookies();
  const token =
    jar.get("__Host-nimani-session")?.value ?? jar.get("nimani-session")?.value;
  if (!token || token.length > 100) return null;
  const user = await authDb()
    .prepare(
      "SELECT s.id,s.email,s.name,s.role FROM sessions x JOIN staff s ON s.id=x.staff_id WHERE x.token_hash=? AND x.expires_at>? AND s.active=1",
    )
    .bind(tokenHash(token), Math.floor(Date.now() / 1000))
    .first<{
      id: string;
      email: string;
      name: string;
      role: "admin" | "staff";
    }>();
  return user
    ? {
        id: user.id,
        email: user.email,
        displayName: user.name,
        role: user.role,
        shopId: "nimani",
      }
    : null;
}
export async function requireStaff() {
  const user = await getStaffUser();
  if (user) return user;
  redirect("/login");
}
export function validOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
export async function bootstrapAdmin() {
  const hash = env.NIMANI_INITIAL_ADMIN_HASH,
    email = env.NIMANI_ADMIN_EMAIL?.trim().toLowerCase();
  if (!hash || !email) return;
  await authDb()
    .prepare(
      "INSERT OR IGNORE INTO staff (id,email,name,password_hash,role,active,created_at,updated_at) SELECT 'nimani-initial-admin',?,'Optika Nimani',?,'admin',1,?,? WHERE NOT EXISTS (SELECT 1 FROM staff)",
    )
    .bind(email, hash, new Date().toISOString(), new Date().toISOString())
    .run();
}
export function workspaceAudit(action: string, author: string) {
  return authDb()
    .prepare(
      "INSERT INTO audit (id,owner_id,customer_id,action,author,created_at) VALUES (?,?,?,?,?,?)",
    )
    .bind(
      crypto.randomUUID(),
      "nimani",
      "workspace",
      action,
      author,
      new Date().toISOString(),
    );
}
