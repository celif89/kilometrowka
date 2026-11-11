import { describe, expect, it } from "vitest";
import { copyDayTrips } from "../src/engine/copy";
import type { Trip } from "../src/engine/types";

const t = (id: number, day: string, seq: number, origin: string, destination: string): Trip => ({
  id, vehicle_id: 1, day, seq, purpose: "Cel", origin, destination, km: 11, driver: "Jan", route_id: 3, note: "uwaga",
});

describe("kopiowanie dnia", () => {
  const source = [t(2, "2026-11-02", 2, "Biuro", "Dom"), t(1, "2026-11-02", 1, "Dom", "Biuro")];

  it("kopiuje przejazdy w kolejności na kilka dni, dopisując na koniec istniejących", () => {
    const existing = [...source, t(5, "2026-11-04", 1, "Dom", "Sklep")];
    const out = copyDayTrips(source, ["2026-11-04", "2026-11-03", "2026-11-03"], existing);
    expect(out.map((x) => [x.day, x.seq, x.origin, x.destination])).toEqual([
      ["2026-11-03", 1, "Dom", "Biuro"],
      ["2026-11-03", 2, "Biuro", "Dom"],
      ["2026-11-04", 2, "Dom", "Biuro"],
      ["2026-11-04", 3, "Biuro", "Dom"],
    ]);
    expect(out[0]).toMatchObject({ km: 11, driver: "Jan", route_id: 3, note: null, vehicle_id: 1 });
  });

  it("bez dni docelowych nic nie kopiuje", () => {
    expect(copyDayTrips(source, [], source)).toEqual([]);
  });
});
