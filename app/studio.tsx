"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Users,
  Glasses,
  HeartHandshake,
  Network,
  Settings,
  Search,
  Plus,
  ArrowUpRight,
  ArrowLeft,
  ChevronRight,
  FileText,
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  MoreHorizontal,
  Download,
  Printer,
  Paperclip,
  X,
  Check,
  Archive,
  RotateCcw,
  ShieldCheck,
  Link2,
  Unlink,
  ArrowRight,
  LoaderCircle,
  Copy,
  CheckCircle2,
  SlidersHorizontal,
  ShoppingBag,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  customerInput,
  rxInput,
  careInput,
  familyInput,
  emptyCustomer,
  emptyGrid,
  groups,
  name,
  today,
  type Store,
  type Customer,
  type CustomerInput,
  type Prescription,
  type RxInput,
  type Grid,
  type Family,
  type Care,
  purchaseInput,
  purchaseCategories,
  type Purchase,
  type PurchaseInput,
} from "./model";
import PurchaseForm from "./purchase-form";
import DateInput from "./date-input";
import DeletedRecords from "./deleted-records";
import FamilyPurchases from "./family-purchases";
import StaffPanel, { PasswordSettings, signOut } from "./staff-panel";
import { useLocale, LanguageSwitch, dateLabel, money } from "./locale";

type View =
  | "customers"
  | "prescriptions"
  | "families"
  | "aftercare"
  | "purchases"
  | "settings"
  | "staff";
// Staff administration is shown only to administrators; the API enforces it too.
type Tab =
  | "overview"
  | "prescriptions"
  | "family"
  | "aftercare"
  | "purchases"
  | "activity"
  | "deleted";
const tabLabels: Record<Tab, string> = {
  overview: "Overview",
  prescriptions: "Prescriptions",
  family: "Family connections",
  aftercare: "Aftercare",
  purchases: "Purchases",
  activity: "Activity",
  deleted: "Deleted records",
};
type Modal = {
  kind:
    | "customer"
    | "rx"
    | "family"
    | "care"
    | "purchase"
    | "viewRx"
    | "compare"
    | "archive"
    | "unlink"
    | "samplesRemove"
    | "delete";
  deletion?: "purchase" | "prescription";
  customer?: Customer;
  rx?: Prescription;
  family?: Family;
  purchase?: Purchase;
};
const empty: Store = {
  customers: [],
  prescriptions: [],
  families: [],
  aftercare: [],
  attachments: [],
  audit: [],
  purchases: [],
  deletedPrescriptions: [],
  deletedPurchases: [],
};
const initials = (c?: Customer) =>
  c ? (c.firstName[0] + c.lastName[0]).toUpperCase() : "N";
const signed = (v: string) =>
  v === "" ? "—" : Number(v) > 0 && !v.startsWith("+") ? "+" + v : v;
const inverse: Record<string, string> = {
  parent: "child",
  child: "parent",
  partner: "partner",
  sibling: "sibling",
  other: "relative",
};
function relation(f: Family, cid: string) {
  return f.customerId === cid ? f.relationship : inverse[f.relationship];
}
function otherId(f: Family, cid: string) {
  return f.customerId === cid ? f.relativeId : f.customerId;
}
function latestRx(s: Store, cid: string) {
  return s.prescriptions
    .filter(
      (p) =>
        p.customerId === cid &&
        !s.prescriptions.some((r) => r.supersedesId === p.id),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
}
function Logo() {
  return (
    <div className="brand">
      <img
        src="/optika-nimani-logo.png"
        alt="OPTIKA NIMANI — Premium Eyewear"
      />
      <span className="brand-mobile" aria-hidden="true">
        ON
      </span>
    </div>
  );
}
function Avatar({
  customer,
  small = false,
}: {
  customer?: Customer;
  small?: boolean;
}) {
  const palette = ["sage", "sand", "lavender", "rose"];
  const color = customer
    ? palette[
        (customer.firstName.charCodeAt(0) + customer.lastName.charCodeAt(0)) % 4
      ]
    : "sage";
  return (
    <span className={`avatar ${color} ${small ? "small" : ""}`}>
      {initials(customer)}
    </span>
  );
}
function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Empty({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h3>{t(title)}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const { t } = useLocale();
  return (
    <label className="field">
      <span>{t(label)}</span>
      {children}
      {hint && <small>{t(hint)}</small>}
    </label>
  );
}
function Dialog({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const { t } = useLocale();

  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current!.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-head">
        <div>
          <h2 id="dialog-title">{t(title)}</h2>
          {subtitle && <p>{t(subtitle)}</p>}
        </div>
        <button
          className="icon-button"
          aria-label={t("Close dialog")}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function GridTable({ rx }: { rx: RxInput }) {
  const { t, language } = useLocale();

  return (
    <div className="grid-scroll">
      <table className="rx-grid">
        <thead>
          <tr>
            <th>{t("Purpose")}</th>
            <th>{t("Eye")}</th>
            <th>SPH</th>
            <th>CYL</th>
            <th>{t("AXIS")}</th>
            <th>
              PD <small>mm</small>
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map(([key, label, al]) =>
            ["od", "os"].map((eye, i) => {
              const e = rx.grid[key][eye as "od" | "os"];
              return (
                <tr key={key + eye} className={i === 0 ? "group-start" : ""}>
                  {i === 0 && (
                    <th rowSpan={2}>
                      {t(label)}
                      <small>{language === "sq" ? label : al}</small>
                    </th>
                  )}
                  <td>
                    <b>{eye.toUpperCase()}</b>
                    <small>{eye === "od" ? t("Right") : t("Left")}</small>
                  </td>
                  <td>{signed(e.sph)}</td>
                  <td>{signed(e.cyl)}</td>
                  <td>{e.axis ? e.axis + "°" : "—"}</td>
                  {rx.pdMode === "monocular" ? (
                    <td>{e.pd || "—"}</td>
                  ) : i === 0 ? (
                    <td rowSpan={2}>{rx.grid[key].pd || "—"}</td>
                  ) : null}
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function Studio({
  displayName,
  role,
  staffId,
  email,
}: {
  displayName: string;
  role: "admin" | "staff";
  staffId: string;
  email: string;
}) {
  const { t, language } = useLocale();
  const fmt = (v: string) => dateLabel(v, language);
  const [data, setData] = useState<Store>(empty),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState("");
  const [view, setView] = useState<View>("customers"),
    [selected, setSelected] = useState(""),
    [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("active"),
    [sort, setSort] = useState("name"),
    [page, setPage] = useState(1);
  const [modal, setModal] = useState<Modal | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [compare, setCompare] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    const r = await fetch("/api/studio", { cache: "no-store" });
    const d = (await r.json()) as Store & { error?: string };
    if (r.status === 401) {
      window.location.assign("/login");
      throw new Error("Please sign in");
    }
    if (!r.ok) throw new Error(d.error || "Unable to load records");
    setData(d);
    setLoadError("");
  }, []);
  useEffect(() => {
    load()
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [load]);
  useEffect(() => {
    const hash = () => {
      const p = new URLSearchParams(location.hash.slice(1));
      setView(
        ([
          "customers",
          "prescriptions",
          "families",
          "aftercare",
          "purchases",
          "settings",
          ...(role === "admin" ? ["staff"] : []),
        ].includes(p.get("view") || "")
          ? p.get("view")
          : "customers") as View,
      );
      setSelected(p.get("customer") || "");
      setTab(
        ([
          "overview",
          "prescriptions",
          "family",
          "aftercare",
          "activity",
          "deleted",
          "purchases",
        ].includes(p.get("tab") || "")
          ? p.get("tab")
          : "overview") as Tab,
      );
      setCompare([]);
    };
    hash();
    window.addEventListener("hashchange", hash);
    return () => window.removeEventListener("hashchange", hash);
  }, []);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => setPage(1), [query, filter, sort]);
  const go = (v: View, cid = "", t: Tab = "overview") => {
    location.hash = new URLSearchParams({
      view: v,
      ...(cid ? { customer: cid, tab: t } : {}),
    }).toString();
  };
  const open = (m: Modal) => {
    setError("");
    setModal(m);
  };
  const close = () => {
    if (!busy) {
      setModal(null);
      setError("");
    }
  };
  async function act(
    action: string,
    payload: Record<string, unknown> = {},
    message = "Saved successfully",
  ) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const result = (await r.json()) as {
        id?: string;
        ok?: boolean;
        error?: string;
      };
      if (r.status === 401) {
        window.location.assign("/login");
        return null;
      }
      if (!r.ok) throw new Error(result.error || "Could not save");
      setModal(null);
      setToast(message);
      try {
        await load();
      } catch {
        setLoadError(
          "Your change was saved, but the records could not refresh. Reload to see the latest version.",
        );
      }
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
      return null;
    } finally {
      setBusy(false);
    }
  }
  const customer = data.customers.find((c) => c.id === selected);
  const active = data.customers.filter((c) => !c.archived);
  const q = query.toLocaleLowerCase().trim();
  const matches = (c: Customer) =>
    [
      name(c),
      c.phone,
      c.phone.replace(/\D/g, ""),
      c.email,
      c.address,
      ...c.tags,
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(q);
  let list = data.customers.filter(
    (c) =>
      (filter === "archived"
        ? c.archived
        : filter === "all"
          ? true
          : !c.archived) && matches(c),
  );
  if (filter === "family")
    list = list.filter((c) =>
      data.families.some((f) => f.customerId === c.id || f.relativeId === c.id),
    );
  if (filter === "noRx")
    list = list.filter(
      (c) => !data.prescriptions.some((p) => p.customerId === c.id),
    );
  list.sort((a, b) =>
    sort === "recent"
      ? b.updatedAt.localeCompare(a.updatedAt)
      : name(a).localeCompare(name(b)),
  );
  const getC = (cid: string) => data.customers.find((c) => c.id === cid);
  const getFamily = (cid: string) =>
    data.families.filter((f) => f.customerId === cid || f.relativeId === cid);
  const getCare = (cid: string) =>
    data.aftercare
      .filter((a) => a.customerId === cid)
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          b.createdAt.localeCompare(a.createdAt),
      );
  const getPurchases = (cid: string) =>
    data.purchases
      .filter((p) => p.customerId === cid)
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          b.createdAt.localeCompare(a.createdAt),
      );
  const hasSamples = data.customers.some((c) => c.demo);
  const nav = [
    ["customers", "Customers", Users],
    ["prescriptions", "Prescriptions", Glasses],
    ["families", "Family connections", Network],
    ["aftercare", "Aftercare", HeartHandshake],
    ["purchases", "Purchases", ShoppingBag],
    ...(role === "admin"
      ? [["staff", "Staff accounts", ShieldCheck] as const]
      : []),
  ] as const;
  const headings = {
    customers: [
      "Customer records",
      "A little familiarity makes all the difference.",
    ],
    prescriptions: [
      "Prescription library",
      "Every prescription, preserved in one place.",
    ],
    families: ["Family connections", "Individual care. A connected family."],
    aftercare: [
      "Aftercare journal",
      "Keep the small details that make great service.",
    ],
    settings: ["Workspace settings", "Your records, your workspace."],
    staff: ["Staff accounts", "The people behind great customer care."],
    purchases: ["Purchase history", "What they chose, remembered."],
  } as const;
  function exportData() {
    const b = new Blob(
      [
        JSON.stringify(
          {
            format: "nimani-export-v1",
            exportedAt: new Date().toISOString(),
            ...data,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nimani-records-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("Records exported. Download attachments separately.");
  }
  function rxCard(rx: Prescription, compact = false) {
    const replaced = data.prescriptions.some((r) => r.supersedesId === rx.id);
    return (
      <section
        className={`card rx-card ${replaced ? "superseded" : ""}`}
        key={rx.id}
      >
        <div className="card-title">
          <div className="row">
            <span className="square-icon">
              <Glasses size={19} />
            </span>
            <div>
              <h3>{fmt(rx.date)}</h3>
              <small>{rx.doctor || t("Prescriber not recorded")}</small>
            </div>
          </div>
          <div className="row">
            <Badge tone={replaced ? "amber" : "green"}>
              {replaced
                ? t("Corrected")
                : rx.supersedesId
                  ? t("Revision")
                  : t("Recorded")}
            </Badge>
            <button
              className="icon-button"
              aria-label={t("Open prescription {date}", { date: fmt(rx.date) })}
              onClick={() =>
                open({ kind: "viewRx", rx, customer: getC(rx.customerId) })
              }
            >
              <ArrowUpRight size={18} />
            </button>
            <button
              className="icon-button"
              aria-label={t("Delete prescription")}
              onClick={() =>
                open({
                  kind: "delete",
                  deletion: "prescription",
                  customer: getC(rx.customerId),
                  rx,
                })
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <GridTable rx={rx} />
        <div className="rx-footer">
          <span>
            {rx.pdMode === "binocular" ? t("Binocular PD") : t("Monocular PD")}{" "}
            ·{" "}
            {data.attachments.filter((a) => a.prescriptionId === rx.id).length}{" "}
            {t("attachments")}
          </span>
          {!compact && (
            <label className="check-label">
              <input
                type="checkbox"
                checked={compare.includes(rx.id)}
                onChange={(e) =>
                  setCompare(
                    e.target.checked
                      ? [...compare.filter((i) => i !== rx.id), rx.id].slice(-2)
                      : compare.filter((i) => i !== rx.id),
                  )
                }
              />
              {t("Compare")}
            </label>
          )}
        </div>
      </section>
    );
  }
  function familyCard(f: Family, cid: string) {
    const c = getC(otherId(f, cid));
    if (!c) return null;
    const isContact = f.contact && f.customerId === cid;
    const contactFor = f.contact && f.relativeId === cid;
    return (
      <div className="family-member" key={f.id}>
        <button className="person-button" onClick={() => go("customers", c.id)}>
          <Avatar customer={c} />
          <span>
            <b>{name(c)}</b>
            <small className="capitalize">
              {t(relation(f, cid))}
              {c.archived ? t(" · Archived") : ""}
            </small>
          </span>
        </button>
        <div className="row">
          {(isContact || contactFor) && (
            <Badge tone="green">
              {isContact ? t("Contact person") : t("Contact for relative")}
            </Badge>
          )}
          <button
            className="icon-button"
            aria-label={t("Remove connection to {name}", { name: name(c) })}
            onClick={() =>
              open({ kind: "unlink", customer: getC(cid), family: f })
            }
          >
            <Unlink size={16} />
          </button>
        </div>
        {isContact && c.phone && (
          <a className="contact-link" href={`tel:${c.phone}`}>
            <Phone size={14} />
            {c.phone}
          </a>
        )}
      </div>
    );
  }
  function careCard(a: Care, showPerson = false) {
    return (
      <article className="care-entry" key={a.id}>
        <span className="care-dot">
          <HeartHandshake size={19} />
        </span>
        <div>
          <div className="row spread">
            <h3>{t(a.kind)}</h3>
            <small>{fmt(a.date)}</small>
          </div>
          {showPerson && (
            <button
              className="text-link"
              onClick={() => go("customers", a.customerId, "aftercare")}
            >
              {name(getC(a.customerId))}
              <ArrowUpRight size={13} />
            </button>
          )}
          <p className="preserve">{a.notes}</p>
          <small>
            {t("Recorded by")} {a.author}
          </small>
        </div>
      </article>
    );
  }
  function purchaseCard(p: Purchase, showPerson = false) {
    const c = getC(p.customerId);
    const rx = data.prescriptions.find((r) => r.id === p.prescriptionId);
    return (
      <article className="purchase-entry" key={p.id}>
        <span className="purchase-icon">
          <ShoppingBag size={19} />
        </span>
        <div className="purchase-content">
          <div className="row spread">
            <div>
              <h3>{p.description}</h3>
              {showPerson && (
                <button
                  className="text-link"
                  onClick={() => go("customers", p.customerId, "purchases")}
                >
                  {name(c)}
                  <ArrowUpRight size={13} />
                </button>
              )}
            </div>
            <div className="purchase-amount">
              {p.totalCents === null ? (
                <small>{t("Amount not recorded")}</small>
              ) : (
                money(p.totalCents, language)
              )}
            </div>
          </div>
          <div className="purchase-meta">
            <Badge>{t(p.category)}</Badge>
            <span>{[p.brand, p.model].filter(Boolean).join(" · ")}</span>
            <span>
              {p.quantity} {t(p.quantity === 1 ? "unit" : "units")}
            </span>
            <span>{fmt(p.date)}</span>
          </div>
          {p.notes && <p className="preserve">{p.notes}</p>}
          {p.prescriptionId && !rx && (
            <small className="linked-deleted-note">
              {t("Linked prescription is in Deleted records.")}
            </small>
          )}
          {p.reference && (
            <small>
              {t("Receipt / reference")}: {p.reference}
            </small>
          )}
          <div className="purchase-bottom">
            <small>
              {t("Recorded by")} {p.author}
            </small>
            <div className="row">
              {rx && (
                <button
                  className="text-link"
                  onClick={() => open({ kind: "viewRx", customer: c, rx })}
                >
                  {t("View linked prescription")} <ArrowUpRight size={13} />
                </button>
              )}
              {!c?.archived && (
                <button
                  className="icon-button"
                  aria-label={t("Edit purchase")}
                  onClick={() =>
                    open({ kind: "purchase", customer: c, purchase: p })
                  }
                >
                  <Pencil size={15} />
                </button>
              )}
              <button
                className="icon-button"
                aria-label={t("Delete purchase")}
                onClick={() =>
                  open({
                    kind: "delete",
                    deletion: "purchase",
                    customer: c,
                    purchase: p,
                  })
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <div className="workspace-label">{t("THE WORKSPACE")}</div>
        <nav aria-label={t("Main navigation")}>
          {nav.map(([key, label, Icon]) => (
            <button
              aria-label={t(label)}
              key={key}
              className={`nav-item ${view === key ? "active" : ""}`}
              onClick={() => {
                go(key);
                setQuery("");
              }}
            >
              <Icon size={19} />
              <span>{t(label)}</span>
              {key === "customers" && (
                <span className="nav-count">{active.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="tiny-star">✳</span>
            <p>
              {t("Good care starts")}
              <br />
              {t("with knowing people.")}
            </p>
            <span>OPTIKA NIMANI</span>
          </div>
          <button
            className={`nav-item ${view === "settings" ? "active" : ""}`}
            onClick={() => go("settings")}
          >
            <Settings size={18} />
            {t("Workspace settings")}
          </button>
          <div className="account">
            <span className="user-avatar">{displayName[0]?.toUpperCase()}</span>
            <div>
              <b>
                {displayName.includes("@")
                  ? displayName.split("@")[0]
                  : displayName}
              </b>
              <small>{t(role === "admin" ? "Administrator" : "Staff")}</small>
            </div>
            <ShieldCheck size={17} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>{t("Workspace")}</span>
            <ChevronRight size={14} />
            <b>{customer ? name(customer) : t(headings[view][0])}</b>
          </div>
          <div className="global-search">
            <Search size={17} />
            <input
              ref={searchRef}
              aria-label={t("Search customers")}
              placeholder={t("Search customers…")}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (selected || view !== "customers") go("customers");
              }}
            />
            <kbd>Ctrl K</kbd>
          </div>
          <LanguageSwitch />
          <span className="top-private">
            <span />
            {t("Private")}
          </span>
        </header>
        <main>
          {loading ? (
            <div className="loading">
              <LoaderCircle className="spin" />
              {t("Opening your workspace…")}
            </div>
          ) : loadError ? (
            <Empty icon={<FileText />} title={t("Let’s reconnect")}>
              {t(loadError)}
              <button
                className="button primary"
                onClick={() => {
                  setLoading(true);
                  load()
                    .catch((e) => setLoadError(e.message))
                    .finally(() => setLoading(false));
                }}
              >
                {t("Reload records")}
              </button>
            </Empty>
          ) : (
            <>
              {hasSamples && (
                <div className="sample-banner">
                  <span>
                    <span className="sample-dot" />
                    {t("Sample records are fictional. Explore freely.")}
                  </span>
                  <button onClick={() => open({ kind: "samplesRemove" })}>
                    {t("Remove samples")} <X size={13} />
                  </button>
                </div>
              )}
              {selected && !customer ? (
                <Empty icon={<Users />} title={t("Customer not found")}>
                  {t("This record may no longer be available.")}
                  <button
                    className="button secondary"
                    onClick={() => go("customers")}
                  >
                    {t("Back to customers")}
                  </button>
                </Empty>
              ) : customer ? (
                <>
                  <button className="back-link" onClick={() => go("customers")}>
                    <ArrowLeft size={15} />
                    {t("All customers")}
                  </button>
                  <div className="profile-heading">
                    <div className="row">
                      <Avatar customer={customer} />
                      <div>
                        <div className="row">
                          <h1>{name(customer)}</h1>
                          {customer.demo && <Badge>{t("Sample")}</Badge>}
                          {customer.archived && (
                            <Badge tone="amber">{t("Archived")}</Badge>
                          )}
                        </div>
                        <p>
                          {t("Customer since")} {fmt(customer.createdAt)}{" "}
                          <span className="dot-separator">·</span>{" "}
                          {customer.address || t("Location not recorded")}
                        </p>
                      </div>
                    </div>
                    <div className="row">
                      <button
                        className="button secondary"
                        onClick={() => open({ kind: "customer", customer })}
                      >
                        {t("Edit details")}
                      </button>
                      {!customer.archived && (
                        <button
                          className="button secondary"
                          onClick={() => open({ kind: "purchase", customer })}
                        >
                          <ShoppingBag size={15} />
                          {t("Register purchase")}
                        </button>
                      )}
                      {!customer.archived && (
                        <button
                          className="button primary"
                          onClick={() => open({ kind: "rx", customer })}
                        >
                          <Plus size={17} />
                          {t("Add prescription")}
                        </button>
                      )}
                      <button
                        className="icon-button bordered"
                        aria-label={
                          customer.archived
                            ? t("Restore customer")
                            : t("Archive customer")
                        }
                        onClick={() => open({ kind: "archive", customer })}
                      >
                        {customer.archived ? (
                          <RotateCcw size={18} />
                        ) : (
                          <Archive size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                  <div
                    className="tabs"
                    role="tablist"
                    aria-label={t("Customer sections")}
                  >
                    {(
                      [
                        "overview",
                        "prescriptions",
                        "purchases",
                        "family",
                        "aftercare",
                        "activity",
                        "deleted",
                      ] as Tab[]
                    ).map((section) => (
                      <button
                        role="tab"
                        aria-selected={tab === section}
                        className={tab === section ? "active" : ""}
                        key={section}
                        onClick={() => go("customers", customer.id, section)}
                      >
                        {t(tabLabels[section])}
                        {section === "prescriptions" && (
                          <span>
                            {
                              data.prescriptions.filter(
                                (p) => p.customerId === customer.id,
                              ).length
                            }
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {tab === "overview" && (
                    <div className="profile-layout">
                      <div className="profile-main">
                        <div className="section-title">
                          <h2>{t("Latest prescription")}</h2>
                          <button
                            className="text-link"
                            onClick={() =>
                              go("customers", customer.id, "prescriptions")
                            }
                          >
                            {t("View history")} <ArrowRight size={15} />
                          </button>
                        </div>
                        {latestRx(data, customer.id)[0] ? (
                          rxCard(latestRx(data, customer.id)[0], true)
                        ) : (
                          <div className="card">
                            <Empty
                              icon={<Glasses />}
                              title={t("A clear starting point")}
                            >
                              {t(
                                "Add the first prescription to begin this customer’s history.",
                              )}
                              {!customer.archived && (
                                <button
                                  className="button secondary"
                                  onClick={() => open({ kind: "rx", customer })}
                                >
                                  <Plus size={16} />
                                  {t("Add prescription")}
                                </button>
                              )}
                            </Empty>
                          </div>
                        )}
                        <div className="section-title">
                          <h2>{t("Recent aftercare")}</h2>
                          {!customer.archived && (
                            <button
                              className="text-link"
                              onClick={() => open({ kind: "care", customer })}
                            >
                              <Plus size={15} />
                              {t("Record visit")}
                            </button>
                          )}
                        </div>
                        <section className="card journal">
                          {getCare(customer.id).length ? (
                            getCare(customer.id)
                              .slice(0, 3)
                              .map((a) => careCard(a))
                          ) : (
                            <div className="soft-empty">
                              {t("No aftercare visits recorded yet.")}
                            </div>
                          )}
                        </section>
                        <div className="section-title">
                          <h2>{t("Recent purchases")}</h2>
                          {!customer.archived && (
                            <button
                              className="text-link"
                              onClick={() =>
                                open({ kind: "purchase", customer })
                              }
                            >
                              <Plus size={15} />
                              {t("Register purchase")}
                            </button>
                          )}
                        </div>
                        <section className="card">
                          {getPurchases(customer.id).length ? (
                            getPurchases(customer.id)
                              .slice(0, 3)
                              .map((p) => purchaseCard(p))
                          ) : (
                            <div className="soft-empty">
                              {t("No purchases recorded yet.")}
                            </div>
                          )}
                        </section>
                      </div>
                      <div className="profile-aside">
                        <FamilyPurchases
                          compact
                          customer={customer}
                          data={data}
                          onOpen={(id) => go("customers", id, "purchases")}
                          onHistory={() =>
                            go("customers", customer.id, "purchases")
                          }
                        />
                        <section className="card contact-card">
                          <div className="card-title">
                            <h3>{t("Customer details")}</h3>
                            <button
                              className="icon-button"
                              aria-label={t("Edit customer details")}
                              onClick={() =>
                                open({ kind: "customer", customer })
                              }
                            >
                              <MoreHorizontal size={19} />
                            </button>
                          </div>
                          <div className="contact-line">
                            <Phone />
                            <div>
                              <small>{t("Phone number")}</small>
                              {customer.phone ? (
                                <a href={`tel:${customer.phone}`}>
                                  {customer.phone}
                                </a>
                              ) : (
                                <span>{t("Not recorded")}</span>
                              )}
                            </div>
                          </div>
                          <div className="contact-line">
                            <Mail />
                            <div>
                              <small>{t("Email address")}</small>
                              {customer.email ? (
                                <a href={`mailto:${customer.email}`}>
                                  {customer.email}
                                </a>
                              ) : (
                                <span>{t("Not recorded")}</span>
                              )}
                            </div>
                          </div>
                          <div className="contact-line">
                            <CalendarDays />
                            <div>
                              <small>{t("Date of birth")}</small>
                              <span>
                                {customer.dob
                                  ? fmt(customer.dob)
                                  : t("Not recorded")}
                              </span>
                            </div>
                          </div>
                          <div className="contact-line">
                            <MapPin />
                            <div>
                              <small>{t("Address / city")}</small>
                              <span>
                                {customer.address || t("Not recorded")}
                              </span>
                            </div>
                          </div>
                          {customer.tags.length > 0 && (
                            <div className="tag-list">
                              {customer.tags.map((t) => (
                                <Badge key={t}>{t}</Badge>
                              ))}
                            </div>
                          )}
                        </section>
                        <section className="card notes-card">
                          <h3>{t("A note to remember")}</h3>
                          <p className="preserve">
                            {customer.notes ||
                              t(
                                "Little details go a long way. Add preferences or useful context in customer details.",
                              )}
                          </p>
                        </section>
                        <section className="card">
                          <div className="card-title">
                            <h3>{t("Family connections")}</h3>
                            {!customer.archived && (
                              <button
                                className="icon-button"
                                aria-label={t("Link family member")}
                                onClick={() =>
                                  open({ kind: "family", customer })
                                }
                              >
                                <Plus size={18} />
                              </button>
                            )}
                          </div>
                          {getFamily(customer.id).length ? (
                            getFamily(customer.id).map((f) =>
                              familyCard(f, customer.id),
                            )
                          ) : (
                            <p className="soft-empty">
                              {t("No family connections yet.")}
                            </p>
                          )}
                        </section>
                      </div>
                    </div>
                  )}
                  {tab === "prescriptions" && (
                    <>
                      <div className="section-title">
                        <div>
                          <h2>{t("Prescription history")}</h2>
                          <p>
                            {t(
                              "Original entries stay preserved when a correction is added.",
                            )}
                          </p>
                        </div>
                        {compare.length === 2 && (
                          <button
                            className="button secondary"
                            onClick={() => open({ kind: "compare", customer })}
                          >
                            <Copy size={16} />
                            {t("Compare selected")}
                          </button>
                        )}
                      </div>
                      <div className="rx-list">
                        {data.prescriptions
                          .filter((p) => p.customerId === customer.id)
                          .sort(
                            (a, b) =>
                              b.date.localeCompare(a.date) ||
                              b.createdAt.localeCompare(a.createdAt),
                          )
                          .map((p) => rxCard(p))}
                      </div>
                      {!data.prescriptions.some(
                        (p) => p.customerId === customer.id,
                      ) && (
                        <Empty
                          icon={<Glasses />}
                          title={t("No prescriptions yet")}
                        >
                          {t("Add a dated prescription to start the history.")}
                        </Empty>
                      )}
                    </>
                  )}
                  {tab === "family" && (
                    <section className="card">
                      <div className="card-title">
                        <div>
                          <h2>{t("Care runs in the family")}</h2>
                          <p>
                            {t("Each family member keeps their own records.")}
                          </p>
                        </div>
                        {!customer.archived && (
                          <button
                            className="button primary"
                            onClick={() => open({ kind: "family", customer })}
                          >
                            <Link2 size={16} />
                            {t("Link family member")}
                          </button>
                        )}
                      </div>
                      {getFamily(customer.id).length ? (
                        getFamily(customer.id).map((f) =>
                          familyCard(f, customer.id),
                        )
                      ) : (
                        <Empty
                          icon={<Network />}
                          title={t("Make the connection")}
                        >
                          {t(
                            "Link an existing customer as a relative or contact person.",
                          )}
                        </Empty>
                      )}
                    </section>
                  )}
                  {tab === "aftercare" && (
                    <section className="card journal">
                      <div className="card-title">
                        <div>
                          <h2>{t("Aftercare journal")}</h2>
                          <p>
                            {t(
                              "Adjustments, repairs, replacements and the details in between.",
                            )}
                          </p>
                        </div>
                        {!customer.archived && (
                          <button
                            className="button primary"
                            onClick={() => open({ kind: "care", customer })}
                          >
                            <Plus size={17} />
                            {t("Record visit")}
                          </button>
                        )}
                      </div>
                      {getCare(customer.id).length ? (
                        getCare(customer.id).map((a) => careCard(a))
                      ) : (
                        <Empty
                          icon={<HeartHandshake />}
                          title={t("Every visit matters")}
                        >
                          {t("Record a visit to build an aftercare history.")}
                        </Empty>
                      )}
                    </section>
                  )}
                  {tab === "purchases" && (
                    <>
                      <FamilyPurchases
                        customer={customer}
                        data={data}
                        onOpen={(id) => go("customers", id, "purchases")}
                        onHistory={() =>
                          go("customers", customer.id, "purchases")
                        }
                      />
                      <section className="card">
                        <div className="card-title">
                          <div>
                            <h2>{t("Personal purchase history")}</h2>
                            <p>
                              {t(
                                "Record what this customer has bought, whenever they visit.",
                              )}
                            </p>
                          </div>
                          {!customer.archived && (
                            <button
                              className="button primary"
                              onClick={() =>
                                open({ kind: "purchase", customer })
                              }
                            >
                              <Plus size={16} />
                              {t("Register purchase")}
                            </button>
                          )}
                        </div>
                        {getPurchases(customer.id).length ? (
                          getPurchases(customer.id).map((p) => purchaseCard(p))
                        ) : (
                          <Empty
                            icon={<ShoppingBag />}
                            title={t("No purchases yet")}
                          >
                            {t("No purchases recorded yet.")}
                          </Empty>
                        )}
                      </section>
                    </>
                  )}
                  {tab === "activity" && (
                    <section className="card">
                      <div className="card-title">
                        <h2>{t("Record activity")}</h2>
                        <Badge>{t("Latest 500 workspace events")}</Badge>
                      </div>
                      {data.audit
                        .filter((a) => a.customerId === customer.id)
                        .map((a) => (
                          <div className="activity-row" key={a.id}>
                            <span className="activity-icon">
                              <Check size={15} />
                            </span>
                            <div>
                              <b>{t(a.action)}</b>
                              <small>{a.author}</small>
                            </div>
                            <small>
                              {fmt(a.createdAt)} ·{" "}
                              {new Date(a.createdAt).toLocaleTimeString(
                                "en-GB",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </small>
                          </div>
                        ))}
                      {!data.audit.some(
                        (a) => a.customerId === customer.id,
                      ) && (
                        <p className="soft-empty">
                          {t("New changes to this record will appear here.")}
                        </p>
                      )}
                    </section>
                  )}
                  {tab === "deleted" && (
                    <DeletedRecords
                      customerId={customer.id}
                      data={data}
                      busy={busy}
                      onRestore={(kind, record) =>
                        act(
                          `${kind}.restore`,
                          {
                            customerId: customer.id,
                            data: {
                              id: record.id,
                              ...("version" in record
                                ? { version: record.version }
                                : {}),
                              deletedAt: record.deletedAt,
                            },
                          },
                          kind === "purchase"
                            ? "Purchase restored"
                            : "Prescription restored",
                        )
                      }
                    />
                  )}
                </>
              ) : (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">
                        OPTIKA NIMANI <span /> {t("CUSTOMER STUDIO")}
                      </div>
                      <h1>{t(headings[view][0])}</h1>
                      <p>{t(headings[view][1])}</p>
                    </div>
                    {view === "customers" && (
                      <button
                        className="button primary"
                        onClick={() => open({ kind: "customer" })}
                      >
                        <Plus size={18} />
                        {t("Add customer")}
                      </button>
                    )}
                  </div>
                  {view === "customers" && (
                    <>
                      <div className="stats-grid">
                        {[
                          [
                            Users,
                            active.length,
                            "Customers",
                            "People, not just records",
                          ],
                          [
                            Glasses,
                            data.prescriptions.filter((p) =>
                              active.some((c) => c.id === p.customerId),
                            ).length,
                            "Prescriptions",
                            "A history worth keeping",
                          ],
                          [
                            Network,
                            data.families.filter(
                              (f) =>
                                active.some((c) => c.id === f.customerId) &&
                                active.some((c) => c.id === f.relativeId),
                            ).length,
                            "Family connections",
                            "Care across generations",
                          ],
                          [
                            HeartHandshake,
                            data.aftercare.filter((a) =>
                              active.some((c) => c.id === a.customerId),
                            ).length,
                            "Aftercare visits",
                            "The details remembered",
                          ],
                        ].map(([Icon, count, label, subtitle], i) => {
                          const I = Icon as typeof Users;
                          return (
                            <div className="stat-card" key={i}>
                              <div>
                                <span>{t(String(label))}</span>
                                <b>{String(count).padStart(2, "0")}</b>
                                <small>{t(String(subtitle))}</small>
                              </div>
                              <span className={`stat-icon tone-${i}`}>
                                <I size={20} />
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <section className="card directory">
                        <div className="directory-head">
                          <div className="row">
                            <h2>{t("Customer directory")}</h2>
                            <Badge>{list.length}</Badge>
                          </div>
                          <div className="row">
                            <label className="sort-label">
                              <SlidersHorizontal size={14} />
                              <select
                                aria-label={t("Sort customers")}
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                              >
                                <option value="name">{t("Name A–Z")}</option>
                                <option value="recent">
                                  {t("Recently updated")}
                                </option>
                              </select>
                            </label>
                            <button
                              className="button subtle"
                              onClick={exportData}
                            >
                              <Download size={15} />
                              {t("Export")}
                            </button>
                          </div>
                        </div>
                        <div className="directory-tools">
                          <div className="directory-search">
                            <Search size={17} />
                            <input
                              aria-label={t("Search client list")}
                              placeholder={t(
                                "Search by name, phone, email or tag…",
                              )}
                              value={query}
                              onChange={(e) => setQuery(e.target.value)}
                            />
                            {query && (
                              <button
                                className="icon-button"
                                aria-label={t("Clear search")}
                                onClick={() => setQuery("")}
                              >
                                <X size={15} />
                              </button>
                            )}
                          </div>
                          <div className="filter-tabs">
                            {[
                              ["active", "All customers"],
                              ["family", "With family"],
                              ["noRx", "No prescription"],
                              ["archived", "Archived"],
                            ].map(([v, l]) => (
                              <button
                                className={filter === v ? "active" : ""}
                                key={v}
                                onClick={() => setFilter(v)}
                              >
                                {t(l)}
                              </button>
                            ))}
                          </div>
                          <span className="result-note">
                            {query
                              ? t("Results for “{query}”", { query })
                              : t("A familiar face, a complete history.")}
                          </span>
                        </div>
                        {list.length ? (
                          <>
                            <div className="table-scroll">
                              <table className="customer-table">
                                <thead>
                                  <tr>
                                    <th>{t("Customer")}</th>
                                    <th>{t("Contact")}</th>
                                    <th>{t("Latest prescription")}</th>
                                    <th>{t("Family")}</th>
                                    <th>{t("Added")}</th>
                                    <th />
                                  </tr>
                                </thead>
                                <tbody>
                                  {list
                                    .slice((page - 1) * 10, page * 10)
                                    .map((c) => {
                                      const latest = latestRx(data, c.id)[0];
                                      return (
                                        <tr key={c.id}>
                                          <td>
                                            <button
                                              className="person-button"
                                              onClick={() =>
                                                go("customers", c.id)
                                              }
                                            >
                                              <Avatar customer={c} small />
                                              <span>
                                                <b>
                                                  {name(c)}
                                                  {c.demo && (
                                                    <span className="sample-label">
                                                      {t("SAMPLE")}
                                                    </span>
                                                  )}
                                                </b>
                                                <small>
                                                  {c.tags[0] ||
                                                    c.address ||
                                                    t("Customer record")}
                                                </small>
                                              </span>
                                            </button>
                                          </td>
                                          <td>
                                            {c.phone || "—"}
                                            <small>
                                              {c.email ||
                                                (!c.phone
                                                  ? t("See family contact")
                                                  : "")}
                                            </small>
                                          </td>
                                          <td>
                                            {latest ? (
                                              <>
                                                <span className="rx-date">
                                                  <span />
                                                  {fmt(latest.date)}
                                                </span>
                                                <small>
                                                  {
                                                    data.prescriptions.filter(
                                                      (p) =>
                                                        p.customerId === c.id,
                                                    ).length
                                                  }{" "}
                                                  {t("recorded")}
                                                </small>
                                              </>
                                            ) : (
                                              <span className="muted">
                                                {t("Not recorded")}
                                              </span>
                                            )}
                                          </td>
                                          <td>
                                            {getFamily(c.id).length ? (
                                              <span className="family-count">
                                                <Network size={14} />
                                                {getFamily(c.id).length}{" "}
                                                {t("linked")}
                                              </span>
                                            ) : (
                                              <span className="muted">—</span>
                                            )}
                                          </td>
                                          <td className="muted">
                                            {fmt(c.createdAt)}
                                          </td>
                                          <td>
                                            <button
                                              className="icon-button"
                                              aria-label={t("Open {name}", {
                                                name: name(c),
                                              })}
                                              onClick={() =>
                                                go("customers", c.id)
                                              }
                                            >
                                              <ArrowUpRight size={17} />
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                            <div className="table-footer">
                              <span>
                                {t("Showing")} {(page - 1) * 10 + 1}–
                                {Math.min(page * 10, list.length)} {t("of")}{" "}
                                {list.length} {t("customers")}
                              </span>
                              <div className="row">
                                <button
                                  className="icon-button bordered"
                                  aria-label={t("Previous page")}
                                  disabled={page <= 1}
                                  onClick={() => setPage(page - 1)}
                                >
                                  <ArrowLeft size={15} />
                                </button>
                                <span>
                                  {t("Page")} {page}
                                </span>
                                <button
                                  className="icon-button bordered"
                                  aria-label={t("Next page")}
                                  disabled={page * 10 >= list.length}
                                  onClick={() => setPage(page + 1)}
                                >
                                  <ArrowRight size={15} />
                                </button>
                              </div>
                            </div>
                          </>
                        ) : data.customers.length ? (
                          <Empty
                            icon={<Search />}
                            title={t("No customers found")}
                          >
                            {t(
                              "Try a different name, phone number, or filter.",
                            )}
                          </Empty>
                        ) : (
                          <div className="welcome">
                            <div className="welcome-art">
                              <Glasses size={64} strokeWidth={1} />
                              <span className="art-orbit orbit-one" />
                              <span className="art-orbit orbit-two" />
                            </div>
                            <div className="eyebrow">
                              {t("A FRESH PERSPECTIVE")}
                            </div>
                            <h2>{t("Great care starts with a name.")}</h2>
                            <p>
                              {t(
                                "Add your first customer to keep their prescriptions,",
                              )}
                              <br />
                              {t("family connections, and aftercare together.")}
                            </p>
                            <div className="row">
                              <button
                                className="button primary"
                                onClick={() => open({ kind: "customer" })}
                              >
                                <Plus size={17} />
                                {t("Add your first customer")}
                              </button>
                              <button
                                className="button secondary"
                                disabled={busy}
                                onClick={() =>
                                  act(
                                    "sample",
                                    {},
                                    "Fictional sample records added",
                                  )
                                }
                              >
                                {busy ? (
                                  <LoaderCircle size={16} className="spin" />
                                ) : (
                                  <ArrowUpRight size={16} />
                                )}
                                {t("Explore sample records")}
                              </button>
                            </div>
                            <small>
                              {t(
                                "Samples are fictional and can be removed from workspace settings.",
                              )}
                            </small>
                          </div>
                        )}
                      </section>
                      <div className="bottom-note">
                        <ShieldCheck size={15} />
                        <span>
                          {t("A private space for thoughtful customer care.")}
                        </span>
                        <span className="bottom-brand">
                          {t("Made for Optika Nimani")}
                        </span>
                      </div>
                    </>
                  )}
                  {view === "prescriptions" && (
                    <section className="card">
                      <div className="card-title">
                        <h2>{t("All prescriptions")}</h2>
                        <Badge>
                          {data.prescriptions.length} {t("entries")}
                        </Badge>
                      </div>
                      {data.prescriptions.length ? (
                        <div className="table-scroll">
                          <table className="customer-table">
                            <thead>
                              <tr>
                                <th>{t("Customer")}</th>
                                <th>{t("Prescription date")}</th>
                                <th>{t("Prescriber")}</th>
                                <th>{t("Status")}</th>
                                <th />
                              </tr>
                            </thead>
                            <tbody>
                              {[...data.prescriptions]
                                .sort((a, b) => b.date.localeCompare(a.date))
                                .map((p) => (
                                  <tr key={p.id}>
                                    <td>
                                      <button
                                        className="person-button"
                                        onClick={() =>
                                          go(
                                            "customers",
                                            p.customerId,
                                            "prescriptions",
                                          )
                                        }
                                      >
                                        <Avatar
                                          customer={getC(p.customerId)}
                                          small
                                        />
                                        <b>{name(getC(p.customerId))}</b>
                                      </button>
                                    </td>
                                    <td>{fmt(p.date)}</td>
                                    <td>{p.doctor || "—"}</td>
                                    <td>
                                      <Badge
                                        tone={
                                          data.prescriptions.some(
                                            (r) => r.supersedesId === p.id,
                                          )
                                            ? "amber"
                                            : "green"
                                        }
                                      >
                                        {data.prescriptions.some(
                                          (r) => r.supersedesId === p.id,
                                        )
                                          ? t("Corrected")
                                          : p.supersedesId
                                            ? t("Revision")
                                            : t("Recorded")}
                                      </Badge>
                                    </td>
                                    <td>
                                      <button
                                        className="icon-button"
                                        aria-label={t(
                                          "View {name} prescription {date}",
                                          {
                                            name: name(getC(p.customerId)),
                                            date: fmt(p.date),
                                          },
                                        )}
                                        onClick={() =>
                                          open({
                                            kind: "viewRx",
                                            customer: getC(p.customerId),
                                            rx: p,
                                          })
                                        }
                                      >
                                        <ArrowUpRight size={18} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <Empty
                          icon={<Glasses />}
                          title={t("A history starts here")}
                        >
                          {t(
                            "Open a customer profile to add their first prescription.",
                          )}
                          <button
                            className="button secondary"
                            onClick={() => go("customers")}
                          >
                            {t("Go to customers")} <ArrowRight size={15} />
                          </button>
                        </Empty>
                      )}
                    </section>
                  )}
                  {view === "families" && (
                    <div className="family-directory">
                      {data.families.length ? (
                        data.families.map((f) => (
                          <section className="card family-pair" key={f.id}>
                            <div className="family-pair-top">
                              <Network size={18} />
                              <span>{t("FAMILY CONNECTION")}</span>
                              {f.contact && (
                                <Badge tone="green">
                                  {t("Contact person linked")}
                                </Badge>
                              )}
                            </div>
                            <div className="pair-people">
                              {[getC(f.customerId), getC(f.relativeId)].map(
                                (c, i) => (
                                  <button
                                    key={c?.id}
                                    className="person-button"
                                    onClick={() =>
                                      go("customers", c?.id, "family")
                                    }
                                  >
                                    <Avatar customer={c} />
                                    <span>
                                      <b>{name(c)}</b>
                                      <small className="capitalize">
                                        {i === 0
                                          ? inverse[f.relationship]
                                          : f.relationship}
                                      </small>
                                    </span>
                                  </button>
                                ),
                              )}
                            </div>
                            <p>
                              {f.contact
                                ? t(
                                    "{contact} is a contact person for {customer}.",
                                    {
                                      contact: name(getC(f.relativeId)),
                                      customer: name(getC(f.customerId)),
                                    },
                                  )
                                : t(
                                    "Separate customer records, connected for better care.",
                                  )}
                            </p>
                          </section>
                        ))
                      ) : (
                        <section className="card full-width">
                          <Empty
                            icon={<Network />}
                            title={t("Keep families connected")}
                          >
                            {t(
                              "Open a customer’s Family connections tab to link a relative.",
                            )}
                            <button
                              className="button secondary"
                              onClick={() => go("customers")}
                            >
                              {t("Go to customers")} <ArrowRight size={15} />
                            </button>
                          </Empty>
                        </section>
                      )}
                    </div>
                  )}
                  {view === "aftercare" && (
                    <section className="card journal">
                      <div className="card-title">
                        <h2>{t("The latest care")}</h2>
                        <Badge>
                          {data.aftercare.length} {t("visits")}
                        </Badge>
                      </div>
                      {data.aftercare.length ? (
                        [...data.aftercare]
                          .sort(
                            (a, b) =>
                              b.date.localeCompare(a.date) ||
                              b.createdAt.localeCompare(a.createdAt),
                          )
                          .map((a) => careCard(a, true))
                      ) : (
                        <Empty
                          icon={<HeartHandshake />}
                          title={t("Remember every little adjustment")}
                        >
                          {t(
                            "Open a customer profile to record an aftercare visit.",
                          )}
                          <button
                            className="button secondary"
                            onClick={() => go("customers")}
                          >
                            {t("Go to customers")} <ArrowRight size={15} />
                          </button>
                        </Empty>
                      )}
                    </section>
                  )}
                  {view === "purchases" && (
                    <section className="card">
                      <div className="card-title">
                        <h2>{t("All purchases")}</h2>
                        <Badge>
                          {data.purchases.length} {t("entries")}
                        </Badge>
                      </div>
                      {data.purchases.length ? (
                        [...data.purchases]
                          .sort(
                            (a, b) =>
                              b.date.localeCompare(a.date) ||
                              b.createdAt.localeCompare(a.createdAt),
                          )
                          .map((p) => purchaseCard(p, true))
                      ) : (
                        <Empty
                          icon={<ShoppingBag />}
                          title={t("No purchases yet")}
                        >
                          {t("Open a customer profile to register a purchase.")}
                          <button
                            className="button secondary"
                            onClick={() => go("customers")}
                          >
                            {t("Go to customers")} <ArrowRight size={15} />
                          </button>
                        </Empty>
                      )}
                    </section>
                  )}
                  {view === "staff" && role === "admin" && (
                    <StaffPanel currentId={staffId} />
                  )}
                  {view === "settings" && (
                    <div className="settings-grid">
                      <PasswordSettings />
                      <section className="card">
                        <div className="card-title">
                          <h2>{t("Your workspace")}</h2>
                          <ShieldCheck size={20} />
                        </div>
                        <div className="settings-body">
                          <p>{t("Optika Nimani’s private customer studio.")}</p>
                          <dl>
                            <dt>{t("Signed in as")}</dt>
                            <dd>{displayName}</dd>
                            <dt>{t("Record access")}</dt>
                            <dd>{t("Shared store records")}</dd>
                            <dt>{t("Email address")}</dt>
                            <dd>{email}</dd>
                            <dt>{t("Role")}</dt>
                            <dd>
                              {t(role === "admin" ? "Administrator" : "Staff")}
                            </dd>
                            <dt>{t("Storage")}</dt>
                            <dd>{t("Records saved across devices")}</dd>
                          </dl>
                          <button
                            className="button secondary"
                            onClick={signOut}
                          >
                            {t("Sign out")} <ArrowUpRight size={15} />
                          </button>
                        </div>
                      </section>
                      <section className="card">
                        <div className="card-title">
                          <h2>{t("Export your records")}</h2>
                          <Download size={20} />
                        </div>
                        <div className="settings-body">
                          <p>
                            {t(
                              "Download customer details, prescriptions, purchases, family links, aftercare and recent activity as JSON.",
                            )}
                          </p>
                          <p className="muted">
                            {t(
                              "Attachment metadata is included. Download the original files from each prescription. This export is not a complete file backup.",
                            )}
                          </p>
                          <button
                            className="button secondary"
                            onClick={exportData}
                          >
                            <Download size={16} />
                            {t("Export records")}
                          </button>
                        </div>
                      </section>
                      <section className="card">
                        <div className="card-title">
                          <h2>{t("Sample records")}</h2>
                          <Glasses size={20} />
                        </div>
                        <div className="settings-body">
                          <p>
                            {t(
                              "Explore the studio with clearly marked fictional customers, prescriptions, relatives and aftercare visits.",
                            )}
                          </p>
                          {hasSamples ? (
                            <>
                              <p className="muted">
                                {t(
                                  "Removing samples also removes records and files added to those sample customers.",
                                )}
                              </p>
                              <button
                                className="button secondary danger-text"
                                onClick={() => open({ kind: "samplesRemove" })}
                              >
                                {t("Remove sample records")}
                              </button>
                            </>
                          ) : (
                            <button
                              className="button secondary"
                              disabled={data.customers.length > 0 || busy}
                              onClick={() =>
                                act("sample", {}, "Sample records added")
                              }
                            >
                              {t("Load fictional samples")}
                            </button>
                          )}
                          {data.customers.length > 0 && !hasSamples && (
                            <small>
                              {t("Available only in an empty workspace.")}
                            </small>
                          )}
                        </div>
                      </section>
                      <section className="card notes-card">
                        <div className="settings-body">
                          <div className="eyebrow">
                            {t("BUILT AROUND CUSTOMER CARE")}
                          </div>
                          <h2>{t("A place for the whole story.")}</h2>
                          <p>
                            {t(
                              "Keep prescriptions, purchases, family connections and aftercare together. Shopify continues to handle the store’s orders.",
                            )}
                          </p>
                        </div>
                      </section>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {error && !modal && (
            <div className="inline-error" role="alert">
              {t(error)}
              <button
                className="icon-button"
                aria-label={t("Dismiss error")}
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </main>
      </div>
      {modal && (
        <Dialog
          wide={["rx", "viewRx", "compare"].includes(modal.kind)}
          title={
            modal.deletion
              ? modal.deletion === "purchase"
                ? t("Delete purchase?")
                : t("Delete prescription?")
              : modal.kind === "purchase"
                ? modal.purchase
                  ? t("Edit purchase")
                  : t("Register purchase")
                : modal.kind === "customer"
                  ? modal.customer
                    ? t("Edit customer details")
                    : t("A new familiar face")
                  : modal.kind === "rx"
                    ? modal.rx
                      ? t("Correct prescription")
                      : t("Add prescription")
                    : modal.kind === "family"
                      ? t("Connect a family member")
                      : modal.kind === "care"
                        ? t("Record an aftercare visit")
                        : modal.kind === "viewRx"
                          ? t("Prescription record")
                          : modal.kind === "compare"
                            ? t("Compare prescriptions")
                            : modal.kind === "archive"
                              ? modal.customer?.archived
                                ? t("Restore customer?")
                                : t("Archive customer?")
                              : modal.kind === "unlink"
                                ? t("Remove family connection?")
                                : t("Remove fictional samples?")
          }
          subtitle={
            modal.customer
              ? name(modal.customer)
              : modal.kind === "customer"
                ? t("Start with the basics. The rest can come later.")
                : undefined
          }
          onClose={close}
        >
          {error && (
            <div className="inline-error" role="alert">
              {t(error)}
            </div>
          )}
          {modal.deletion && modal.customer && (
            <div className="confirm-body">
              <p>
                {t(
                  modal.deletion === "purchase"
                    ? "This purchase will be removed from personal and family totals. You can restore it from Deleted records."
                    : "This prescription will move to Deleted records. Linked purchases, original documents and other prescription revisions will be preserved.",
                )}
              </p>
              <div className="dialog-actions">
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={close}
                >
                  {t("Cancel")}
                </button>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() =>
                    act(
                      `${modal.deletion}.delete`,
                      {
                        customerId: modal.customer!.id,
                        data: {
                          id:
                            modal.deletion === "purchase"
                              ? modal.purchase!.id
                              : modal.rx!.id,
                          ...(modal.deletion === "purchase"
                            ? { version: modal.purchase!.version }
                            : {}),
                        },
                      },
                      modal.deletion === "purchase"
                        ? "Purchase deleted. Restore it from Deleted records if needed."
                        : "Prescription deleted. Restore it from Deleted records if needed.",
                    )
                  }
                >
                  <Trash2 size={15} />
                  {t(busy ? "Saving…" : "Delete")}
                </button>
              </div>
            </div>
          )}
          {modal.kind === "customer" && (
            <CustomerForm
              customer={modal.customer}
              customers={data.customers}
              busy={busy}
              onCancel={close}
              onSave={async (c) => {
                const r = await act(
                  modal.customer ? "customer.update" : "customer.create",
                  {
                    data: c,
                    ...(modal.customer
                      ? {
                          customerId: modal.customer.id,
                          version: modal.customer.version,
                        }
                      : {}),
                  },
                  modal.customer
                    ? "Customer details updated"
                    : "Customer registered",
                );
                if (r?.id) {
                  go("customers", r.id);
                  setQuery("");
                }
              }}
            />
          )}
          {modal.kind === "rx" && modal.customer && (
            <RxForm
              rx={modal.rx}
              busy={busy}
              onCancel={close}
              onSave={(r) =>
                act(
                  "prescription.create",
                  { customerId: modal.customer!.id, data: r },
                  r.supersedesId
                    ? "Correction saved; original preserved"
                    : "Prescription added",
                )
              }
            />
          )}
          {modal.kind === "family" && modal.customer && (
            <FamilyForm
              customer={modal.customer}
              customers={active.filter(
                (c) =>
                  !getFamily(modal.customer!.id).some(
                    (f) => otherId(f, modal.customer!.id) === c.id,
                  ),
              )}
              busy={busy}
              onCancel={close}
              onSave={(f) =>
                act(
                  "family.create",
                  { customerId: modal.customer!.id, data: f },
                  "Family connection added",
                )
              }
            />
          )}
          {modal.kind === "purchase" && modal.customer && (
            <PurchaseForm
              purchase={modal.purchase}
              prescriptions={[
                ...data.prescriptions,
                ...data.deletedPrescriptions.filter(
                  (p) => p.id === modal.purchase?.prescriptionId,
                ),
              ].filter((p) => p.customerId === modal.customer!.id)}
              busy={busy}
              onCancel={close}
              onSave={(p) =>
                act(
                  modal.purchase ? "purchase.update" : "purchase.create",
                  {
                    customerId: modal.customer!.id,
                    data: {
                      ...p,
                      ...(modal.purchase
                        ? {
                            id: modal.purchase.id,
                            version: modal.purchase.version,
                          }
                        : {}),
                    },
                  },
                  modal.purchase ? "Purchase updated" : "Purchase recorded",
                )
              }
            />
          )}
          {modal.kind === "care" && modal.customer && (
            <CareForm
              busy={busy}
              onCancel={close}
              onSave={(c) =>
                act(
                  "aftercare.create",
                  { customerId: modal.customer!.id, data: c },
                  "Aftercare visit recorded",
                )
              }
            />
          )}
          {modal.kind === "viewRx" && modal.rx && (
            <>
              <div className="rx-view print-record">
                <div className="print-brand">
                  <Logo />
                  <h2>{t("Prescription record · Raport për syza")}</h2>
                  <p>
                    {name(modal.customer)}
                    {modal.customer?.dob ? ` · ${fmt(modal.customer.dob)}` : ""}
                  </p>
                </div>
                <div className="rx-metadata">
                  <div>
                    <small>{t("Prescription date")}</small>
                    <b>{fmt(modal.rx.date)}</b>
                  </div>
                  <div>
                    <small>{t("Prescriber")}</small>
                    <b>{modal.rx.doctor || t("Not recorded")}</b>
                  </div>
                  <div>
                    <small>{t("PD notation")}</small>
                    <b>
                      {modal.rx.pdMode === "binocular"
                        ? t("Binocular (combined)")
                        : t("Monocular (per eye)")}
                    </b>
                  </div>
                </div>
                {data.prescriptions.some(
                  (p) => p.supersedesId === modal.rx!.id,
                ) && (
                  <div className="notice amber">
                    {t(
                      "This entry has been corrected. The original is retained for history.",
                    )}
                  </div>
                )}
                {modal.rx.supersedesId && (
                  <div className="notice">
                    {t("Correction reason:")} {modal.rx.correctionReason}
                  </div>
                )}
                <GridTable rx={modal.rx} />
                {modal.rx.notes && (
                  <div className="record-notes">
                    <small>{t("Notes")}</small>
                    <p className="preserve">{modal.rx.notes}</p>
                  </div>
                )}
                <p className="record-author">
                  {t("Recorded by")} {modal.rx.author} ·{" "}
                  {fmt(modal.rx.createdAt)}
                </p>
                <div className="attachments">
                  <h3>
                    <Paperclip size={16} />
                    {t("Original documents")}
                  </h3>
                  {data.attachments
                    .filter((a) => a.prescriptionId === modal.rx!.id)
                    .map((a) => (
                      <a
                        href={`/api/files?id=${encodeURIComponent(a.id)}`}
                        key={a.id}
                        className="attachment"
                        download
                      >
                        <FileText size={18} />
                        <span>
                          {a.name}
                          <small>{Math.ceil(a.size / 1024)} KB</small>
                        </span>
                        <Download size={16} />
                      </a>
                    ))}
                  {!data.attachments.some(
                    (a) => a.prescriptionId === modal.rx!.id,
                  ) && (
                    <p className="muted">
                      {t("No original documents attached.")}
                    </p>
                  )}
                  {!modal.customer?.archived && (
                    <label
                      className={`button secondary upload-button ${busy ? "disabled" : ""}`}
                    >
                      <Paperclip size={15} />
                      {busy ? t("Uploading…") : t("Attach scan or photo")}
                      <input
                        aria-label={t("Attach scan or photo")}
                        type="file"
                        accept="image/jpeg,image/png,application/pdf"
                        disabled={busy}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setError("");
                          if (file.size > 4 * 1024 * 1024) {
                            setError("Files must be 4 MB or smaller");
                            e.target.value = "";
                            return;
                          }
                          setBusy(true);
                          const form = new FormData();
                          form.append("file", file);
                          form.append("prescriptionId", modal.rx!.id);
                          try {
                            const r = await fetch("/api/files", {
                              method: "POST",
                              body: form,
                            });
                            const d = (await r.json()) as { error?: string };
                            if (!r.ok) throw new Error(d.error);
                            await load();
                            setToast("Original document attached");
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Upload failed",
                            );
                          } finally {
                            setBusy(false);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                  )}
                  <small>{t("JPG, PNG or PDF · up to 4 MB each")}</small>
                </div>
              </div>
              <div className="dialog-actions">
                <button
                  className="button secondary"
                  onClick={() => window.print()}
                >
                  <Printer size={16} />
                  {t("Print record")}
                </button>
                <button
                  className="button secondary"
                  onClick={() =>
                    open({
                      kind: "delete",
                      deletion: "prescription",
                      customer: modal.customer,
                      rx: modal.rx,
                    })
                  }
                >
                  <Trash2 size={15} />
                  {t("Delete prescription")}
                </button>
                {!modal.customer?.archived &&
                  !data.prescriptions.some(
                    (p) => p.supersedesId === modal.rx!.id,
                  ) && (
                    <button
                      className="button primary"
                      onClick={() =>
                        open({
                          kind: "rx",
                          customer: modal.customer,
                          rx: modal.rx,
                        })
                      }
                    >
                      {t("Add correction")} <ArrowRight size={16} />
                    </button>
                  )}
              </div>
            </>
          )}
          {modal.kind === "compare" && (
            <div className="comparison">
              {compare.map((id) => {
                const p = data.prescriptions.find((p) => p.id === id);
                return p ? (
                  <div key={id}>
                    <h3>{fmt(p.date)}</h3>
                    <p>{p.doctor || t("Prescriber not recorded")}</p>
                    <GridTable rx={p} />
                    <small>
                      {p.pdMode === "binocular"
                        ? t("Binocular PD")
                        : t("Monocular PD")}
                    </small>
                  </div>
                ) : null;
              })}
              <p className="muted full-width">
                {t(
                  "Values are shown as recorded. No clinical interpretation or conversion is applied.",
                )}
              </p>
            </div>
          )}
          {["archive", "unlink", "samplesRemove"].includes(modal.kind) && (
            <div className="confirm-body">
              <p>
                {modal.kind === "archive"
                  ? modal.customer?.archived
                    ? t(
                        "This customer will return to the active directory with their history intact.",
                      )
                    : t(
                        "This customer will move to the archived directory. Their prescriptions, family links and aftercare will be preserved.",
                      )
                  : modal.kind === "unlink"
                    ? t(
                        "Both customer profiles and their individual histories will stay intact. Only this family connection will be removed.",
                      )
                    : t(
                        "This will remove all sample customers and any prescriptions, files, aftercare or family links added to them. Your other customers will stay in the workspace.",
                      )}
              </p>
              <div className="dialog-actions">
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={close}
                >
                  {t("Cancel")}
                </button>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={async () => {
                    if (modal.kind === "archive")
                      await act(
                        "customer.archive",
                        {
                          customerId: modal.customer!.id,
                          version: modal.customer!.version,
                        },
                        modal.customer!.archived
                          ? "Customer restored"
                          : "Customer archived",
                      );
                    else if (modal.kind === "unlink")
                      await act(
                        "family.remove",
                        {
                          customerId: modal.customer!.id,
                          data: { id: modal.family!.id },
                        },
                        "Family connection removed",
                      );
                    else {
                      const result = await act(
                        "samples.remove",
                        {},
                        "Sample records removed",
                      );
                      if (result) go("customers");
                    }
                  }}
                >
                  {busy ? <LoaderCircle className="spin" size={16} /> : null}
                  {modal.kind === "archive"
                    ? modal.customer?.archived
                      ? t("Restore customer")
                      : t("Archive customer")
                    : modal.kind === "unlink"
                      ? t("Remove connection")
                      : t("Remove samples")}
                </button>
              </div>
            </div>
          )}
        </Dialog>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {t(toast)}
          <button
            className="icon-button"
            onClick={() => setToast("")}
            aria-label={t("Dismiss notification")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function FormActions({
  busy,
  onCancel,
  label = "Save changes",
  disabled = false,
}: {
  busy: boolean;
  onCancel: () => void;
  label?: string;
  disabled?: boolean;
}) {
  const { t } = useLocale();

  return (
    <div className="dialog-actions">
      <button
        className="button secondary"
        type="button"
        disabled={busy}
        onClick={onCancel}
      >
        {t("Cancel")}
      </button>
      <button
        className="button primary"
        type="submit"
        disabled={busy || disabled}
      >
        {busy ? (
          <LoaderCircle className="spin" size={16} />
        ) : (
          <Check size={16} />
        )}{" "}
        {busy ? t("Saving…") : t(label)}
      </button>
    </div>
  );
}
function CustomerForm({
  customer,
  customers,
  busy,
  onSave,
  onCancel,
}: {
  customer?: Customer;
  customers: Customer[];
  busy: boolean;
  onSave: (c: CustomerInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const { t } = useLocale();

  const [c, setC] = useState<CustomerInput>(
      customer ? { ...customer } : emptyCustomer,
    ),
    [err, setErr] = useState("");
  const [tags, setTags] = useState(c.tags.join(", "));
  const set = (key: keyof CustomerInput, value: string) =>
    setC({ ...c, [key]: value });
  const duplicate = customers
    .filter((v) => v.id !== customer?.id)
    .find(
      (v) =>
        (c.phone.replace(/\D/g, "").length >= 6 &&
          v.phone.replace(/\D/g, "") === c.phone.replace(/\D/g, "")) ||
        (c.firstName &&
          c.lastName &&
          name(v).toLowerCase() === name(c).toLowerCase()),
    );
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setErr("");
        const result = customerInput.safeParse({
          ...c,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        });
        if (!result.success) {
          setErr(result.error.issues[0].message);
          return;
        }
        await onSave(result.data);
      }}
    >
      <div className="form-body">
        {err && (
          <div role="alert" className="inline-error">
            {t(err)}
          </div>
        )}
        <div className="form-grid">
          <Field label={t("First name *")}>
            <input
              autoFocus
              required
              maxLength={80}
              autoComplete="given-name"
              value={c.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              placeholder={t("e.g. Arta")}
            />
          </Field>
          <Field label={t("Last name *")}>
            <input
              required
              maxLength={80}
              autoComplete="family-name"
              value={c.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              placeholder={t("e.g. Krasniqi")}
            />
          </Field>
          <Field label={t("Phone number")}>
            <input
              type="tel"
              maxLength={40}
              autoComplete="tel"
              value={c.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+383 …"
            />
          </Field>
          <Field label={t("Email address")}>
            <input
              type="email"
              autoComplete="email"
              value={c.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="name@example.com"
            />
          </Field>
          <Field label={t("Date of birth")}>
            <DateInput
              label={t("Date of birth")}
              max={today()}
              value={c.dob}
              onChange={(v) => set("dob", v)}
            />
          </Field>
          <Field label={t("Address / city")}>
            <input
              maxLength={300}
              autoComplete="street-address"
              value={c.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder={t("e.g. Prishtina")}
            />
          </Field>
        </div>
        {duplicate && (
          <div className="notice amber">
            {t("Possible existing customer:")} <b>{name(duplicate)}</b>
            {t(
              ". Family members may share a phone number; check before creating another record.",
            )}
          </div>
        )}
        <Field
          label={t("Preferences / tags")}
          hint={t("Separate tags with commas. Up to 8 tags.")}
        >
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={t("Lightweight frames, phone preferred")}
          />
        </Field>
        <Field label={t("Customer notes")}>
          <textarea
            rows={3}
            maxLength={5000}
            value={c.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder={t("The small details worth remembering…")}
          />
        </Field>
        <small className="muted">
          {t(
            "Contact information is optional, including for children with a family contact.",
          )}
        </small>
      </div>
      <FormActions
        busy={busy}
        onCancel={onCancel}
        label={customer ? t("Save changes") : t("Register customer")}
      />
    </form>
  );
}
function RxForm({
  rx,
  busy,
  onSave,
  onCancel,
}: {
  rx?: Prescription;
  busy: boolean;
  onSave: (r: RxInput) => Promise<unknown>;
  onCancel: () => void;
}) {
  const { t, language } = useLocale();

  const [r, setR] = useState<RxInput>(
    rx
      ? {
          date: rx.date,
          doctor: rx.doctor,
          notes: rx.notes,
          pdMode: rx.pdMode,
          grid: structuredClone(rx.grid),
          supersedesId: rx.id,
          correctionReason: "",
        }
      : {
          date: today(),
          doctor: "",
          notes: "",
          pdMode: "binocular",
          grid: emptyGrid(),
          supersedesId: null,
          correctionReason: "",
        },
  );
  const [err, setErr] = useState("");
  function setCell(
    key: keyof Grid,
    eye: "od" | "os" | "shared",
    field: "sph" | "cyl" | "axis" | "pd",
    value: string,
  ) {
    setR((prev) => {
      const grid = structuredClone(prev.grid);
      if (eye === "shared") grid[key].pd = value;
      else grid[key][eye][field] = value;
      return { ...prev, grid };
    });
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const result = rxInput.safeParse(r);
        if (!result.success) {
          setErr(result.error.issues[0].message);
          return;
        }
        setErr("");
        await onSave(result.data);
      }}
    >
      <div className="form-body">
        {err && (
          <div className="inline-error" role="alert">
            {t(err)}
          </div>
        )}
        {rx && (
          <div className="notice">
            {t(
              "You’re adding a correction. The original entry will stay in the history.",
            )}
          </div>
        )}
        <div className="form-grid">
          <Field label={t("Prescription date *")}>
            <DateInput
              label={t("Prescription date *")}
              required
              max={today()}
              value={r.date}
              onChange={(v) => setR({ ...r, date: v })}
            />
          </Field>
          <Field label={t("Prescriber / doctor")}>
            <input
              maxLength={150}
              placeholder={t("As written on the prescription")}
              value={r.doctor}
              onChange={(e) => setR({ ...r, doctor: e.target.value })}
            />
          </Field>
        </div>
        <div className="rx-form-caption">
          <h3>{t("Prescription measurements")}</h3>
          <Field label={t("PD notation")}>
            <select
              value={r.pdMode}
              onChange={(e) => {
                const mode = e.target.value as RxInput["pdMode"];
                const hasValues = Object.values(r.grid).some(
                  (g) => g.pd || g.od.pd || g.os.pd,
                );
                if (
                  hasValues &&
                  !window.confirm(
                    t(
                      "Switching PD notation will clear PD values. Re-enter them using the selected notation.",
                    ),
                  )
                )
                  return;
                const grid = structuredClone(r.grid);
                for (const g of Object.values(grid)) {
                  g.pd = "";
                  g.od.pd = "";
                  g.os.pd = "";
                }
                setR({ ...r, pdMode: mode, grid });
              }}
            >
              <option value="binocular">{t("Binocular · combined PD")}</option>
              <option value="monocular">{t("Monocular · per-eye PD")}</option>
            </select>
          </Field>
        </div>
        <div className="grid-scroll">
          <table className="rx-grid editable">
            <thead>
              <tr>
                <th>{t("Purpose")}</th>
                <th>{t("Eye")}</th>
                <th>SPH</th>
                <th>CYL</th>
                <th>{t("AXIS")}</th>
                <th>
                  PD <small>mm</small>
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map(([key, label, al]) =>
                ["od", "os"].map((eye, i) => (
                  <tr key={key + eye} className={i === 0 ? "group-start" : ""}>
                    {i === 0 && (
                      <th rowSpan={2}>
                        {t(label)}
                        <small>{language === "sq" ? label : al}</small>
                      </th>
                    )}
                    <td>
                      <b>{eye.toUpperCase()}</b>
                      <small>{eye === "od" ? t("Right") : t("Left")}</small>
                    </td>
                    {(["sph", "cyl", "axis"] as const).map((field) => (
                      <td key={field}>
                        <input
                          aria-label={`${t(label)} ${eye.toUpperCase()} ${field.toUpperCase()}`}
                          inputMode={field === "axis" ? "numeric" : "text"}
                          maxLength={12}
                          placeholder="—"
                          value={r.grid[key][eye as "od" | "os"][field]}
                          onChange={(e) =>
                            setCell(
                              key,
                              eye as "od" | "os",
                              field,
                              e.target.value,
                            )
                          }
                        />
                      </td>
                    ))}
                    {r.pdMode === "monocular" ? (
                      <td>
                        <input
                          aria-label={`${t(label)} ${eye.toUpperCase()} PD`}
                          inputMode="decimal"
                          placeholder="—"
                          value={r.grid[key][eye as "od" | "os"].pd}
                          onChange={(e) =>
                            setCell(
                              key,
                              eye as "od" | "os",
                              "pd",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                    ) : i === 0 ? (
                      <td rowSpan={2}>
                        <input
                          aria-label={`${t(label)} ${t("combined PD")}`}
                          inputMode="decimal"
                          placeholder="—"
                          value={r.grid[key].pd}
                          onChange={(e) =>
                            setCell(key, "shared", "pd", e.target.value)
                          }
                        />
                      </td>
                    ) : null}
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
        <div className="grid-help">
          <span>{t("OD = right eye · OS = left eye")}</span>
          <span>{t("Blank fields stay blank. No values are calculated.")}</span>
        </div>
        {rx && (
          <Field label={t("Reason for correction *")}>
            <textarea
              required
              rows={2}
              maxLength={2000}
              value={r.correctionReason}
              onChange={(e) => setR({ ...r, correctionReason: e.target.value })}
              placeholder={t("Explain what changed and why")}
            />
          </Field>
        )}
        <Field label={t("Prescription notes")}>
          <textarea
            rows={2}
            maxLength={5000}
            placeholder={t("Additional instructions exactly as recorded…")}
            value={r.notes}
            onChange={(e) => setR({ ...r, notes: e.target.value })}
          />
        </Field>
        <small className="muted">
          {t(
            "You can attach the original photo or scan after saving this prescription.",
          )}
        </small>
      </div>
      <FormActions
        busy={busy}
        onCancel={onCancel}
        label={rx ? t("Save correction") : t("Save prescription")}
      />
    </form>
  );
}
function FamilyForm({
  customer,
  customers,
  busy,
  onSave,
  onCancel,
}: {
  customer: Customer;
  customers: Customer[];
  busy: boolean;
  onSave: (f: {
    relativeId: string;
    relationship: "parent" | "child" | "partner" | "sibling" | "other";
    contact: boolean;
  }) => Promise<unknown>;
  onCancel: () => void;
}) {
  const { t } = useLocale();

  const [relativeId, setRelative] = useState(""),
    [relationship, setRel] = useState<
      "parent" | "child" | "partner" | "sibling" | "other"
    >("parent"),
    [contact, setContact] = useState(false);
  const options = customers.filter((c) => c.id !== customer.id);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = familyInput.parse({ relativeId, relationship, contact });
        await onSave(f);
      }}
    >
      <div className="form-body">
        <Field
          label={t("Family member *")}
          hint={t("Register them as a customer first if they are not listed.")}
        >
          <select
            required
            autoFocus
            value={relativeId}
            onChange={(e) => setRelative(e.target.value)}
          >
            <option value="">{t("Choose an existing customer")}</option>
            {options
              .sort((a, b) => name(a).localeCompare(name(b)))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {name(c)}
                </option>
              ))}
          </select>
        </Field>
        <Field
          label={t("This person is {name}’s…", { name: customer.firstName })}
        >
          <select
            value={relationship}
            onChange={(e) => setRel(e.target.value as typeof relationship)}
          >
            <option value="parent">{t("Parent")}</option>
            <option value="child">{t("Child")}</option>
            <option value="partner">{t("Partner")}</option>
            <option value="sibling">{t("Sibling")}</option>
            <option value="other">{t("Other relative")}</option>
          </select>
        </Field>
        <label className="contact-choice">
          <input
            type="checkbox"
            checked={contact}
            onChange={(e) => setContact(e.target.checked)}
          />
          <span>
            <b>
              {t("Use this person as a contact for")} {customer.firstName}
            </b>
            <small>
              {t("Useful when a parent handles communication for a child.")}
            </small>
          </span>
        </label>
        <div className="notice">
          {t(
            "The connection appears on both profiles. Each person’s prescriptions and aftercare stay separate.",
          )}
        </div>
      </div>
      <FormActions
        busy={busy}
        disabled={!options.length || !relativeId}
        onCancel={onCancel}
        label={t("Link family member")}
      />
    </form>
  );
}
function CareForm({
  busy,
  onSave,
  onCancel,
}: {
  busy: boolean;
  onSave: (c: {
    date: string;
    kind: "Adjustment" | "Repair" | "Lens replacement" | "Warranty" | "Other";
    notes: string;
  }) => Promise<unknown>;
  onCancel: () => void;
}) {
  const { t } = useLocale();

  const [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const result = careInput.safeParse(Object.fromEntries(f));
        if (result.success) {
          setError("");
          await onSave(result.data);
        } else {
          setError(result.error.issues[0].message);
        }
      }}
    >
      <div className="form-body">
        {error && (
          <div className="inline-error" role="alert">
            {t(error)}
          </div>
        )}
        <div className="form-grid">
          <Field label={t("Visit date *")}>
            <DateInput
              label={t("Visit date *")}
              name="date"
              defaultValue={today()}
              max={today()}
              required
              autoFocus
            />
          </Field>
          <Field label={t("Type of care")}>
            <select name="kind">
              {[
                "Adjustment",
                "Repair",
                "Lens replacement",
                "Warranty",
                "Other",
              ].map((k) => (
                <option key={k} value={k}>
                  {t(k)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t("Visit notes *")}>
          <textarea
            name="notes"
            rows={5}
            maxLength={5000}
            required
            placeholder={t(
              "What was done? Include anything useful for the next visit.",
            )}
          />
        </Field>
        <p className="muted">
          {t(
            "This visit will be saved as a dated entry in the customer’s history.",
          )}
        </p>
      </div>
      <FormActions busy={busy} onCancel={onCancel} label={t("Record visit")} />
    </form>
  );
}
