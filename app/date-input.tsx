"use client";
import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { parseWrittenDate, writtenDate } from "../lib/dates";
import { useLocale } from "./locale";
export default function DateInput({
  value,
  defaultValue = "",
  onChange,
  name,
  label,
  required = false,
  autoFocus = false,
  max,
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  name?: string;
  label: string;
  required?: boolean;
  autoFocus?: boolean;
  max?: string;
}) {
  const { t, language } = useLocale();
  const [draft, setDraft] = useState(() =>
    writtenDate(value ?? defaultValue, language),
  );
  const input = useRef<HTMLInputElement>(null),
    picker = useRef<HTMLInputElement>(null),
    focused = useRef(false),
    calendarActive = useRef(false);
  const iso = parseWrittenDate(draft);
  const error =
    draft.length > 0 && !iso
      ? t("Enter a valid date, for example 26 October 2026 or 26/10/2026")
      : iso && max && iso > max
        ? t("Date cannot be later than {date}", {
            date: writtenDate(max, language),
          })
        : "";
  useEffect(() => {
    if (!focused.current)
      setDraft((previous) => writtenDate(value ?? previous, language));
  }, [value, language]);
  useEffect(() => {
    input.current?.setCustomValidity(error);
  }, [error]);
  useEffect(() => {
    const dialog = input.current?.closest("dialog");
    const dismiss = (event: Event) => {
      if (calendarActive.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
        calendarActive.current = false;
        input.current?.focus();
      }
    };
    dialog?.addEventListener("cancel", dismiss, true);
    return () => dialog?.removeEventListener("cancel", dismiss, true);
  }, []);
  function change(raw: string) {
    setDraft(raw);
    onChange?.(parseWrittenDate(raw) ?? raw);
  }
  return (
    <div className="date-entry">
      <div className="date-entry-controls">
        <input
          ref={input}
          type="text"
          aria-label={label}
          required={required}
          autoFocus={autoFocus}
          value={draft}
          maxLength={80}
          autoComplete="off"
          placeholder={t("e.g. 26 October 2026 or 26/10/2026")}
          onFocus={() => {
            focused.current = true;
            calendarActive.current = false;
          }}
          onChange={(e) => change(e.target.value)}
          onBlur={() => {
            focused.current = false;
            const date = parseWrittenDate(draft);
            if (date) {
              setDraft(writtenDate(date, language));
              onChange?.(date);
            }
          }}
        />
        <button
          className="date-picker-button"
          type="button"
          aria-label={t("Open calendar")}
          title={t("Open calendar")}
          onClick={() => {
            try {
              calendarActive.current = true;
              if (picker.current?.showPicker) picker.current.showPicker();
              else picker.current?.click();
            } catch {
              calendarActive.current = false;
              picker.current?.focus();
            }
          }}
        >
          <CalendarDays size={18} />
        </button>
        <input
          ref={picker}
          className="native-date-picker"
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={iso ?? ""}
          max={max}
          onChange={(e) => {
            calendarActive.current = false;
            change(e.target.value);
            setDraft(writtenDate(e.target.value, language));
            input.current?.focus();
          }}
        />
      </div>
      {name && <input type="hidden" name={name} value={iso ?? ""} />}
      <small className="date-entry-hint">
        {t("Type a date or use the calendar. DD/MM/YYYY is also accepted.")}
      </small>
    </div>
  );
}
