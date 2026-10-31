// Import ewidencji z arkusza Excel w układzie „Ewidencja_pojazdu.xlsx”.
//
// Układ arkusza:
// * A1–A5: dane firmy (nazwa, adres, NIP, REGON); E1–E4: pojazd, numer rejestracyjny,
//   dzień rozpoczęcia ewidencji, stan licznika na ten dzień
// * bloki miesięcy: „Ewidencja za miesiąc grudzień, roku 2025”, nagłówek tabeli, potem wpisy
//   po dwa wiersze: A nr, B data, C cel, D opis trasy (czasem „skąd -” w D i „dokąd” wiersz niżej),
//   F km, G stan licznika (wyjazd / przyjazd), H kierowca, J numer stałej trasy
// * K/L: liczby wpisane obok wpisów – faktyczne odczyty licznika
// * S–W: lista stałych tras (nr, nazwa, cel, trasa, km)
import { isValidDay } from "../engine/dates";
import { normalizePlace, round1 } from "../engine/ledger";
import type { Company } from "../engine/types";
import { type CellValue, type Sheet, readWorkbook, serialToDay } from "./xlsx";

export const MONTHS_PL = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień",
  "wrzesień", "październik", "listopad", "grudzień"];

export interface ImportedTrip {
  day: string;
  seq: number;
  purpose: string;
  origin: string;
  destination: string;
  km: number;
  driver: string;
}

export interface ImportedRoute {
  name: string | null;
  purpose: string;
  origin: string;
  destination: string;
  km: number;
}

export interface ImportedReading {
  day: string;
  km: number;
  note: string;
}

export interface ImportResult {
  company: Partial<Company>;
  vehicle: { name: string; plate: string; start_date: string | null; start_odometer: number | null };
  trips: ImportedTrip[];
  routes: ImportedRoute[];
  readings: ImportedReading[];
  warnings: string[];
  months: string[];
  /** stan licznika na koniec wg arkusza (kolumna G ostatniego wpisu), do sprawdzenia zgodności */
  sheetOdometerEnd: number | null;
}

const str = (v: CellValue) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
const num = (v: CellValue) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const afterColon = (s: string) => (s.includes(":") ? s.slice(s.indexOf(":") + 1).trim() : "");

function cellDay(v: CellValue, date1904: boolean): string | null {
  if (typeof v === "number" && v > 30000 && v < 80000) return serialToDay(v, date1904);
  if (typeof v === "string") {
    const m = v.trim().match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
    if (m) {
      const day = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
      if (isValidDay(day)) return day;
    }
    const iso = v.trim().slice(0, 10);
    if (isValidDay(iso)) return iso;
  }
  return null;
}

/** „Gród, ul. Krzywa - Miasteczko, ul. Prosta” → [skąd, dokąd]. Łącznik w nazwie (Skłodowskiej-Curie) zostaje. */
export function splitRoute(route: string): [string, string] {
  const s = route.replace(/\s+/g, " ").trim();
  const m = s.match(/\s[-–—]\s?|\s?[-–—]\s/);
  if (!m || m.index === undefined) return [normalizePlace(s), ""];
  return [normalizePlace(s.slice(0, m.index)), normalizePlace(s.slice(m.index + m[0].length))];
}

/**
 * Trasa bez myślnika, np. „Gród, ul. Krzywa, Wieś Mała, ul. Polna”: jeśli zaczyna się
 * od miejsca, w którym skończył się poprzedni przejazd, reszta to cel; w przeciwnym razie dzielimy
 * na przecinku, po którym zaczyna się „Miejscowość, ul. …”.
 */
export function splitRouteFallback(route: string, previousDestination: string | null): [string, string] | null {
  const s = normalizePlace(route);
  if (previousDestination) {
    const prev = normalizePlace(previousDestination);
    if (s.toLowerCase().startsWith(prev.toLowerCase()) && s.length > prev.length) {
      const rest = s.slice(prev.length).replace(/^[\s,;:–—-]+/, "");
      if (rest) return [prev, rest];
    }
  }
  const re = /,\s*(?=[A-ZĄĆĘŁŃÓŚŹŻ][^,]*,\s*(?:ul|al|os|pl)\.)/g;
  for (const m of s.matchAll(re)) {
    const a = s.slice(0, m.index).trim();
    const b = s.slice(m.index! + m[0].length).trim();
    if (/,/.test(a) && b) return [a, b];
  }
  return null;
}

function monthHeader(s: string): string | null {
  const m = s.match(/ewidencja za miesi[aą]c\s+([a-ząćęłńóśźż]+),?\s+(?:roku\s+)?(\d{4})/i);
  if (!m) return null;
  const idx = MONTHS_PL.indexOf(m[1].toLowerCase());
  return idx < 0 ? null : `${m[2]}-${String(idx + 1).padStart(2, "0")}`;
}

function readHeader(s: Sheet, out: ImportResult) {
  const lines: string[] = [];
  for (let r = 1; r <= 8; r++) {
    const a = str(s.value(r, "A"));
    if (a && !monthHeader(a)) {
      if (/^nip\b/i.test(a)) out.company.nip = afterColon(a) || a.replace(/^nip/i, "").trim();
      else if (/^regon\b/i.test(a)) out.company.regon = afterColon(a) || a.replace(/^regon/i, "").trim();
      else if (!/stan licznika/i.test(a)) lines.push(a);
    }
    const e = str(s.value(r, "E"));
    if (!e) continue;
    if (/^pojazd/i.test(e)) out.vehicle.name = afterColon(e);
    else if (/numer rejestracyjny/i.test(e)) out.vehicle.plate = afterColon(e);
    else if (/rozpocz/i.test(e) && !/stan licznika/i.test(e)) out.vehicle.start_date = cellDay(afterColon(e), false);
    else if (/stan licznika/i.test(e)) {
      const n = Number(afterColon(e).replace(/\s/g, "").replace(",", "."));
      if (Number.isFinite(n)) out.vehicle.start_odometer = n;
    }
  }
  if (lines[0]) out.company.name = lines[0];
  if (lines[1]) out.company.address1 = lines[1];
  if (lines[2]) out.company.address2 = lines[2];
}

function readSheet(s: Sheet, date1904: boolean, out: ImportResult) {
  let expected: string | null = null;
  const fixed = new Map<string, number>();
  const seqByDay = new Map<string, number>();
  let lastSheetEnd: number | null = null;
  const isTripRow = (r: number) => num(s.value(r, "A")) !== null && cellDay(s.value(r, "B"), date1904) !== null;

  for (let r = 1; r <= s.maxRow; r++) {
    const a = s.value(r, "A");
    const header = typeof a === "string" ? monthHeader(a) : null;
    if (header) { expected = header; continue; }
    if (!isTripRow(r)) continue;

    let day = cellDay(s.value(r, "B"), date1904)!;
    // literówka w roku (np. 2025 zamiast 2026 w bloku czerwca 2026) – poprawiamy na rok bloku
    if (expected && day.slice(0, 7) !== expected && day.slice(5, 7) === expected.slice(5, 7)) {
      const correct = `${expected.slice(0, 4)}${day.slice(4)}`;
      if (isValidDay(correct)) {
        fixed.set(expected, (fixed.get(expected) ?? 0) + 1);
        day = correct;
      }
    } else if (expected && day.slice(0, 7) !== expected) {
      out.warnings.push(`Wiersz ${r}: data ${day} nie pasuje do bloku miesiąca ${expected} – zostawiono bez zmian.`);
    }

    let route = str(s.value(r, "D"));
    const below = str(s.value(r + 1, "D"));
    if (below && !isTripRow(r + 1)) route = `${route} ${below}`;
    let [origin, destination] = splitRoute(route);
    if (origin && !destination) {
      const fb = splitRouteFallback(route, out.trips.at(-1)?.destination ?? null);
      if (fb) {
        [origin, destination] = fb;
        out.warnings.push(`Wiersz ${r} (${day}): trasa bez myślnika „${route}” – odczytano jako „${origin} – ${destination}”.`);
      }
    }
    const purpose = str(s.value(r, "C"));
    const km = num(s.value(r, "F"));
    const driver = str(s.value(r, "H"));

    if (!origin || !destination || !purpose || km === null || km <= 0) {
      out.warnings.push(`Wiersz ${r} (${day}): niepełny wpis (cel, trasa lub km) – pominięto.`);
      lastSheetEnd = num(s.value(r + 1, "G")) ?? lastSheetEnd;
      continue;
    }
    // licznik w arkuszu (kolumna G): start wpisu powinien równać się końcowi poprzedniego
    const gStart = num(s.value(r, "G"));
    if (gStart !== null && lastSheetEnd !== null && Math.abs(gStart - lastSheetEnd) > 0.05) {
      const d = round1(gStart - lastSheetEnd);
      out.warnings.push(`Wiersz ${r} (${day}): w arkuszu licznik startuje od ${gStart}, a poprzedni wpis skończył się na ${lastSheetEnd} (${d > 0 ? "+" : "−"}${Math.abs(d)} km). Aplikacja liczy bez tej przerwy.`);
    }
    const seq = (seqByDay.get(day) ?? 0) + 1;
    seqByDay.set(day, seq);
    out.trips.push({ day, seq, purpose, origin, destination, km: round1(km), driver });
    const g = num(s.value(r + 1, "G"));
    if (g !== null) out.sheetOdometerEnd = g;
    lastSheetEnd = g;

    // odczyty licznika wpisane w K/L obok wpisu (w wierszu wpisu albo pod nim)
    for (const rr of [r, r + 1]) {
      for (const col of ["K", "L"]) {
        const v = num(s.value(rr, col));
        if (v !== null && v > 0) out.readings.push({ day, km: v, note: "z arkusza Excel" });
      }
    }
  }

  for (const [month, n] of fixed) {
    out.warnings.push(`${month}: ${n} ${n === 1 ? "wpis miał" : "wpisy miały"} zły rok w dacie – poprawiono na ${month.slice(0, 4)}.`);
  }

  for (let r = 1; r <= s.maxRow; r++) {
    const id = num(s.value(r, "S"));
    const name = str(s.value(r, "T"));
    const purpose = str(s.value(r, "U"));
    const [origin, destination] = splitRoute(str(s.value(r, "V")));
    const km = num(s.value(r, "W"));
    if (id === null || !purpose || !origin || !destination || km === null || km <= 0) continue;
    out.routes.push({ name: name || null, purpose, origin, destination, km });
  }
}

export function parseWorkbook(data: Uint8Array): ImportResult {
  const wb = readWorkbook(data);
  const out: ImportResult = {
    company: {},
    vehicle: { name: "", plate: "", start_date: null, start_odometer: null },
    trips: [], routes: [], readings: [], warnings: [], months: [], sheetOdometerEnd: null,
  };
  let found = false;
  for (const sheet of wb.sheets.values()) {
    let isLedger = false;
    for (let r = 1; r <= Math.min(sheet.maxRow, 40) && !isLedger; r++) {
      isLedger = /opis trasy|ewidencja za miesi/i.test(str(sheet.value(r, "A")) + str(sheet.value(r, "D")));
    }
    if (!isLedger) continue;
    if (!found) readHeader(sheet, out);
    found = true;
    readSheet(sheet, wb.date1904, out);
  }
  if (!found) throw new Error("Nie znaleziono arkusza z ewidencją (brak nagłówka „Ewidencja za miesiąc …”).");
  out.trips.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.seq - b.seq));
  // po sortowaniu numeracja w dniu od nowa (dzień mógł być rozbity na kilka miejsc arkusza)
  const seq = new Map<string, number>();
  for (const t of out.trips) { t.seq = (seq.get(t.day) ?? 0) + 1; seq.set(t.day, t.seq); }
  out.months = [...new Set(out.trips.map((t) => t.day.slice(0, 7)))];
  // ten sam odczyt wpisany dwa razy – zostaw jeden
  const seen = new Set<string>();
  out.readings = out.readings.filter((r) => { const k = `${r.day}|${r.km}`; if (seen.has(k)) return false; seen.add(k); return true; });
  if (!out.vehicle.start_date && out.trips[0]) out.vehicle.start_date = out.trips[0].day;
  return out;
}
