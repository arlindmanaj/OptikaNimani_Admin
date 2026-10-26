"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import sq from "./sq.json";
export type Language = "sq" | "en";
const dictionary: Record<string, string> = sq;
export function translate(
  text: string,
  language: Language,
  params: Record<string, string | number> = {},
) {
  let result = language === "sq" ? (dictionary[text] ?? text) : text;
  if (language === "sq" && !dictionary[text]) {
    const max = text.match(
      /^String must contain at most (\d+) character\(s\)$/,
    );
    if (max) result = `Teksti duhet të ketë jo më shumë se ${max[1]} karaktere`;
  }
  for (const [key, value] of Object.entries(params))
    result = result.replaceAll(`{${key}}`, () => String(value));
  return result;
}
export function dateLabel(value: string, language: Language) {
  if (language === "sq" && value) {
    const [year, month, day] = value.slice(0, 10).split("-");
    const months = [
      "jan",
      "shk",
      "mar",
      "pri",
      "maj",
      "qer",
      "kor",
      "gsh",
      "sht",
      "tet",
      "nën",
      "dhj",
    ];
    return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
  }
  return value
    ? new Date(value.slice(0, 10) + "T12:00:00").toLocaleDateString(
        language === "sq" ? "sq-AL" : "en-GB",
        { day: "numeric", month: "short", year: "numeric" },
      )
    : "—";
}
export function money(value: number, language: Language) {
  if (language === "sq") {
    const whole = Math.trunc(value / 100)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${whole},${String(value % 100).padStart(2, "0")} €`;
  }
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(value / 100);
}
const Locale = createContext<{
  language: Language;
  setLanguage: (v: Language) => void;
  t: (text: string, params?: Record<string, string | number>) => string;
}>({
  language: "sq",
  setLanguage: () => {},
  t: (text) => dictionary[text] ?? text,
});
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("sq");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nimani-language");
      if (saved === "en" || saved === "sq") setLanguageState(saved);
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title=language==='sq'?'Optika Nimani | Menaxhimi i klientëve':'Optika Nimani | Customer Studio';
  }, [language]);
  const setLanguage = (value: Language) => {
    setLanguageState(value);
    try {
      localStorage.setItem("nimani-language", value);
    } catch {}
  };
  return (
    <Locale.Provider
      value={{
        language,
        setLanguage,
        t: (text, params) => translate(text, language, params),
      }}
    >
      {children}
    </Locale.Provider>
  );
}
export const useLocale = () => useContext(Locale);
export function LanguageSwitch() {
  const { language, setLanguage } = useLocale();
  return (
    <div
      className="language-switch"
      role="group"
      aria-label={
        language === "sq" ? "Gjuha e ndërfaqes" : "Interface language"
      }
    >
      <button
        aria-pressed={language === "sq"}
        onClick={() => setLanguage("sq")}
        lang="sq"
      >
        SQ<span>Shqip</span>
      </button>
      <span className="language-divider" />
      <button
        aria-pressed={language === "en"}
        onClick={() => setLanguage("en")}
        lang="en"
      >
        EN<span>English</span>
      </button>
    </div>
  );
}
