"use client";
import { useEffect, useState, useRef } from "react";
import {
  Plus,
  ShieldCheck,
  UserRound,
  KeyRound,
  X,
  LoaderCircle,
} from "lucide-react";
import { useLocale, dateLabel } from "./locale";
type Staff = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "staff";
  active: boolean;
  createdAt: string;
  lastLogin: string | null;
};
export async function signOut() {
  await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "logout" }),
  });
  window.location.assign("/login");
}
export function PasswordSettings() {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section className="card">
      <div className="card-title">
        <h2>{t("Change password")}</h2>
        <KeyRound size={18} />
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          setError("");
          if (f.get("password") !== f.get("confirm")) {
            setError("Passwords do not match");
            setBusy(false);
            return;
          }
          try {
            const r = await fetch("/api/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "changePassword",
                currentPassword: f.get("currentPassword"),
                password: f.get("password"),
              }),
            });
            const d = (await r.json()) as { error?: string };
            if (!r.ok) throw new Error(d.error);
            window.location.assign("/login?changed=1");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not save");
            setBusy(false);
          }
        }}
      >
        <div className="form-body">
          {error && (
            <div className="inline-error" role="alert">
              {t(error)}
            </div>
          )}
          <label className="field">
            <span>{t("Current password")}</span>
            <input
              required
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              maxLength={256}
            />
          </label>
          <label className="field">
            <span>{t("New password")}</span>
            <input
              required
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={256}
            />
          </label>
          <label className="field">
            <span>{t("Confirm password")}</span>
            <input
              required
              type="password"
              name="confirm"
              autoComplete="new-password"
              minLength={12}
              maxLength={256}
            />
          </label>
          <small>
            {t("Changing your password signs out all your sessions.")}
          </small>
        </div>
        <div className="dialog-actions">
          <button className="button primary" disabled={busy}>
            {t(busy ? "Saving…" : "Change password")}
          </button>
        </div>
      </form>
    </section>
  );
}
export default function StaffPanel({ currentId }: { currentId: string }) {
  const { t, language } = useLocale();
  const [staff, setStaff] = useState<Staff[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [modal, setModal] = useState<"create" | Staff | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const load = async () => {
    const r = await fetch("/api/staff", { cache: "no-store" });
    const d = (await r.json()) as { staff: Staff[]; error?: string };
    if (!r.ok) throw new Error(d.error);
    setStaff(d.staff);
  };
  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(d.error);
      setModal(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save staff account");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="card">
        <div className="card-title">
          <div>
            <h2>{t("Your team")}</h2>
            <p>
              {t(
                "Staff share the store’s customer records. Only administrators manage accounts.",
              )}
            </p>
          </div>
          <button
            className="button primary"
            onClick={() => {
              setError("");
              setModal("create");
            }}
          >
            <Plus size={16} />
            {t("Create staff account")}
          </button>
        </div>
        {error && !modal && (
          <div className="inline-error" role="alert">
            {t(error)}
          </div>
        )}
        {loading ? (
          <p className="soft-empty">{t("Loading staff…")}</p>
        ) : (
          staff.map((s) => (
            <article className="staff-row" key={s.id}>
              <span className="square-icon">
                {s.role === "admin" ? (
                  <ShieldCheck size={18} />
                ) : (
                  <UserRound size={18} />
                )}
              </span>
              <div className="staff-person">
                <b>{s.name}</b>
                <small>{s.email}</small>
                <small>
                  {t("Last login")}:{" "}
                  {s.lastLogin
                    ? dateLabel(s.lastLogin, language)
                    : t("Not yet")}
                </small>
              </div>
              <span className="badge">
                {t(s.role === "admin" ? "Administrator" : "Staff")}
              </span>
              <span className="badge">
                {t(s.active ? "Active" : "Inactive")}
              </span>
              <div className="row">
                {s.id === currentId ? (
                  <small>{t("You")}</small>
                ) : (
                  <>
                    <button
                      className="button subtle"
                      disabled={busy}
                      onClick={() => {
                        setError("");
                        setModal(s);
                      }}
                    >
                      <KeyRound size={14} />
                      {t("Reset password")}
                    </button>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        act({ action: "toggle", id: s.id, active: !s.active })
                      }
                    >
                      {t(s.active ? "Deactivate" : "Activate")}
                    </button>
                  </>
                )}
              </div>
            </article>
          ))
        )}
      </section>
      {modal && (
        <dialog
          ref={dialog}
          className="dialog"
          onCancel={(e) => {
            e.preventDefault();
            if (!busy) setModal(null);
          }}
          aria-labelledby="staff-dialog-title"
        >
          <div className="dialog-head">
            <div>
              <h2 id="staff-dialog-title">
                {t(
                  modal === "create"
                    ? "Create staff account"
                    : "Reset password",
                )}
              </h2>
              {modal !== "create" && (
                <p>
                  {modal.name} · {modal.email}
                </p>
              )}
            </div>
            <button
              className="icon-button"
              aria-label={t("Close dialog")}
              disabled={busy}
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (f.get("password") !== f.get("confirm")) {
                setError("Passwords do not match");
                return;
              }
              act(
                modal === "create"
                  ? {
                      action: "create",
                      name: f.get("name"),
                      email: f.get("email"),
                      role: f.get("role"),
                      password: f.get("password"),
                    }
                  : {
                      action: "resetPassword",
                      id: modal.id,
                      password: f.get("password"),
                    },
              );
            }}
          >
            <div className="form-body">
              {error && (
                <div className="inline-error" role="alert">
                  {t(error)}
                </div>
              )}
              {modal === "create" && (
                <>
                  <label className="field">
                    <span>{t("Full name")}</span>
                    <input
                      autoFocus
                      required
                      name="name"
                      maxLength={100}
                      autoComplete="off"
                    />
                  </label>
                  <label className="field">
                    <span>{t("Email address")}</span>
                    <input
                      required
                      name="email"
                      type="email"
                      maxLength={254}
                      autoComplete="off"
                    />
                  </label>
                  <label className="field">
                    <span>{t("Role")}</span>
                    <select name="role">
                      <option value="staff">{t("Staff")}</option>
                      <option value="admin">{t("Administrator")}</option>
                    </select>
                  </label>
                </>
              )}
              <label className="field">
                <span>{t("New password")}</span>
                <input
                  type="password"
                  required
                  name="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={256}
                />
              </label>
              <label className="field">
                <span>{t("Confirm password")}</span>
                <input
                  type="password"
                  required
                  name="confirm"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={256}
                />
              </label>
              <small>
                {t("Use at least 12 characters")}
                {modal !== "create"
                  ? ` · ${t("Existing sessions will be signed out.")}`
                  : ""}
              </small>
            </div>
            <div className="dialog-actions">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setModal(null)}
              >
                {t("Cancel")}
              </button>
              <button className="button primary" disabled={busy}>
                {busy && <LoaderCircle className="spin" size={15} />}{" "}
                {t(
                  busy
                    ? "Saving…"
                    : modal === "create"
                      ? "Create staff account"
                      : "Reset password",
                )}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}
