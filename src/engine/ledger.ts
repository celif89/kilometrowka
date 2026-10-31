// Ewidencja przebiegu: numeracja wpisów, stan licznika, podsumowania miesięcy, kontrola.
import { lastDayOfMonth, monthOf, monthRange, todayLocal } from "./dates";
import type { MonthClose, OdometerReading, Trip, Vehicle } from "./types";

export interface LedgerTrip extends Trip {
  /** numer kolejny wpisu w miesiącu (od 1) */
  no: number;
  month: string;
  odoStart: number;
  odoEnd: number;
}

export interface MonthSummary {
  month: string;
  trips: LedgerTrip[];
  km: number;
  days: number;
  odoStart: number;
  odoEnd: number;
  closed: MonthClose | null;
}

/** Zaokrąglenie do 0,1 km, żeby sumy ułamków nie dawały 17 925,000000001. */
export const round1 = (v: number) => Math.round(v * 10) / 10;

export function compareTrips(a: Trip, b: Trip): number {
  return a.day < b.day ? -1 : a.day > b.day ? 1 : a.seq - b.seq || a.id - b.id;
}

export function sortTrips<T extends Trip>(trips: T[]): T[] {
  return [...trips].sort(compareTrips);
}

/** Przejazdy pojazdu w kolejności z numerami i stanem licznika (licznik startowy + suma km). */
export function buildLedger(vehicle: Vehicle, trips: Trip[]): LedgerTrip[] {
  let odo = vehicle.start_odometer;
  let month = "";
  let no = 0;
  return sortTrips(trips.filter((t) => t.vehicle_id === vehicle.id)).map((t) => {
    const m = monthOf(t.day);
    if (m !== month) { month = m; no = 0; }
    no += 1;
    const odoStart = odo;
    odo = round1(odo + t.km);
    return { ...t, no, month: m, odoStart, odoEnd: odo };
  });
}

/** Wszystkie miesiące ewidencji – także te bez przejazdów (dalej wymagają stanu licznika). */
export function monthSummaries(
  vehicle: Vehicle, ledger: LedgerTrip[], closes: MonthClose[], today = todayLocal(),
): MonthSummary[] {
  const first = monthOf(vehicle.start_date);
  const lastTrip = ledger.at(-1)?.month ?? first;
  const max = (a: string, b: string) => (a > b ? a : b);
  let last = monthOf(today);
  if (vehicle.end_date && monthOf(vehicle.end_date) < last) last = monthOf(vehicle.end_date);
  last = max(last, lastTrip);
  const byMonth = new Map<string, LedgerTrip[]>();
  for (const t of ledger) {
    if (!byMonth.has(t.month)) byMonth.set(t.month, []);
    byMonth.get(t.month)!.push(t);
  }
  const start = ledger[0]?.month && ledger[0].month < first ? ledger[0].month : first;
  let odo = vehicle.start_odometer;
  return monthRange(start, last).map((month) => {
    const trips = byMonth.get(month) ?? [];
    const odoStart = odo;
    const km = round1(trips.reduce((a, t) => a + t.km, 0));
    odo = trips.at(-1)?.odoEnd ?? odo;
    return {
      month,
      trips,
      km,
      days: new Set(trips.map((t) => t.day)).size,
      odoStart,
      odoEnd: odo,
      closed: closes.find((c) => c.vehicle_id === vehicle.id && c.month === month) ?? null,
    };
  });
}

/** Stan licznika wg ewidencji na koniec danego dnia. */
export function odometerAt(vehicle: Vehicle, ledger: LedgerTrip[], day: string): number {
  let odo = vehicle.start_odometer;
  for (const t of ledger) {
    if (t.day > day) break;
    odo = t.odoEnd;
  }
  return odo;
}

export interface OdometerCheck {
  reading: OdometerReading;
  computed: number;
  /** faktyczny − wg ewidencji; > 0: auto przejechało więcej niż wpisano */
  diff: number;
}

export function odometerChecks(vehicle: Vehicle, ledger: LedgerTrip[], readings: OdometerReading[]): OdometerCheck[] {
  return readings
    // odczyty sprzed rozpoczęcia ewidencji (np. 0 km w dniu zakupu) nie mają z czym się porównać
    .filter((r) => r.vehicle_id === vehicle.id && r.day >= vehicle.start_date)
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.id - b.id))
    .map((reading) => {
      const computed = odometerAt(vehicle, ledger, reading.day);
      return { reading, computed, diff: round1(reading.km - computed) };
    });
}

export function isMonthClosed(closes: MonthClose[], vehicleId: number, day: string): boolean {
  const m = monthOf(day);
  return closes.some((c) => c.vehicle_id === vehicleId && c.month === m);
}

/** Wymagane pola wpisu (art. 86a ust. 7 pkt 4 ustawy o VAT). */
export function validateTrip(t: Pick<Trip, "day" | "purpose" | "origin" | "destination" | "km" | "driver">): string[] {
  const errors: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.day)) errors.push("Podaj datę wyjazdu");
  if (!t.purpose.trim()) errors.push("Podaj cel wyjazdu");
  if (!t.origin.trim()) errors.push("Podaj, skąd był wyjazd");
  if (!t.destination.trim()) errors.push("Podaj, dokąd był wyjazd");
  if (!(t.km > 0)) errors.push("Liczba kilometrów musi być większa od zera");
  if (t.km > 2000) errors.push("Ponad 2000 km w jednym przejeździe? Sprawdź liczbę");
  if (!t.driver.trim()) errors.push("Podaj osobę kierującą");
  return errors;
}

export const samePlace = (a: string, b: string) => normalizePlace(a).toLowerCase() === normalizePlace(b).toLowerCase();

export function normalizePlace(s: string): string {
  return s.replace(/\s+/g, " ").replace(/\s+,/g, ",").trim();
}

/** Wpisy, które nie zaczynają się tam, gdzie skończył się poprzedni przejazd. */
export function continuityGaps(ledger: LedgerTrip[]): Map<number, string> {
  const gaps = new Map<number, string>();
  for (let i = 1; i < ledger.length; i++) {
    const prev = ledger[i - 1];
    const t = ledger[i];
    if (!samePlace(prev.destination, t.origin)) gaps.set(t.id, prev.destination);
  }
  return gaps;
}

export function monthEndDay(month: string): string {
  return lastDayOfMonth(month);
}
