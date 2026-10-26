"use client";
import { RotateCcw, Glasses, ShoppingBag } from "lucide-react";
import { type Store, type Prescription, type Purchase } from "./model";
import { dateLabel, useLocale } from "./locale";
export default function DeletedRecords({
  customerId,
  data,
  busy,
  onRestore,
}: {
  customerId: string;
  data: Store;
  busy: boolean;
  onRestore: (
    kind: "purchase" | "prescription",
    record: Purchase | Prescription,
  ) => void;
}) {
  const { t, language } = useLocale();
  const prescriptions = data.deletedPrescriptions.filter(
      (r) => r.customerId === customerId,
    ),
    purchases = data.deletedPurchases.filter(
      (r) => r.customerId === customerId,
    );
  return (
    <section className="card deleted-records">
      <div className="card-title">
        <div>
          <h2>{t("Deleted records")}</h2>
          <p>
            {t(
              "Restore purchases or prescriptions removed by mistake. Original details are kept.",
            )}
          </p>
        </div>
        <span className="badge">{prescriptions.length + purchases.length}</span>
      </div>
      {prescriptions.length + purchases.length === 0 ? (
        <p className="soft-empty">{t("No deleted records.")}</p>
      ) : (
        <>
          {prescriptions.map((r) => (
            <article className="deleted-row" key={r.id}>
              <span className="square-icon">
                <Glasses size={18} />
              </span>
              <div>
                <b>
                  {t("Prescription")} · {dateLabel(r.date, language)}
                </b>
                <small>{r.doctor || t("Prescriber not recorded")}</small>
                <small>
                  {t("Deleted on")} {dateLabel(r.deletedAt ?? "", language)}
                </small>
              </div>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => onRestore("prescription", r)}
              >
                <RotateCcw size={15} />
                {t("Restore")}
              </button>
            </article>
          ))}
          {purchases.map((r) => (
            <article className="deleted-row" key={r.id}>
              <span className="square-icon">
                <ShoppingBag size={18} />
              </span>
              <div>
                <b>{r.description}</b>
                <small>
                  {dateLabel(r.date, language)} · {r.quantity}{" "}
                  {t(r.quantity === 1 ? "unit" : "units")}
                </small>
                <small>
                  {t("Deleted on")} {dateLabel(r.deletedAt ?? "", language)}
                </small>
              </div>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => onRestore("purchase", r)}
              >
                <RotateCcw size={15} />
                {t("Restore")}
              </button>
            </article>
          ))}
        </>
      )}
    </section>
  );
}
