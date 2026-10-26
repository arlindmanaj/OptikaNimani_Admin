import { NextResponse } from "next/server";
import { z } from "zod";
import { authDb, getStaffUser, validOrigin, workspaceAudit } from "../../auth";
import { hashPassword, PASSWORD_MIN } from "../../../lib/password";
export const dynamic = "force-dynamic";
const json = (v: unknown, status = 200) =>
  NextResponse.json(v, { status, headers: { "Cache-Control": "no-store" } });
export async function GET() {
  const user = await getStaffUser();
  if (!user) return json({ error: "Please sign in" }, 401);
  if (user.role !== "admin")
    return json({ error: "Administrator access required" }, 403);
  const records = await authDb()
    .prepare(
      "SELECT id,email,name,role,active,created_at AS createdAt,last_login AS lastLogin FROM staff ORDER BY created_at",
    )
    .all();
  return json({
    staff: records.results.map((s) => ({ ...s, active: !!s.active })),
  });
}
export async function POST(request: Request) {
  const user = await getStaffUser();
  if (!user) return json({ error: "Please sign in" }, 401);
  if (user.role !== "admin")
    return json({ error: "Administrator access required" }, 403);
  if (!validOrigin(request))
    return json({ error: "Invalid request origin" }, 403);
  if (Number(request.headers.get("content-length") || 0) > 8192)
    return json({ error: "Request is too large" }, 413);
  try {
    const body = (await request.json()) as Record<string, unknown>,
      now = new Date().toISOString();
    if (body.action === "create") {
      const data = z
        .object({
          name: z.string().trim().min(1, "Name is required").max(100),
          email: z
            .string()
            .trim()
            .email("Enter a valid email")
            .max(254)
            .transform((v) => v.toLowerCase()),
          password: z
            .string()
            .min(PASSWORD_MIN, "Use at least 12 characters")
            .max(256),
          role: z.enum(["admin", "staff"]),
        })
        .parse(body);
      const hash = await hashPassword(data.password),
        id = crypto.randomUUID();
      await authDb().batch([
        authDb()
          .prepare(
            "INSERT INTO staff (id,email,name,password_hash,role,active,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)",
          )
          .bind(id, data.email, data.name, hash, data.role, now, now),
        workspaceAudit("Staff account created", user.displayName),
      ]);
      return json({ id }, 201);
    }
    const id = z.string().min(1).max(200).parse(body.id);
    if (body.action === "toggle") {
      if (id === user.id)
        return json({ error: "You cannot deactivate your own account" }, 400);
      const active = z.boolean().parse(body.active);
      const result = await authDb().batch([
        authDb()
          .prepare(
            "UPDATE staff SET active=?,updated_at=? WHERE id=? AND (role<>'admin' OR ?=1 OR active=0 OR (SELECT COUNT(*) FROM staff WHERE role='admin' AND active=1)>1)",
          )
          .bind(active ? 1 : 0, now, id, active ? 1 : 0),
        authDb().prepare("DELETE FROM sessions WHERE staff_id=?").bind(id),
        workspaceAudit(
          active ? "Staff account activated" : "Staff account deactivated",
          user.displayName,
        ),
      ]);
      if (!result[0].meta.changes)
        return json(
          { error: "The last active administrator cannot be deactivated" },
          409,
        );
      return json({ ok: true });
    }
    if (body.action === "resetPassword") {
      if (id === user.id)
        return json(
          { error: "Use your password settings to change your own password" },
          400,
        );
      const password = z
        .string()
        .min(PASSWORD_MIN, "Use at least 12 characters")
        .max(256)
        .parse(body.password);
      const exists = await authDb()
        .prepare("SELECT id FROM staff WHERE id=?")
        .bind(id)
        .first();
      if (!exists) return json({ error: "Staff account not found" }, 404);
      const hash = await hashPassword(password);
      await authDb().batch([
        authDb()
          .prepare("UPDATE staff SET password_hash=?,updated_at=? WHERE id=?")
          .bind(hash, now, id),
        authDb().prepare("DELETE FROM sessions WHERE staff_id=?").bind(id),
        workspaceAudit("Staff password reset", user.displayName),
      ]);
      return json({ ok: true });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    if (e instanceof z.ZodError)
      return json({ error: e.issues[0].message }, 400);
    if (e instanceof Error && /UNIQUE/.test(e.message))
      return json({ error: "An account with this email already exists" }, 409);
    console.error("Staff operation failed");
    return json({ error: "Could not save staff account" }, 500);
  }
}
