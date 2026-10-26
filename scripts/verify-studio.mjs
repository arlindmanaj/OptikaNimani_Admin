// Integration checks against a local development server and its isolated local database.
import assert from "node:assert/strict";
const origin = process.argv[2] || "http://127.0.0.1:5173";
assert(
  ["127.0.0.1", "localhost"].includes(new URL(origin).hostname),
  "Run these checks only against a local preview",
);
const cookie = process.env.NIMANI_TEST_COOKIE;
assert(cookie, "Use verify-auth.mjs to run with a real local session");
let checks = 0;
function check(condition, message) {
  assert(condition, message);
  checks++;
  console.log("PASS " + message);
}
async function read() {
  const r = await fetch(origin + "/api/studio", {
    headers: { Cookie: cookie },
  });
  assert.equal(r.status, 200);
  return r.json();
}
async function send(action, payload = {}, expected = 200) {
  const r = await fetch(origin + "/api/studio", {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const d = await r.json();
  assert.equal(r.status, expected, JSON.stringify(d));
  return d;
}
check(
  (await fetch(origin + "/api/studio")).status === 401,
  "Anonymous reads are rejected",
);
check(
  (
    await fetch(origin + "/api/studio", {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: "https://elsewhere.example",
        "Content-Type": "application/json",
      },
      body: "{}",
    })
  ).status === 403,
  "Cross-origin writes are rejected",
);
const c = {
  firstName: "Integration",
  lastName: "Fixture " + Date.now(),
  phone: "",
  email: "",
  dob: "",
  address: "Local test only",
  notes: "Automated local verification fixture",
  tags: [],
};
const first = await send("customer.create", { data: c }, 201),
  second = await send(
    "customer.create",
    { data: { ...c, firstName: "Related" } },
    201,
  );
let state = await read();
check(
  state.customers.some((v) => v.id === first.id),
  "Created customers survive a separate database read",
);
await send("customer.update", {
  customerId: first.id,
  version: 1,
  data: { ...c, notes: "Updated once" },
});
await send(
  "customer.update",
  { customerId: first.id, version: 1, data: { ...c, notes: "Stale write" } },
  409,
);
check(
  (await read()).customers.find((v) => v.id === first.id).notes ===
    "Updated once",
  "Stale edits cannot overwrite newer customer details",
);
const grid = Object.fromEntries(
  ["distance", "computer", "near"].map((k) => [
    k,
    {
      od: { sph: "", cyl: "", axis: "", pd: "" },
      os: { sph: "", cyl: "", axis: "", pd: "" },
      pd: "",
    },
  ]),
);
const rx = {
  date: "2026-10-20",
  doctor: "Dr. Integration",
  notes: "Local test",
  pdMode: "binocular",
  grid,
  supersedesId: null,
  correctionReason: "",
};
await send("prescription.create", { customerId: first.id, data: rx }, 400);
grid.near.od.sph = "0";
grid.near.os.sph = "+1.25";
grid.near.pd = "60";
const original = await send(
  "prescription.create",
  { customerId: first.id, data: rx },
  201,
);
const changed = structuredClone(rx);
changed.grid.near.os.sph = "+1.50";
changed.supersedesId = original.id;
await send("prescription.create", { customerId: first.id, data: changed }, 400);
changed.correctionReason = "Corrected transcription";
const revision = await send(
  "prescription.create",
  { customerId: first.id, data: changed },
  201,
);
await send("prescription.create", { customerId: first.id, data: changed }, 409);
state = await read();
check(
  state.prescriptions.find((v) => v.id === original.id).grid.near.os.sph ===
    "+1.25" && state.prescriptions.some((v) => v.id === revision.id),
  "Correction preserves the original prescription",
);
check(
  state.prescriptions.find((v) => v.id === original.id).grid.near.od.sph ===
    "0" &&
    state.prescriptions.find((v) => v.id === original.id).grid.distance.od
      .sph === "",
  "Zero and blank measurements remain distinct",
);
const bad = structuredClone(rx);
bad.grid.distance.od.axis = "181";
await send("prescription.create", { customerId: first.id, data: bad }, 400);
check(true, "Invalid axis values are rejected server-side");
await send(
  "prescription.create",
  { customerId: crypto.randomUUID(), data: rx },
  404,
);
check(true, "Unknown or inaccessible customer IDs cannot receive records");
await send("family.create", {
  customerId: first.id,
  data: { relativeId: second.id, relationship: "parent", contact: true },
});
await send(
  "family.create",
  {
    customerId: second.id,
    data: { relativeId: first.id, relationship: "child", contact: false },
  },
  409,
);
state = await read();
const family = state.families.find(
  (v) => v.customerId === first.id && v.relativeId === second.id,
);
check(
  family?.contact && family.relationship === "parent",
  "Family contact and relationship are retained; reciprocal duplicates are rejected",
);
await send(
  "aftercare.create",
  {
    customerId: first.id,
    data: {
      date: "2026-10-20",
      kind: "Adjustment",
      notes: "Local fit adjustment",
    },
  },
  201,
);
check(
  (await read()).aftercare.some((v) => v.customerId === first.id),
  "Aftercare is linked to the customer",
);
const file = new File(
  [
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
      "base64",
    ),
  ],
  "synthetic-test.png",
  { type: "image/png" },
);
const form = new FormData();
form.set("file", file);
form.set("prescriptionId", original.id);
const uploaded = await fetch(origin + "/api/files", {
  method: "POST",
  headers: { Cookie: cookie, Origin: origin },
  body: form,
});
assert.equal(uploaded.status, 201, await uploaded.clone().text());
const attachment = await uploaded.json();
const download = await fetch(origin + "/api/files?id=" + attachment.id, {
  headers: { Cookie: cookie },
});
check(
  download.status === 200 &&
    download.headers.get("content-type") === "image/png" &&
    Buffer.from(await download.arrayBuffer()).equals(
      Buffer.from(await file.arrayBuffer()),
    ),
  "Original attachment survives upload and authenticated download",
);
check(
  (await fetch(origin + "/api/files?id=" + attachment.id)).status === 401,
  "Anonymous attachment downloads are rejected",
);
const invalidForm = new FormData();
invalidForm.set(
  "file",
  new File(["<script>test</script>"], "fake.png", { type: "image/png" }),
);
invalidForm.set("prescriptionId", original.id);
check(
  (
    await fetch(origin + "/api/files", {
      method: "POST",
      headers: { Cookie: cookie, Origin: origin },
      body: invalidForm,
    })
  ).status === 400,
  "Disguised unsupported attachments are rejected",
);
const purchaseData = {
  date: "2026-10-20",
  category: "Prescription glasses",
  description: "Fictional black frames",
  brand: "Example",
  model: "TEST-01",
  quantity: 2,
  total: "129,90",
  currency: "EUR",
  prescriptionId: original.id,
  reference: "LOCAL-TEST",
  notes: "Local purchase fixture",
};
const purchased = await send(
  "purchase.create",
  { customerId: first.id, data: purchaseData },
  201,
);
state = await read();
let purchase = state.purchases.find((p) => p.id === purchased.id);
check(
  purchase.totalCents === 12990 &&
    purchase.total === "129.90" &&
    purchase.quantity === 2,
  "Purchase totals use exact integer cents and accept decimal commas",
);
check(
  purchase.prescriptionId === original.id && purchase.brand === "Example",
  "Purchase history retains item details and the exact linked prescription",
);
await send(
  "purchase.create",
  { customerId: second.id, data: purchaseData },
  400,
);
check(true, "A purchase cannot link another customer’s prescription");
await send(
  "purchase.create",
  { customerId: first.id, data: { ...purchaseData, total: "1.999" } },
  400,
);
await send(
  "purchase.create",
  { customerId: first.id, data: { ...purchaseData, quantity: 0 } },
  400,
);
check(true, "Invalid monetary precision and quantities are rejected");
await send("purchase.update", {
  customerId: first.id,
  data: {
    ...purchaseData,
    id: purchased.id,
    version: 1,
    total: "",
    notes: "Corrected purchase note",
  },
});
await send(
  "purchase.update",
  {
    customerId: first.id,
    data: { ...purchaseData, id: purchased.id, version: 1 },
  },
  409,
);
purchase = (await read()).purchases.find((p) => p.id === purchased.id);
check(
  purchase.version === 2 &&
    purchase.totalCents === null &&
    purchase.notes === "Corrected purchase note",
  "Purchase edits preserve optional empty amounts and reject stale overwrites",
);
const free = await send(
  "purchase.create",
  { customerId: first.id, data: { ...purchaseData, total: "0" } },
  201,
);
check(
  (await read()).purchases.find((p) => p.id === free.id).totalCents === 0,
  "A recorded zero amount stays distinct from a missing amount",
);
await send("purchase.delete", {
  customerId: first.id,
  data: { id: purchased.id, version: 2 },
});
state = await read();
let removedPurchase = state.deletedPurchases.find((p) => p.id === purchased.id);
check(
  !state.purchases.some((p) => p.id === purchased.id) &&
    removedPurchase?.version === 3,
  "Deleted purchases leave active lists and retain their original data for recovery",
);
await send(
  "purchase.update",
  {
    customerId: first.id,
    data: { ...purchaseData, id: purchased.id, version: 3 },
  },
  409,
);
await send(
  "purchase.restore",
  {
    customerId: first.id,
    data: {
      id: purchased.id,
      version: 2,
      deletedAt: removedPurchase.deletedAt,
    },
  },
  409,
);
check(
  true,
  "Stale writes and stale restores cannot resurrect a deleted purchase",
);
await send(
  "prescription.delete",
  { customerId: second.id, data: { id: original.id } },
  404,
);
await send("prescription.delete", {
  customerId: first.id,
  data: { id: original.id },
});
state = await read();
const removedRx = state.deletedPrescriptions.find((p) => p.id === original.id);
check(
  !state.prescriptions.some((p) => p.id === original.id) &&
    removedRx?.grid.near.os.sph === "+1.25" &&
    state.purchases.some(
      (p) => p.id === free.id && p.prescriptionId === original.id,
    ),
  "Deleting a prescription preserves its measurements, correction revisions and linked purchases",
);
assert.equal(
  (
    await fetch(origin + "/api/files?id=" + attachment.id, {
      headers: { Cookie: cookie },
    })
  ).status,
  404,
);
await send(
  "purchase.create",
  { customerId: first.id, data: purchaseData },
  400,
);
check(
  true,
  "Deleted prescriptions cannot receive new links and their attachments stay out of active downloads",
);
await send("prescription.restore", {
  customerId: first.id,
  data: { id: original.id, deletedAt: removedRx.deletedAt },
});
check(
  (
    await fetch(origin + "/api/files?id=" + attachment.id, {
      headers: { Cookie: cookie },
    })
  ).status === 200,
  "Restoring a prescription restores access to its original attachment",
);
await send("purchase.restore", {
  customerId: first.id,
  data: {
    id: purchased.id,
    version: removedPurchase.version,
    deletedAt: removedPurchase.deletedAt,
  },
});
check(
  (await read()).purchases.some(
    (p) => p.id === purchased.id && p.version === 4,
  ),
  "Restored purchases return to active history with a new version",
);
await send("customer.archive", { customerId: first.id, version: 2 });
await send(
  "purchase.create",
  { customerId: first.id, data: purchaseData },
  409,
);
check(
  (await read()).purchases.some((p) => p.id === purchased.id),
  "Archiving preserves purchase history and blocks new purchases",
);
await send(
  "aftercare.create",
  {
    customerId: first.id,
    data: {
      date: "2026-10-20",
      kind: "Repair",
      notes: "Blocked archived write",
    },
  },
  409,
);
state = await read();
check(
  state.customers.find((v) => v.id === first.id).archived &&
    state.prescriptions.some((v) => v.id === original.id) &&
    state.aftercare.some((v) => v.customerId === first.id),
  "Archive preserves history and blocks new entries",
);
await send("customer.archive", { customerId: first.id, version: 3 });
check(
  !(await read()).customers.find((v) => v.id === first.id).archived,
  "Archived customers can be restored",
);
state = await read();
check(
  state.audit.filter((v) => v.customerId === first.id).length >= 7,
  "Changes have dated author-attributed activity entries",
);
await send("family.remove", { customerId: first.id, data: { id: family.id } });
await send("customer.archive", { customerId: first.id, version: 4 });
await send("customer.archive", { customerId: second.id, version: 1 });
console.log(
  `\n${checks} integration checks passed. Test fixtures were archived in the LOCAL database only.`,
);
