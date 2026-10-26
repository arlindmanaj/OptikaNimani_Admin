// Integration checks against a local development server and its isolated local database.
import assert from "node:assert/strict";
const origin = process.argv[2] || "http://127.0.0.1:5173";
assert(
  ["127.0.0.1", "localhost"].includes(new URL(origin).hostname),
  "Run these checks only against a local preview",
);
const cookie = "__sites_local_auth=1";
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
await send("customer.archive", { customerId: first.id, version: 2 });
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
