// Minimalny zapis plików .xlsx: jeden arkusz, kilka stałych stylów, scalenia, szerokości kolumn,
// podziały stron i ustawienia wydruku. Bez zewnętrznych bibliotek poza spakowaniem ZIP.
import { strToU8, zipSync } from "fflate";
import { colName } from "./xlsx";

/** Style komórek (indeksy w styles.xml). */
export const S = {
  normal: 0,
  bold: 1,
  title: 2,
  th: 3,
  td: 4,
  tdDate: 5,
  tdNum: 6,
  tdCenter: 7,
  small: 8,
  boldRight: 9,
} as const;
export type StyleId = (typeof S)[keyof typeof S];

export type XCell = { v: string | number | null; s?: StyleId; date?: boolean } | string | number | null;

export interface XSheet {
  name: string;
  rows: XCell[][];
  merges?: string[];
  colWidths?: number[];
  rowHeights?: Record<number, number>;
  /** numery wierszy (od 1), PO których zaczyna się nowa strona */
  pageBreaks?: number[];
  landscape?: boolean;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 'YYYY-MM-DD' → numer seryjny daty Excela. */
export function dayToSerial(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86_400_000;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="dd\\.mm\\.yyyy"/><numFmt numFmtId="165" formatCode="#,##0.#"/></numFmts>
<fonts count="5">
<font><sz val="10"/><name val="Arial"/></font>
<font><b/><sz val="10"/><name val="Arial"/></font>
<font><b/><sz val="12"/><name val="Arial"/></font>
<font><sz val="8"/><color rgb="FF555555"/><name val="Arial"/></font>
<font><b/><sz val="9"/><name val="Arial"/></font>
</fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE8ECF4"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FF8A94A6"/></left><right style="thin"><color rgb="FF8A94A6"/></right><top style="thin"><color rgb="FF8A94A6"/></top><bottom style="thin"><color rgb="FF8A94A6"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="10">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="165" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyAlignment="1"><alignment horizontal="right"/></xf>
</cellXfs>
</styleSheet>`;

function sheetXml(sh: XSheet): string {
  const rows = sh.rows.map((cells, i) => {
    const r = i + 1;
    const ht = sh.rowHeights?.[r];
    const cs = cells.map((raw, j) => {
      if (raw === null || raw === undefined) return "";
      const c = typeof raw === "object" ? raw : { v: raw };
      if (c.v === null || c.v === "") return c.s ? `<c r="${colName(j + 1)}${r}" s="${c.s}"/>` : "";
      const ref = `${colName(j + 1)}${r}`;
      const s = c.s ? ` s="${c.s}"` : "";
      if (typeof c.v === "number") return `<c r="${ref}"${s}><v>${c.v}</v></c>`;
      if (c.date) return `<c r="${ref}"${s}><v>${dayToSerial(c.v)}</v></c>`;
      return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`;
    }).join("");
    return `<row r="${r}"${ht ? ` ht="${ht}" customHeight="1"` : ""}>${cs}</row>`;
  }).join("");
  const cols = sh.colWidths?.length
    ? `<cols>${sh.colWidths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>`
    : "";
  const merges = sh.merges?.length
    ? `<mergeCells count="${sh.merges.length}">${sh.merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>`
    : "";
  const breaks = sh.pageBreaks?.length
    ? `<rowBreaks count="${sh.pageBreaks.length}" manualBreakCount="${sh.pageBreaks.length}">${sh.pageBreaks
      .map((b) => `<brk id="${b}" max="16383" man="1"/>`).join("")}</rowBreaks>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>
<sheetFormatPr defaultRowHeight="13.2"/>${cols}<sheetData>${rows}</sheetData>${merges}
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="${sh.landscape ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/>${breaks}
</worksheet>`;
}

export function writeWorkbook(sheets: XSheet[]): Uint8Array {
  const names = sheets.map((s, i) => esc(s.name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || `Arkusz${i + 1}`));
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("\n")}
</Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>
</workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("\n")}
<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    "xl/styles.xml": strToU8(STYLES),
  };
  sheets.forEach((sh, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(sh)); });
  return zipSync(files, { level: 6 });
}
