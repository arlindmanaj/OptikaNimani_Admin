const english = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const albanian = [
  "janar",
  "shkurt",
  "mars",
  "prill",
  "maj",
  "qershor",
  "korrik",
  "gusht",
  "shtator",
  "tetor",
  "nëntor",
  "dhjetor",
];
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const months: Record<string, number> = {
  jan: 1,
  shk: 2,
  mar: 3,
  pri: 4,
  apr: 4,
  maj: 5,
  qer: 6,
  jun: 6,
  kor: 7,
  jul: 7,
  gsh: 8,
  aug: 8,
  sht: 9,
  sep: 9,
  sept: 9,
  tet: 10,
  oct: 10,
  nen: 11,
  nov: 11,
  dhj: 12,
  dec: 12,
};
for (let i = 0; i < 12; i++) {
  months[fold(english[i])] = i + 1;
  months[fold(english[i].slice(0, 3))] = i + 1;
  months[fold(albanian[i])] = i + 1;
}
function valid(y: number, m: number, d: number) {
  if (y < 1 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const value = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const check = new Date(value + "T12:00:00Z");
  return !Number.isNaN(check.getTime()) &&
    check.toISOString().slice(0, 10) === value
    ? value
    : null;
}
/** Explicit formats only: never guess US vs European numeric dates. */
export function parseWrittenDate(value: string): string | null {
  const text = fold(value.trim())
    .replace(/(\d)(st|nd|rd|th)\b/g, "$1")
    .replace(/\bof\b/g, " ")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  let m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = text.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (m) return valid(+m[3], +m[2], +m[1]);
  m = text.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (m) return valid(+m[3], months[m[2]] ?? 0, +m[1]);
  m = text.match(/^([a-z]+)\s+(\d{1,2})\s+(\d{4})$/);
  if (m) return valid(+m[3], months[m[1]] ?? 0, +m[2]);
  return null;
}
export function writtenDate(value: string, language: "sq" | "en") {
  const iso = parseWrittenDate(value);
  if (!iso) return value;
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${(language === "sq" ? albanian : english)[Number(m) - 1]} ${y}`;
}
