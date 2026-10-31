// Przebieg wpisywany w FV Meter (zakładka „Samochód”, tabela mileage w tym samym projekcie Supabase).
import type { OdometerReading, Vehicle } from "./types";

export interface FvMileage {
  day: string;
  km: number;
}

/**
 * Do którego pojazdu przypisać przebieg z FV Meter. Ustawienie `fvmeter_vehicle`:
 * brak → pierwszy aktywny pojazd, "none" → żaden, liczba → ten pojazd.
 */
export function fvMeterVehicleId(settings: Record<string, string>, vehicles: Vehicle[]): number | null {
  const v = settings.fvmeter_vehicle;
  if (v === "none") return null;
  if (v && vehicles.some((x) => x.id === Number(v))) return Number(v);
  return vehicles.find((x) => x.active)?.id ?? null;
}

export function fvMeterReadings(mileage: FvMileage[], vehicleId: number | null): OdometerReading[] {
  if (vehicleId === null) return [];
  return mileage
    .filter((m) => m.km > 0)
    .map((m, i) => ({ id: -(i + 1), vehicle_id: vehicleId, day: m.day, km: m.km, note: "FV Meter", source: "fvmeter" as const }));
}
