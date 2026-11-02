import { ChevronLeft, ChevronRight, FileSpreadsheet, Lock, LockOpen, NotebookPen, Plus, Printer, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Place, type TripDraft, TripForm } from "../components/trips";
import { Badge, Card, cx, EmptyState, PageHeader, Stat, useAction } from "../components/ui";
import { addMonths, monthOf, todayLocal } from "../engine/dates";
import type { LedgerTrip } from "../engine/ledger";
import { closeMonth, reopenMonth } from "../lib/data";
import { useData } from "../lib/DataContext";
import { downloadBlob, exportLedgerXlsx } from "../lib/exportXlsx";
import { printFont, printHeaderEnabled } from "../lib/fonts";
import { dateTimeLabel, dayLabel, dayLong, km, monthName, num, trips as tripsWord } from "../lib/format";

export function LedgerPage() {
  const { month: param } = useParams();
  const nav = useNavigate();
  const { data, vehicle, months, company, reload, defaultDriver, gaps } = useData();
  const { busy, run } = useAction(reload);
  const [draft, setDraft] = useState<TripDraft | null>(null);
  const [q, setQ] = useState("");

  const month = param && /^\d{4}-\d{2}$/.test(param) ? param : monthOf(todayLocal());
  const summary = months.find((m) => m.month === month);
  const filtered = useMemo(() => {
    const trips = summary?.trips ?? [];
    const f = q.trim().toLowerCase();
    if (!f) return trips;
    return trips.filter((t) => `${t.purpose} ${t.origin} ${t.destination} ${t.driver} ${t.note ?? ""}`.toLowerCase().includes(f));
  }, [summary, q]);
  const byDay = useMemo(() => {
    const m = new Map<string, LedgerTrip[]>();
    for (const t of filtered) {
      if (!m.has(t.day)) m.set(t.day, []);
      m.get(t.day)!.push(t);
    }
    return [...m.entries()];
  }, [filtered]);

  if (!data) return null;
  if (!vehicle) return <Card><EmptyState icon={<NotebookPen className="size-6" />} title="Najpierw dodaj pojazd" action={<Link className="btn btn-primary" to="/ustawienia#pojazdy">Ustawienia</Link>} /></Card>;

  const first = months[0]?.month ?? month;
  const last = months.at(-1)?.month ?? month;
  const closed = summary?.closed;
  const go = (m: string) => nav(`/ewidencja/${m}`);
  const edit = (t: LedgerTrip) => setDraft({ id: t.id, day: t.day, purpose: t.purpose, origin: t.origin, destination: t.destination, km: t.km, driver: t.driver, note: t.note ?? "", route_id: t.route_id });
  const add = () => {
    const today = todayLocal();
    const day = monthOf(today) === month ? today : `${month}-01`;
    const prev = [...(summary?.trips ?? [])].reverse().find((t) => t.day <= day);
    setDraft({ day, purpose: "", origin: prev?.destination ?? "", destination: "", km: null, driver: defaultDriver, note: "", route_id: null });
  };

  return (
    <div>
      <PageHeader eyebrow="Ewidencja przebiegu" title={<span className="first-letter:uppercase">{monthName(month)}</span>}
        subtitle={<>{vehicle.name} · <span className="font-mono">{vehicle.plate}</span></>}
        actions={<>
          <div className="flex rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
            <button className="btn btn-ghost btn-icon rounded-r-none" disabled={month <= first} onClick={() => go(addMonths(month, -1))} aria-label="Poprzedni miesiąc"><ChevronLeft className="size-4" /></button>
            <input type="month" className="w-36 bg-transparent px-1 text-sm font-medium outline-none" value={month} min={first} max={last}
              onChange={(e) => e.target.value && go(e.target.value)} />
            <button className="btn btn-ghost btn-icon rounded-l-none" disabled={month >= last} onClick={() => go(addMonths(month, 1))} aria-label="Następny miesiąc"><ChevronRight className="size-4" /></button>
          </div>
          {!closed && <button className="btn btn-primary" onClick={add}><Plus className="size-4" /> Przejazd</button>}
        </>} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Przejechane" value={km(summary?.km ?? 0)} hint={tripsWord(summary?.trips.length ?? 0)} />
        <Stat label="Dni z jazdą" value={summary?.days ?? 0} />
        <Stat label="Licznik na początek" value={num(summary?.odoStart ?? vehicle.start_odometer)} hint="km" />
        <Stat label="Licznik na koniec" value={num(summary?.odoEnd ?? vehicle.start_odometer)} hint="km" />
      </div>

      <Card pad={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
          <div className="flex items-center gap-2">
            {closed
              ? <Badge tone="green"><Lock className="size-3" /> zatwierdzony {dateTimeLabel(closed.closed_at)}</Badge>
              : <Badge tone="amber">otwarty – można edytować</Badge>}
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <input className="input w-44 py-2 pl-9 text-sm" placeholder="Szukaj…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Link className="btn btn-secondary" to={`/druk/${vehicle.id}/${month}/${month}`} target="_blank"><Printer className="size-4" /> Drukuj / PDF</Link>
            <button className="btn btn-secondary" disabled={!summary}
              onClick={() => summary && downloadBlob(exportLedgerXlsx(company, vehicle, [summary], { font: printFont(data.settings.print_font), withHeader: printHeaderEnabled() }), `Ewidencja_${vehicle.plate.replace(/\s/g, "")}_${month}.xlsx`)}>
              <FileSpreadsheet className="size-4" /> Excel
            </button>
            {closed
              ? <button className="btn btn-ghost" disabled={busy} onClick={() => {
                  if (window.confirm("Otworzyć miesiąc ponownie? Wpisy znów będzie można zmieniać – pamiętaj o ponownym wydruku i podpisie.")) void run(() => reopenMonth(vehicle.id, month), "Miesiąc otwarty");
                }}><LockOpen className="size-4" /> Otwórz</button>
              : <button className="btn btn-dark" disabled={busy || !summary?.trips.length} onClick={() => {
                  if (window.confirm(`Zatwierdzić ${monthName(month)}? Wpisów nie będzie można zmieniać (chyba że otworzysz miesiąc ponownie).`)) void run(() => closeMonth(vehicle.id, month), "Miesiąc zatwierdzony");
                }}><Lock className="size-4" /> Zatwierdź</button>}
          </div>
        </div>

        {byDay.length === 0 ? (
          <EmptyState icon={<NotebookPen className="size-6" />} title={q ? "Nic nie znaleziono" : "Brak przejazdów w tym miesiącu"}>
            {!q && !closed && "Dodaj przejazd przyciskiem powyżej albo z Pulpitu jednym kliknięciem na stałą trasę."}
          </EmptyState>
        ) : (
          <>
            {/* komputer: tabela jak w arkuszu */}
            <div className="mt-4 hidden overflow-x-auto md:block">
              <table className="table-clean">
                <thead>
                  <tr>
                    <th className="w-12 text-center">Nr</th><th>Data</th><th>Cel wyjazdu</th><th>Trasa (skąd – dokąd)</th>
                    <th className="text-right">Km</th><th className="text-right">Licznik</th><th>Kierowca</th>
                  </tr>
                </thead>
                <tbody>
                  {byDay.map(([day, trips]) => trips.map((t, i) => (
                    <tr key={t.id} onClick={() => !closed && edit(t)} className={cx(!closed && "cursor-pointer", i === 0 && "border-t-2 border-slate-100 dark:border-white/5")}>
                      <td className="text-center font-mono text-xs text-slate-400">{t.no}</td>
                      <td className="whitespace-nowrap">{i === 0 && <span className="font-medium">{dayLabel(day)}</span>}</td>
                      <td className="text-slate-600 dark:text-slate-300">{t.purpose}</td>
                      <td>
                        <div className="flex flex-wrap items-center gap-x-1.5">
                          <Place address={t.origin} /> <span className="text-slate-400">→</span> <Place address={t.destination} />
                        </div>
                        {gaps.has(t.id) && <div className="text-[11px] text-amber-600">poprzedni przejazd skończył się gdzie indziej</div>}
                      </td>
                      <td className="text-right font-semibold tnum">{num(t.km)}</td>
                      <td className="text-right text-xs whitespace-nowrap text-slate-500 tnum">{num(t.odoStart)} → {num(t.odoEnd)}</td>
                      <td className="text-xs whitespace-nowrap text-slate-500">{t.driver}</td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
            {/* telefon: dni jako karty */}
            <div className="mt-4 space-y-4 px-4 pb-4 md:hidden">
              {byDay.map(([day, trips]) => (
                <div key={day}>
                  <div className="mb-1.5 flex items-baseline justify-between px-1">
                    <span className="text-sm font-semibold first-letter:uppercase">{dayLong(day)}</span>
                    <span className="text-xs text-slate-500 tnum">{km(trips.reduce((a, t) => a + t.km, 0))}</span>
                  </div>
                  <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 dark:divide-white/5 dark:border-white/5">
                    {trips.map((t) => (
                      <button key={t.id} disabled={!!closed} onClick={() => edit(t)} className="flex w-full items-center gap-3 bg-white px-3 py-2.5 text-left disabled:opacity-100 dark:bg-transparent">
                        <span className="font-mono w-6 text-center text-xs text-slate-400">{t.no}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs text-slate-500">{t.purpose}</span>
                          <span className="block truncate text-sm"><Place address={t.origin} /> → <Place address={t.destination} /></span>
                        </span>
                        <span className="font-display font-bold tnum">{num(t.km)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 text-sm sm:px-6 dark:border-white/5">
              <span className="text-slate-500">{q ? `Znaleziono ${tripsWord(filtered.length)}` : "Razem w miesiącu"}</span>
              <span className="font-display text-lg font-bold tnum">{km(filtered.reduce((a, t) => a + t.km, 0))}</span>
            </div>
          </>
        )}
      </Card>

      <TripForm draft={draft} onClose={() => setDraft(null)} />
    </div>
  );
}
