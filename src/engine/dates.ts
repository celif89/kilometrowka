// Daty jako napisy 'YYYY-MM-DD' (bez stref czasowych), miesiące jako 'YYYY-MM'.

const pad = (n: number) => String(n).padStart(2, "0");

export function toDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayLocal(): string {
  return toDay(new Date());
}

export function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(day: string, n: number): string {
  const d = parseDay(day);
  d.setDate(d.getDate() + n);
  return toDay(d);
}

export const monthOf = (day: string) => day.slice(0, 7);

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

/** Miesiące od `from` do `to` włącznie. */
export function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let m = from; m <= to; m = addMonths(m, 1)) out.push(m);
  return out;
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function lastDayOfMonth(month: string): string {
  return `${month}-${pad(daysInMonth(month))}`;
}

/** 0 = poniedziałek … 6 = niedziela */
export function weekday(day: string): number {
  return (parseDay(day).getDay() + 6) % 7;
}

export const isValidDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && toDay(parseDay(s)) === s;
