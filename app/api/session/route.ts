import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  authDb,
  bootstrapAdmin,
  getStaffUser,
  validOrigin,
  workspaceAudit,
} from "../../auth";
import {
  hashPassword,
  verifyPassword,
  tokenHash,
  randomToken,
  PASSWORD_MIN,
} from "../../../lib/password";
export const dynamic = "force-dynamic";
const json = (v: unknown, status = 200) =>
  NextResponse.json(v, { status, headers: { "Cache-Control": "no-store" } });
function cookieName(r: Request) {
  return new URL(r.url).protocol === "https:"
    ? "__Host-nimani-session"
    : "nimani-session";
}
function setCookie(
  r: Request,
  response: NextResponse,
  token: string,
  maxAge: number,
) {
  response.cookies.set(cookieName(r), token, {
    httpOnly: true,
    secure: new URL(r.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return response;
}
export async function GET() {
  const user = await getStaffUser();
  return user ? json({ user }) : json({ error: "Please sign in" }, 401);
}
export async function POST(request: Request) {
  if (!validOrigin(request))
    return json({ error: "Invalid request origin" }, 403);
  if (Number(request.headers.get("content-length") || 0) > 8192)
    return json({ error: "Request is too large" }, 413);
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    if (body.action === "logout") {
      const jar = await cookies();
      const token = jar.get(cookieName(request))?.value;
      if (token)
        await authDb()
          .prepare("DELETE FROM sessions WHERE token_hash=?")
          .bind(tokenHash(token))
          .run();
      return setCookie(request, json({ ok: true }), "", 0);
    }
    if (body.action === "changePassword") {
      const user = await getStaffUser();
      if (!user) return json({ error: "Please sign in" }, 401);
      const data = z
        .object({
          currentPassword: z.string().min(1).max(256),
          password: z
            .string()
            .min(PASSWORD_MIN, "Use at least 12 characters")
            .max(256),
        })
        .parse(body);
      const row = await authDb()
        .prepare("SELECT password_hash FROM staff WHERE id=?")
        .bind(user.id)
        .first<{ password_hash: string }>();
      if (
        !row ||
        !(await verifyPassword(data.currentPassword, row.password_hash))
      )
        return json({ error: "Current password is incorrect" }, 400);
      const hash = await hashPassword(data.password);
      await authDb().batch([
        authDb()
          .prepare("UPDATE staff SET password_hash=?,updated_at=? WHERE id=?")
          .bind(hash, new Date().toISOString(), user.id),
        authDb().prepare("DELETE FROM sessions WHERE staff_id=?").bind(user.id),
        workspaceAudit("Password changed", user.displayName),
      ]);
      return setCookie(request, json({ ok: true }), "", 0);
    }
    if (body.action !== "login") return json({ error: "Unknown action" }, 400);
    const data = z
      .object({
        email: z
          .string()
          .trim()
          .email()
          .max(254)
          .transform((v) => v.toLowerCase()),
        password: z.string().min(1).max(256),
      })
      .parse(body);
    // Persistent counters apply before password work; no raw emails or addresses are kept in them.
    const ip = process.env.VERCEL
      ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() || "unknown"
      : request.headers.get("cf-connecting-ip") || "local";
    const buckets = [
      { key: "email:" + tokenHash(data.email), limit: 10 },
      { key: "ip:" + tokenHash(ip), limit: 40 },
    ];
    const limits = await authDb().batch<{ attempts: number }>(
      buckets.map((b) =>
        authDb()
          .prepare(
            "INSERT INTO login_limits (key,attempts,window_start) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END,window_start=CASE WHEN window_start<? THEN ? ELSE window_start END RETURNING attempts",
          )
          .bind(b.key, now, now - 900, now - 900, now),
      ),
    );
    if (limits.some((v, i) => v.results[0].attempts > buckets[i].limit))
      return json(
        { error: "Too many login attempts. Try again in 15 minutes." },
        429,
      );
    await bootstrapAdmin();
    const row = await authDb()
      .prepare(
        "SELECT id,email,name,role,password_hash,active FROM staff WHERE email=?",
      )
      .bind(data.email)
      .first<{
        id: string;
        email: string;
        name: string;
        role: string;
        password_hash: string;
        active: number;
      }>();
    const hash = row?.password_hash ?? env.NIMANI_INITIAL_ADMIN_HASH;
    const valid = hash ? await verifyPassword(data.password, hash) : false;
    if (!row || !row.active || !valid)
      return json({ error: "Email or password is incorrect" }, 401);
    const token = randomToken(),
      stamp = new Date().toISOString();
    await authDb().batch([
      authDb()
        .prepare(
          "INSERT INTO sessions (token_hash,staff_id,expires_at,created_at) VALUES (?,?,?,?)",
        )
        .bind(tokenHash(token), row.id, now + 43200, stamp),
      authDb()
        .prepare("UPDATE staff SET last_login=? WHERE id=?")
        .bind(stamp, row.id),
      authDb().prepare("DELETE FROM sessions WHERE expires_at<?").bind(now),
      authDb()
        .prepare("DELETE FROM login_limits WHERE window_start<? OR key=?")
        .bind(now - 86400, buckets[0].key),
    ]);
    return setCookie(
      request,
      json({
        ok: true,
        user: {
          id: row.id,
          email: row.email,
          displayName: row.name,
          role: row.role,
        },
      }),
      token,
      43200,
    );
  } catch (e) {
    if (e instanceof z.ZodError)
      return json({ error: e.issues[0].message }, 400);
    console.error("Authentication operation failed");
    return json(
      { error: "Could not complete sign-in. Please try again." },
      500,
    );
  }
}
