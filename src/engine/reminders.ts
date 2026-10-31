// Przypomnienie o zamknięciu miesiąca: od 1. dnia miesiąca za miesiąc poprzedni, dopóki nie jest zatwierdzony.
import { addMonths, lastDayOfMonth, monthOf, todayLocal } from "./dates";
import type { MonthSummary, OdometerCheck } from "./ledger";

export function monthToClose(months: MonthSummary[], today = todayLocal()): MonthSummary | null {
  const prev = addMonths(monthOf(today), -1);
  const m = months.find((x) => x.month === prev);
  return m && !m.closed ? m : null;
}

/** Faktyczny odczyt licznika najbliższy końcowi miesiąca (± 7 dni) – do porównania przy zamykaniu. */
export function checkNearMonthEnd(checks: OdometerCheck[], month: string): OdometerCheck | null {
  const end = Date.parse(lastDayOfMonth(month));
  let best: OdometerCheck | null = null;
  let bestDist = Infinity;
  for (const c of checks) {
    const dist = Math.abs(Date.parse(c.reading.day) - end) / 86_400_000;
    if (dist <= 7 && dist < bestDist) { best = c; bestDist = dist; }
  }
  return best;
}
