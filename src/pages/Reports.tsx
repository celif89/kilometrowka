import { ChartColumn, FileSpreadsheet, Gauge, Lock, Plus, Printer, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Place } from "../components/trips";
import { Badge, Card, cx, EmptyState, Field, Notice, NumberInput, PageHeader, Segmented, Stat, useAction } from "../components/ui";
import { todayLocal } from "../engine/dates";
import { odometerAt } from "../engine/ledger";
import { deleteReading, saveReading } from "../lib/data";
import { useData } from "../lib/DataContext";
import { downloadBlob, exportLedgerXlsx } from "../lib/exportXlsx";
import { dayLabel, km, monthName, monthShort, num, signedKm, trips as tripsWord } from "../lib/format";

function Bars({ items }: { items: { label: string; value: number; to?: string; muted?: boolean }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="flex h-48 items-end gap-1.5 sm:gap-2.5">
      {items.map((i) => {
        const h = Math.max((i.value / max) * 100, i.value ? 3 : 0);
        const bar = (
          <div className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="font-display text-[10px] font-bold text-slate-500 opacity-0 transition group-hover:opacity-100 sm:text-xs sm:opacity-100 tnum">{i.value ? num(i.value, 0) : ""}</span>
            <div className={cx("w-full rounded-t-xl rounded-b-md transition-all group-hover:brightness-110", i.muted ? "bg-slate-200 dark:bg-white/10" : "bg-gradient-to-t from-brand-600 to-brand-400 dark:from-brand-500 dark:to-road-400")}
              style={{ height: `${h}%` }} />
            <span className="text-[10px] font-semibold text-slate-500 uppercase sm:text-[11px]">{i.label}</span>
          </div>
        );
        return i.to ? <Link key={i.label} to={i.to} className="flex h-full flex-1">{bar}</Link> : <div key={i.label} className="flex h-full flex-1">{bar}</div>;
      })}
    </div>
  );
}

function TopList({ rows }: { rows: { label: React.ReactNode; key: string; value: number; count: number }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{r.label}</span>
            <span className="shrink-0 text-xs text-slate-500 tnum"><b className="text-slate-700 dark:text-slate-200">{num(r.value, 0)} km</b> · {r.count}×</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
            <div className="h-full rounded-full bg-road-500" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ReportsPage() {
  const { data, vehicle, months, ledger, checks, company, reload, fvVehicleId } = useData();
  const { busy, run } = useAction(reload);
  const location = useLocation();
  const years = useMemo(() => [...new Set(months.map((m) => m.month.slice(0, 4)))], [months]);
  const [year, setYear] = useState(todayLocal().slice(0, 4));
  const [reading, setReading] = useState<{ day: string; km: number | null; note: string }>({ day: todayLocal(), km: null, note: "" });
  const [topBy, setTopBy] = useState<"dest" | "purpose">("dest");
  const [allReadings, setAllReadings] = useState(false);

  useEffect(() => {
    if (location.hash === "#licznik") setTimeout(() => document.getElementById("licznik")?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [location.hash]);

  const ym = months.filter((m) => m.month.startsWith(year));
  const yearTrips = ym.flatMap((m) => m.trips);
  const top = useMemo(() => {
    const g = new Map<string, { label: string; value: number; count: number }>();
    for (const t of yearTrips) {
      const k = topBy === "dest" ? t.destination : t.purpose;
      const key = k.trim().toLowerCase();
      const cur = g.get(key) ?? { label: k.trim(), value: 0, count: 0 };
      cur.value += t.km;
      cur.count += 1;
      g.set(key, cur);
    }
    return [...g.entries()].sort((a, b) => b[1].value - a[1].value).slice(0, 8);
  }, [yearTrips, topBy]);

  if (!data) return null;
  if (!vehicle) return <Card><EmptyState icon={<ChartColumn className="size-6" />} title="Brak danych" /></Card>;

  const total = ym.reduce((a, m) => a + m.km, 0);
  const active = ym.filter((m) => m.km > 0);
  const avg = active.length ? total / active.length : 0;
  const yearList = years.includes(year) ? years : [...years, year].sort();
  const vChecks = checks;
  const expected = reading.km === null ? null : odometerAt(vehicle, ledger, reading.day);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Podsumowania" title="Raporty" subtitle={<>{vehicle.name} · <span className="font-mono">{vehicle.plate}</span></>}
        actions={<>
          <Segmented value={year} onChange={setYear} options={yearList.map((y) => ({ value: y, label: y }))} />
          <Link className="btn btn-secondary" to={`/druk/${vehicle.id}/${ym[0]?.month ?? `${year}-01`}/${ym.at(-1)?.month ?? `${year}-12`}`} target="_blank"><Printer className="size-4" /> Drukuj rok</Link>
          <button className="btn btn-secondary" disabled={!ym.length}
            onClick={() => downloadBlob(exportLedgerXlsx(company, vehicle, ym), `Ewidencja_${vehicle.plate.replace(/\s/g, "")}_${year}.xlsx`)}>
            <FileSpreadsheet className="size-4" /> Excel {year}
          </button>
        </>} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label={`Kilometry ${year}`} value={km(total)} hint={tripsWord(yearTrips.length)} />
        <Stat label="Średnio w miesiącu" value={km(Math.round(avg))} hint={`z ${active.length} mies.`} />
        <Stat label="Dni z jazdą" value={new Set(yearTrips.map((t) => t.day)).size} />
        <Stat label="Średnio na przejazd" value={km(yearTrips.length ? Math.round((total / yearTrips.length) * 10) / 10 : 0)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Kilometry w miesiącach" icon={<ChartColumn className="size-4" />}>
          <Bars items={Array.from({ length: 12 }, (_, i) => {
            const month = `${year}-${String(i + 1).padStart(2, "0")}`;
            const m = ym.find((x) => x.month === month);
            return { label: monthShort(month), value: m?.km ?? 0, to: m ? `/ewidencja/${month}` : undefined, muted: !m };
          })} />
        </Card>
        <Card title={topBy === "dest" ? "Najczęstsze cele podróży" : "Cele wyjazdów"}
          actions={<Segmented value={topBy} onChange={setTopBy} options={[{ value: "dest", label: "Miejsca" }, { value: "purpose", label: "Cele" }]} />}>
          {top.length ? <TopList rows={top.map(([key, r]) => ({ key, label: topBy === "dest" ? <Place address={r.label} /> : r.label, value: r.value, count: r.count }))} />
            : <p className="text-sm text-slate-500">Brak przejazdów w {year}.</p>}
        </Card>
      </div>

      <Card title="Miesiące" pad={false}>
        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead><tr><th>Miesiąc</th><th className="text-right">Przejazdy</th><th className="text-right">Km</th><th className="text-right">Licznik pocz.</th><th className="text-right">Licznik kon.</th><th>Status</th><th /></tr></thead>
            <tbody>
              {[...ym].reverse().map((m) => (
                <tr key={m.month}>
                  <td className="font-medium first-letter:uppercase"><Link to={`/ewidencja/${m.month}`} className="hover:text-brand-600">{monthName(m.month)}</Link></td>
                  <td className="text-right tnum">{m.trips.length}</td>
                  <td className="text-right font-semibold tnum">{num(m.km)}</td>
                  <td className="text-right text-slate-500 tnum">{num(m.odoStart)}</td>
                  <td className="text-right text-slate-500 tnum">{num(m.odoEnd)}</td>
                  <td>{m.closed ? <Badge tone="green"><Lock className="size-3" /> zatwierdzony</Badge> : m.trips.length ? <Badge tone="amber">otwarty</Badge> : <Badge>bez jazd</Badge>}</td>
                  <td className="text-right"><Link className="btn btn-ghost btn-icon size-8" to={`/druk/${vehicle.id}/${m.month}/${m.month}`} target="_blank" aria-label="Drukuj"><Printer className="size-3.5" /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div id="licznik" className="scroll-mt-24">
        <Card title="Kontrola licznika" icon={<Gauge className="size-4" />}
          subtitle={fvVehicleId === vehicle.id
            ? "Przebieg wpisywany w FV Meter (zakładka Samochód) pobiera się tu sam. Możesz też dopisać odczyt ręcznie."
            : "Wpisz faktyczny stan licznika (np. z aplikacji auta, przeglądu, faktury serwisowej). Aplikacja porówna go z sumą kilometrów w ewidencji."}>
          <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-[10rem_10rem_1fr_auto] sm:items-end dark:bg-white/[0.03]">
            <Field label="Data"><input type="date" className="input" value={reading.day} onChange={(e) => setReading({ ...reading, day: e.target.value })} /></Field>
            <Field label="Stan licznika"><NumberInput value={reading.km} onChange={(v) => setReading({ ...reading, km: v })} suffix="km" /></Field>
            <Field label="Skąd odczyt (opcjonalnie)"><input className="input" placeholder="np. aplikacja Tesla" value={reading.note} onChange={(e) => setReading({ ...reading, note: e.target.value })} /></Field>
            <button className="btn btn-primary" disabled={busy || reading.km === null}
              onClick={async () => {
                if (await run(() => saveReading({ vehicle_id: vehicle.id, day: reading.day, km: reading.km!, note: reading.note.trim() || null }), "Zapisano odczyt")) {
                  setReading({ day: todayLocal(), km: null, note: "" });
                }
              }}><Plus className="size-4" /> Dodaj</button>
            {expected !== null && reading.km !== null && (
              <p className="text-xs text-slate-500 sm:col-span-4">Wg ewidencji na koniec {dayLabel(reading.day)}: <b>{km(expected)}</b> → różnica <b>{signedKm(Math.round((reading.km - expected) * 10) / 10)}</b></p>
            )}
          </div>

          {vChecks.length > 0 && (() => {
            const last = vChecks.at(-1)!;
            return (
              <div className="mt-4">
                {Math.abs(last.diff) >= 50
                  ? <Notice tone="warn">
                      Ostatni odczyt różni się od ewidencji o <b>{signedKm(last.diff)}</b>.{" "}
                      {last.diff > 0
                        ? "Auto przejechało więcej, niż wpisano – brakuje części przejazdów w ewidencji."
                        : "W ewidencji jest więcej kilometrów, niż wskazuje licznik – sprawdź długości tras."}
                      {" "}Przy pełnym odliczeniu VAT ewidencja powinna odpowiadać faktycznemu przebiegowi.
                    </Notice>
                  : <Notice tone="ok">Ostatni odczyt zgadza się z ewidencją ({signedKm(last.diff)}).</Notice>}
              </div>
            );
          })()}

          {vChecks.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="table-clean">
                <thead><tr><th>Data</th><th className="text-right">Faktyczny</th><th className="text-right">Wg ewidencji</th><th className="text-right">Różnica</th><th>Uwagi</th><th /></tr></thead>
                <tbody>
                  {[...vChecks].reverse().slice(0, allReadings ? undefined : 8).map((c) => (
                    <tr key={c.reading.id}>
                      <td>{dayLabel(c.reading.day)}</td>
                      <td className="text-right font-semibold tnum">{num(c.reading.km)}</td>
                      <td className="text-right text-slate-500 tnum">{num(c.computed)}</td>
                      <td className={cx("text-right font-semibold tnum", Math.abs(c.diff) >= 50 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>{signedKm(c.diff)}</td>
                      <td className="text-xs text-slate-500">{c.reading.source === "fvmeter" ? <Badge tone="brand">FV Meter</Badge> : c.reading.note}</td>
                      <td className="text-right">
                        {!c.reading.source && <button className="btn btn-danger btn-icon size-8" disabled={busy} onClick={() => window.confirm("Usunąć odczyt?") && run(() => deleteReading(c.reading.id), "Usunięto odczyt")} aria-label="Usuń"><Trash2 className="size-3.5" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {vChecks.length > 8 && (
                <button className="btn btn-ghost mt-2 text-xs" onClick={() => setAllReadings(!allReadings)}>
                  {allReadings ? "Pokaż ostatnie" : `Pokaż wszystkie (${vChecks.length})`}
                </button>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
