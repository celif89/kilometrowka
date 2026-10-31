import { ArrowLeft, Printer } from "lucide-react";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Spinner } from "../components/ui";
import { buildLedger, monthSummaries } from "../engine/ledger";
import { useData } from "../lib/DataContext";
import { dayLabel, monthGenitive, monthOnly, num } from "../lib/format";

export function PrintPage() {
  const { vehicleId, from, to } = useParams();
  const { data, company } = useData();
  const vehicle = data?.vehicles.find((v) => v.id === Number(vehicleId));

  useEffect(() => {
    document.title = vehicle ? `Ewidencja ${vehicle.plate} ${from === to ? from : `${from} – ${to}`}` : "Ewidencja";
    return () => { document.title = "Kilometrówka"; };
  }, [vehicle, from, to]);

  if (!data) return <div className="p-10"><Spinner label="Wczytywanie…" /></div>;
  if (!vehicle || !from || !to) return <div className="p-10">Nie znaleziono pojazdu.</div>;

  const months = monthSummaries(vehicle, buildLedger(vehicle, data.trips), data.closes).filter((m) => m.month >= from && m.month <= to);
  const firm = [company.name, company.address1, company.address2, company.nip && `NIP: ${company.nip}`, company.regon && `REGON: ${company.regon}`].filter(Boolean);

  return (
    <div className="min-h-dvh bg-slate-200 py-6 print:bg-white print:py-0 dark:bg-ink-950">
      <div className="no-print mx-auto mb-5 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4">
        <Link to={`/ewidencja/${from}`} className="btn btn-secondary"><ArrowLeft className="size-4" /> Wróć</Link>
        <div className="text-sm text-slate-600 dark:text-slate-300">{months.length} {months.length === 1 ? "strona" : "stron(y)"} A4 · w oknie drukowania wybierz „Zapisz jako PDF”</div>
        <button className="btn btn-primary" onClick={() => window.print()}><Printer className="size-4" /> Drukuj / PDF</button>
      </div>

      {months.map((m) => (
        <article key={m.month} className="print-page mx-auto mb-6 w-full max-w-[210mm] bg-white p-[12mm] text-[10.5px] leading-snug text-black shadow-xl"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
          <header className="flex justify-between gap-6">
            <div>{firm.map((l, i) => <div key={i} className={i === 0 ? "font-bold" : ""}>{l}</div>)}</div>
            <div className="text-right">
              <div>Pojazd: <b>{vehicle.name}</b></div>
              <div>Numer rejestracyjny: <b>{vehicle.plate}</b></div>
              <div>Dzień rozpoczęcia prowadzenia ewidencji: {dayLabel(vehicle.start_date)}</div>
              <div>Stan licznika na dzień rozpoczęcia ewidencji: {num(vehicle.start_odometer)} km</div>
              {vehicle.end_date && <div>Dzień zakończenia prowadzenia ewidencji: {dayLabel(vehicle.end_date)}</div>}
            </div>
          </header>

          <h1 className="mt-6 text-center text-[15px] font-bold" style={{ fontFamily: "inherit" }}>
            Ewidencja przebiegu pojazdu za miesiąc {monthOnly(m.month)} {m.month.slice(0, 4)}
          </h1>
          <p className="mt-2">Stan licznika na początek miesiąca {monthGenitive(m.month)}: <b>{num(m.odoStart)} km</b></p>

          <table className="print-table mt-3 w-full table-fixed border-collapse text-[9.5px]">
            <colgroup>
              <col style={{ width: "6%" }} /><col style={{ width: "10.5%" }} /><col style={{ width: "15%" }} /><col style={{ width: "35%" }} />
              <col style={{ width: "8.5%" }} /><col style={{ width: "12.5%" }} /><col style={{ width: "12.5%" }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-100">
                {["Nr kolejny wpisu", "Data wyjazdu", "Cel wyjazdu", "Opis trasy wyjazdu (skąd – dokąd)", "Liczba faktycznie przejechanych km",
                  "Stan licznika wyjazd / przyjazd", "Imię i nazwisko osoby kierującej pojazdem"].map((h) => (
                  <th key={h} className="border border-slate-500 px-1.5 py-1 text-center align-middle text-[9px] font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.trips.length === 0 && <tr><td colSpan={7} className="border border-slate-500 px-2 py-3 text-center">W tym miesiącu pojazd nie był używany.</td></tr>}
              {m.trips.map((t) => (
                <tr key={t.id}>
                  <td className="border border-slate-500 px-1 py-0.5 text-center">{t.no}</td>
                  <td className="border border-slate-500 px-1 py-0.5 text-center whitespace-nowrap">{dayLabel(t.day)}</td>
                  <td className="border border-slate-500 px-1.5 py-0.5">{t.purpose}</td>
                  <td className="border border-slate-500 px-1.5 py-0.5">{t.origin} – {t.destination}</td>
                  <td className="border border-slate-500 px-1.5 py-0.5 text-right">{num(t.km)}</td>
                  <td className="border border-slate-500 px-1.5 py-0.5 text-right whitespace-nowrap">{num(t.odoStart)} / {num(t.odoEnd)}</td>
                  <td className="border border-slate-500 px-1.5 py-0.5">{t.driver}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} className="px-1.5 py-1 text-right font-bold">Razem w miesiącu:</td>
                <td className="border border-slate-500 px-1.5 py-1 text-right font-bold">{num(m.km)}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>

          <div className="mt-5 flex items-end justify-between gap-8" style={{ breakInside: "avoid" }}>
            <div>
              <p>Stan licznika na koniec miesiąca {monthGenitive(m.month)}: <b>{num(m.odoEnd)} km</b></p>
              <p className="mt-0.5">Liczba przejechanych kilometrów w miesiącu: <b>{num(m.km)} km</b></p>
            </div>
            <div className="w-64 text-center">
              <div className="h-10" />
              <div className="border-t border-dotted border-black pt-1">Podpis podatnika</div>
              <div className="text-[9px] text-slate-600">{company.signatory || company.name}</div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
