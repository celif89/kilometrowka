import { CalendarDays, ChevronLeft, ChevronRight, FileSpreadsheet, Layers, Lock, MapPin, Plus, Repeat, Route as RouteIcon, Settings2} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MonthReminder } from "../components/MonthReminder";
import { DayTimeline, nextSeq, Place, RouteChip, type TripDraft, TripForm, tripFromRoute } from "../components/trips";
import { Badge, Card, cx, EmptyState, Modal, Notice, useAction } from "../components/ui";
import { addDays, monthOf, todayLocal, weekday } from "../engine/dates";
import { isMonthClosed, type LedgerTrip } from "../engine/ledger";
import { suggestRoutes } from "../engine/suggest";
import type { Route } from "../engine/types";
import { deleteTrips, insertTrips, reorderTrips } from "../lib/data";
import { useData } from "../lib/DataContext";
import { dayLabel, dayLong, km, monthName, num, signedKm, trips as tripsWord, WEEKDAYS_SHORT } from "../lib/format";

function Odometer({ value }: { value: number }) {
  const digits = String(Math.round(value)).padStart(6, "0").split("");
  return (
    <div className="flex gap-1">
      {digits.map((d, i) => (
        <span key={i} className={cx("font-mono flex h-11 w-8 items-center justify-center rounded-lg text-2xl font-bold sm:h-12 sm:w-9 sm:text-[28px]",
          "bg-white/10 text-white shadow-inner ring-1 ring-white/10", i === digits.length - 1 && "bg-road-500/90 text-ink-950 ring-road-400")}>
          {d}
        </span>
      ))}
    </div>
  );
}

function DayStrip({ day, onChange, ledger }: { day: string; onChange: (d: string) => void; ledger: LedgerTrip[] }) {
  const today = todayLocal();
  // okno 3 tygodni przesuwa się razem z wybranym dniem (wcześniej przy cofaniu dzień znikał z paska)
  const ahead = addDays(day, 7);
  const end = day >= today ? day : ahead < today ? ahead : today;
  const days = Array.from({ length: 21 }, (_, i) => addDays(end, i - 20));
  const scroller = useRef<HTMLDivElement>(null);
  const kmByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of ledger) m.set(t.day, (m.get(t.day) ?? 0) + t.km);
    return m;
  }, [ledger]);
  const first = useRef(true);
  useEffect(() => {
    const box = scroller.current;
    const btn = box?.querySelector<HTMLElement>(`[data-day="${day}"]`);
    if (!box || !btn) return;
    box.scrollTo({ left: btn.offsetLeft - box.clientWidth / 2 + btn.offsetWidth / 2, behavior: first.current ? "auto" : "smooth" });
    first.current = false;
  }, [day]);
  return (
    <div className="flex items-center gap-2">
      <button className="btn btn-ghost btn-icon shrink-0" onClick={() => onChange(addDays(day, -1))} aria-label="Poprzedni dzień"><ChevronLeft className="size-4" /></button>
      <div ref={scroller} className="chip-scroll relative flex-1">
        {days.map((d) => {
          const k = kmByDay.get(d);
          const wd = weekday(d);
          return (
            <button key={d} data-day={d} onClick={() => onChange(d)} title={dayLabel(d)}
              className={cx("flex w-12 shrink-0 flex-col items-center rounded-2xl py-2 transition",
                d === day ? "bg-ink-900 text-white shadow-lg dark:bg-white dark:text-ink-900" : "hover:bg-slate-900/5 dark:hover:bg-white/5",
                wd >= 5 && d !== day && "text-slate-400")}>
              <span className="text-[10px] font-semibold uppercase">{WEEKDAYS_SHORT[wd]}</span>
              <span className="font-display text-lg leading-tight font-bold">{Number(d.slice(8))}</span>
              <span className={cx("mt-0.5 h-1.5 w-1.5 rounded-full", k ? (d === day ? "bg-road-400" : "bg-brand-500") : "bg-transparent")} />
            </button>
          );
        })}
      </div>
      <button className="btn btn-ghost btn-icon shrink-0" onClick={() => onChange(addDays(day, 1))} aria-label="Następny dzień"><ChevronRight className="size-4" /></button>
      <label className="btn btn-secondary btn-icon relative shrink-0 cursor-pointer" title="Wybierz datę">
        <CalendarDays className="size-4" />
        <input type="date" className="absolute inset-0 cursor-pointer opacity-0" value={day} onChange={(e) => e.target.value && onChange(e.target.value)} />
      </label>
    </div>
  );
}

export function Dashboard() {
  const { data, vehicle, ledger, months, checks, reload, defaultDriver } = useData();
  const { busy, run } = useAction(reload);
  const [day, setDay] = useState(todayLocal());
  const [draft, setDraft] = useState<TripDraft | null>(null);
  const [repeatOpen, setRepeatOpen] = useState(false);

  if (!data) return null;
  if (!vehicle) {
    return (
      <div className="mx-auto max-w-xl pt-6">
        <Card>
          <EmptyState icon={<RouteIcon className="size-6" />} title="Witaj w Kilometrówce"
            action={<div className="flex flex-wrap justify-center gap-2">
              <Link to="/ustawienia#import" className="btn btn-primary"><FileSpreadsheet className="size-4" /> Wczytaj arkusz Excel</Link>
              <Link to="/ustawienia#pojazdy" className="btn btn-secondary"><Plus className="size-4" /> Dodaj pojazd</Link>
            </div>}>
            Przenieś dotychczasową ewidencję z Excela – wczytają się przejazdy, stałe trasy, dane firmy i pojazdu.
            Możesz też zacząć od zera, dodając pojazd.
          </EmptyState>
        </Card>
      </div>
    );
  }

  const dayTrips = ledger.filter((t) => t.day === day);
  const before = ledger.filter((t) => t.day <= day);
  const carAt = before.at(-1)?.destination ?? null;
  const locked = isMonthClosed(data.closes, vehicle.id, day);
  const suggestions = suggestRoutes(data.routes, data.trips, carAt);
  const odoNow = ledger.at(-1)?.odoEnd ?? vehicle.start_odometer;
  const thisMonth = months.find((m) => m.month === monthOf(todayLocal()));
  const lastCheck = checks.at(-1);
  const year = todayLocal().slice(0, 4);
  const yearKm = months.filter((m) => m.month.startsWith(year)).reduce((a, m) => a + m.km, 0);
  const dayKm = dayTrips.reduce((a, t) => a + t.km, 0);

  function newDraft(): TripDraft {
    return { day, purpose: "", origin: carAt ?? "", destination: "", km: null, driver: defaultDriver, note: "", route_id: null };
  }

  async function addRoutes(routes: Route[]) {
    let seq = nextSeq(ledger, day);
    const rows = routes.map((r) => tripFromRoute(r, vehicle!.id, day, seq++, defaultDriver));
    let ids: number[] = [];
    await run(async () => { ids = await insertTrips(rows); },
      routes.length === 1 ? `Dodano: ${routes[0].name || routes[0].purpose} (${km(routes[0].km)})` : `Dodano ${tripsWord(routes.length)}`,
      { label: "Cofnij", run: () => void run(() => deleteTrips(ids), "Cofnięto") });
  }

  async function move(t: LedgerTrip, dir: -1 | 1) {
    const ids = dayTrips.map((x) => x.id);
    const i = ids.indexOf(t.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    await run(() => reorderTrips(ids));
  }

  async function remove(t: LedgerTrip) {
    const copy = { ...t };
    await run(() => deleteTrips([t.id]), "Usunięto przejazd", {
      label: "Cofnij",
      run: () => void run(() => insertTrips([{
        vehicle_id: copy.vehicle_id, day: copy.day, seq: copy.seq, purpose: copy.purpose, origin: copy.origin,
        destination: copy.destination, km: copy.km, driver: copy.driver, route_id: copy.route_id, note: copy.note,
      }]), "Przywrócono"),
    });
  }

  const templates = data.templates
    .map((t) => ({ ...t, routes: t.route_ids.map((id) => data.routes.find((r) => r.id === id)).filter((r): r is Route => !!r) }))
    .filter((t) => t.routes.length > 0);

  return (
    <div className="space-y-6">
      {/* licznik */}
      <section className="relative overflow-hidden rounded-[2rem] bg-ink-900 p-5 text-white shadow-2xl shadow-ink-900/20 sm:p-7 dark:bg-ink-800">
        <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-10 size-64 rounded-full bg-road-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="text-xs font-semibold tracking-wider text-white/60 uppercase">Stan licznika wg ewidencji</div>
            <div className="mt-3"><Odometer value={odoNow} /></div>
            <div className="mt-3 text-xs text-white/50">{vehicle.name} · <span className="font-mono">{vehicle.plate}</span></div>
          </div>
          <div className="grid grid-cols-3 gap-5 sm:gap-8">
            <div>
              <div className="text-[11px] font-medium text-white/50">{monthName(monthOf(todayLocal()))}</div>
              <div className="font-display mt-1 text-2xl font-bold tnum">{num(thisMonth?.km ?? 0)}<span className="ml-1 text-sm text-white/50">km</span></div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-white/50">przejazdy</div>
              <div className="font-display mt-1 text-2xl font-bold tnum">{thisMonth?.trips.length ?? 0}</div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-white/50">rok {year}</div>
              <div className="font-display mt-1 text-2xl font-bold tnum">{num(yearKm, 0)}<span className="ml-1 text-sm text-white/50">km</span></div>
            </div>
          </div>
        </div>
      </section>

      <MonthReminder />

      {lastCheck && Math.abs(lastCheck.diff) >= 50 && (
        <Notice tone="warn" action={<Link to="/raporty#licznik" className="btn btn-secondary px-3 py-1.5 text-xs">Szczegóły</Link>}>
          Faktyczny licznik{lastCheck.reading.source === "fvmeter" ? " z FV Meter" : ""} ({dayLabel(lastCheck.reading.day)}: {km(lastCheck.reading.km)}) różni się od ewidencji
          o <b>{signedKm(lastCheck.diff)}</b>.
        </Notice>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Card className="min-w-0" pad={false}>
          <div className="px-4 pt-4 sm:px-6 sm:pt-5"><DayStrip day={day} onChange={setDay} ledger={ledger} /></div>
          <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5 sm:px-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight first-letter:uppercase">{day === todayLocal() ? "Dziś" : dayLong(day)}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {dayTrips.length ? <>{tripsWord(dayTrips.length)} · <b className="text-slate-700 dark:text-slate-200">{km(dayKm)}</b></> : "Brak przejazdów"}
                {day === todayLocal() ? "" : ` · ${dayLabel(day)}`}
              </p>
            </div>
            {locked
              ? <Badge tone="green"><Lock className="size-3" /> miesiąc zatwierdzony</Badge>
              : <button className="btn btn-primary" onClick={() => setDraft(newDraft())}><Plus className="size-4" /> Przejazd</button>}
          </div>

          <div className="p-5 sm:p-6">
            {dayTrips.length > 0
              ? <DayTimeline trips={dayTrips} locked={locked} onMove={move} onDelete={remove}
                  onEdit={(t) => setDraft({ id: t.id, day: t.day, purpose: t.purpose, origin: t.origin, destination: t.destination, km: t.km, driver: t.driver, note: t.note ?? "", route_id: t.route_id })} />
              : <div className="rounded-2xl border-2 border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10">
                  {locked ? "Ten miesiąc jest zatwierdzony." : "Wybierz stałą trasę poniżej albo dodaj przejazd."}
                </div>}
          </div>

          {!locked && (
            <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-5 sm:px-6 dark:border-white/5 dark:bg-white/[0.02]">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="size-4 text-road-500" />
                  <span className="text-slate-500 dark:text-slate-400">Auto jest teraz:</span>
                  {carAt ? <Place address={carAt} className="font-medium" /> : <span className="text-slate-400">—</span>}
                </div>
                <div className="flex gap-1.5">
                  <button className="btn btn-ghost px-3 py-1.5 text-xs" onClick={() => setRepeatOpen(true)}><Repeat className="size-3.5" /> Powtórz dzień</button>
                  <Link to="/trasy" className="btn btn-ghost px-3 py-1.5 text-xs"><Settings2 className="size-3.5" /> Trasy</Link>
                </div>
              </div>
              {suggestions.length === 0
                ? <p className="text-sm text-slate-500">Nie masz jeszcze stałych tras. <Link to="/trasy" className="font-medium text-brand-600 underline">Dodaj pierwszą</Link> – potem przejazd dodasz jednym kliknięciem.</p>
                : <div className="space-y-4">
                    {[
                      { label: carAt ? "Z tego miejsca" : null, items: suggestions.filter((x) => x.fromHere) },
                      { label: suggestions.some((x) => x.fromHere) ? "Pozostałe trasy" : null, items: suggestions.filter((x) => !x.fromHere) },
                    ].filter((g) => g.items.length > 0).map((g, i) => (
                      <div key={i}>
                        {g.label && <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">{g.label}</div>}
                        <div className="grid gap-2.5 sm:grid-cols-2 2xl:grid-cols-3">
                          {g.items.map(({ route, fromHere }) => (
                            <RouteChip key={route.id} route={route} highlight={fromHere} disabled={busy} onClick={() => addRoutes([route])} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>}
              {templates.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase"><Layers className="size-3.5" /> Szablony dnia</div>
                  <div className="flex flex-wrap gap-2">
                    {templates.map((t) => (
                      <button key={t.id} disabled={busy} onClick={() => addRoutes(t.routes)}
                        className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-left text-sm transition hover:border-brand-300 hover:shadow-md disabled:opacity-50 dark:border-white/10 dark:bg-ink-900">
                        <span className="font-semibold">{t.name}</span>
                        <span className="ml-2 text-xs text-slate-500">{t.routes.length} tras · {km(t.routes.reduce((a, r) => a + r.km, 0))}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Ostatnie miesiące" icon={<CalendarDays className="size-4" />} pad={false}>
            <ul className="px-2 pb-2">
              {[...months].reverse().slice(0, 5).map((m) => (
                <li key={m.month}>
                  <Link to={`/ewidencja/${m.month}`} className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-slate-900/5 dark:hover:bg-white/5">
                    <div>
                      <div className="text-sm font-semibold first-letter:uppercase">{monthName(m.month)}</div>
                      <div className="text-xs text-slate-500">{tripsWord(m.trips.length)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold tnum">{num(m.km)} <span className="text-xs font-medium text-slate-400">km</span></span>
                      {m.closed ? <Lock className="size-3.5 text-emerald-500" /> : <span className="size-3.5" />}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          {checks.length === 0 && (
            <Notice tone="info" action={<Link to="/raporty#licznik" className="btn btn-secondary px-3 py-1.5 text-xs">Dodaj</Link>}>
              Wpisuj co jakiś czas faktyczny stan licznika – aplikacja pokaże, czy ewidencja się z nim zgadza.
            </Notice>
          )}
          {lastCheck && Math.abs(lastCheck.diff) < 50 && (
            <Notice tone="ok">Licznik zgodny z ewidencją ({signedKm(lastCheck.diff)} na {dayLabel(lastCheck.reading.day)}).</Notice>
          )}
        </div>
      </div>

      <TripForm draft={draft} onClose={() => setDraft(null)} />
      <RepeatDay open={repeatOpen} onClose={() => setRepeatOpen(false)} day={day} ledger={ledger}
        onPick={async (src) => {
          let seq = nextSeq(ledger, day);
          const rows = src.map((t) => ({
            vehicle_id: vehicle.id, day, seq: seq++, purpose: t.purpose, origin: t.origin, destination: t.destination,
            km: t.km, driver: t.driver, route_id: t.route_id, note: null,
          }));
          let ids: number[] = [];
          const ok = await run(async () => { ids = await insertTrips(rows); }, `Skopiowano ${tripsWord(rows.length)}`,
            { label: "Cofnij", run: () => void run(() => deleteTrips(ids), "Cofnięto") });
          if (ok) setRepeatOpen(false);
        }} />
    </div>
  );
}

function RepeatDay({ open, onClose, day, ledger, onPick }: {
  open: boolean; onClose: () => void; day: string; ledger: LedgerTrip[]; onPick: (trips: LedgerTrip[]) => void;
}) {
  const days = useMemo(() => {
    const byDay = new Map<string, LedgerTrip[]>();
    for (const t of ledger) {
      if (t.day >= day) continue;
      if (!byDay.has(t.day)) byDay.set(t.day, []);
      byDay.get(t.day)!.push(t);
    }
    return [...byDay.entries()].reverse().slice(0, 12);
  }, [ledger, day]);
  return (
    <Modal open={open} onClose={onClose} title="Powtórz przejazdy z innego dnia">
      <p className="mb-3 text-sm text-slate-500">Przejazdy z wybranego dnia zostaną dodane na {dayLabel(day)}.</p>
      {days.length === 0 && <p className="text-sm text-slate-500">Brak wcześniejszych przejazdów.</p>}
      <ul className="space-y-2">
        {days.map(([d, trips]) => (
          <li key={d}>
            <button className="w-full rounded-2xl border border-slate-200 p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-white/10 dark:hover:bg-white/5"
              onClick={() => onPick(trips)}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold first-letter:uppercase">{dayLong(d)}</span>
                <span className="text-xs text-slate-500">{tripsWord(trips.length)} · {km(trips.reduce((a, t) => a + t.km, 0))}</span>
              </div>
              <div className="mt-1 truncate text-xs text-slate-500">{trips.map((t) => t.purpose).join(" · ")}</div>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
