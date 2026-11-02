import { Archive, ArchiveRestore, ArrowDown, ArrowLeftRight, ArrowUp, Layers, MapPin, Pencil, Plus, Route as RouteIcon, Sparkles, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { MapsLink, Place, ROUTE_COLORS, routeColor, RouteLine } from "../components/trips";
import { Badge, Card, Combobox, cx, EmptyState, Field, Modal, NumberInput, PageHeader, useAction } from "../components/ui";
import { samePlace } from "../engine/ledger";
import { knownPlaces, knownPurposes, returnPurpose, routeProposals, routeUsage } from "../engine/suggest";
import type { Route, Template } from "../engine/types";
import { deleteRoute, deleteTemplate, saveRoute, saveSettings, saveTemplate } from "../lib/data";
import { placeKey, useData } from "../lib/DataContext";
import { km, num, plural } from "../lib/format";

type RouteDraft = Omit<Route, "id"> & { id?: number };

export function RoutesPage() {
  const { data, reload, placeLabels, placeLabel } = useData();
  const { busy, run } = useAction(reload);
  const [editing, setEditing] = useState<RouteDraft | null>(null);
  const [tpl, setTpl] = useState<(Omit<Template, "id"> & { id?: number }) | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [labels, setLabels] = useState<Record<string, string> | null>(null);

  const routes = data?.routes ?? [];
  const trips = data?.trips ?? [];
  const usage = useMemo(() => routeUsage(routes, trips), [routes, trips]);
  const proposals = useMemo(() => routeProposals(trips, routes).slice(0, 8), [trips, routes]);
  const places = useMemo(() => knownPlaces(trips, routes), [trips, routes]);
  const purposes = useMemo(() => knownPurposes(trips, routes), [trips, routes]);
  if (!data) return null;

  const active = routes.filter((r) => !r.archived).sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.position - b.position);
  const archived = routes.filter((r) => r.archived);
  const blank = (): RouteDraft => ({ name: null, purpose: "", origin: "", destination: "", km: 0, color: null, position: routes.length, archived: false });
  const hasReverse = (r: Route) => routes.some((x) => samePlace(x.origin, r.destination) && samePlace(x.destination, r.origin));
  const labelState = labels ?? placeLabels;

  async function saveDraft() {
    if (!editing) return;
    const e = editing;
    if (!e.purpose.trim() || !e.origin.trim() || !e.destination.trim() || !(e.km > 0)) {
      window.alert("Uzupełnij cel, skąd, dokąd i liczbę km.");
      return;
    }
    const ok = await run(() => saveRoute({ ...e, name: e.name?.trim() || null, purpose: e.purpose.trim(), origin: e.origin.trim(), destination: e.destination.trim() }),
      e.id ? "Zapisano trasę" : "Dodano stałą trasę");
    if (ok) setEditing(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Jednym kliknięciem" title="Stałe trasy"
        subtitle="Na Pulpicie najpierw pokazują się trasy zaczynające się tam, gdzie auto aktualnie stoi."
        actions={<button className="btn btn-primary" onClick={() => setEditing(blank())}><Plus className="size-4" /> Nowa trasa</button>} />

      {active.length === 0 ? (
        <Card><EmptyState icon={<RouteIcon className="size-6" />} title="Brak stałych tras">Dodaj trasy, którymi jeździsz regularnie – dom ↔ biuro, biuro ↔ budowa.</EmptyState></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((r) => (
            <div key={r.id} className="card group relative overflow-hidden p-5">
              <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: routeColor(r) }} />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold tracking-wide text-slate-500 uppercase">{r.name || "Trasa"}</div>
                  <div className="mt-1 text-[15px] leading-snug"><RouteLine origin={r.origin} destination={r.destination} /></div>
                  <div className="mt-1 text-sm text-slate-500">{r.purpose}</div>
                </div>
                <div className="font-display shrink-0 text-2xl font-bold tnum">{num(r.km)}<span className="ml-0.5 text-xs font-medium text-slate-400">km</span></div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <Badge>{plural(usage.get(r.id) ?? 0, "przejazd", "przejazdy", "przejazdów")}</Badge>
                <div className="flex gap-0.5">
                  {!hasReverse(r) && (
                    <button className="btn btn-ghost px-2 py-1 text-xs" disabled={busy} title="Dodaj trasę w drugą stronę"
                      onClick={() => setEditing({ ...blank(), purpose: returnPurpose(trips, r), origin: r.destination, destination: r.origin, km: r.km, color: r.color })}>
                      <ArrowLeftRight className="size-3.5" /> Powrót
                    </button>
                  )}
                  <button className="btn btn-ghost btn-icon size-8" onClick={() => setEditing({ ...r })} aria-label="Edytuj"><Pencil className="size-3.5" /></button>
                  <button className="btn btn-ghost btn-icon size-8" disabled={busy} onClick={() => run(() => saveRoute({ ...r, archived: true }), "Przeniesiono do archiwum")} aria-label="Do archiwum" title="Do archiwum"><Archive className="size-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {proposals.length > 0 && (
        <Card title="Propozycje nowych tras" subtitle="Przejazdy, które powtarzasz, a nie ma ich jeszcze na liście." icon={<Sparkles className="size-4" />}>
          <ul className="grid gap-2 md:grid-cols-2">
            {proposals.map((p) => (
              <li key={`${p.origin}|${p.destination}`} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 dark:border-white/5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm"><RouteLine origin={p.origin} destination={p.destination} /></div>
                  <div className="text-xs text-slate-500">{p.purpose} · {km(p.km)} · {p.count}×</div>
                </div>
                <button className="btn btn-secondary px-3 py-1.5 text-xs" disabled={busy}
                  onClick={() => run(() => saveRoute({ name: null, purpose: p.purpose, origin: p.origin, destination: p.destination, km: p.km, color: null, position: routes.length, archived: false }), "Dodano stałą trasę")}>
                  <Plus className="size-3.5" /> Dodaj
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Szablony dnia" subtitle="Kilka tras dodawanych naraz, np. dom → biuro → budowa → dom." icon={<Layers className="size-4" />}
        actions={<button className="btn btn-secondary" onClick={() => setTpl({ name: "", route_ids: [], position: data.templates.length })} disabled={active.length === 0}><Plus className="size-4" /> Szablon</button>}>
        {data.templates.length === 0 ? <p className="text-sm text-slate-500">Brak szablonów.</p> : (
          <ul className="space-y-2">
            {data.templates.map((t) => {
              const rs = t.route_ids.map((id) => routes.find((r) => r.id === id)).filter((r): r is Route => !!r);
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 p-3 dark:border-white/5">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{t.name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
                      {rs.map((r, i) => (
                        <span key={i} className="inline-flex items-center gap-1">
                          {i === 0 && <Place address={r.origin} />}
                          <span>→</span><Place address={r.destination} />
                        </span>
                      ))}
                    </div>
                  </div>
                  <Badge tone="brand">{km(rs.reduce((a, r) => a + r.km, 0))}</Badge>
                  <button className="btn btn-ghost btn-icon size-8" onClick={() => setTpl({ ...t })} aria-label="Edytuj"><Pencil className="size-3.5" /></button>
                  <button className="btn btn-danger btn-icon size-8" disabled={busy} onClick={() => window.confirm(`Usunąć szablon „${t.name}”?`) && run(() => deleteTemplate(t.id), "Usunięto szablon")} aria-label="Usuń"><Trash2 className="size-3.5" /></button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Nazwy miejsc" subtitle="Krótkie nazwy (np. „Dom”, „Biuro”) ułatwiają czytanie tras w aplikacji. Na wydruku zostaje pełny adres." icon={<MapPin className="size-4" />}
        actions={labels && <button className="btn btn-primary" disabled={busy} onClick={async () => {
          const clean = Object.fromEntries(Object.entries(labels).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()]));
          if (await run(() => saveSettings({ place_labels: JSON.stringify(clean) }), "Zapisano nazwy miejsc")) setLabels(null);
        }}>Zapisz</button>}>
        <div className="grid gap-x-6 gap-y-2 md:grid-cols-2">
          {places.slice(0, 16).map((p) => (
            <div key={p} className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-sm" title={p}>{p}</span>
              <input className="input w-36 py-1.5 text-sm" placeholder="nazwa" value={labelState[placeKey(p)] ?? ""}
                onChange={(e) => setLabels({ ...labelState, [placeKey(p)]: e.target.value })} />
            </div>
          ))}
        </div>
      </Card>

      {archived.length > 0 && (
        <div>
          <button className="btn btn-ghost text-sm" onClick={() => setShowArchived(!showArchived)}>
            <Archive className="size-4" /> Archiwum ({archived.length})
          </button>
          {showArchived && (
            <ul className="mt-2 space-y-2">
              {archived.map((r) => (
                <li key={r.id} className="card flex items-center gap-3 p-3 opacity-80">
                  <div className="min-w-0 flex-1 text-sm"><RouteLine origin={r.origin} destination={r.destination} /> <span className="text-slate-500">· {km(r.km)}</span></div>
                  <button className="btn btn-ghost btn-icon size-8" onClick={() => run(() => saveRoute({ ...r, archived: false }), "Przywrócono trasę")} aria-label="Przywróć"><ArchiveRestore className="size-3.5" /></button>
                  <button className="btn btn-danger btn-icon size-8" onClick={() => window.confirm("Usunąć trasę na stałe? Przejazdy w ewidencji zostaną.") && run(() => deleteRoute(r.id), "Usunięto trasę")} aria-label="Usuń"><Trash2 className="size-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edycja trasy" : "Nowa stała trasa"}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setEditing(null)}>Anuluj</button>
          <button className="btn btn-primary" disabled={busy} onClick={saveDraft}>Zapisz</button>
        </>}>
        {editing && (
          <div className="space-y-4">
            <Field label="Nazwa (opcjonalnie)" hint="np. Budowa Kowalski, Dom → Biuro">
              <input className="input" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="Cel wyjazdu">
              <Combobox value={editing.purpose} onChange={(purpose) => setEditing({ ...editing, purpose })} options={purposes} />
            </Field>
            <Field label="Skąd"><Combobox value={editing.origin} onChange={(origin) => setEditing({ ...editing, origin })} options={places} labelOf={placeLabel} /></Field>
            <Field label="Dokąd"><Combobox value={editing.destination} onChange={(destination) => setEditing({ ...editing, destination })} options={places} labelOf={placeLabel} /></Field>
            <Field label="Kilometry" hint={<MapsLink origin={editing.origin} destination={editing.destination} />}>
              <NumberInput value={editing.km || null} onChange={(v) => setEditing({ ...editing, km: v ?? 0 })} suffix="km" />
            </Field>
            <div>
              <span className="label">Kolor</span>
              <div className="flex gap-2">
                {ROUTE_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setEditing({ ...editing, color: c })} aria-label={`Kolor ${c}`}
                    className={cx("size-8 rounded-full ring-offset-2 transition dark:ring-offset-ink-900", editing.color === c && "ring-2 ring-slate-900 dark:ring-white")}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
            {editing.id && (
              <button className="btn btn-danger -ml-3" onClick={async () => {
                if (window.confirm("Usunąć trasę? Przejazdy w ewidencji zostaną.") && await run(() => deleteRoute(editing.id!), "Usunięto trasę")) setEditing(null);
              }}><Trash2 className="size-4" /> Usuń trasę</button>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!tpl} onClose={() => setTpl(null)} title={tpl?.id ? "Edycja szablonu" : "Nowy szablon dnia"}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setTpl(null)}>Anuluj</button>
          <button className="btn btn-primary" disabled={busy || !tpl?.name.trim() || !tpl?.route_ids.length}
            onClick={async () => { if (tpl && await run(() => saveTemplate({ ...tpl, name: tpl.name.trim() }), "Zapisano szablon")) setTpl(null); }}>Zapisz</button>
        </>}>
        {tpl && (
          <div className="space-y-4">
            <Field label="Nazwa"><input className="input" value={tpl.name} placeholder="np. Zwykły dzień w biurze" onChange={(e) => setTpl({ ...tpl, name: e.target.value })} /></Field>
            <div>
              <span className="label">Trasy po kolei</span>
              <ol className="space-y-1.5">
                {tpl.route_ids.map((id, i) => {
                  const r = routes.find((x) => x.id === id);
                  if (!r) return null;
                  const prev = i > 0 ? routes.find((x) => x.id === tpl.route_ids[i - 1]) : null;
                  const swap = (j: number) => { const ids = [...tpl.route_ids]; [ids[i], ids[j]] = [ids[j], ids[i]]; setTpl({ ...tpl, route_ids: ids }); };
                  return (
                    <li key={`${id}-${i}`} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-white/5">
                      <span className="font-mono text-xs text-slate-400">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate"><RouteLine origin={r.origin} destination={r.destination} /></span>
                      {prev && !samePlace(prev.destination, r.origin) && <Badge tone="amber">przerwa</Badge>}
                      <span className="text-xs text-slate-500 tnum">{num(r.km)} km</span>
                      {i > 0 && <button className="btn btn-ghost size-7 rounded-lg p-0" onClick={() => swap(i - 1)} aria-label="W górę"><ArrowUp className="size-3.5" /></button>}
                      {i < tpl.route_ids.length - 1 && <button className="btn btn-ghost size-7 rounded-lg p-0" onClick={() => swap(i + 1)} aria-label="W dół"><ArrowDown className="size-3.5" /></button>}
                      <button className="btn btn-ghost size-7 rounded-lg p-0" onClick={() => setTpl({ ...tpl, route_ids: tpl.route_ids.filter((_, j) => j !== i) })} aria-label="Usuń"><X className="size-3.5" /></button>
                    </li>
                  );
                })}
              </ol>
              <select className="input mt-2" value="" onChange={(e) => e.target.value && setTpl({ ...tpl, route_ids: [...tpl.route_ids, Number(e.target.value)] })}>
                <option value="">+ dodaj trasę…</option>
                {(() => {
                  const lastR = routes.find((x) => x.id === tpl.route_ids.at(-1));
                  const list = [...active].sort((a, b) => Number(lastR ? samePlace(b.origin, lastR.destination) : 0) - Number(lastR ? samePlace(a.origin, lastR.destination) : 0));
                  return list.map((r) => <option key={r.id} value={r.id}>{(r.name ? `${r.name}: ` : "") + `${r.origin} → ${r.destination} (${num(r.km)} km)`}</option>);
                })()}
              </select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
