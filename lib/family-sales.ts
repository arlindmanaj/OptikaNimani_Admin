import type { Store, Family } from "../app/model";
export function connectedFamily(id: string, links: Family[]) {
  const ids = new Set([id]),
    queue = [id];
  while (queue.length) {
    const current = queue.shift()!;
    for (const link of links) {
      const next =
        link.customerId === current
          ? link.relativeId
          : link.relativeId === current
            ? link.customerId
            : null;
      if (next && !ids.has(next)) {
        ids.add(next);
        queue.push(next);
      }
    }
  }
  return ids;
}
export function familySales(data: Store, id: string) {
  const ids = connectedFamily(id, data.families);
  const records = data.purchases.filter((p) => ids.has(p.customerId));
  return {
    ids,
    records,
    glasses: records
      .filter((p) =>
        ["Prescription glasses", "Sunglasses", "Frames"].includes(p.category),
      )
      .reduce((n, p) => n + p.quantity, 0),
    amount: records.reduce((n, p) => n + (p.totalCents ?? 0), 0),
    missing: records.filter((p) => p.totalCents === null).length,
  };
}
