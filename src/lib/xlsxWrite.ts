// Minimalny zapis plików .xlsx: style tworzone w locie (czcionka, obramowanie, wyrównanie, format liczb),
// tekst sformatowany fragmentami (pogrubienie/podkreślenie w środku zdania), scalenia, wysokości wierszy,
// podziały stron, nagłówek i stopka wydruku. Bez zewnętrznych bibliotek poza spakowaniem ZIP.
import { strToU8, zipSync } from "fflate";
import { colName } from "./xlsx";

export interface XFont { name?: string; size?: number; bold?: boolean; underline?: boolean }
export interface XBorder { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean }
export interface XStyle {
  font?: XFont;
  border?: XBorder;
  h?: "left" | "center" | "right";
  v?: "top" | "center" | "bottom";
  wrap?: boolean;
  /** np. "#,##0" albo "dd.mm.yyyy" */
  numFmt?: string;
}
/** fragment tekstu z własnym formatowaniem */
export interface XRun { text: string; bold?: boolean; underline?: boolean }

export interface XCellObj { v: string | number | null | XRun[]; s?: XStyle; date?: boolean }
export type XCell = XCellObj | string | number | null | undefined;

export interface XSheet {
  name: string;
  rows: XCell[][];
  merges?: string[];
  colWidths?: number[];
  /** wysokość wiersza w punktach, numer wiersza od 1 */
  rowHeights?: Record<number, number>;
  /** numery wierszy (od 1), PO których zaczyna się nowa strona */
  pageBreaks?: number[];
  landscape?: boolean;
  /** kody nagłówka/stopki Excela, np. "&CStrona &P z &N" */
  header?: string;
  footer?: string;
}

export interface XBook {
  sheets: XSheet[];
  /** czcionka domyślna komórek bez stylu */
  font?: XFont;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 'YYYY-MM-DD' → numer seryjny daty Excela. */
export function dayToSerial(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86_400_000;
}

const BORDER_COLOR = "FF000000";

class Styles {
  fonts: string[] = [];
  borders: string[] = ['<border><left/><right/><top/><bottom/><diagonal/></border>'];
  numFmts: string[] = [];
  xfs: string[] = [];
  private keys = new Map<string, number>();

  constructor(readonly base: Required<Pick<XFont, "name" | "size">>) {
    this.fonts.push(this.fontXml({}));
    this.xfs.push('<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>');
  }

  fontXml(f: XFont): string {
    return `<font>${f.bold ? "<b/>" : ""}${f.underline ? '<u/>' : ""}<sz val="${f.size ?? this.base.size}"/><name val="${esc(f.name ?? this.base.name)}"/><family val="2"/><charset val="238"/></font>`;
  }

  runProps(f: XFont): string {
    return `<rPr>${f.bold ? "<b/>" : ""}${f.underline ? "<u/>" : ""}<sz val="${f.size ?? this.base.size}"/><rFont val="${esc(f.name ?? this.base.name)}"/><family val="2"/><charset val="238"/></rPr>`;
  }

  private index(list: string[], xml: string): number {
    const i = list.indexOf(xml);
    if (i >= 0) return i;
    list.push(xml);
    return list.length - 1;
  }

  id(s: XStyle | undefined): number {
    if (!s) return 0;
    const key = JSON.stringify(s);
    const known = this.keys.get(key);
    if (known !== undefined) return known;
    const fontId = this.index(this.fonts, this.fontXml(s.font ?? {}));
    const b = s.border ?? {};
    const side = (name: string, on?: boolean) => (on ? `<${name} style="thin"><color rgb="${BORDER_COLOR}"/></${name}>` : `<${name}/>`);
    const borderId = this.index(this.borders, `<border>${side("left", b.left)}${side("right", b.right)}${side("top", b.top)}${side("bottom", b.bottom)}<diagonal/></border>`);
    let numFmtId = 0;
    if (s.numFmt) numFmtId = 164 + this.index(this.numFmts, s.numFmt);
    const align = s.h || s.v || s.wrap
      ? `<alignment${s.h ? ` horizontal="${s.h}"` : ""}${s.v ? ` vertical="${s.v}"` : ""}${s.wrap ? ' wrapText="1"' : ""}/>`
      : "";
    this.xfs.push(`<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="0" borderId="${borderId}" xfId="0" applyFont="1" applyBorder="1"${numFmtId ? ' applyNumberFormat="1"' : ""}${align ? ' applyAlignment="1">' + align + "</xf>" : "/>"}`);
    const id = this.xfs.length - 1;
    this.keys.set(key, id);
    return id;
  }

  xml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
${this.numFmts.length ? `<numFmts count="${this.numFmts.length}">${this.numFmts.map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${esc(f)}"/>`).join("")}</numFmts>` : ""}
<fonts count="${this.fonts.length}">${this.fonts.join("")}</fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="${this.borders.length}">${this.borders.join("")}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${this.xfs.length}">${this.xfs.join("")}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
  }
}

function sheetXml(sh: XSheet, styles: Styles): string {
  const rows = sh.rows.map((cells, i) => {
    const r = i + 1;
    const ht = sh.rowHeights?.[r];
    const cs = cells.map((raw, j) => {
      if (raw === null || raw === undefined) return "";
      const c: XCellObj = typeof raw === "object" ? raw : { v: raw };
      const ref = `${colName(j + 1)}${r}`;
      const sid = styles.id(c.s);
      const s = sid ? ` s="${sid}"` : "";
      if (c.v === null || c.v === "") return sid ? `<c r="${ref}"${s}/>` : "";
      if (typeof c.v === "number") return `<c r="${ref}"${s}><v>${c.v}</v></c>`;
      if (c.date) return `<c r="${ref}"${s}><v>${dayToSerial(c.v as string)}</v></c>`;
      if (Array.isArray(c.v)) {
        const font = c.s?.font ?? {};
        const runs = c.v.map((run) => `<r>${styles.runProps({ ...font, bold: run.bold ?? font.bold, underline: run.underline })}<t xml:space="preserve">${esc(run.text)}</t></r>`).join("");
        return `<c r="${ref}"${s} t="inlineStr"><is>${runs}</is></c>`;
      }
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
  const hf = sh.header || sh.footer
    ? `<headerFooter>${sh.header ? `<oddHeader>${esc(sh.header)}</oddHeader>` : ""}${sh.footer ? `<oddFooter>${esc(sh.footer)}</oddFooter>` : ""}</headerFooter>`
    : "";
  const breaks = sh.pageBreaks?.length
    ? `<rowBreaks count="${sh.pageBreaks.length}" manualBreakCount="${sh.pageBreaks.length}">${sh.pageBreaks
      .map((b) => `<brk id="${b}" max="16383" man="1"/>`).join("")}</rowBreaks>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<sheetViews><sheetView workbookViewId="0" showGridLines="0" view="pageLayout"/></sheetViews>
<sheetFormatPr defaultRowHeight="13.2"/>${cols}<sheetData>${rows}</sheetData>${merges}
<pageMargins left="0.6" right="0.6" top="0.85" bottom="0.75" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="${sh.landscape ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/>${hf}${breaks}
</worksheet>`;
}

export function writeWorkbook(book: XBook | XSheet[]): Uint8Array {
  const { sheets, font } = Array.isArray(book) ? { sheets: book, font: undefined } : book;
  const styles = new Styles({ name: font?.name ?? "Calibri", size: font?.size ?? 11 });
  const sheetFiles = sheets.map((sh) => sheetXml(sh, styles));
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
  };
  sheetFiles.forEach((xml, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(xml); });
  files["xl/styles.xml"] = strToU8(styles.xml());
  return zipSync(files, { level: 6 });
}
