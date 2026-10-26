"use client";
import DateInput from "./date-input";
import { useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import {
  purchaseInput,
  purchaseCategories,
  today,
  type Purchase,
  type PurchaseInput,
  type Prescription,
} from "./model";
import { useLocale, dateLabel } from "./locale";
export default function PurchaseForm({
  purchase,
  prescriptions,
  busy,
  onSave,
  onCancel,
}: {
  purchase?: Purchase;
  prescriptions: Prescription[];
  busy: boolean;
  onSave: (p: PurchaseInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const { t, language } = useLocale();
  const [error, setError] = useState("");
  const [p, setP] = useState<PurchaseInput>(
    purchase ?? {
      date: today(),
      category: "Prescription glasses",
      description: "",
      brand: "",
      model: "",
      quantity: 1,
      total: "",
      currency: "EUR",
      prescriptionId: null,
      reference: "",
      notes: "",
    },
  );
  const field = (label: string, child: React.ReactNode, hint?: string) => (
    <label className="field">
      <span>{t(label)}</span>
      {child}
      {hint && <small>{t(hint)}</small>}
    </label>
  );
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const r = purchaseInput.safeParse(p);
        if (!r.success) {
          setError(r.error.issues[0].message);
          return;
        }
        setError("");
        await onSave(r.data);
      }}
    >
      <div className="form-body">
        {error && (
          <div className="inline-error" role="alert">
            {t(error)}
          </div>
        )}
        <div className="form-grid">
          {field(
            "Purchase date *",
            <DateInput
              label={t("Purchase date *")}
              required
              autoFocus
              max={today()}
              value={p.date}
              onChange={(v) => setP({ ...p, date: v })}
            />,
          )}
          {field(
            "Category",
            <select
              value={p.category}
              onChange={(e) =>
                setP({
                  ...p,
                  category: e.target.value as PurchaseInput["category"],
                })
              }
            >
              {purchaseCategories.map((c) => (
                <option key={c} value={c}>
                  {t(c)}
                </option>
              ))}
            </select>,
          )}
        </div>
        {field(
          "Item / description *",
          <input
            required
            maxLength={200}
            placeholder={t(
              "e.g. Black acetate frames with prescription lenses",
            )}
            value={p.description}
            onChange={(e) => setP({ ...p, description: e.target.value })}
          />,
        )}
        <div className="form-grid">
          {field(
            "Brand",
            <input
              maxLength={100}
              placeholder="Ray-Ban, Prada…"
              value={p.brand}
              onChange={(e) => setP({ ...p, brand: e.target.value })}
            />,
          )}
          {field(
            "Model",
            <input
              maxLength={100}
              value={p.model}
              onChange={(e) => setP({ ...p, model: e.target.value })}
            />,
          )}
          {field(
            "Quantity *",
            <input
              type="number"
              required
              min={1}
              max={1000}
              step={1}
              value={Number.isNaN(p.quantity) ? "" : p.quantity}
              onChange={(e) =>
                setP({
                  ...p,
                  quantity:
                    e.target.value === "" ? NaN : Number(e.target.value),
                })
              }
            />,
          )}
          {field(
            "Total amount (EUR)",
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={p.total}
              onChange={(e) => setP({ ...p, total: e.target.value })}
            />,
            "Optional. Total for this purchase, including all units.",
          )}
        </div>
        {field(
          "Linked prescription",
          <select
            value={p.prescriptionId ?? ""}
            onChange={(e) =>
              setP({ ...p, prescriptionId: e.target.value || null })
            }
          >
            <option value="">{t("No linked prescription")}</option>
            {[...prescriptions]
              .sort(
                (a, b) =>
                  b.date.localeCompare(a.date) ||
                  b.createdAt.localeCompare(a.createdAt),
              )
              .map((rx) => (
                <option key={rx.id} value={rx.id}>
                  {dateLabel(rx.date, language)} ·{" "}
                  {rx.doctor || t("Prescriber not recorded")}
                  {rx.supersedesId ? ` · ${t("Revision")}` : ""}
                  {prescriptions.some((r) => r.supersedesId === rx.id)
                    ? ` · ${t("Corrected")}`
                    : ""}
                </option>
              ))}
          </select>,
        )}
        {field(
          "Receipt / reference",
          <input
            maxLength={150}
            placeholder={t("Optional receipt number")}
            value={p.reference}
            onChange={(e) => setP({ ...p, reference: e.target.value })}
          />,
        )}
        {field(
          "Purchase notes",
          <textarea
            maxLength={5000}
            rows={3}
            placeholder={t("Additional details about the item…")}
            value={p.notes}
            onChange={(e) => setP({ ...p, notes: e.target.value })}
          />,
        )}
      </div>
      <div className="dialog-actions">
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={onCancel}
        >
          {t("Cancel")}
        </button>
        <button type="submit" className="button primary" disabled={busy}>
          {busy ? (
            <LoaderCircle size={16} className="spin" />
          ) : (
            <Check size={16} />
          )}{" "}
          {t(busy ? "Saving…" : purchase ? "Save changes" : "Save purchase")}
        </button>
      </div>
    </form>
  );
}
