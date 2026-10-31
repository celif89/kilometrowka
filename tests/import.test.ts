import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildLedger } from "../src/engine/ledger";
import { parseWorkbook, splitRoute, splitRouteFallback } from "../src/lib/excelImport";

const fixture = new URL("./fixtures/ewidencja_syntetyczna.xlsx", import.meta.url);

describe("splitRoute", () => {
  it("dzieli na skąd/dokąd, zostawia łącznik w nazwie ulicy", () => {
    expect(splitRoute("Mikołów, ul. M Skłodowskiej-Curie - Gród, ul. Krzywa ")).toEqual(
      ["Mikołów, ul. M Skłodowskiej-Curie", "Gród, ul. Krzywa"]);
    expect(splitRoute("Miasteczko, ul. Prosta -Rogów")).toEqual(["Miasteczko, ul. Prosta", "Rogów"]);
  });

  it("trasa z przecinkiem zamiast myślnika", () => {
    const route = "Wieś Duża, ul. Leśna, Wieś Mała, ul. Polna";
    expect(splitRouteFallback(route, "Wieś Duża, ul. Leśna")).toEqual(["Wieś Duża, ul. Leśna", "Wieś Mała, ul. Polna"]);
    expect(splitRouteFallback(route, null)).toEqual(["Wieś Duża, ul. Leśna", "Wieś Mała, ul. Polna"]);
    expect(splitRouteFallback("Rybnik", null)).toBeNull();
  });
});

describe("import arkusza (dane syntetyczne)", () => {
  const r = parseWorkbook(new Uint8Array(readFileSync(fixture)));

  it("czyta dane firmy i pojazdu", () => {
    expect(r.company).toMatchObject({
      name: "Firma Testowa Jan Kowalski", address1: "00-001 Miasteczko", address2: "ul. Prosta 1",
      nip: "123 456 78 90", regon: "123456789",
    });
    expect(r.vehicle).toEqual({ name: "Auto X", plate: "AB 12345", start_date: "2025-11-30", start_odometer: 100 });
  });

  it("czyta wpisy, łączy trasę rozbitą na dwa wiersze i poprawia zły rok", () => {
    expect(r.trips.map((t) => [t.day, t.seq, t.origin, t.destination, t.km])).toEqual([
      ["2025-12-01", 1, "Miasteczko, ul. Prosta", "Gród, ul. Krzywa", 12],
      ["2025-12-01", 2, "Gród, ul. Krzywa", "Gród, ul. M. Skłodowskiej-Curie", 7.5],
      ["2025-12-01", 3, "Gród, ul. M. Skłodowskiej-Curie", "Miasteczko, ul. Prosta", 15],
      ["2026-01-02", 1, "Miasteczko, ul. Prosta", "Gród, ul. Krzywa", 12],
      ["2026-01-02", 2, "Gród, ul. Krzywa", "Miasteczko, ul. Prosta", 12],
    ]);
    expect(r.warnings.some((w) => w.includes("zły rok"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("niepełny"))).toBe(true);
  });

  it("czyta stałe trasy i odczyty licznika", () => {
    expect(r.routes).toEqual([
      { name: "Dom-Praca", purpose: "Wyjazd do biura", origin: "Miasteczko, ul. Prosta", destination: "Gród, ul. Krzywa", km: 12 },
      { name: "Praca-Dom", purpose: "Powrót do domu", origin: "Gród, ul. Krzywa", destination: "Miasteczko, ul. Prosta", km: 12 },
    ]);
    expect(r.readings).toEqual([{ day: "2025-12-01", km: 140, note: "z arkusza Excel" }]);
  });
});

// Prawdziwy arkusz nie jest w repozytorium: REAL_XLSX=/ścieżka/Ewidencja_pojazdu.xlsx npm test
const real = process.env.REAL_XLSX;
describe.runIf(real && existsSync(real))("import prawdziwego arkusza", () => {
  it("zgadza się z arkuszem: liczba wpisów i stan licznika na koniec", () => {
    const r = parseWorkbook(new Uint8Array(readFileSync(real!)));
    const v = { id: 1, name: r.vehicle.name, plate: r.vehicle.plate, start_date: r.vehicle.start_date!,
      start_odometer: r.vehicle.start_odometer ?? 0, end_date: null, default_driver: null, active: true };
    const l = buildLedger(v, r.trips.map((t, i) => ({ ...t, id: i + 1, vehicle_id: 1, route_id: null, note: null })));
    console.log({ trips: r.trips.length, routes: r.routes.length, readings: r.readings.length, months: r.months,
      end: l.at(-1)?.odoEnd, sheetEnd: r.sheetOdometerEnd, warnings: r.warnings, vehicle: r.vehicle, company: r.company });
    expect(r.trips).toHaveLength(1118);
    expect(r.warnings.filter((w) => w.includes("pominięto"))).toEqual([]);
    expect(r.warnings.filter((w) => w.includes("licznik startuje"))).toEqual([
      "Wiersz 686 (2026-03-02): w arkuszu licznik startuje od 5949, a poprzedni wpis skończył się na 5960 (−11 km). Aplikacja liczy bez tej przerwy.",
    ]);
    // w arkuszu pierwszy wpis marca 2026 ma formułę =G675 zamiast =G676 (−11 km),
    // więc od marca Excel pokazuje licznik o 11 km niższy niż suma kilometrów
    expect(l.at(-1)?.odoEnd).toBe(r.sheetOdometerEnd! + 11);
  });
});
