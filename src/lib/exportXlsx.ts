// Eksport ewidencji do Excela – układ jak w dotychczasowym arkuszu, jeden wiersz na przejazd.
import { dayLabel, monthGenitive, monthOnly, MONTHS_GENITIVE } from "./format";
import type { MonthSummary } from "../engine/ledger";
import type { Company, Vehicle } from "../engine/types";
import { S, type XCell, type XSheet, writeWorkbook } from "./xlsxWrite";

const COLS = ["Nr kolejny wpisu", "Data wyjazdu", "Cel wyjazdu", "Opis trasy wyjazdu (skąd – dokąd)",
  "Liczba faktycznie przejechanych km", "Stan licznika – wyjazd", "Stan licznika – przyjazd",
  "Imię i nazwisko osoby kierującej pojazdem"];

const kmText = (v: number) => new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 1 }).format(v);

export function buildSheet(company: Company, vehicle: Vehicle, months: MonthSummary[]): XSheet {
  const rows: XCell[][] = [];
  const merges: string[] = [];
  const pageBreaks: number[] = [];
  const rowHeights: Record<number, number> = {};
  const push = (r: XCell[]) => { rows.push(r); return rows.length; };

  months.forEach((m, i) => {
    const firmLines = [company.name, company.address1, company.address2,
      company.nip && `NIP: ${company.nip}`, company.regon && `REGON: ${company.regon}`].filter(Boolean) as string[];
    const vehLines = [
      `Pojazd: ${vehicle.name}`,
      `Numer rejestracyjny: ${vehicle.plate}`,
      `Dzień rozpoczęcia prowadzenia ewidencji: ${dayLabel(vehicle.start_date)}`,
      `Stan licznika na dzień rozpoczęcia prowadzenia ewidencji: ${kmText(vehicle.start_odometer)} km`,
      ...(vehicle.end_date ? [`Dzień zakończenia prowadzenia ewidencji: ${dayLabel(vehicle.end_date)}`] : []),
    ];
    for (let k = 0; k < Math.max(firmLines.length, vehLines.length); k++) {
      push([{ v: firmLines[k] ?? null, s: k === 0 ? S.bold : S.normal }, null, null,
        { v: vehLines[k] ?? null, s: S.normal }]);
    }
    push([]);
    const [y, mm] = m.month.split("-");
    push([{ v: `Ewidencja przebiegu pojazdu za miesiąc ${monthOnly(m.month)} ${y}`, s: S.title }]);
    push([{ v: `Stan licznika na początek miesiąca ${MONTHS_GENITIVE[Number(mm) - 1]} ${y}: ${kmText(m.odoStart)} km`, s: S.normal }]);
    push([]);
    const h = push(COLS.map((c) => ({ v: c, s: S.th })));
    rowHeights[h] = 40;
    if (m.trips.length === 0) {
      const r = push([{ v: "W tym miesiącu pojazd nie był używany.", s: S.td }, ...Array(7).fill({ v: "", s: S.td })]);
      merges.push(`A${r}:H${r}`);
    }
    for (const t of m.trips) {
      push([
        { v: t.no, s: S.tdCenter },
        { v: t.day, s: S.tdDate, date: true },
        { v: t.purpose, s: S.td },
        { v: `${t.origin} – ${t.destination}`, s: S.td },
        { v: t.km, s: S.tdNum },
        { v: t.odoStart, s: S.tdNum },
        { v: t.odoEnd, s: S.tdNum },
        { v: t.driver, s: S.td },
      ]);
    }
    push([null, null, null, { v: "Razem w miesiącu:", s: S.boldRight }, { v: m.km, s: S.boldRight }]);
    push([]);
    push([{ v: `Stan licznika na koniec miesiąca ${monthGenitive(m.month)}: ${kmText(m.odoEnd)} km`, s: S.bold }]);
    push([{ v: `Liczba przejechanych kilometrów w miesiącu: ${kmText(m.km)} km`, s: S.normal }]);
    push([]);
    push([null, null, null, null, null, { v: "Podpis podatnika", s: S.normal }]);
    push([]);
    push([null, null, null, null, null, { v: "………………………………………", s: S.normal }]);
    const last = push([null, null, null, null, null, { v: company.signatory || company.name || "", s: S.small }]);
    if (i < months.length - 1) {
      push([]);
      pageBreaks.push(last + 1);
    }
  });

  return {
    name: `${vehicle.plate || vehicle.name}`.slice(0, 31),
    rows,
    merges,
    rowHeights,
    pageBreaks,
    colWidths: [8, 11, 24, 46, 12, 11, 11, 20],
  };
}

export function exportLedgerXlsx(company: Company, vehicle: Vehicle, months: MonthSummary[]): Blob {
  const bytes = writeWorkbook([buildSheet(company, vehicle, months)]);
  return new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
