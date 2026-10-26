import assert from "node:assert/strict";
import { parseWrittenDate, writtenDate } from "../lib/dates.ts";
const examples = [
  "26th of October 2026",
  "26 October 2026",
  "October 26th, 2026",
  "26 tetor 2026",
  "26/10/2026",
  "26.10.2026",
  "26-10-2026",
  "2026-10-26",
  "26 Oct 2026",
];
for (const v of examples) assert.equal(parseWrittenDate(v), "2026-10-26", v);
assert.equal(parseWrittenDate("29 February 2024"), "2024-02-29");
assert.equal(parseWrittenDate("26 nëntor 2026"), "2026-11-26");
for (const v of [
  "31/02/2026",
  "29 February 2026",
  "2026-13-01",
  "2/3/26",
  "next Tuesday",
  "26/10/2026 extra",
])
  assert.equal(parseWrittenDate(v), null, v);
assert.equal(writtenDate("2026-10-26", "sq"), "26 tetor 2026");
assert.equal(writtenDate("2026-10-26", "en"), "26 October 2026");
console.log(
  "Written-date checks passed: English/Albanian, ordinals, numeric day/month/year, leap years and invalid dates.",
);
