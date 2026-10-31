// Minimalny czytnik plików .xlsx (wartości komórek i formuły) – bez zewnętrznych bibliotek
// poza rozpakowaniem ZIP (przeniesiony z FV Meter).
import { unzipSync } from "fflate";

export type CellValue = number | string | boolean | null;

export interface Cell {
  v: CellValue;
  f?: string;
}

export class Sheet {
  readonly maxRow: number;

  constructor(readonly name: string, private readonly cells: Map<string, Cell>) {
    let max = 0;
    for (const ref of cells.keys()) max = Math.max(max, Number(ref.replace(/^[A-Z]+/, "")));
    this.maxRow = max;
  }

  cell(row: number, col: number | string): Cell | undefined {
    const c = typeof col === "number" ? colName(col) : col;
    return this.cells.get(`${c}${row}`);
  }

  value(row: number, col: number | string): CellValue {
    return this.cell(row, col)?.v ?? null;
  }

  formula(row: number, col: number | string): string | undefined {
    return this.cell(row, col)?.f;
  }
}

export interface Workbook {
  sheets: Map<string, Sheet>;
  date1904: boolean;
}

export function colName(n: number): string {
  let s = "";
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

export function colIndex(name: string): number {
  return [...name].reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0);
}

function decode(s: string): string {
  return s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (_, e: string) => {
    switch (e.toLowerCase()) {
      case "lt": return "<";
      case "gt": return ">";
      case "amp": return "&";
      case "quot": return '"';
      case "apos": return "'";
      default:
        return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    }
  });
}

const textOf = (xml: string) =>
  [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "").matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join("");

function attr(attrs: string, name: string): string | undefined {
  return attrs.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
}

function parseSheet(name: string, xml: string, shared: string[]): Sheet {
  const cells = new Map<string, Cell>();
  for (const m of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attrs = m[1];
    const inner = m[2] ?? "";
    const ref = attr(attrs, "r");
    if (!ref) continue;
    const type = attr(attrs, "t");
    const fm = inner.match(/<f\b[^>]*?(?:\/>|>([\s\S]*?)<\/f>)/);
    const raw = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1];
    let v: CellValue = null;
    if (type === "inlineStr") v = textOf(inner);
    else if (raw !== undefined) {
      if (type === "s") v = shared[Number(raw)] ?? null;
      else if (type === "str" || type === "e") v = decode(raw);
      else if (type === "b") v = raw === "1";
      else v = Number(raw);
    }
    if (v === null && !fm) continue;
    cells.set(ref, fm?.[1] !== undefined ? { v, f: decode(fm[1]) } : { v });
  }
  return new Sheet(name, cells);
}

export function readWorkbook(data: Uint8Array): Workbook {
  const files = unzipSync(data);
  const text = (path: string) => {
    const f = files[path];
    return f ? new TextDecoder("utf-8").decode(f) : "";
  };
  const wb = text("xl/workbook.xml");
  if (!wb) throw new Error("To nie jest plik Excel (.xlsx)");
  const rels = new Map(
    [...text("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b([^>]*)\/?>/g)].map((m) => [
      attr(m[1], "Id") ?? "", attr(m[1], "Target") ?? "",
    ]),
  );
  const shared = [...text("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));
  const sheets = new Map<string, Sheet>();
  for (const m of wb.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const name = decode(attr(m[1], "name") ?? "");
    const target = rels.get(attr(m[1], "r:id") ?? "") ?? "";
    const path = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
    sheets.set(name, parseSheet(name, text(path), shared));
  }
  return { sheets, date1904: /date1904="(1|true)"/.test(wb) };
}

/** Numer seryjny daty Excela → 'YYYY-MM-DD'. */
export function serialToDay(serial: number, date1904 = false): string {
  const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  return new Date(epoch + Math.floor(serial) * 86_400_000).toISOString().slice(0, 10);
}
