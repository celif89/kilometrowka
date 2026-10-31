// Odczyt i zapis danych w Supabase (tabele km_*).
import type { MonthClose, NewTrip, OdometerReading, Route, Template, Trip, Vehicle } from "../engine/types";
import { supabase } from "./supabase";

export interface AppData {
  vehicles: Vehicle[];
  routes: Route[];
  templates: Template[];
  trips: Trip[];
  readings: OdometerReading[];
  closes: MonthClose[];
  settings: Record<string, string>;
}

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** Supabase zwraca najwyżej 1000 wierszy na zapytanie – pobieramy stronami. */
async function fetchAll<T>(table: string, order: string[]): Promise<T[]> {
  const out: T[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    let q = supabase.from(table).select("*");
    for (const col of order) q = q.order(col);
    const rows = check(await q.range(from, from + page - 1)) as T[];
    out.push(...rows);
    if (rows.length < page) return out;
  }
}

const n = (v: unknown) => (v === null || v === undefined ? v : Number(v));

export async function loadAll(): Promise<AppData> {
  const [vehicles, routes, templates, trips, readings, closes, settings] = await Promise.all([
    fetchAll<Vehicle>("km_vehicles", ["id"]),
    fetchAll<Route>("km_routes", ["position", "id"]),
    fetchAll<Template>("km_templates", ["position", "id"]),
    fetchAll<Trip>("km_trips", ["day", "seq", "id"]),
    fetchAll<OdometerReading>("km_odometer", ["day", "id"]),
    fetchAll<MonthClose>("km_month_close", ["month"]),
    fetchAll<{ key: string; value: string }>("km_settings", ["key"]),
  ]);
  return {
    vehicles: vehicles.map((v) => ({ ...v, start_odometer: Number(v.start_odometer) })),
    routes: routes.map((r) => ({ ...r, km: Number(r.km) })),
    templates: templates.map((t) => ({ ...t, route_ids: (t.route_ids ?? []).map(Number) })),
    trips: trips.map((t) => ({ ...t, km: Number(t.km), route_id: n(t.route_id) as number | null })),
    readings: readings.map((r) => ({ ...r, km: Number(r.km) })),
    closes,
    settings: Object.fromEntries(settings.map((s) => [s.key, s.value ?? ""])),
  };
}

async function inChunks<T>(rows: T[], size: number, fn: (chunk: T[]) => Promise<void>) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

// --- przejazdy ----------------------------------------------------------------
/** Wstawia przejazdy i zwraca ich identyfikatory (do „Cofnij”). */
export async function insertTrips(trips: NewTrip[]): Promise<number[]> {
  const ids: number[] = [];
  await inChunks(trips, 500, async (chunk) => {
    const rows = check(await supabase.from("km_trips").insert(chunk).select("id")) as { id: number }[];
    ids.push(...rows.map((r) => r.id));
  });
  return ids;
}

export async function deleteTrips(ids: number[]) {
  if (ids.length) check(await supabase.from("km_trips").delete().in("id", ids));
}

export async function updateTrip(t: Trip) {
  const { id, ...rest } = t;
  check(await supabase.from("km_trips").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id));
}

export async function deleteTrip(id: number) {
  check(await supabase.from("km_trips").delete().eq("id", id));
}

/** Nowa kolejność przejazdów w dniu (po przesunięciu w górę / w dół). */
export async function reorderTrips(ids: number[]) {
  await Promise.all(ids.map(async (id, i) => {
    check(await supabase.from("km_trips").update({ seq: i + 1 }).eq("id", id));
  }));
}

// --- stałe trasy i szablony ---------------------------------------------------
export async function saveRoute(r: Omit<Route, "id"> & { id?: number }) {
  const { id, ...rest } = r;
  if (id) check(await supabase.from("km_routes").update(rest).eq("id", id));
  else check(await supabase.from("km_routes").insert(rest));
}

export async function deleteRoute(id: number) {
  check(await supabase.from("km_routes").delete().eq("id", id));
}

export async function saveTemplate(t: Omit<Template, "id"> & { id?: number }) {
  const { id, ...rest } = t;
  if (id) check(await supabase.from("km_templates").update(rest).eq("id", id));
  else check(await supabase.from("km_templates").insert(rest));
}

export async function deleteTemplate(id: number) {
  check(await supabase.from("km_templates").delete().eq("id", id));
}

// --- pojazdy, odczyty, miesiące ------------------------------------------------
export async function saveVehicle(v: Omit<Vehicle, "id"> & { id?: number }): Promise<number> {
  const { id, ...rest } = v;
  if (id) {
    check(await supabase.from("km_vehicles").update(rest).eq("id", id));
    return id;
  }
  const row = check(await supabase.from("km_vehicles").insert(rest).select("id").single()) as { id: number };
  return row.id;
}

export async function deleteVehicle(id: number) {
  check(await supabase.from("km_vehicles").delete().eq("id", id));
}

export async function saveReading(r: Omit<OdometerReading, "id"> & { id?: number }) {
  const { id, ...rest } = r;
  if (id) check(await supabase.from("km_odometer").update(rest).eq("id", id));
  else check(await supabase.from("km_odometer").insert(rest));
}

export async function deleteReading(id: number) {
  check(await supabase.from("km_odometer").delete().eq("id", id));
}

export async function closeMonth(vehicleId: number, month: string) {
  check(await supabase.from("km_month_close").upsert({ vehicle_id: vehicleId, month, closed_at: new Date().toISOString() },
    { onConflict: "vehicle_id,month" }));
}

export async function reopenMonth(vehicleId: number, month: string) {
  check(await supabase.from("km_month_close").delete().eq("vehicle_id", vehicleId).eq("month", month));
}

export async function saveSettings(values: Record<string, string>) {
  check(await supabase.from("km_settings").upsert(
    Object.entries(values).map(([key, value]) => ({ key, value })), { onConflict: "key" },
  ));
}

// --- import / kopia zapasowa ---------------------------------------------------
export async function replaceVehicleData(vehicleId: number, trips: NewTrip[], readings: Omit<OdometerReading, "id">[]) {
  check(await supabase.from("km_trips").delete().eq("vehicle_id", vehicleId));
  check(await supabase.from("km_odometer").delete().eq("vehicle_id", vehicleId));
  await insertTrips(trips);
  await inChunks(readings, 500, async (chunk) => { check(await supabase.from("km_odometer").insert(chunk)); });
}

export interface Backup {
  app: "kilometrowka";
  version: string;
  exported_at: string;
  data: AppData;
}

/**
 * Przywrócenie kopii: czyści wszystkie tabele i wstawia dane z pliku. Baza nadaje nowe
 * identyfikatory, więc powiązania (pojazd, stała trasa, szablon) są przepisywane na nowe.
 */
export async function restoreBackup(b: Backup) {
  const d = b.data;
  for (const t of ["km_month_close", "km_odometer", "km_trips", "km_templates", "km_routes", "km_vehicles"]) {
    check(await supabase.from(t).delete().not(t === "km_month_close" ? "month" : "id", "is", null));
  }
  const vehicleIds = new Map<number, number>();
  for (const v of d.vehicles) {
    const { id, ...rest } = v;
    vehicleIds.set(id, await saveVehicle(rest));
  }
  const routeIds = new Map<number, number>();
  for (const r of d.routes) {
    const { id, ...rest } = r;
    const row = check(await supabase.from("km_routes").insert(rest).select("id").single()) as { id: number };
    routeIds.set(id, row.id);
  }
  for (const t of d.templates) {
    const { id: _id, ...rest } = t;
    await saveTemplate({ ...rest, route_ids: rest.route_ids.map((x) => routeIds.get(x)).filter((x): x is number => !!x) });
  }
  await insertTrips(d.trips.map(({ id: _id, ...t }) => ({
    ...t, vehicle_id: vehicleIds.get(t.vehicle_id)!, route_id: t.route_id ? routeIds.get(t.route_id) ?? null : null,
  })).filter((t) => t.vehicle_id));
  await inChunks(d.readings.map(({ id: _id, ...r }) => ({ ...r, vehicle_id: vehicleIds.get(r.vehicle_id)! }))
    .filter((r) => r.vehicle_id), 500, async (chunk) => { check(await supabase.from("km_odometer").insert(chunk)); });
  for (const c of d.closes) {
    const vid = vehicleIds.get(c.vehicle_id);
    if (vid) check(await supabase.from("km_month_close").insert({ ...c, vehicle_id: vid }));
  }
  await saveSettings(d.settings);
}
