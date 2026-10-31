import { describe, expect, it } from "vitest";
import { buildLedger, monthSummaries } from "../src/engine/ledger";
import { buildSheet } from "../src/lib/exportXlsx";
import { readWorkbook } from "../src/lib/xlsx";
import { writeWorkbook } from "../src/lib/xlsxWrite";

describe("eksport do Excela", () => {
  it("zapisany plik da się odczytać z powrotem", () => {
    const vehicle = { id: 1, name: "Auto X", plate: "AB 1", start_date: "2025-12-01", start_odometer: 100,
      end_date: null, default_driver: null, active: true };
    const ledger = buildLedger(vehicle, [
      { id: 1, vehicle_id: 1, day: "2025-12-02", seq: 1, purpose: "Wyjazd <do> biura & dalej", origin: "Dom", destination: "Biuro",
        km: 11, driver: "Jan", route_id: null, note: null },
    ]);
    const months = monthSummaries(vehicle, ledger, [], "2026-01-15");
    const company = { name: "Firma", address1: "ul. A", address2: "00-001 B", nip: "1", regon: "2", signatory: "JAN" };
    const wb = readWorkbook(writeWorkbook([buildSheet(company, vehicle, months)]));
    const sheet = [...wb.sheets.values()][0];
    const all: string[] = [];
    for (let r = 1; r <= sheet.maxRow; r++) for (const c of "ABCDEFGH") { const v = sheet.value(r, c); if (v !== null) all.push(String(v)); }
    expect(all).toContain("Wyjazd <do> biura & dalej");
    expect(all).toContain("Dom – Biuro");
    expect(all.some((s) => s.includes("Stan licznika na koniec miesiąca grudnia 2025: 111 km"))).toBe(true);
    expect(all.some((s) => s.includes("nie był używany"))).toBe(true);
  });
});
