import { Building2, CarFront, DatabaseBackup, Download, FileSpreadsheet, Gauge, Pencil, Plus, Sparkles, Trash2, Upload, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { APP_VERSION } from "../changelog";
import { Badge, Card, Field, Modal, Notice, NumberInput, PageHeader, Spinner, useAction } from "../components/ui";
import { todayLocal } from "../engine/dates";
import { buildLedger, samePlace } from "../engine/ledger";
import type { Vehicle } from "../engine/types";
import { type Backup, closeMonth, deleteVehicle, replaceVehicleData, restoreBackup, saveRoute, saveSettings, saveVehicle } from "../lib/data";
import { placeKey, useData } from "../lib/DataContext";
import { type ImportResult, parseWorkbook } from "../lib/excelImport";
import { downloadBlob } from "../lib/exportXlsx";
import { supabase } from "../lib/supabase";
import { dayLabel, km, monthName, num, trips as tripsWord } from "../lib/format";

type VehicleDraft = Omit<Vehicle, "id"> & { id?: number };

export function SettingsPage() {
  const { data, company, reload, fvVehicleId } = useData();
  const { busy, run } = useAction(reload);
  const location = useLocation();
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => { void supabase.auth.getSession().then(({ data: d }) => setEmail(d.session?.user.email ?? null)); }, []);
  const [firm, setFirm] = useState(company);
  const [driver, setDriver] = useState(data?.settings.default_driver ?? "");
  const [veh, setVeh] = useState<VehicleDraft | null>(null);
  useEffect(() => setFirm(company), [company.name, company.nip, company.address1, company.address2, company.regon, company.signatory]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (location.hash) setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [location.hash]);
  if (!data) return null;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Konfiguracja" title="Ustawienia" />

      <div id="pojazdy" className="scroll-mt-24">
        <Card title="Pojazdy" icon={<CarFront className="size-4" />} subtitle="Dane z nagłówka ewidencji. Stan licznika na dzień rozpoczęcia to punkt startowy wyliczeń."
          actions={<button className="btn btn-secondary" onClick={() => setVeh({ name: "", plate: "", start_date: todayLocal(), start_odometer: 0, end_date: null, default_driver: driver || null, active: true })}><Plus className="size-4" /> Pojazd</button>}>
          {data.vehicles.length === 0 ? <p className="text-sm text-slate-500">Brak pojazdów – dodaj ręcznie albo wczytaj arkusz Excel poniżej.</p> : (
            <ul className="space-y-2">
              {data.vehicles.map((v) => {
                const n = data.trips.filter((t) => t.vehicle_id === v.id).length;
                return (
                  <li key={v.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 p-3 dark:border-white/5">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10"><CarFront className="size-5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{v.name} <span className="font-mono ml-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-white/10">{v.plate}</span> {!v.active && <Badge>nieaktywny</Badge>}</div>
                      <div className="text-xs text-slate-500">od {dayLabel(v.start_date)}{v.end_date ? ` do ${dayLabel(v.end_date)}` : ""} · licznik startowy {km(v.start_odometer)} · {tripsWord(n)}</div>
                    </div>
                    <button className="btn btn-ghost btn-icon size-8" onClick={() => setVeh({ ...v })} aria-label="Edytuj"><Pencil className="size-3.5" /></button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div id="firma" className="scroll-mt-24">
        <Card title="Dane firmy i kierowca" icon={<Building2 className="size-4" />} subtitle="Pojawiają się w nagłówku wydruku i eksportu do Excela."
          actions={<button className="btn btn-primary" disabled={busy} onClick={() => run(() => saveSettings({
            company_name: firm.name, company_address1: firm.address1, company_address2: firm.address2, company_nip: firm.nip,
            company_regon: firm.regon, company_signatory: firm.signatory, default_driver: driver,
          }), "Zapisano dane")}>Zapisz</button>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nazwa firmy" className="sm:col-span-2"><input className="input" value={firm.name} onChange={(e) => setFirm({ ...firm, name: e.target.value })} /></Field>
            <Field label="Adres – linia 1"><input className="input" value={firm.address1} onChange={(e) => setFirm({ ...firm, address1: e.target.value })} /></Field>
            <Field label="Adres – linia 2"><input className="input" value={firm.address2} onChange={(e) => setFirm({ ...firm, address2: e.target.value })} /></Field>
            <Field label="NIP"><input className="input" value={firm.nip} onChange={(e) => setFirm({ ...firm, nip: e.target.value })} /></Field>
            <Field label="REGON"><input className="input" value={firm.regon} onChange={(e) => setFirm({ ...firm, regon: e.target.value })} /></Field>
            <Field label="Podpis podatnika (imię i nazwisko pod podpisem)"><input className="input" value={firm.signatory} onChange={(e) => setFirm({ ...firm, signatory: e.target.value })} /></Field>
            <Field label="Domyślny kierowca" hint="Wpisywany w nowych przejazdach (można go zmienić też w pojeździe)."><input className="input" value={driver} onChange={(e) => setDriver(e.target.value)} /></Field>
          </div>
        </Card>
      </div>

      <div id="import" className="scroll-mt-24"><ExcelImport /></div>

      <div id="kopia" className="scroll-mt-24">
        <Card title="Kopia zapasowa" icon={<DatabaseBackup className="size-4" />} subtitle="Wszystkie dane w jednym pliku – warto pobrać co jakiś czas.">
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-secondary" onClick={() => {
              const b: Backup = { app: "kilometrowka", version: APP_VERSION, exported_at: new Date().toISOString(), data };
              downloadBlob(new Blob([JSON.stringify(b, null, 1)], { type: "application/json" }), `kilometrowka_kopia_${todayLocal()}.json`);
            }}><Download className="size-4" /> Pobierz kopię</button>
            <label className="btn btn-ghost cursor-pointer">
              <Upload className="size-4" /> Przywróć z pliku…
              <input type="file" accept="application/json,.json" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try {
                  const b = JSON.parse(await f.text()) as Backup;
                  if (b.app !== "kilometrowka" || !b.data?.trips) throw new Error("To nie jest kopia Kilometrówki");
                  if (!window.confirm(`Przywrócić kopię z ${new Date(b.exported_at).toLocaleString("pl-PL")}? Obecne dane zostaną ZASTĄPIONE (${tripsWord(b.data.trips.length)}).`)) return;
                  await run(() => restoreBackup(b), "Przywrócono kopię");
                } catch (err) {
                  window.alert(err instanceof Error ? err.message : String(err));
                }
              }} />
            </label>
          </div>
        </Card>
      </div>

      {data.fvMileage.length > 0 && (
        <Card title="Przebieg z FV Meter" icon={<Gauge className="size-4" />}
          subtitle="Odczyty przebiegu wpisywane w FV Meter (zakładka Samochód) trafiają do kontroli licznika – nie trzeba ich przepisywać.">
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Pojazd" className="min-w-56">
              <select className="input" value={fvVehicleId ?? "none"} disabled={busy}
                onChange={(e) => run(() => saveSettings({ fvmeter_vehicle: e.target.value }), "Zapisano")}>
                {data.vehicles.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>)}
                <option value="none">nie pobieraj</option>
              </select>
            </Field>
            {(() => {
              const last = [...data.fvMileage].filter((m) => m.km > 0).at(-1);
              return last && <p className="pb-3 text-sm text-slate-500">{num(data.fvMileage.filter((m) => m.km > 0).length)} odczytów, ostatni {dayLabel(last.day)}: <b className="text-slate-700 dark:text-slate-200">{km(last.km)}</b></p>;
            })()}
          </div>
        </Card>
      )}

      <Card title="Konta" icon={<Users className="size-4" />}>
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p>Zalogowano jako <b>{email ?? "…"}</b>. Każde konto ma własne, oddzielne dane: pojazdy, przejazdy, trasy i dane firmy.</p>
          <p>Konto dla drugiej osoby (np. żony z jej autem) zakładasz w Supabase: <b>Authentication → Users → Add user → Create new user</b>
            {" "}(e-mail, hasło, zaznacz „Auto Confirm User”). Ta osoba loguje się pod tym samym adresem aplikacji i nie widzi Twoich danych ani danych FV Meter.</p>
        </div>
      </Card>

      <Card title="O aplikacji" icon={<Sparkles className="size-4" />}>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span>Kilometrówka <span className="font-mono font-semibold">v{APP_VERSION}</span></span>
          <Link to="/co-nowego" className="btn btn-secondary">Co nowego</Link>
        </div>
      </Card>

      <Modal open={!!veh} onClose={() => setVeh(null)} title={veh?.id ? "Edycja pojazdu" : "Nowy pojazd"}
        footer={<>
          {veh?.id && (
            <button className="btn btn-danger mr-auto" onClick={async () => {
              const n = data.trips.filter((t) => t.vehicle_id === veh.id).length;
              const typed = window.prompt(`Usunięcie pojazdu usuwa też ${tripsWord(n)} z ewidencji. Aby potwierdzić, wpisz numer rejestracyjny: ${veh.plate}`);
              if (typed?.replace(/\s/g, "").toUpperCase() === veh.plate.replace(/\s/g, "").toUpperCase() && await run(() => deleteVehicle(veh.id!), "Usunięto pojazd")) setVeh(null);
            }}><Trash2 className="size-4" /> Usuń</button>
          )}
          <button className="btn btn-secondary" onClick={() => setVeh(null)}>Anuluj</button>
          <button className="btn btn-primary" disabled={busy || !veh?.name.trim() || !veh?.plate.trim() || !veh?.start_date}
            onClick={async () => { if (veh && await run(() => saveVehicle({ ...veh, name: veh.name.trim(), plate: veh.plate.trim().toUpperCase() }), "Zapisano pojazd")) setVeh(null); }}>Zapisz</button>
        </>}>
        {veh && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pojazd (marka, model)"><input className="input" value={veh.name} onChange={(e) => setVeh({ ...veh, name: e.target.value })} /></Field>
            <Field label="Numer rejestracyjny"><input className="input font-mono uppercase" value={veh.plate} onChange={(e) => setVeh({ ...veh, plate: e.target.value })} /></Field>
            <Field label="Dzień rozpoczęcia ewidencji"><input type="date" className="input" value={veh.start_date} onChange={(e) => setVeh({ ...veh, start_date: e.target.value })} /></Field>
            <Field label="Stan licznika na ten dzień"><NumberInput value={veh.start_odometer} onChange={(v) => setVeh({ ...veh, start_odometer: v ?? 0 })} suffix="km" /></Field>
            <Field label="Dzień zakończenia ewidencji" hint="Zostaw puste, dopóki prowadzisz ewidencję."><input type="date" className="input" value={veh.end_date ?? ""} onChange={(e) => setVeh({ ...veh, end_date: e.target.value || null })} /></Field>
            <Field label="Kierowca"><input className="input" value={veh.default_driver ?? ""} onChange={(e) => setVeh({ ...veh, default_driver: e.target.value || null })} /></Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" className="size-4 accent-brand-600" checked={veh.active} onChange={(e) => setVeh({ ...veh, active: e.target.checked })} /> Aktywny (widoczny w wyborze pojazdu)
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ExcelImport() {
  const { data, company, reload, placeLabels } = useData();
  const { busy, run } = useAction(reload);
  const [file, setFile] = useState<string | null>(null);
  const [res, setRes] = useState<ImportResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [withReadingsRaw, setWithReadings] = useState(true);
  const [withCompany, setWithCompany] = useState(true);
  // z FV Meter przychodzi prawidłowy przebieg – wtedy liczby z K–L domyślnie pomijamy
  const [withReadingsSet, setWithReadingsSet] = useState(false);
  const [closePast, setClosePast] = useState(true);
  const [progress, setProgress] = useState<string | null>(null);
  if (!data) return null;
  const app = data;
  const withReadings = withReadingsSet ? withReadingsRaw : app.fvMileage.length === 0;
  const pastMonths = res ? res.months.filter((m) => m < todayLocal().slice(0, 7)) : [];
  const existing = res ? app.vehicles.find((v) => v.plate.replace(/\s/g, "").toUpperCase() === res.vehicle.plate.replace(/\s/g, "").toUpperCase()) : undefined;
  const end = res ? (() => {
    const v = { id: 0, name: "", plate: "", start_date: res.vehicle.start_date ?? "", start_odometer: res.vehicle.start_odometer ?? 0, end_date: null, default_driver: null, active: true };
    return buildLedger(v, res.trips.map((t, i) => ({ ...t, id: i + 1, vehicle_id: 0, route_id: null, note: null }))).at(-1)?.odoEnd ?? null;
  })() : null;

  async function go() {
    if (!res) return;
    const r = res;
    if (existing && !window.confirm(`Pojazd ${existing.plate} już jest w aplikacji (${tripsWord(app.trips.filter((t) => t.vehicle_id === existing.id).length)}). Jego przejazdy i odczyty zostaną zastąpione danymi z pliku. Kontynuować?`)) return;
    const ok = await run(async () => {
      setProgress("Zapisywanie pojazdu…");
      const driver = r.trips.at(-1)?.driver || null;
      const vehicleId = await saveVehicle({
        ...(existing ?? {}), id: existing?.id, name: r.vehicle.name || existing?.name || "Pojazd", plate: r.vehicle.plate.toUpperCase(),
        start_date: r.vehicle.start_date ?? todayLocal(), start_odometer: r.vehicle.start_odometer ?? 0,
        end_date: existing?.end_date ?? null, default_driver: existing?.default_driver ?? driver, active: true,
      });
      setProgress(`Zapisywanie ${tripsWord(r.trips.length)}…`);
      await replaceVehicleData(vehicleId, r.trips.map((t) => ({ ...t, vehicle_id: vehicleId, route_id: null, note: null })),
        withReadings ? r.readings.map((x) => ({ ...x, vehicle_id: vehicleId })) : []);
      setProgress("Stałe trasy…");
      let pos = app.routes.length;
      const labels: Record<string, string> = { ...placeLabels };
      for (const rt of r.routes) {
        const exists = app.routes.some((x) => samePlace(x.origin, rt.origin) && samePlace(x.destination, rt.destination));
        if (!exists) await saveRoute({ ...rt, color: null, position: pos++, archived: false });
        // „Dom-Praca” → nazwy miejsc „Dom” i „Praca”
        const m = rt.name?.match(/^([\p{L}]+)\s*-\s*([\p{L}]+)$/u);
        if (m) {
          labels[placeKey(rt.origin)] ??= m[1];
          labels[placeKey(rt.destination)] ??= m[2];
        }
      }
      const settings: Record<string, string> = { place_labels: JSON.stringify(labels) };
      if (withCompany) {
        const c = r.company;
        Object.assign(settings, {
          ...(c.name ? { company_name: c.name, company_signatory: company.signatory || c.name.split(" ").slice(-2).join(" ").toUpperCase() } : {}),
          ...(c.address1 ? { company_address1: c.address1 } : {}), ...(c.address2 ? { company_address2: c.address2 } : {}),
          ...(c.nip ? { company_nip: c.nip } : {}), ...(c.regon ? { company_regon: c.regon } : {}),
          ...(driver && !app.settings.default_driver ? { default_driver: driver } : {}),
        });
      }
      await saveSettings(settings);
      if (closePast) {
        setProgress("Zatwierdzanie miesięcy…");
        for (const m of pastMonths) await closeMonth(vehicleId, m);
      }
    }, `Przeniesiono ${tripsWord(r.trips.length)}`);
    setProgress(null);
    if (ok) { setRes(null); setFile(null); }
  }

  return (
    <Card title="Wczytanie ewidencji z Excela" icon={<FileSpreadsheet className="size-4" />}
      subtitle="Plik w układzie „Ewidencja_pojazdu.xlsx”. Jest czytany w przeglądarce – do bazy trafiają tylko dane.">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 px-4 py-8 text-center transition hover:border-brand-400 hover:bg-brand-50/30 dark:border-white/10 dark:hover:bg-white/5">
        <Upload className="size-6 text-brand-500" />
        <span className="text-sm font-medium">{file ?? "Wybierz plik .xlsx"}</span>
        <span className="text-xs text-slate-500">przejazdy, stałe trasy (kolumny S–W), odczyty licznika (K–L), dane firmy</span>
        <input type="file" accept=".xlsx" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setErr(null); setRes(null); setFile(f.name);
          try { setRes(parseWorkbook(new Uint8Array(await f.arrayBuffer()))); } catch (x) { setErr(x instanceof Error ? x.message : String(x)); }
        }} />
      </label>
      {err && <div className="mt-4"><Notice tone="error">{err}</Notice></div>}
      {res && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["Przejazdy", num(res.trips.length)], ["Miesiące", res.months.length ? `${monthName(res.months[0], true)} – ${monthName(res.months.at(-1)!, true)}` : "–"],
              ["Stałe trasy", num(res.routes.length)], ["Odczyty licznika", num(res.readings.length)]].map(([l, v]) => (
              <div key={l} className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5"><div className="text-xs text-slate-500">{l}</div><div className="font-display mt-0.5 font-bold">{v}</div></div>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-100 p-4 text-sm dark:border-white/5">
            <div><b>{res.vehicle.name}</b> <span className="font-mono">{res.vehicle.plate}</span> – ewidencja od {res.vehicle.start_date ? dayLabel(res.vehicle.start_date) : "?"}, licznik startowy {km(res.vehicle.start_odometer)}</div>
            <div className="mt-1 text-slate-500">{[res.company.name, res.company.address1, res.company.address2, res.company.nip && `NIP ${res.company.nip}`].filter(Boolean).join(" · ")}</div>
            <div className="mt-2">Stan licznika na koniec wg aplikacji: <b>{km(end)}</b>{res.sheetOdometerEnd !== null && end !== res.sheetOdometerEnd && <> (w arkuszu: {km(res.sheetOdometerEnd)} – różnica {km(Math.abs((end ?? 0) - res.sheetOdometerEnd))}; aplikacja sumuje wszystkie przejazdy bez przerw)</>}</div>
          </div>
          {res.warnings.length > 0 && (
            <Notice tone="warn">
              <div className="font-semibold">Uwagi do pliku</div>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">{res.warnings.slice(0, 12).map((w) => <li key={w}>{w}</li>)}</ul>
              {res.warnings.length > 12 && <div className="mt-1">…i {res.warnings.length - 12} więcej</div>}
            </Notice>
          )}
          <div className="space-y-2 text-sm">
            <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5 size-4 accent-brand-600" checked={withReadings} onChange={(e) => { setWithReadingsSet(true); setWithReadings(e.target.checked); }} />
              <span>Liczby z kolumn K–L wczytaj jako faktyczne odczyty licznika ({res.readings.length}) – do kontroli w Raportach
                {app.fvMileage.length > 0 && <span className="block text-xs text-slate-500">Przebieg pobiera się już z FV Meter, więc zwykle nie jest to potrzebne.</span>}</span></label>
            {pastMonths.length > 0 && (
              <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5 size-4 accent-brand-600" checked={closePast} onChange={(e) => setClosePast(e.target.checked)} />
                <span>Oznacz {pastMonths.length === 1 ? "zakończony miesiąc" : `${pastMonths.length} zakończonych miesięcy`} ({monthName(pastMonths[0], true)} – {monthName(pastMonths.at(-1)!, true)}) jako zatwierdzone – były już drukowane i podpisane w Excelu</span></label>
            )}
            <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5 size-4 accent-brand-600" checked={withCompany} onChange={(e) => setWithCompany(e.target.checked)} />
              <span>Zapisz dane firmy z nagłówka arkusza</span></label>
          </div>
          {existing && <Notice tone="warn">Pojazd <b>{existing.plate}</b> już istnieje – jego przejazdy i odczyty zostaną zastąpione.</Notice>}
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" disabled={busy || res.trips.length === 0} onClick={go}><Upload className="size-4" /> Przenieś dane</button>
            {progress && <Spinner label={progress} />}
          </div>
        </div>
      )}
    </Card>
  );
}
