import { env } from "cloudflare:workers";
import { getStaffUser } from "../../auth";
export const dynamic = "force-dynamic";
const reply = (error: string, status: number) =>
  Response.json({ error }, { status });
const max = 8 * 1024 * 1024;
export async function POST(request: Request) {
  const user = await getStaffUser();
  if (!user) return reply("Sign in to attach files", 401);
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return reply("Invalid request origin", 403);
  if (Number(request.headers.get("content-length") || 0) > max + 20000)
    return reply("Files must be 8 MB or smaller", 413);
  if (!env.DB || !env.BUCKET) return reply("File storage is unavailable", 503);
  try {
    const form = await request.formData(),
      file = form.get("file"),
      rxId = String(form.get("prescriptionId") || "");
    if (!(file instanceof File) || file.size === 0 || file.size > max)
      return reply("Choose a non-empty file up to 8 MB", 400);
    const row = await env.DB.prepare(
      "SELECT p.customer_id,c.archived FROM prescriptions p JOIN customers c ON c.id=p.customer_id WHERE p.id=? AND p.deleted_at IS NULL",
    )
      .bind(rxId)
      .first<{ customer_id: string; archived: number }>();
    if (!row) return reply("Prescription not found", 404);
    if (row.archived)
      return reply("Restore this customer before adding attachments", 409);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime =
      bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
        ? "image/jpeg"
        : bytes[0] === 0x89 &&
            bytes[1] === 0x50 &&
            bytes[2] === 0x4e &&
            bytes[3] === 0x47
          ? "image/png"
          : new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-"
            ? "application/pdf"
            : null;
    if (!mime) return reply("Use a JPG, PNG or PDF file", 400);
    const fid = crypto.randomUUID(),
      key = `${user.shopId}/${fid}`,
      now = new Date().toISOString();
    await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: mime } });
    try {
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO attachments (id,customer_id,prescription_id,name,key,mime,size,created_at) VALUES (?,?,?,?,?,?,?,?)",
        ).bind(
          fid,
          row.customer_id,
          rxId,
          file.name.slice(0, 200),
          key,
          mime,
          file.size,
          now,
        ),
        env.DB.prepare(
          "INSERT INTO audit (id,owner_id,customer_id,action,author,created_at) VALUES (?,?,?,?,?,?)",
        ).bind(
          crypto.randomUUID(),
          user.shopId,
          row.customer_id,
          "Prescription attachment added",
          user.displayName,
          now,
        ),
      ]);
    } catch (e) {
      await env.BUCKET.delete(key);
      throw e;
    }
    return Response.json({ id: fid }, { status: 201 });
  } catch (e) {
    console.error("File upload failed", e);
    return reply("Could not attach the file. Please try again.", 500);
  }
}
export async function GET(request: Request) {
  const user = await getStaffUser();
  if (!user) return reply("Sign in to view files", 401);
  if (!env.DB || !env.BUCKET) return reply("File storage is unavailable", 503);
  try {
    const fid = new URL(request.url).searchParams.get("id");
    const a = await env.DB.prepare(
      "SELECT a.* FROM attachments a JOIN customers c ON c.id=a.customer_id JOIN prescriptions p ON p.id=a.prescription_id WHERE a.id=? AND p.deleted_at IS NULL",
    )
      .bind(fid)
      .first<{ key: string; mime: string; name: string }>();
    if (!a) return reply("File not found", 404);
    const obj = await env.BUCKET.get(a.key);
    if (!obj) return reply("File not found", 404);
    return new Response(obj.body, {
      headers: {
        "Content-Type": a.mime,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(a.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error("File read failed", e);
    return reply("Could not open this file", 500);
  }
}
