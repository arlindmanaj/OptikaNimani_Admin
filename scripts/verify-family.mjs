import assert from "node:assert/strict";
import { familySales, connectedFamily } from "../lib/family-sales.ts";
const link = (a, b) => ({ customerId: a, relativeId: b });
const data = {
  customers: [],
  families: [
    link("brother", "parent"),
    link("me", "parent"),
    link("me", "brother"),
  ],
  purchases: [
    {
      id: "mine",
      customerId: "me",
      category: "Prescription glasses",
      quantity: 5,
      totalCents: 50000,
    },
    {
      id: "lens",
      customerId: "parent",
      category: "Lenses",
      quantity: 2,
      totalCents: null,
    },
    {
      id: "outsider",
      customerId: "stranger",
      category: "Sunglasses",
      quantity: 10,
      totalCents: 90000,
    },
  ],
  prescriptions: [
    { id: "rx-me", customerId: "me" },
    { id: "rx-brother", customerId: "brother" },
  ],
};
const before = JSON.stringify(data),
  a = familySales(data, "brother");
assert.equal(a.ids.size, 3);
assert.equal(a.records.length, 2);
assert.equal(a.glasses, 5);
assert.equal(a.amount, 50000);
assert.equal(a.missing, 1);
assert(!a.records.some((p) => p.id === "outsider"));
assert.equal(JSON.stringify(data), before);
assert.deepEqual([...connectedFamily("alone", data.families)], ["alone"]);
data.families = [link("me", "parent")];
assert.equal(familySales(data, "brother").glasses, 0);
console.log(
  "Family checks passed: transitive links, cycles without duplicates, five-glasses example, unrelated customers excluded, missing amounts, unlinking, and unchanged personal prescriptions.",
);
