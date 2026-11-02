import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { buildLedger, monthSummaries } from "../src/engine/ledger";
import type { Trip, Vehicle } from "../src/engine/types";
import { buildSheet, wrapLines } from "../src/lib/exportXlsx";
import { printFont } from "../src/lib/fonts";
import { readWorkbook } from "../src/lib/xlsx";
import { writeWorkbook } from "../src/lib/xlsxWrite";

const vehicle: Vehicle = { id: 1, name: "Auto X", plate: "AB 1", start_date: "2025-12-01", start_odometer: 8600,
  end_date: null, default_driver: null, active: true };
const company = { name: "Firma", address1: "ul. A", address2: "00-001 B", nip: "1", regon: "2", signatory: "Jan Kowalski" };

let id = 0;
const trip = (day: string, purpose: string, km: number): Trip => ({
  id: ++id, vehicle_id: 1, day, seq: id, purpose, origin: "Dom", destination: "Biuro", km, driver: "Jan", route_id: null, note: null,
});

function cells(bytes: Uint8Array) {
  const sheet = [...readWorkbook(bytes).sheets.values()][0];
  const all: string[] = [];
  for (let r = 1; r <= sheet.maxRow; r++) for (const c of "ABCDEFG") { const v = sheet.value(r, c); if (v !== null) all.push(String(v)); }
  return { sheet, all };
}

describe("eksport do Excela w układzie wydruku", () => {
  it("zapisany plik da się odczytać: dwa wiersze na przejazd, licznik wyjazd/przyjazd, stopka", () => {
    const ledger = buildLedger(vehicle, [trip("2025-12-02", "Wyjazd <do> biura & dalej", 11)]);
    const months = monthSummaries(vehicle, ledger, [], "2026-01-15");
    const bytes = writeWorkbook({ sheets: [buildSheet(company, vehicle, months, { font: printFont("arial-narrow") })] });
    const { sheet, all } = cells(bytes);
    expect(all).toContain("Wyjazd <do> biura & dalej");
    expect(all).toContain("Dom - Biuro");
    expect(all).toContain("Ewidencja za miesiąc grudzień, roku 2025");
    expect(all).toContain("Stan licznika 8 600 na początek miesiąca grudnia, roku 2025");
    expect(all).toContain("Stan licznika 8 611 na koniec miesiąca grudnia, roku 2025");
    expect(all).toContain("JAN KOWALSKI");
    expect(all.some((s) => s.includes("nie był używany"))).toBe(true); // styczeń bez jazd
    // licznik: wyjazd w wierszu przejazdu, przyjazd wiersz niżej
    let r = 1;
    while (sheet.value(r, "C") !== "Wyjazd <do> biura & dalej") r++;
    expect([sheet.value(r, "F"), sheet.value(r + 1, "F")]).toEqual([8600, 8611]);

    const files = unzipSync(bytes);
    const xml = strFromU8(files["xl/worksheets/sheet1.xml"]);
    expect(xml).toContain(`<mergeCell ref="A${r}:A${r + 1}"/>`);
    expect(xml).toContain("Strona &amp;P z &amp;N");
    expect(xml).toContain("EWIDENCJA PRZEBIEGU POJAZDU");
    expect(strFromU8(files["xl/styles.xml"])).toContain('<name val="Arial Narrow"/>');
  });

  it("podział strony wypada tylko między dniami", () => {
    const trips: Trip[] = [];
    for (let d = 1; d <= 28; d++) {
      const day = `2026-02-${String(d).padStart(2, "0")}`;
      for (let k = 0; k < 5; k++) trips.push(trip(day, k === 2 ? "Wyjazd na inwentaryzację do bardzo odległego klienta" : "Wyjazd do biura", 11));
    }
    const months = monthSummaries(vehicle, buildLedger(vehicle, trips), [], "2026-02-28").filter((m) => m.month === "2026-02");
    const sh = buildSheet(company, vehicle, months);
    expect(sh.pageBreaks!.length).toBeGreaterThan(2);
    const dateAt = (row: number) => {
      // data jest w pierwszym wierszu przejazdu (kolumna B); dla drugiego wiersza patrzymy wiersz wyżej
      for (let r = row; r > 0; r--) {
        const c = sh.rows[r - 1]?.[1];
        if (c && typeof c === "object" && "date" in c && c.date) return c.v;
      }
      return null;
    };
    for (const b of sh.pageBreaks!) {
      const before = dateAt(b);
      const after = sh.rows[b]?.[1];
      expect(after && typeof after === "object" && "date" in after && after.date).toBe(true); // nowa strona zaczyna się od przejazdu
      expect((after as { v: unknown }).v).not.toBe(before);
    }
  });

  it("szacuje łamanie tekstu w kolumnie", () => {
    expect(wrapLines("Wyjazd do biura", 12, 1.25)).toBe(2);
    expect(wrapLines("Rybnik, ul. Młyńska - Świerklany, ul. Plebiscytowa", 30, 1.25)).toBe(2);
    expect(wrapLines("Krótko", 30, 1.25)).toBe(1);
  });
});
