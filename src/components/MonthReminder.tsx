import { CalendarCheck, Lock, NotebookPen, Printer } from "lucide-react";
import { Link } from "react-router-dom";
import { checkNearMonthEnd } from "../engine/reminders";
import { closeMonth } from "../lib/data";
import { useData } from "../lib/DataContext";
import { dayLabel, km, monthName, num, signedKm, trips as tripsWord } from "../lib/format";
import { useAction } from "./ui";

/** Od 1. dnia miesiąca: przypomnienie, żeby wydrukować, podpisać i zatwierdzić poprzedni miesiąc. */
export function MonthReminder() {
  const { reminder: m, vehicle, checks, reload } = useData();
  const { busy, run } = useAction(reload);
  if (!m || !vehicle) return null;
  const check = checkNearMonthEnd(checks, m.month);

  return (
    <section className="card relative overflow-hidden border-brand-200/70 p-5 sm:p-6 dark:border-brand-500/20">
      <div className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-brand-500/10 blur-2xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            <CalendarCheck className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Zamknij {monthName(m.month)}</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {m.trips.length ? <>{tripsWord(m.trips.length)} · {km(m.km)} · licznik na koniec {num(m.odoEnd)} km</> : "W tym miesiącu nie ma przejazdów – wydruk i tak jest potrzebny."}
            </p>
            {check && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Faktyczny licznik{check.reading.source === "fvmeter" ? " z FV Meter" : ""} ({dayLabel(check.reading.day)}): {km(check.reading.km)} –{" "}
                <span className={Math.abs(check.diff) >= 50 ? "font-semibold text-amber-600 dark:text-amber-400" : "font-semibold text-emerald-600 dark:text-emerald-400"}>
                  {Math.abs(check.diff) >= 50 ? `różnica ${signedKm(check.diff)}` : `zgodny (${signedKm(check.diff)})`}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
      <ol className="relative mt-5 grid gap-2 sm:grid-cols-3">
        <li>
          <Link to={`/ewidencja/${m.month}`} className="flex h-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium transition hover:border-brand-300 hover:shadow-md dark:border-white/10 dark:bg-ink-900">
            <span className="font-mono text-xs text-slate-400">1</span><NotebookPen className="size-4 text-brand-500" /> Sprawdź wpisy
          </Link>
        </li>
        <li>
          <Link to={`/druk/${vehicle.id}/${m.month}/${m.month}`} target="_blank" className="flex h-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium transition hover:border-brand-300 hover:shadow-md dark:border-white/10 dark:bg-ink-900">
            <span className="font-mono text-xs text-slate-400">2</span><Printer className="size-4 text-brand-500" /> Wydrukuj i podpisz
          </Link>
        </li>
        <li>
          <button disabled={busy} onClick={() => {
            if (window.confirm(`Zatwierdzić ${monthName(m.month)}? Wpisów nie będzie można zmieniać (chyba że otworzysz miesiąc ponownie).`)) {
              void run(() => closeMonth(vehicle.id, m.month), `Zatwierdzono: ${monthName(m.month)}`);
            }
          }} className="flex h-full w-full items-center gap-3 rounded-2xl bg-ink-900 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-ink-700 disabled:opacity-50 dark:bg-white dark:text-ink-900">
            <span className="font-mono text-xs text-white/50 dark:text-ink-900/50">3</span><Lock className="size-4" /> Zatwierdź miesiąc
          </button>
        </li>
      </ol>
    </section>
  );
}
