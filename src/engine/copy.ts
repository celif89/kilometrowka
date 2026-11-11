// Kopiowanie przejazdów jednego dnia na inne dni (dopisywane na koniec każdego z nich).
import type { NewTrip, Trip } from "./types";

export function copyDayTrips(source: Trip[], targets: string[], existing: Trip[]): NewTrip[] {
  const ordered = [...source].sort((a, b) => a.seq - b.seq || a.id - b.id);
  return [...new Set(targets)].sort().flatMap((day) => {
    let seq = existing.filter((t) => t.day === day && t.vehicle_id === ordered[0]?.vehicle_id)
      .reduce((m, t) => Math.max(m, t.seq), 0);
    return ordered.map((t) => ({
      vehicle_id: t.vehicle_id, day, seq: ++seq, purpose: t.purpose, origin: t.origin, destination: t.destination,
      km: t.km, driver: t.driver, route_id: t.route_id, note: null,
    }));
  });
}
