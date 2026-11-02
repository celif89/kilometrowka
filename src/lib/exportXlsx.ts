// Eksport ewidencji do Excela w układzie wydruku (jak dotychczasowy arkusz):
// przejazd w dwóch wierszach (scalone komórki, licznik wyjazd / przyjazd), linie tylko między dniami,
// tytuł w nagłówku strony, „Strona X z Y” w stopce, podział stron tylko między dniami.
import type { LedgerTrip, MonthSummary } from "../engine/ledger";
import type { Company, Vehicle } from "../engine/types";
import { DEFAULT_FONT, type PrintFont } from "./fonts";
import { dayLabel, monthGenitive, monthOnly, odo } from "./format";
import type { XBorder, XCell, XRun, XSheet, XStyle } from "./xlsxWrite";
import { writeWorkbook } from "./xlsxWrite";

export interface ExportOptions {
  font?: PrintFont;
  /** dane firmy i pojazdu nad tabelą każdego miesiąca */
  withHeader?: boolean;
}

const COLS = ["Nr kolejny wpisu", "Data wyjazdu", "Cel wyjazdu", "Opis trasy wyjazdu (skąd - dokąd)",
  "Liczba faktycznie przejechanych kilometrów", "Stan licznika (wyjazd/przyjazd)", "Imię i nazwisko osoby kierującej pojazdem"];
const WIDTHS = [7, 10.5, 12, 30, 12, 13.5, 14.5];
const SIZE = 10;
/** „17 198” niezależnie od ustawień regionalnych Excela (spacja jako stały znak, a nie separator systemowy) */
const ODO_FMT = '[>=1000000]#\\ ###\\ ##0;[>=1000]#\\ ##0;0';
const LINE_PT = 12.75;
/** wysokość strony A4 bez marginesów (pkt), z zapasem */
const PAGE_PT = 700;

const kmText = odo;

/** Ile linii zajmie tekst w kolumnie o danej szerokości (zawijanie po słowach). */
export function wrapLines(text: string, widthUnits: number, charsPerUnit: number): number {
  const max = Math.max(4, Math.floor(widthUnits * charsPerUnit) - 1);
  let lines = 1;
  let len = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (len === 0) len = word.length;
    else if (len + 1 + word.length <= max) len += 1 + word.length;
    else { lines += 1 + Math.floor((word.length - 1) / max); len = word.length % max || max; }
  }
  return lines;
}

export function buildSheet(company: Company, vehicle: Vehicle, months: MonthSummary[], opts: ExportOptions = {}): XSheet {
  const font = opts.font ?? DEFAULT_FONT;
  const f = { name: font.excel, size: SIZE };
  const rows: XCell[][] = [];
  const merges: string[] = [];
  const pageBreaks: number[] = [];
  const rowHeights: Record<number, number> = {};
  let used = 0;
  const push = (r: XCell[], height = 15) => {
    rows.push(r);
    rowHeights[rows.length] = height;
    used += height;
    return rows.length;
  };
  const breakBefore = () => {
    if (rows.length > 0) pageBreaks.push(rows.length);
    used = 0;
  };
  const st = (s: XStyle = {}): XStyle => ({ ...s, font: { ...f, ...s.font } });
  const text = (v: string | XRun[], s: XStyle = {}): XCell => ({ v, s: st(s) });

  months.forEach((m, mi) => {
    if (mi > 0) breakBefore();
    const [year] = m.month.split("-");
    const genitive = monthGenitive(m.month).split(" ")[0];

    if (opts.withHeader) {
      const firm = [company.name, company.address1, company.address2,
        company.nip && `NIP: ${company.nip}`, company.regon && `REGON: ${company.regon}`].filter(Boolean) as string[];
      const veh = [`Pojazd: ${vehicle.name}`, `Numer rejestracyjny: ${vehicle.plate}`,
        `Dzień rozpoczęcia prowadzenia ewidencji: ${dayLabel(vehicle.start_date)}`,
        `Stan licznika na dzień rozpoczęcia ewidencji: ${kmText(vehicle.start_odometer)}`,
        ...(vehicle.end_date ? [`Dzień zakończenia prowadzenia ewidencji: ${dayLabel(vehicle.end_date)}`] : [])];
      for (let k = 0; k < Math.max(firm.length, veh.length); k++) {
        const r = push([firm[k] ? text(firm[k], { font: { size: 9, bold: k === 0 } }) : null, null, null, null,
          veh[k] ? text(veh[k], { font: { size: 9 }, h: "right" }) : null, null, null], 12.5);
        merges.push(`E${r}:G${r}`);
      }
      push([], 8);
    }

    push([text([{ text: "Ewidencja za miesiąc ", bold: true }, { text: monthOnly(m.month), bold: true, underline: true },
      { text: ", roku ", bold: true }, { text: year, bold: true, underline: true }], { font: { size: 11 } })]);
    push([text([{ text: "Stan licznika " }, { text: kmText(m.odoStart), underline: true }, { text: " na początek miesiąca " },
      { text: genitive, underline: true }, { text: ", roku " }, { text: year, underline: true }], { font: { size: 11 } })]);
    push([], 8);

    const headLines = Math.max(...COLS.map((c, i) => wrapLines(c, WIDTHS[i], font.charsPerUnit)));
    push(COLS.map((c) => text(c, { border: { left: true, right: true, top: true, bottom: true }, h: "center", v: "center", wrap: true })),
      headLines * LINE_PT + 4);

    if (m.trips.length === 0) {
      const r = push([text("W tym miesiącu pojazd nie był używany.", { border: { left: true, top: true, bottom: true }, h: "center", v: "center" }),
        ...Array.from({ length: 6 }, (_, i) => text("", { border: { top: true, bottom: true, right: i === 5 }, h: "center" }))], 24);
      merges.push(`A${r}:G${r}`);
    }

    const days: LedgerTrip[][] = [];
    for (const t of m.trips) {
      if (days.at(-1)?.[0].day === t.day) days.at(-1)!.push(t);
      else days.push([t]);
    }
    days.forEach((day, di) => {
      const heights = day.map((t) => {
        const lines = Math.max(2,
          wrapLines(t.purpose, WIDTHS[2], font.charsPerUnit),
          wrapLines(`${t.origin} - ${t.destination}`, WIDTHS[3], font.charsPerUnit),
          wrapLines(t.driver, WIDTHS[6], font.charsPerUnit));
        return lines * LINE_PT + 2;
      });
      const dayHeight = heights.reduce((a, h) => a + h, 0);
      // cały dzień na jednej stronie
      if (di > 0 && used + dayHeight > PAGE_PT) breakBefore();
      day.forEach((t, ti) => {
        const lastOfMonth = di === days.length - 1 && ti === day.length - 1;
        const top = ti === 0;
        const b = (col: number, upper: boolean): XBorder => ({
          left: col === 0, right: col === 6,
          top: upper && top, bottom: !upper && lastOfMonth,
        });
        const c = (col: number, upper: boolean, v: string | number | null, extra: XStyle = {}, date = false): XCell =>
          ({ v, date, s: st({ border: b(col, upper), h: "center", v: "center", wrap: true, ...extra }) });
        const half = heights[ti] / 2;
        push([
          c(0, true, t.no), c(1, true, t.day, { numFmt: "dd.mm.yyyy" }, true), c(2, true, t.purpose),
          c(3, true, `${t.origin} - ${t.destination}`), c(4, true, t.km),
          c(5, true, t.odoStart, { numFmt: ODO_FMT, v: "bottom" }), c(6, true, t.driver),
        ], half);
        const r1 = rows.length;
        push([
          c(0, false, null), c(1, false, null), c(2, false, null), c(3, false, null), c(4, false, null),
          c(5, false, t.odoEnd, { numFmt: ODO_FMT, v: "top" }), c(6, false, null),
        ], half);
        for (const col of ["A", "B", "C", "D", "E", "G"]) merges.push(`${col}${r1}:${col}${r1 + 1}`);
      });
    });

    if (used + 60 > PAGE_PT) breakBefore();
    push([], 10);
    const r = push([text([{ text: "Stan licznika " }, { text: kmText(m.odoEnd), underline: true }, { text: " na koniec miesiąca " },
      { text: genitive, underline: true }, { text: ", roku " }, { text: year, underline: true }], { font: { size: 11 } }),
    null, null, null, null, text("Podpis podatnika", { h: "center", font: { size: 11 } }), null]);
    merges.push(`F${r}:G${r}`);
    push([], 12);
    const s = push([null, null, null, null, null, text((company.signatory || company.name).toUpperCase(), { h: "center", font: { size: 11, bold: true } }), null]);
    merges.push(`F${s}:G${s}`);
  });

  const hf = (code: string) => code.replace(/FONT/g, font.excel);
  return {
    name: `${vehicle.plate || vehicle.name}`.slice(0, 31),
    rows,
    merges,
    rowHeights,
    pageBreaks,
    colWidths: WIDTHS,
    header: hf('&C&"FONT,Bold"&12EWIDENCJA PRZEBIEGU POJAZDU\n&"FONT,Regular"&11wykorzystywanego wyłącznie do celów działalności gospodarczej'),
    footer: hf('&C&"FONT,Regular"&10Strona &P z &N'),
  };
}

export function exportLedgerXlsx(company: Company, vehicle: Vehicle, months: MonthSummary[], opts: ExportOptions = {}): Blob {
  // czcionka domyślna zostaje Calibri 11 – od niej zależy szerokość kolumn; wybrana czcionka jest w stylach komórek
  const bytes = writeWorkbook({ sheets: [buildSheet(company, vehicle, months, opts)], font: { name: "Calibri", size: 11 } });
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
