import { describe, expect, it } from "vitest";
import { fvMeterReadings, fvMeterVehicleId } from "../src/engine/fvmeter";
import { buildLedger, monthSummaries, odometerChecks } from "../src/engine/ledger";
import { checkNearMonthEnd, monthToClose } from "../src/engine/reminders";
import type { Trip, Vehicle } from "../src/engine/types";

const vehicle: Vehicle = { id: 7, name: "Auto", plate: "AB 1", start_date: "2026-09-10", start_odometer: 100, end_date: null, default_driver: null, active: true };
const trip = (id: number, day: string, km: number): Trip => ({ id, vehicle_id: 7, day, seq: 1, purpose: "C", origin: "A", destination: "B", km, driver: "J", route_id: null, note: null });
const ledger = buildLedger(vehicle, [trip(1, "2026-09-15", 50), trip(2, "2026-10-20", 30)]);

describe("przypomnienie o zamknięciu miesiąca", () => {
  it("dopiero od początku miesiąca, za poprzedni miesiąc", () => {
    const months = monthSummaries(vehicle, ledger, [], "2026-11-01");
    expect(monthToClose(months, "2026-10-31")?.month).toBe("2026-09"); // w październiku – za wrzesień
    expect(monthToClose(months, "2026-11-01")?.month).toBe("2026-10");
    expect(monthToClose(months, "2026-11-25")?.month).toBe("2026-10");
  });

  it("znika po zatwierdzeniu i nie przypomina o starszych miesiącach", () => {
    const months = monthSummaries(vehicle, ledger, [{ vehicle_id: 7, month: "2026-10", closed_at: "x" }], "2026-11-01");
    expect(monthToClose(months, "2026-11-03")).toBeNull();
    expect(monthToClose(months, "2026-12-02")?.month).toBe("2026-11");
  });

  it("dobiera odczyt licznika najbliższy końcowi miesiąca", () => {
    const checks = odometerChecks(vehicle, ledger, [
      { id: 1, vehicle_id: 7, day: "2026-10-02", km: 160, note: null },
      { id: 2, vehicle_id: 7, day: "2026-11-02", km: 182, note: null },
    ]);
    expect(checkNearMonthEnd(checks, "2026-10")?.reading.id).toBe(2);
    expect(checkNearMonthEnd(checks, "2026-10")?.diff).toBe(2);
    expect(checkNearMonthEnd(checks, "2026-08")).toBeNull();
  });
});

describe("przebieg z FV Meter", () => {
  const vehicles = [vehicle, { ...vehicle, id: 8, active: true }];

  it("domyślnie pierwszy aktywny pojazd, można wybrać inny albo wyłączyć", () => {
    expect(fvMeterVehicleId({}, vehicles)).toBe(7);
    expect(fvMeterVehicleId({ fvmeter_vehicle: "8" }, vehicles)).toBe(8);
    expect(fvMeterVehicleId({ fvmeter_vehicle: "none" }, vehicles)).toBeNull();
    expect(fvMeterVehicleId({ fvmeter_vehicle: "99" }, vehicles)).toBe(7);
  });

  it("odczyty trafiają do kontroli licznika, bez zera z dnia zakupu i sprzed ewidencji", () => {
    const r = fvMeterReadings([{ day: "2026-09-01", km: 0 }, { day: "2026-09-05", km: 90 }, { day: "2026-10-31", km: 185 }], 7);
    expect(r).toHaveLength(2);
    const checks = odometerChecks(vehicle, ledger, r);
    expect(checks.map((c) => [c.reading.day, c.diff, c.reading.source])).toEqual([["2026-10-31", 5, "fvmeter"]]);
    expect(fvMeterReadings([{ day: "2026-10-31", km: 185 }], null)).toEqual([]);
  });
});
