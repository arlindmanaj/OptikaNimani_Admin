"use client";
import { useState } from "react";
import { Network, ArrowRight, ShoppingBag } from "lucide-react";
import { type Store, type Customer, name } from "./model";
import { dateLabel, money, useLocale } from "./locale";
import { familySales } from "../lib/family-sales";
export default function FamilyPurchases({
  customer,
  data,
  compact = false,
  onOpen,
  onHistory,
}: {
  customer: Customer;
  data: Store;
  compact?: boolean;
  onOpen: (id: string) => void;
  onHistory: () => void;
}) {
  const { t, language } = useLocale();
  const [shown, setShown] = useState(10);
  const sales = familySales(data, customer.id);
  if (sales.ids.size < 2) return null;
  const records = [...sales.records].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
  return (
    <section className={`card family-sales ${compact ? "compact" : ""}`}>
      <div className="card-title">
        <div>
          <h2>
            <Network size={17} />
            {t("Family purchase history")}
          </h2>
          <p>
            {t(
              "Shared purchases across connected relatives. Prescriptions stay personal.",
            )}
          </p>
        </div>
        {compact && (
          <button className="text-link" onClick={onHistory}>
            {t("View history")}
            <ArrowRight size={14} />
          </button>
        )}
      </div>
      <div className="family-sales-totals">
        <div>
          <small>{t("Family members")}</small>
          <b>{sales.ids.size}</b>
        </div>
        <div>
          <small>{t("Purchases")}</small>
          <b>{records.length}</b>
        </div>
        <div>
          <small>{t("Glasses & frames")}</small>
          <b>{sales.glasses}</b>
        </div>
        <div>
          <small>{t("Recorded family spend")}</small>
          <b>{money(sales.amount, language)}</b>
        </div>
      </div>
      {sales.missing > 0 && (
        <p className="family-sales-note">
          {t("{count} purchases have no recorded amount.", {
            count: sales.missing,
          })}
        </p>
      )}
      <div className="family-sales-members">
        {data.customers
          .filter((c) => sales.ids.has(c.id))
          .map((c) => (
            <button
              className={`badge ${c.id === customer.id ? "selected" : ""}`}
              key={c.id}
              onClick={() => onOpen(c.id)}
            >
              {name(c)}
              {c.archived ? ` · ${t("Archived")}` : ""}
            </button>
          ))}
      </div>
      {!compact && (
        <>
          {records.slice(0, shown).map((p) => (
            <article key={p.id} className="family-sale">
              <ShoppingBag size={18} />
              <div>
                <button
                  className="text-link"
                  onClick={() => onOpen(p.customerId)}
                >
                  {name(data.customers.find((c) => c.id === p.customerId))}
                </button>
                <h3>{p.description}</h3>
                <small>
                  {t(p.category)} · {p.quantity}{" "}
                  {t(p.quantity === 1 ? "unit" : "units")} ·{" "}
                  {dateLabel(p.date, language)}
                  {p.brand ? ` · ${p.brand}` : ""}
                </small>
              </div>
              <b>
                {p.totalCents === null ? "—" : money(p.totalCents, language)}
              </b>
            </article>
          ))}
          {records.length === 0 && (
            <p className="soft-empty">{t("No purchases recorded yet.")}</p>
          )}
          {records.length > shown && (
            <div className="family-sales-more">
              <button
                className="button secondary"
                onClick={() => setShown(shown + 10)}
              >
                {t("Show more")}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
