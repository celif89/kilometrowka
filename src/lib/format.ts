import { parseDay } from "../engine/dates";

export const MONTHS = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień",
  "październik", "listopad", "grudzień"];
export const MONTHS_GENITIVE = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia",
  "września", "października", "listopada", "grudnia"];
const MONTHS_SHORT = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
export const WEEKDAYS = ["poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota", "niedziela"];
export const WEEKDAYS_SHORT = ["pn", "wt", "śr", "cz", "pt", "sb", "nd"];

const formats = new Map<number, Intl.NumberFormat>();
const fmt = (digits: number) => {
  if (!formats.has(digits)) {
    formats.set(digits, new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: digits }));
  }
  return formats.get(digits)!;
};

const empty = (v: number | null | undefined): v is null | undefined =>
  v === null || v === undefined || Number.isNaN(v);

/** „17 925” lub „7,5” – do jednego miejsca po przecinku, bez zbędnych zer. */
export const num = (v: number | null | undefined, digits = 1) => (empty(v) ? "–" : fmt(digits).format(v));
export const km = (v: number | null | undefined) => (empty(v) ? "–" : `${num(v)} km`);
export const signedKm = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${num(Math.abs(v))} km`;

export function monthName(month: string, short = false): string {
  const [y, m] = month.split("-");
  return `${(short ? MONTHS_SHORT : MONTHS)[Number(m) - 1]} ${y}`;
}

export const monthOnly = (month: string) => MONTHS[Number(month.slice(5, 7)) - 1];
export const monthShort = (month: string) => MONTHS_SHORT[Number(month.slice(5, 7)) - 1];

/** „grudnia 2025” */
export function monthGenitive(month: string): string {
  const [y, m] = month.split("-");
  return `${MONTHS_GENITIVE[Number(m) - 1]} ${y}`;
}

export function dayLabel(day: string): string {
  const [y, m, d] = day.split("-");
  return `${d}.${m}.${y}`;
}

/** „pt, 31 października” */
export function dayLong(day: string, withYear = false): string {
  const d = parseDay(day);
  const wd = WEEKDAYS[(d.getDay() + 6) % 7];
  return `${wd}, ${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ""}`;
}

export function dateTimeLabel(iso: string): string {
  return new Date(iso).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" });
}

/** „1 przejazd”, „2 przejazdy”, „5 przejazdów” */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10, mod100 = n % 100;
  const word = n === 1 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many;
  return `${num(n, 0)} ${word}`;
}

export const trips = (n: number) => plural(n, "przejazd", "przejazdy", "przejazdów");

/** „46 153”, „8 671” – grupowanie tysięcy jak w arkuszu (także dla liczb czterocyfrowych), bez łamania linii. */
export function odo(v: number): string {
  const [int, frac] = String(Math.round(v * 10) / 10).split(".");
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0") + (frac ? `,${frac}` : "");
}
