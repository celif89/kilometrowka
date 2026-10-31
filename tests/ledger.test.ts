import { describe, expect, it } from "vitest";
import { buildLedger, continuityGaps, monthSummaries, odometerChecks, validateTrip } from "../src/engine/ledger";
import { kmForPair, routeProposals, suggestRoutes } from "../src/engine/suggest";
import type { Route, Trip, Vehicle } from "../src/engine/types";

const vehicle: Vehicle = {
  id: 1, name: "Auto", plate: "AB 1", start_date: "2025-12-03", start_odometer: 2, end_date: null,
  default_driver: "Jan", active: true,
};
let id = 0;
const trip = (day: string, origin: string, destination: string, km: number, seq = 0): Trip => ({
  id: ++id, vehicle_id: 1, day, seq, purpose: "Cel", origin, destination, km, driver: "Jan", route_id: null, note: null,
});

describe("ewidencja", () => {
  const trips = [
    trip("2026-01-02", "Dom", "Biuro", 11, 1),
    trip("2025-12-04", "Biuro", "Dom", 11, 2),
    trip("2025-12-04", "Dom", "Biuro", 11, 1),
    trip("2025-12-03", "Katowice", "Dom", 63, 1),
  ];

  it("numeruje wpisy od 1 w każdym miesiącu i liczy licznik narastająco", () => {
    const l = buildLedger(vehicle, trips);
    expect(l.map((t) => [t.day, t.no, t.odoStart, t.odoEnd])).toEqual([
      ["2025-12-03", 1, 2, 65],
      ["2025-12-04", 2, 65, 76],
      ["2025-12-04", 3, 76, 87],
      ["2026-01-02", 1, 87, 98],
    ]);
  });

  it("tworzy podsumowania także pustych miesięcy", () => {
    const l = buildLedger(vehicle, trips);
    const m = monthSummaries(vehicle, l, [{ vehicle_id: 1, month: "2025-12", closed_at: "x" }], "2026-03-10");
    expect(m.map((x) => [x.month, x.km, x.odoStart, x.odoEnd, !!x.closed])).toEqual([
      ["2025-12", 85, 2, 87, true],
      ["2026-01", 11, 87, 98, false],
      ["2026-02", 0, 98, 98, false],
      ["2026-03", 0, 98, 98, false],
    ]);
  });

  it("porównuje faktyczny licznik z ewidencją", () => {
    const l = buildLedger(vehicle, trips);
    const c = odometerChecks(vehicle, l, [{ id: 1, vehicle_id: 1, day: "2025-12-04", km: 90, note: null }]);
    expect(c[0].computed).toBe(87);
    expect(c[0].diff).toBe(3);
  });

  it("wykrywa przerwę w trasie", () => {
    const l = buildLedger(vehicle, trips);
    // 03.12 kończy się w „Dom”, 04.12 zaczyna z „Dom” – ok; brak przerw
    expect(continuityGaps(l).size).toBe(0);
    const l2 = buildLedger(vehicle, [...trips, trip("2026-01-03", "Rybnik", "Dom", 5, 1)]);
    expect([...continuityGaps(l2).values()]).toEqual(["Biuro"]);
  });

  it("sumuje ułamki bez błędów zaokrągleń", () => {
    const l = buildLedger(vehicle, [trip("2026-02-01", "A", "B", 0.1, 1), trip("2026-02-01", "B", "A", 0.2, 2)]);
    expect(l.at(-1)!.odoEnd).toBe(2.3);
  });

  it("sprawdza wymagane pola", () => {
    expect(validateTrip({ day: "2026-01-01", purpose: "", origin: "A", destination: "", km: 0, driver: "J" })).toHaveLength(3);
  });
});

describe("podpowiedzi", () => {
  const routes: Route[] = [
    { id: 1, name: null, purpose: "Do biura", origin: "Dom", destination: "Biuro", km: 11, color: null, position: 0, archived: false },
    { id: 2, name: null, purpose: "Do domu", origin: "Biuro", destination: "Dom", km: 11, color: null, position: 1, archived: false },
  ];
  const trips = [trip("2026-01-02", "Biuro", "Budowa", 8), trip("2026-01-03", "Biuro", "budowa ", 8), trip("2026-01-04", "Biuro", "Budowa", 9)];

  it("najpierw trasy z miejsca, w którym stoi auto", () => {
    expect(suggestRoutes(routes, trips, "biuro")[0].route.id).toBe(2);
    expect(suggestRoutes(routes, trips, "Dom")[0].route.id).toBe(1);
  });

  it("km dla znanej pary miejsc: stała trasa albo najczęstsza wartość", () => {
    expect(kmForPair(trips, routes, "Dom", "Biuro")).toBe(11);
    expect(kmForPair(trips, routes, "Biuro", "Budowa")).toBe(8);
    expect(kmForPair(trips, routes, "X", "Y")).toBeNull();
  });

  it("proponuje powtarzane przejazdy jako stałe trasy", () => {
    const p = routeProposals(trips, routes);
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ origin: "Biuro", destination: "Budowa", km: 8, count: 3 });
  });
});
