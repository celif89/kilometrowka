import { ArrowLeft, FileSpreadsheet, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Spinner } from "../components/ui";
import { buildLedger, type LedgerTrip, monthSummaries } from "../engine/ledger";
import { saveSettings } from "../lib/data";
import { useData } from "../lib/DataContext";
import { downloadBlob, exportLedgerXlsx } from "../lib/exportXlsx";
import { PRINT_FONTS, PRINT_HEADER_KEY, printFont, printHeaderEnabled } from "../lib/fonts";
import { dayLabel, monthGenitive, monthOnly, num, odo } from "../lib/format";



const U = ({ children }: { children: React.ReactNode }) => <span className="underline underline-offset-2">{children}</span>;

// obramowania jak w arkuszu: siatka w nagłówku, w treści tylko ramka i linie między dniami
const LINE = "1px solid #000";

export function PrintPage() {
  const { vehicleId, from, to } = useParams();
  const { data, company, reload } = useData();
  const vehicle = data?.vehicles.find((v) => v.id === Number(vehicleId));
  const [withHeader, setWithHeader] = useState(printHeaderEnabled);
  // czcionka zapisana w ustawieniach konta – ta sama na każdym urządzeniu i w eksporcie do Excela
  const [fontId, setFontId] = useState<string | null>(null);
  const font = printFont(fontId ?? data?.settings.print_font);

  useEffect(() => {
    document.title = vehicle ? `Ewidencja ${vehicle.plate} ${from === to ? from : `${from} – ${to}`}` : "Ewidencja";
    return () => { document.title = "Kilometrówka"; };
  }, [vehicle, from, to]);

  if (!data) return <div className="p-10"><Spinner label="Wczytywanie…" /></div>;
  if (!vehicle || !from || !to) return <div className="p-10">Nie znaleziono pojazdu.</div>;

  const months = monthSummaries(vehicle, buildLedger(vehicle, data.trips), data.closes).filter((m) => m.month >= from && m.month <= to);
  const firm = [company.name, company.address1, company.address2, company.nip && `NIP: ${company.nip}`, company.regon && `REGON: ${company.regon}`].filter(Boolean);
  const signatory = (company.signatory || company.name).toUpperCase();

  return (
    <div className="min-h-dvh bg-slate-200 py-6 print:bg-white print:py-0 dark:bg-ink-950">
      {/* stopka „Strona X z Y” tą samą czcionką co wydruk */}
      <style>{`@page { @bottom-center { font-family: ${font.css}; } }`}</style>
      <div className="no-print mx-auto mb-5 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4">
        <Link to={`/ewidencja/${from}`} className="btn btn-secondary"><ArrowLeft className="size-4" /> Wróć</Link>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" className="size-4 accent-brand-600" checked={withHeader} onChange={(e) => {
            setWithHeader(e.target.checked);
            try { localStorage.setItem(PRINT_HEADER_KEY, e.target.checked ? "1" : "0"); } catch { /* */ }
          }} />
          Dane firmy i pojazdu nad tabelą
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          Czcionka
          <select className="input w-44 py-1.5 text-sm" value={font.id} style={{ fontFamily: font.css }}
            onChange={async (e) => {
              setFontId(e.target.value);
              try { await saveSettings({ print_font: e.target.value }); await reload(); } catch { /* zostaje wybór lokalny */ }
            }}>
            {PRINT_FONTS.map((f) => <option key={f.id} value={f.id} style={{ fontFamily: f.css }}>{f.label}</option>)}
          </select>
        </label>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => downloadBlob(exportLedgerXlsx(company, vehicle, months, { font, withHeader }),
            `Ewidencja_${vehicle.plate.replace(/\s/g, "")}_${from === to ? from : `${from}_${to}`}.xlsx`)}>
            <FileSpreadsheet className="size-4" /> Excel
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}><Printer className="size-4" /> Drukuj / PDF</button>
        </div>
        <p className="w-full text-center text-xs text-slate-500">
          W oknie drukowania wybierz „Zapisz jako PDF”, a w „Więcej ustawień” odznacz „Nagłówki i stopki”.
        </p>
      </div>

      {months.map((m) => {
        const [year] = m.month.split("-");
        const days: LedgerTrip[][] = [];
        for (const t of m.trips) {
          if (days.at(-1)?.[0].day === t.day) days.at(-1)!.push(t);
          else days.push([t]);
        }
        return (
          <article key={m.month} className="print-page mx-auto mb-6 w-full max-w-[210mm] bg-white px-[14mm] py-[10mm] text-black shadow-xl"
            style={{ fontFamily: font.css, fontSize: "10.5pt", lineHeight: 1.25 }}>
            <table className="print-table w-full table-fixed border-collapse" style={{ fontSize: "9.5pt" }}>
              <colgroup>
                <col style={{ width: "7.8%" }} /><col style={{ width: "10.3%" }} /><col style={{ width: "11.9%" }} /><col style={{ width: "28.3%" }} />
                <col style={{ width: "12%" }} /><col style={{ width: "14.7%" }} /><col style={{ width: "15%" }} />
              </colgroup>
              {/* tytuł powtarza się u góry każdej strony */}
              <thead>
                <tr>
                  <th colSpan={7} className="pb-3 text-center font-normal">
                    <div style={{ fontSize: "11.5pt" }} className="font-bold">EWIDENCJA PRZEBIEGU POJAZDU</div>
                    <div style={{ fontSize: "10.5pt" }}>wykorzystywanego wyłącznie do celów działalności gospodarczej</div>
                  </th>
                </tr>
              </thead>
              {/* każdy dzień w osobnej grupie wierszy, której nie wolno dzielić między strony;
                  pierwsza grupa ma też nagłówek miesiąca i kolumn, żeby nie zostały same na dole strony */}
              <tbody style={{ breakInside: "avoid" }}>
                <tr>
                  <td colSpan={7} className="pb-3 text-left" style={{ fontSize: "10pt" }}>
                    {withHeader && (
                      <div className="mb-3 flex justify-between gap-6" style={{ fontSize: "9pt" }}>
                        <div>{firm.map((l, i) => <div key={i} className={i === 0 ? "font-bold" : ""}>{l}</div>)}</div>
                        <div className="text-right">
                          <div>Pojazd: <b>{vehicle.name}</b></div>
                          <div>Numer rejestracyjny: <b>{vehicle.plate}</b></div>
                          <div>Dzień rozpoczęcia prowadzenia ewidencji: {dayLabel(vehicle.start_date)}</div>
                          <div>Stan licznika na dzień rozpoczęcia ewidencji: {odo(vehicle.start_odometer)}</div>
                          {vehicle.end_date && <div>Dzień zakończenia prowadzenia ewidencji: {dayLabel(vehicle.end_date)}</div>}
                        </div>
                      </div>
                    )}
                    <div className="font-bold">Ewidencja za miesiąc <U>{monthOnly(m.month)}</U>, roku <U>{year}</U></div>
                    <div>Stan licznika <U>{odo(m.odoStart)}</U> na początek miesiąca <U>{monthGenitive(m.month).split(" ")[0]}</U>, roku <U>{year}</U></div>
                  </td>
                </tr>
                <tr>
                  {["Nr kolejny wpisu", "Data wyjazdu", "Cel wyjazdu", "Opis trasy wyjazdu (skąd - dokąd)",
                    "Liczba faktycznie przejechanych kilometrów", "Stan licznika (wyjazd/przyjazd)", "Imię i nazwisko osoby kierującej pojazdem"].map((h) => (
                    <td key={h} className="px-0.5 py-1 text-center align-middle" style={{ border: LINE, hyphens: "manual" }}>{h}</td>
                  ))}
                </tr>
                {m.trips.length === 0 && (
                  <tr><td colSpan={7} className="px-2 py-3 text-center" style={{ border: LINE }}>W tym miesiącu pojazd nie był używany.</td></tr>
                )}
                {days[0]?.map((t, i) => <TripRow key={t.id} t={t} newDay={i === 0} last={m.trips.length === days[0].length && i === days[0].length - 1} />)}
              </tbody>
              {days.slice(1).map((day, d) => (
                <tbody key={day[0].day} style={{ breakInside: "avoid" }}>
                  {day.map((t, i) => <TripRow key={t.id} t={t} newDay={i === 0} last={d === days.length - 2 && i === day.length - 1} />)}
                </tbody>
              ))}
            </table>

            <div className="mt-4 flex items-start justify-between gap-6" style={{ breakInside: "avoid", fontSize: "10pt" }}>
              <div>Stan licznika <U>{odo(m.odoEnd)}</U> na koniec miesiąca <U>{monthGenitive(m.month).split(" ")[0]}</U>, roku <U>{year}</U></div>
              <div className="w-[30%] shrink-0 text-center">
                <div>Podpis podatnika</div>
                <div className="mt-4 font-bold">{signatory}</div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TripRow({ t, newDay, last }: { t: LedgerTrip; newDay: boolean; last: boolean }) {
  const cell = (i: number): React.CSSProperties => ({
    borderLeft: i === 0 ? LINE : undefined,
    borderRight: i === 6 ? LINE : undefined,
    borderTop: newDay ? LINE : undefined,
    borderBottom: last ? LINE : undefined,
  });
  const values = [
    String(t.no), dayLabel(t.day), t.purpose, `${t.origin} - ${t.destination}`, num(t.km),
    <>{odo(t.odoStart)}<br />{odo(t.odoEnd)}</>, t.driver,
  ];
  return (
    <tr>
      {values.map((v, i) => (
        <td key={i} className="px-1 py-[1px] text-center align-middle" style={cell(i)}>{v}</td>
      ))}
    </tr>
  );
}
