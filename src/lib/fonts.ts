// Czcionki do wyboru na wydruku (PDF) i w eksporcie do Excela. Są standardowo w Windows / pakiecie Office;
// w `css` są zamienniki o podobnej szerokości na wypadek, gdyby czcionki nie było w systemie.

export interface PrintFont {
  id: string;
  label: string;
  /** font-family dla wydruku w przeglądarce */
  css: string;
  /** nazwa czcionki w Excelu */
  excel: string;
  /** ile znaków 10-punktowego tekstu mieści się na jednostkę szerokości kolumny Excela (do łamania wierszy) */
  charsPerUnit: number;
}

export const PRINT_FONTS: PrintFont[] = [
  { id: "calibri", label: "Calibri", css: "Calibri, Carlito, 'Segoe UI', Arial, sans-serif", excel: "Calibri", charsPerUnit: 1.25 },
  { id: "arial", label: "Arial", css: "Arial, 'Liberation Sans', Helvetica, sans-serif", excel: "Arial", charsPerUnit: 1.1 },
  { id: "arial-narrow", label: "Arial Narrow", css: "'Arial Narrow', 'Liberation Sans Narrow', 'Nimbus Sans Narrow', 'Helvetica Neue Condensed', Arial, sans-serif", excel: "Arial Narrow", charsPerUnit: 1.4 },
  { id: "times", label: "Times New Roman", css: "'Times New Roman', Times, 'Liberation Serif', Tinos, serif", excel: "Times New Roman", charsPerUnit: 1.3 },
  { id: "tahoma", label: "Tahoma", css: "Tahoma, 'DejaVu Sans Condensed', Verdana, sans-serif", excel: "Tahoma", charsPerUnit: 1.05 },
];

export const DEFAULT_FONT = PRINT_FONTS[0];

export function printFont(id: string | undefined): PrintFont {
  return PRINT_FONTS.find((f) => f.id === id) ?? DEFAULT_FONT;
}

/** Ustawienie „dane firmy i pojazdu nad tabelą” (zapamiętane w przeglądarce). */
export const PRINT_HEADER_KEY = "km.printHeader";

export function printHeaderEnabled(): boolean {
  try { return localStorage.getItem(PRINT_HEADER_KEY) === "1"; } catch { return false; }
}
