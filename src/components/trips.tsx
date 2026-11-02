import { ArrowDown, ArrowLeftRight, ArrowUp, ExternalLink, Lock, Map as MapIcon, MapPin, Pencil, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { isMonthClosed, type LedgerTrip, validateTrip } from "../engine/ledger";
import { kmForPair, knownDrivers, knownPlaces, knownPurposes, purposeForPair } from "../engine/suggest";
import type { NewTrip, Route, Trip } from "../engine/types";
import { deleteTrips, insertTrips, saveRoute, updateTrip } from "../lib/data";
import { useData } from "../lib/DataContext";
import { googleMapsRoute } from "../lib/maps";
import { dayLong, km, num } from "../lib/format";
import { Combobox, cx, Field, Modal, Notice, NumberInput, useAction } from "./ui";

export const ROUTE_COLORS = ["#6366f1", "#14b8a6", "#f59e0b", "#ec4899", "#0ea5e9", "#84cc16", "#f97316", "#a855f7"];

export function routeColor(r: Pick<Route, "id" | "color">): string {
  return r.color || ROUTE_COLORS[(r.id - 1 + ROUTE_COLORS.length) % ROUTE_COLORS.length];
}

/** Miejsce: własna nazwa (np. „Dom”) albo skrócony adres. */
export function Place({ address, className, sub = false }: { address: string; className?: string; sub?: boolean }) {
  const { placeLabel } = useData();
  const label = placeLabel(address);
  if (!label) return <span className={className}>{address}</span>;
  return (
    <span className={className} title={address}>
      <span className="font-semibold">{label}</span>
      {sub && <span className="ml-1 text-slate-400 dark:text-slate-500">· {address}</span>}
    </span>
  );
}

export function RouteLine({ origin, destination, className }: { origin: string; destination: string; className?: string }) {
  return (
    <span className={cx("inline-flex min-w-0 flex-wrap items-center gap-x-1.5", className)}>
      <Place address={origin} />
      <span className="text-slate-400">→</span>
      <Place address={destination} />
    </span>
  );
}

export function RouteChip({ route, onClick, highlight, disabled }: { route: Route; onClick: () => void; highlight?: boolean; disabled?: boolean }) {
  const color = routeColor(route);
  return (
    <button type="button" onClick={onClick} disabled={disabled} data-route-chip
      className={cx("group relative flex w-full min-w-0 flex-col items-start gap-1 overflow-hidden rounded-2xl border bg-white px-3.5 py-3 text-left transition",
        "hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-50 dark:bg-ink-900",
        highlight ? "border-brand-300 shadow-md shadow-brand-500/10 dark:border-brand-500/40" : "border-slate-200 dark:border-white/10")}>
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      <span className="flex w-full items-center justify-between gap-2">
        <span className="truncate text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          {route.name || route.purpose}
        </span>
        <span className="font-display shrink-0 rounded-lg bg-slate-100 px-1.5 py-0.5 text-xs font-bold tnum dark:bg-white/10">{num(route.km)} km</span>
      </span>
      <span className="line-clamp-2 text-sm leading-snug">
        <RouteLine origin={route.origin} destination={route.destination} />
      </span>
      {route.name && <span className="truncate text-xs text-slate-500 dark:text-slate-400">{route.purpose}</span>}
    </button>
  );
}

/** Przejazdy jednego dnia w formie „drogi” z przystankami. */
export function DayTimeline({ trips, onEdit, onDelete, onMove, locked }: {
  trips: LedgerTrip[]; onEdit: (t: LedgerTrip) => void; onDelete: (t: LedgerTrip) => void;
  onMove?: (t: LedgerTrip, dir: -1 | 1) => void; locked?: boolean;
}) {
  const { gaps } = useData();
  return (
    <ol className="relative">
      {trips.map((t, i) => {
        const gap = gaps.get(t.id);
        return (
          <li key={t.id} className="group relative flex gap-3 pb-4 last:pb-0">
            <div className="flex w-8 shrink-0 flex-col items-center">
              <div className="font-display z-10 flex size-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shadow-sm shadow-brand-600/30 dark:bg-brand-500">
                {t.no}
              </div>
              {i < trips.length - 1 && <div className="mt-1 w-0.5 flex-1 rounded bg-[repeating-linear-gradient(to_bottom,var(--color-slate-300)_0_6px,transparent_6px_11px)] dark:bg-[repeating-linear-gradient(to_bottom,rgb(255_255_255/0.15)_0_6px,transparent_6px_11px)]" />}
            </div>
            <div className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 transition group-hover:border-slate-200 dark:border-white/5 dark:bg-white/[0.03]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.purpose}</div>
                  <RouteLine origin={t.origin} destination={t.destination} className="mt-0.5 text-[15px]" />
                </div>
                <div className="font-display shrink-0 text-right text-lg font-bold tnum">{num(t.km)}<span className="ml-0.5 text-xs font-medium text-slate-400">km</span></div>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-400 tnum">licznik {num(t.odoStart)} → {num(t.odoEnd)}{t.note ? ` · ${t.note}` : ""}</div>
                {!locked && (
                  <div className="flex gap-0.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                    {onMove && i > 0 && <button className="btn btn-ghost size-7 rounded-lg p-0" onClick={() => onMove(t, -1)} aria-label="W górę"><ArrowUp className="size-3.5" /></button>}
                    {onMove && i < trips.length - 1 && <button className="btn btn-ghost size-7 rounded-lg p-0" onClick={() => onMove(t, 1)} aria-label="W dół"><ArrowDown className="size-3.5" /></button>}
                    <button className="btn btn-ghost size-7 rounded-lg p-0" onClick={() => onEdit(t)} aria-label="Edytuj"><Pencil className="size-3.5" /></button>
                    <button className="btn btn-danger size-7 rounded-lg p-0" onClick={() => onDelete(t)} aria-label="Usuń"><Trash2 className="size-3.5" /></button>
                  </div>
                )}
              </div>
              {gap && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                  <MapPin className="size-3" /> Poprzedni przejazd skończył się w: <Place address={gap} />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export interface TripDraft {
  id?: number;
  day: string;
  purpose: string;
  origin: string;
  destination: string;
  km: number | null;
  driver: string;
  note: string;
  route_id: number | null;
}

export function TripForm({ draft, onClose }: { draft: TripDraft | null; onClose: () => void }) {
  const { data, vehicle, reload, ledger, placeLabel } = useData();
  const { busy, run } = useAction(reload);
  const [t, setT] = useState<TripDraft | null>(draft);
  const [asRoute, setAsRoute] = useState(false);
  const [routeName, setRouteName] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const autoKm = useRef(false);
  useEffect(() => { setT(draft); setErrors([]); setAsRoute(false); setRouteName(""); autoKm.current = false; }, [draft]);

  const trips = data?.trips ?? [];
  const routes = data?.routes ?? [];
  const places = useMemo(() => knownPlaces(trips, routes), [trips, routes]);
  const purposes = useMemo(() => knownPurposes(trips, routes), [trips, routes]);
  const drivers = useMemo(() => knownDrivers(trips), [trips]);

  if (!t || !vehicle || !data) return null;
  const set = (patch: Partial<TripDraft>) => setT((prev) => (prev ? { ...prev, ...patch } : prev));
  const suggestedKm = kmForPair(trips, routes, t.origin, t.destination);
  const locked = isMonthClosed(data.closes, vehicle.id, t.day);

  function placeChanged(patch: Partial<TripDraft>) {
    const next = { ...t!, ...patch };
    const k = kmForPair(trips, routes, next.origin, next.destination);
    if (k !== null && (next.km === null || autoKm.current)) { next.km = k; autoKm.current = true; }
    if (!next.purpose.trim()) next.purpose = purposeForPair(trips, next.origin, next.destination) ?? "";
    setT(next);
  }

  async function save() {
    const v = { ...t!, km: t!.km ?? 0 };
    const errs = validateTrip(v);
    if (locked) errs.unshift("Ten miesiąc jest zatwierdzony – najpierw otwórz go ponownie w Raportach");
    setErrors(errs);
    if (errs.length) return;
    const ok = await run(async () => {
      const base = {
        vehicle_id: vehicle!.id, day: v.day, purpose: v.purpose.trim(), origin: v.origin.trim(),
        destination: v.destination.trim(), km: v.km, driver: v.driver.trim(), note: v.note.trim() || null, route_id: v.route_id,
      };
      if (v.id) {
        const prev = data!.trips.find((x) => x.id === v.id)!;
        const seq = prev.day === v.day ? prev.seq : nextSeq(ledger, v.day);
        await updateTrip({ ...base, id: v.id, seq });
      } else {
        await insertTrips([{ ...base, seq: nextSeq(ledger, v.day) } satisfies NewTrip]);
      }
      if (asRoute) {
        await saveRoute({
          name: routeName.trim() || null, purpose: base.purpose, origin: base.origin, destination: base.destination,
          km: base.km, color: null, position: routes.length, archived: false,
        });
      }
    }, v.id ? "Zapisano zmiany" : asRoute ? "Dodano przejazd i stałą trasę" : "Dodano przejazd");
    if (ok) onClose();
  }

  return (
    <Modal open={!!t} onClose={onClose} title={t.id ? "Edycja przejazdu" : "Nowy przejazd"}
      footer={<>
        {t.id && !locked && (
          <button className="btn btn-danger mr-auto" disabled={busy} onClick={async () => {
            if (window.confirm("Usunąć ten przejazd?") && await run(() => deleteTrips([t.id!]), "Usunięto przejazd")) onClose();
          }}><Trash2 className="size-4" /> Usuń</button>
        )}
        <button className="btn btn-secondary" onClick={onClose}>Anuluj</button>
        <button className="btn btn-primary min-w-28" onClick={save} disabled={busy || locked}>{busy ? "Zapisywanie…" : "Zapisz"}</button>
      </>}>
      <div className="space-y-4">
        {locked && <Notice tone="warn"><Lock className="mr-1 inline size-3.5" />Miesiąc jest zatwierdzony – zmiany są zablokowane.</Notice>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data wyjazdu">
            <input className="input" type="date" value={t.day} onChange={(e) => set({ day: e.target.value })} />
          </Field>
          <Field label="Kierowca">
            <Combobox value={t.driver} onChange={(driver) => set({ driver })} options={drivers} />
          </Field>
        </div>
        <Field label="Cel wyjazdu">
          <Combobox value={t.purpose} onChange={(purpose) => set({ purpose })} options={purposes} placeholder="np. Wyjazd na budowę" />
        </Field>
        <div className="relative space-y-3 rounded-2xl bg-slate-50 p-3 dark:bg-white/[0.03]">
          <Field label="Skąd">
            <Combobox value={t.origin} onChange={(origin) => placeChanged({ origin })} options={places} labelOf={placeLabel} placeholder="Miejscowość, ulica" />
          </Field>
          <button type="button" className="btn btn-secondary absolute top-[3.6rem] right-5 z-10 size-8 rounded-full p-0 shadow-sm"
            onClick={() => placeChanged({ origin: t.destination, destination: t.origin })} aria-label="Zamień kierunek" title="Zamień kierunek">
            <ArrowLeftRight className="size-3.5 rotate-90" />
          </button>
          <Field label="Dokąd">
            <Combobox value={t.destination} onChange={(destination) => placeChanged({ destination })} options={places} labelOf={placeLabel} placeholder="Miejscowość, ulica" />
          </Field>
        </div>
        <Field label="Przejechane kilometry" hint={
          <span className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            {suggestedKm !== null && suggestedKm !== t.km ? (
              <button type="button" className="inline-flex items-center gap-1 font-medium text-brand-600 dark:text-brand-300"
                onClick={() => set({ km: suggestedKm })}><Sparkles className="size-3" /> Zwykle {km(suggestedKm)} – użyj</button>
            ) : <span />}
            <MapsLink origin={t.origin} destination={t.destination} />
          </span>
        }>
          <NumberInput value={t.km} onChange={(v) => { autoKm.current = false; set({ km: v }); }} suffix="km" />
        </Field>
        <Field label="Uwagi (opcjonalnie, nie trafiają na wydruk)">
          <input className="input" value={t.note} onChange={(e) => set({ note: e.target.value })} />
        </Field>
        {!t.id && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-3 dark:border-white/10">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
              <input type="checkbox" className="size-4 accent-brand-600" checked={asRoute} onChange={(e) => setAsRoute(e.target.checked)} />
              Zapisz też jako stałą trasę
            </label>
            {asRoute && (
              <input className="input mt-2" placeholder="Nazwa (opcjonalnie), np. Budowa Kowalski" value={routeName}
                onChange={(e) => setRouteName(e.target.value)} />
            )}
          </div>
        )}
        {errors.length > 0 && <Notice tone="error"><ul className="list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul></Notice>}
        <p className="text-xs text-slate-400">{dayLong(t.day, true)}</p>
      </div>
    </Modal>
  );
}

/** „Sprawdź km w Google Maps” – otwiera trasę skąd → dokąd w nowej karcie (na telefonie w aplikacji Mapy). */
export function MapsLink({ origin, destination }: { origin: string; destination: string }) {
  const ready = origin.trim() !== "" && destination.trim() !== "";
  if (!ready) {
    return <span className="inline-flex items-center gap-1 text-slate-400"><MapIcon className="size-3" /> Wpisz skąd i dokąd, by sprawdzić km w Google Maps</span>;
  }
  return (
    <a href={googleMapsRoute(origin, destination)} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-road-500/30 bg-road-400/10 px-2.5 py-1 font-semibold text-road-600 transition hover:bg-road-400/20 dark:text-road-400">
      <MapIcon className="size-3" /> Sprawdź km w Google Maps <ExternalLink className="size-3" />
    </a>
  );
}

export function nextSeq(trips: Trip[], day: string): number {
  return trips.filter((x) => x.day === day).reduce((m, x) => Math.max(m, x.seq), 0) + 1;
}

export function tripFromRoute(r: Route, vehicleId: number, day: string, seq: number, driver: string): NewTrip {
  return {
    vehicle_id: vehicleId, day, seq, purpose: r.purpose, origin: r.origin, destination: r.destination, km: r.km,
    driver, route_id: r.id, note: null,
  };
}
