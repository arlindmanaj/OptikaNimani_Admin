import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { getStaffUser } from "../../auth";
import {
  customerInput,
  rxInput,
  familyInput,
  careInput,
  purchaseInput,
} from "../../model";
import { sampleCustomers, sampleRx } from "../../sample";
import { z } from "zod";
export const dynamic = "force-dynamic";
const json = (v: unknown, status = 200) =>
  NextResponse.json(v, { status, headers: { "Cache-Control": "no-store" } });
const id = () => crypto.randomUUID();
function db() {
  if (!env.DB) throw new Error("Database is not configured");
  return env.DB;
}
async function owned(customerId: string) {
  return db()
    .prepare("SELECT * FROM customers WHERE id = ?")
    .bind(customerId)
    .first<Record<string, unknown>>();
}
function audit(
  ownerId: string,
  customerId: string,
  action: string,
  author: string,
  now: string,
) {
  return db()
    .prepare(
      "INSERT INTO audit (id,owner_id,customer_id,action,author,created_at) VALUES (?,?,?,?,?,?)",
    )
    .bind(id(), ownerId, customerId, action, author, now);
}
function customerStmt(
  cid: string,
  ownerId: string,
  c: z.infer<typeof customerInput>,
  now: string,
  demo = false,
) {
  return db()
    .prepare(
      "INSERT INTO customers (id,owner_id,first_name,last_name,phone,email,dob,address,notes,tags,archived,demo,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,0,?,1,?,?)",
    )
    .bind(
      cid,
      ownerId,
      c.firstName,
      c.lastName,
      c.phone,
      c.email,
      c.dob,
      c.address,
      c.notes,
      JSON.stringify(c.tags),
      demo ? 1 : 0,
      now,
      now,
    );
}
function rxStmt(
  rid: string,
  cid: string,
  r: z.infer<typeof rxInput>,
  author: string,
  now: string,
) {
  return db()
    .prepare(
      "INSERT INTO prescriptions (id,customer_id,date,doctor,notes,pd_mode,grid,supersedes_id,correction_reason,author,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    )
    .bind(
      rid,
      cid,
      r.date,
      r.doctor,
      r.notes,
      r.pdMode,
      JSON.stringify(r.grid),
      r.supersedesId,
      r.correctionReason,
      author,
      now,
    );
}
export async function GET() {
  const user = await getStaffUser();
  if (!user) return json({ error: "Sign in to view customer records" }, 401);
  try {
    const [cs, rs, fs, as, ats, ps, logs] = await db().batch<
      Record<string, unknown>
    >([
      db().prepare("SELECT * FROM customers ORDER BY updated_at DESC"),
      ...[
        "prescriptions",
        "families",
        "aftercare",
        "attachments",
        "purchases",
      ].map((t) =>
        db().prepare(
          `SELECT r.* FROM ${t} r JOIN customers c ON c.id = r.customer_id ORDER BY r.created_at DESC`,
        ),
      ),
      db().prepare("SELECT * FROM audit ORDER BY created_at DESC LIMIT 500"),
    ]);
    const camel = (r: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(r).map(([k, v]) => [
          k.replace(/_([a-z])/g, (_, s) => s.toUpperCase()),
          v,
        ]),
      );
    return json({
      customers: cs.results.map((r) => ({
        ...camel(r),
        tags: JSON.parse(String(r.tags)),
        archived: !!r.archived,
        demo: !!r.demo,
      })),
      prescriptions: rs.results.map((r) => ({
        ...camel(r),
        grid: JSON.parse(String(r.grid)),
      })),
      families: fs.results.map((r) => ({ ...camel(r), contact: !!r.contact })),
      aftercare: as.results.map(camel),
      attachments: ats.results.map((r) => {
        const { key, ...safe } = r;
        return camel(safe);
      }),
      audit: logs.results.map(camel),
      purchases: ps.results.map((r) => ({
        ...camel(r),
        total:
          r.total_cents === null
            ? ""
            : (Number(r.total_cents) / 100).toFixed(2),
      })),
    });
  } catch (e) {
    console.error("Studio read failed", e);
    return json({ error: "Could not load records. Please try again." }, 500);
  }
}
export async function POST(request: Request) {
  const user = await getStaffUser();
  if (!user) return json({ error: "Sign in to change customer records" }, 401);
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return json({ error: "This request must come from the workspace" }, 403);
  if (Number(request.headers.get("content-length") || 0) > 100000)
    return json({ error: "Request is too large" }, 413);
  try {
    const body = (await request.json()) as {
      action: string;
      customerId?: string;
      data?: unknown;
      version?: number;
    };
    const now = new Date().toISOString(),
      author = user.displayName,
      owner = user.shopId;
    if (
      ["sample", "samples.remove"].includes(body.action) &&
      user.role !== "admin"
    )
      return json({ error: "Administrator access required" }, 403);
    if (body.action === "sample") {
      const existing = await db()
        .prepare("SELECT id FROM customers LIMIT 1")
        .first();
      if (existing)
        return json(
          { error: "Sample records can only be added to an empty workspace" },
          409,
        );
      const ids = sampleCustomers.map((_, i) => `sample-${owner}-${i}`);
      const statements = sampleCustomers.map((c, i) =>
        customerStmt(ids[i], owner, c, now, true),
      );
      for (const [i, cid] of ids.entries())
        if (i !== 6)
          statements.push(rxStmt(id(), cid, sampleRx(i), author, now));
      statements.push(rxStmt(id(), ids[0], sampleRx(0, true), author, now));
      for (const [a, b, rel, contact] of [
        [1, 0, "parent", 1],
        [2, 3, "partner", 0],
        [4, 6, "sibling", 0],
      ] as const)
        statements.push(
          db()
            .prepare(
              "INSERT INTO families (id,customer_id,relative_id,relationship,contact,created_at) VALUES (?,?,?,?,?,?)",
            )
            .bind(id(), ids[a], ids[b], rel, contact, now),
        );
      for (const [i, kind, note] of [
        [
          0,
          "Adjustment",
          "Adjusted the temple fit. Customer confirmed a comfortable fit.",
        ],
        [2, "Repair", "Replaced a loose screw and checked the frame."],
        [4, "Warranty", "Recorded the customer’s warranty enquiry."],
        [5, "Adjustment", "Replaced nose pads and cleaned the frame."],
      ] as const)
        statements.push(
          db()
            .prepare(
              "INSERT INTO aftercare (id,customer_id,date,kind,notes,author,created_at) VALUES (?,?,?,?,?,?,?)",
            )
            .bind(id(), ids[i], "2026-10-20", kind, note, author, now),
        );
      await db().batch(statements);
      return json({ ok: true });
    }
    if (body.action === "samples.remove") {
      const demo = await db()
        .prepare("SELECT id FROM customers WHERE demo=1")
        .all<{ id: string }>();
      const ids = demo.results.map((r) => r.id);
      if (!ids.length) return json({ ok: true });
      // Sample data has an explicit removal path; ordinary records are archived instead.
      const placeholders = ids.map(() => "?").join(",");
      const keys = await db()
        .prepare(
          `SELECT key FROM attachments WHERE customer_id IN (${placeholders})`,
        )
        .bind(...ids)
        .all<{ key: string }>();
      const statements = [
        "purchases",
        "attachments",
        "prescriptions",
        "aftercare",
      ].map((t) =>
        db()
          .prepare(`DELETE FROM ${t} WHERE customer_id IN (${placeholders})`)
          .bind(...ids),
      );
      statements.push(
        db()
          .prepare(
            `DELETE FROM families WHERE customer_id IN (${placeholders}) OR relative_id IN (${placeholders})`,
          )
          .bind(...ids, ...ids),
        db()
          .prepare(`DELETE FROM audit WHERE customer_id IN (${placeholders}) `)
          .bind(...ids),
        db().prepare("DELETE FROM customers WHERE demo=1"),
      );
      await db().batch(statements);
      if (env.BUCKET && keys.results.length)
        await env.BUCKET.delete(keys.results.map((k) => k.key));
      return json({ ok: true });
    }
    if (body.action === "customer.create") {
      const c = customerInput.parse(body.data),
        cid = id();
      await db().batch([
        customerStmt(cid, owner, c, now),
        audit(owner, cid, "Customer registered", author, now),
      ]);
      return json({ id: cid }, 201);
    }
    const cid = z.string().min(1).max(200).parse(body.customerId),
      customer = await owned(cid);
    if (!customer) return json({ error: "Customer was not found" }, 404);
    if (
      body.action === "customer.update" ||
      body.action === "customer.archive"
    ) {
      const version = z.number().int().min(1).parse(body.version);
      if (customer.version !== version)
        return json(
          {
            error:
              "This customer was updated elsewhere. Reload before saving your changes.",
          },
          409,
        );
      const c =
        body.action === "customer.update"
          ? customerInput.parse(body.data)
          : null;
      const statement = c
        ? db()
            .prepare(
              "UPDATE customers SET first_name=?,last_name=?,phone=?,email=?,dob=?,address=?,notes=?,tags=?,version=version+1,updated_at=? WHERE id=? AND version=?",
            )
            .bind(
              c.firstName,
              c.lastName,
              c.phone,
              c.email,
              c.dob,
              c.address,
              c.notes,
              JSON.stringify(c.tags),
              now,
              cid,
              version,
            )
        : db()
            .prepare(
              "UPDATE customers SET archived=?,version=version+1,updated_at=? WHERE id=? AND version=?",
            )
            .bind(customer.archived ? 0 : 1, now, cid, version);
      const result = await db().batch([
        statement,
        db()
          .prepare(
            "INSERT INTO audit (id,owner_id,customer_id,action,author,created_at) SELECT ?,?,?,?,?,? WHERE changes() > 0",
          )
          .bind(
            id(),
            owner,
            cid,
            c
              ? "Customer details updated"
              : customer.archived
                ? "Customer restored"
                : "Customer archived",
            author,
            now,
          ),
      ]);
      if (!result[0].meta.changes)
        return json(
          {
            error:
              "The record changed while you were editing. Reload and try again.",
          },
          409,
        );
      return json({ ok: true });
    }
    if (customer.archived)
      return json(
        { error: "Restore this customer before adding records" },
        409,
      );
    if (
      body.action === "purchase.create" ||
      body.action === "purchase.update"
    ) {
      const raw = z
        .object({
          id: z.string().optional(),
          version: z.number().int().positive().optional(),
        })
        .passthrough()
        .parse(body.data);
      const p = purchaseInput.parse(body.data);
      if (
        p.prescriptionId &&
        !(await db()
          .prepare("SELECT id FROM prescriptions WHERE id=? AND customer_id=?")
          .bind(p.prescriptionId, cid)
          .first())
      )
        return json(
          { error: "Choose a prescription belonging to this customer" },
          400,
        );
      const cents =
        p.total === ""
          ? null
          : (() => {
              const [whole, fraction = ""] = p.total
                .replace(",", ".")
                .split(".");
              return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
            })();
      if (body.action === "purchase.create") {
        const pid = id();
        await db().batch([
          db()
            .prepare(
              "INSERT INTO purchases (id,customer_id,date,category,description,brand,model,quantity,total_cents,currency,prescription_id,reference,notes,version,author,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?)",
            )
            .bind(
              pid,
              cid,
              p.date,
              p.category,
              p.description,
              p.brand,
              p.model,
              p.quantity,
              cents,
              p.currency,
              p.prescriptionId,
              p.reference,
              p.notes,
              author,
              now,
              now,
            ),
          audit(owner, cid, "Purchase recorded", author, now),
        ]);
        return json({ id: pid }, 201);
      }
      const pid = z.string().min(1).parse(raw.id),
        version = z.number().int().positive().parse(raw.version);
      const result = await db().batch([
        db()
          .prepare(
            "UPDATE purchases SET date=?,category=?,description=?,brand=?,model=?,quantity=?,total_cents=?,currency=?,prescription_id=?,reference=?,notes=?,version=version+1,updated_at=? WHERE id=? AND customer_id=? AND version=?",
          )
          .bind(
            p.date,
            p.category,
            p.description,
            p.brand,
            p.model,
            p.quantity,
            cents,
            p.currency,
            p.prescriptionId,
            p.reference,
            p.notes,
            now,
            pid,
            cid,
            version,
          ),
        db()
          .prepare(
            "INSERT INTO audit (id,owner_id,customer_id,action,author,created_at) SELECT ?,?,?,?,?,? WHERE changes()>0",
          )
          .bind(id(), owner, cid, "Purchase updated", author, now),
      ]);
      if (!result[0].meta.changes)
        return json(
          {
            error:
              "This purchase changed elsewhere or is unavailable. Reload before editing.",
          },
          409,
        );
      return json({ ok: true });
    }
    if (body.action === "prescription.create") {
      const r = rxInput.parse(body.data),
        rid = id();
      if (r.supersedesId) {
        const original = await db()
          .prepare("SELECT id FROM prescriptions WHERE id=? AND customer_id=?")
          .bind(r.supersedesId, cid)
          .first();
        if (!original)
          return json(
            { error: "The original prescription was not found" },
            404,
          );
        if (
          await db()
            .prepare("SELECT id FROM prescriptions WHERE supersedes_id=?")
            .bind(r.supersedesId)
            .first()
        )
          return json(
            {
              error:
                "This entry already has a correction. Correct the latest revision instead.",
            },
            409,
          );
      }
      await db().batch([
        rxStmt(rid, cid, r, author, now),
        audit(
          owner,
          cid,
          r.supersedesId ? "Prescription corrected" : "Prescription added",
          author,
          now,
        ),
      ]);
      return json({ id: rid }, 201);
    }
    if (body.action === "family.create") {
      const f = familyInput.parse(body.data);
      if (f.relativeId === cid)
        return json({ error: "Choose a different customer" }, 400);
      const relative = await owned(f.relativeId);
      if (!relative || relative.archived)
        return json(
          { error: "Choose an active customer in this workspace" },
          400,
        );
      const existing = await db()
        .prepare(
          "SELECT id FROM families WHERE (customer_id=? AND relative_id=?) OR (customer_id=? AND relative_id=?)",
        )
        .bind(cid, f.relativeId, f.relativeId, cid)
        .first();
      if (existing)
        return json({ error: "These customers are already connected" }, 409);
      const fid = [cid, f.relativeId].sort().join("::");
      await db().batch([
        db()
          .prepare(
            "INSERT INTO families (id,customer_id,relative_id,relationship,contact,created_at) VALUES (?,?,?,?,?,?)",
          )
          .bind(fid, cid, f.relativeId, f.relationship, f.contact ? 1 : 0, now),
        audit(owner, cid, "Family connection added", author, now),
        audit(owner, f.relativeId, "Family connection added", author, now),
      ]);
      return json({ ok: true });
    }
    if (body.action === "family.remove") {
      const fid = z
        .object({ id: z.string().min(1).max(500) })
        .parse(body.data).id;
      const f = await db()
        .prepare(
          "SELECT * FROM families WHERE id=? AND (customer_id=? OR relative_id=?)",
        )
        .bind(fid, cid, cid)
        .first<{ customer_id: string; relative_id: string }>();
      if (!f) return json({ error: "Family connection was not found" }, 404);
      await db().batch([
        db().prepare("DELETE FROM families WHERE id=?").bind(fid),
        audit(owner, cid, "Family connection removed", author, now),
        audit(
          owner,
          f.customer_id === cid ? f.relative_id : f.customer_id,
          "Family connection removed",
          author,
          now,
        ),
      ]);
      return json({ ok: true });
    }
    if (body.action === "aftercare.create") {
      const a = careInput.parse(body.data);
      await db().batch([
        db()
          .prepare(
            "INSERT INTO aftercare (id,customer_id,date,kind,notes,author,created_at) VALUES (?,?,?,?,?,?,?)",
          )
          .bind(id(), cid, a.date, a.kind, a.notes, author, now),
        audit(owner, cid, "Aftercare visit recorded", author, now),
      ]);
      return json({ ok: true }, 201);
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    if (e instanceof z.ZodError)
      return json({ error: e.issues[0].message }, 400);
    if (e instanceof Error && /UNIQUE constraint/i.test(e.message))
      return json(
        {
          error:
            "This record already exists. Refresh the page to see the latest changes.",
        },
        409,
      );
    console.error("Studio write failed", e);
    return json(
      {
        error:
          "Could not save. Your changes have not been confirmed; please reload before retrying.",
      },
      500,
    );
  }
}
