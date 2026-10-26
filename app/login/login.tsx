"use client";
import { useState } from "react";
import {
  ArrowRight,
  LoaderCircle,
  Eye,
  EyeOff,
  LockKeyhole,
} from "lucide-react";
import { useLocale, LanguageSwitch } from "../locale";
export default function Login() {
  const { t } = useLocale();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="login-shell">
      <header className="login-header">
        <div className="login-wordmark">
          OPTIKA NIMANI<small>Premium Eyewear</small>
        </div>
        <LanguageSwitch />
      </header>
      <div className="login-layout">
        <section className="login-intro">
          <div className="eyebrow">OPTIKA NIMANI · {t("CUSTOMER STUDIO")}</div>
          <h1>{t("A clearer view of customer care.")}</h1>
          <p>
            {t(
              "Prescriptions, purchases and families. Everything your team needs, together.",
            )}
          </p>
          <div className="login-line" />
          <small>{t("Made for the people behind Optika Nimani.")}</small>
        </section>
        <section className="login-card">
          <span className="login-lock">
            <LockKeyhole size={22} />
          </span>
          <h2>{t("Welcome back")}</h2>
          <p>{t("Sign in to your store workspace.")}</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const r = await fetch("/api/session", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "login", email, password }),
                });
                const d = (await r.json()) as { error?: string };
                if (!r.ok)
                  throw new Error(
                    d.error || "Could not complete sign-in. Please try again.",
                  );
                window.location.assign("/");
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Could not complete sign-in. Please try again.",
                );
                setBusy(false);
              }
            }}
          >
            {error && (
              <div className="inline-error" role="alert">
                {t(error)}
              </div>
            )}
            <label className="field">
              <span>{t("Email address")}</span>
              <input
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </label>
            <div className="field">
              <label htmlFor="login-password">{t("Password")}</label>
              <div className="password-input">
                <input
                  id="login-password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  maxLength={256}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t(show ? "Hide password" : "Show password")}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            <button className="button primary login-submit" disabled={busy}>
              {busy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <ArrowRight size={16} />
              )}{" "}
              {t(busy ? "Signing in…" : "Sign in")}
            </button>
          </form>
          <div className="login-help">
            {t(
              "Need access or a password reset? Ask your store administrator.",
            )}
          </div>
        </section>
      </div>
      <footer>{t("A private space for thoughtful customer care.")}</footer>
    </div>
  );
}
