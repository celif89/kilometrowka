import { ChevronLeft, ChevronRight, Copy, Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { copyDayTrips } from "../engine/copy";
import { addMonths, daysInMonth, monthOf, todayLocal, weekday } from "../engine/dates";
import { isMonthClosed, type LedgerTrip } from "../engine/ledger";
import { deleteTrips, insertTrips } from "../lib/data";
import { useData } from "../lib/DataContext";
import { dayLabel, dayLong, km, monthName, num, plural, trips as tripsWord, WEEKDAYS_SHORT } from "../lib/format";
import { Place } from "./trips";
import { cx, Modal, useAction } from "./ui";

/** Kopiowanie przejazdów jednego dnia na wybrane dni (kalendarz z wyborem wielu dni). */
export function CopyDayModal({ source, onClose }: { source: LedgerTrip[] | null; onClose: () => void }) {
  const { data, vehicle, ledger, reload } = useData();
  const { busy, run } = useAction(reload);
  const sourceDay = source?.[0]?.day ?? "";
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [targets, setTargets] = useState<string[]>([]);
  const [month, setMonth] = useState(monthOf(todayLocal()));

  useEffect(() => {
    if (!source?.length) return;
    setPicked(new Set(source.map((t) => t.id)));
    setTargets([]);
    // zatwierdzony miesiąc nie przyjmie kopii – wtedy od razu pokaż bieżący
    const closed = data && vehicle ? isMonthClosed(data.closes, vehicle.id, source[0].day) : false;
    setMonth(closed ? monthOf(todayLocal()) : monthOf(source[0].day));
  }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

  const tripsByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of ledger) m.set(t.day, (m.get(t.day) ?? 0) + 1);
    return m;
  }, [ledger]);

  if (!source?.length || !data || !vehicle) return null;
  const chosen = source.filter((t) => picked.has(t.id));
  const chosenKm = chosen.reduce((a, t) => a + t.km, 0);
  const toggleDay = (d: string) => setTargets((xs) => (xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d].sort()));
  const blocked = (d: string) => d === sourceDay || d < vehicle.start_date || (!!vehicle.end_date && d > vehicle.end_date)
    || isMonthClosed(data.closes, vehicle.id, d);

  const first = `${month}-01`;
  const lead = weekday(first);
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth(month) }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  const monthLocked = isMonthClosed(data.closes, vehicle.id, first);

  async function copy() {
    const rows = copyDayTrips(chosen, targets, ledger);
    let ids: number[] = [];
    const ok = await run(async () => { ids = await insertTrips(rows); },
      `Skopiowano ${tripsWord(rows.length)} na ${plural(targets.length, "dzień", "dni", "dni")}`,
      { label: "Cofnij", run: () => void run(() => deleteTrips(ids), "Cofnięto kopiowanie") });
    if (ok) onClose();
  }

  return (
    <Modal open onClose={onClose} wide title={<span className="flex items-center gap-2"><Copy className="size-4 text-brand-500" /> Kopiuj dzień {dayLabel(sourceDay)}</span>}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Anuluj</button>
        <button className="btn btn-primary" disabled={busy || chosen.length === 0 || targets.length === 0} onClick={copy}>
          <Copy className="size-4" />
          {targets.length === 0 ? "Wybierz dni" : `Kopiuj ${tripsWord(chosen.length)} na ${plural(targets.length, "dzień", "dni", "dni")}`}
        </button>
      </>}>
      <div className="grid gap-6 md:grid-cols-[1fr_17rem]">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label mb-0">Przejazdy do skopiowania</span>
            <span className="text-xs text-slate-500">{tripsWord(chosen.length)} · {km(chosenKm)}</span>
          </div>
          <ul className="space-y-1.5">
            {source.map((t) => (
              <li key={t.id}>
                <label className={cx("flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2.5 transition",
                  picked.has(t.id) ? "border-brand-200 bg-brand-50/50 dark:border-brand-500/30 dark:bg-brand-500/10" : "border-slate-200 opacity-60 dark:border-white/10")}>
                  <input type="checkbox" className="mt-1 size-4 accent-brand-600" checked={picked.has(t.id)}
                    onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); return n; })} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-slate-500">{t.purpose}</span>
                    <span className="block truncate text-sm"><Place address={t.origin} /> → <Place address={t.destination} /></span>
                  </span>
                  <span className="font-display shrink-0 font-bold tnum">{num(t.km)}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <span className="label">Na dni</span>
          <div className="rounded-2xl border border-slate-200 p-3 dark:border-white/10">
            <div className="mb-2 flex items-center justify-between">
              <button className="btn btn-ghost size-8 rounded-lg p-0" onClick={() => setMonth(addMonths(month, -1))} aria-label="Poprzedni miesiąc"><ChevronLeft className="size-4" /></button>
              <span className="text-sm font-semibold first-letter:uppercase">{monthName(month)} {monthLocked && <Lock className="ml-1 inline size-3 text-emerald-500" />}</span>
              <button className="btn btn-ghost size-8 rounded-lg p-0" onClick={() => setMonth(addMonths(month, 1))} aria-label="Następny miesiąc"><ChevronRight className="size-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS_SHORT.map((w) => <span key={w} className="pb-1 text-[10px] font-semibold text-slate-400 uppercase">{w}</span>)}
              {cells.map((d, i) => {
                if (!d) return <span key={`e${i}`} />;
                const sel = targets.includes(d);
                const off = blocked(d);
                const has = tripsByDay.get(d);
                return (
                  <button key={d} type="button" disabled={off} onClick={() => toggleDay(d)} data-copy-day={d}
                    title={d === sourceDay ? "Dzień źródłowy" : has ? `Już ${tripsWord(has)} – nowe dopiszą się na koniec` : dayLong(d)}
                    className={cx("relative flex h-9 items-center justify-center rounded-xl text-sm font-medium transition",
                      sel ? "bg-brand-600 text-white shadow-md shadow-brand-600/30" : "hover:bg-slate-100 dark:hover:bg-white/10",
                      d === sourceDay && "ring-2 ring-brand-300 ring-inset",
                      off && !sel && "cursor-not-allowed text-slate-300 hover:bg-transparent dark:text-slate-600",
                      weekday(d) >= 5 && !sel && !off && "text-slate-400",
                      d === todayLocal() && !sel && "font-bold text-brand-600")}>
                    {Number(d.slice(8))}
                    {has && !off && <span className={cx("absolute bottom-1 size-1 rounded-full", sel ? "bg-white" : "bg-amber-500")} />}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Kliknij kilka dni, aby skopiować na każdy z nich. <span className="inline-block size-1.5 rounded-full bg-amber-500 align-middle" /> – dzień
            ma już przejazdy (nowe dopiszą się na koniec). Zatwierdzone miesiące są zablokowane.
          </p>
          {targets.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {targets.map((d) => (
                <button key={d} className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-200 dark:bg-brand-500/20 dark:text-brand-200"
                  onClick={() => toggleDay(d)} title="Usuń">{dayLabel(d)} ✕</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
