import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { buildLedger, continuityGaps, type LedgerTrip, monthSummaries, type MonthSummary, odometerChecks, type OdometerCheck } from "../engine/ledger";
import type { Company, Vehicle } from "../engine/types";
import { type AppData, loadAll } from "./data";

interface DataState {
  data: AppData | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  vehicle: Vehicle | null;
  setVehicleId: (id: number) => void;
  /** przejazdy wybranego pojazdu z numerami i licznikiem */
  ledger: LedgerTrip[];
  months: MonthSummary[];
  checks: OdometerCheck[];
  gaps: Map<number, string>;
  company: Company;
  defaultDriver: string;
  /** własne nazwy miejsc, np. „Miasteczko, ul. Prosta 1” → „Dom” */
  placeLabels: Record<string, string>;
  placeLabel: (address: string) => string | null;
}

export const placeKey = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

export function parseLabels(raw: string | undefined): Record<string, string> {
  try {
    const v = JSON.parse(raw || "{}") as Record<string, string>;
    return Object.fromEntries(Object.entries(v).map(([k, l]) => [placeKey(k), l]));
  } catch {
    return {};
  }
}

const Ctx = createContext<DataState | null>(null);
const VEHICLE_KEY = "km.vehicle";

function storedVehicle(): number | null {
  try {
    const v = localStorage.getItem(VEHICLE_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

export function companyFrom(settings: Record<string, string>): Company {
  return {
    name: settings.company_name ?? "",
    address1: settings.company_address1 ?? "",
    address2: settings.company_address2 ?? "",
    nip: settings.company_nip ?? "",
    regon: settings.company_regon ?? "",
    signatory: settings.company_signatory ?? "",
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicleId, setVehicleIdState] = useState<number | null>(storedVehicle);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loadAll());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const setVehicleId = useCallback((id: number) => {
    setVehicleIdState(id);
    try { localStorage.setItem(VEHICLE_KEY, String(id)); } catch { /* tryb prywatny */ }
  }, []);

  const value = useMemo<DataState>(() => {
    const vehicles = data?.vehicles ?? [];
    const vehicle = vehicles.find((v) => v.id === vehicleId) ?? vehicles.find((v) => v.active) ?? vehicles[0] ?? null;
    const ledger = data && vehicle ? buildLedger(vehicle, data.trips) : [];
    const settings = data?.settings ?? {};
    const placeLabels = parseLabels(settings.place_labels);
    return {
      data, loading, error, reload, vehicle, setVehicleId, ledger,
      months: data && vehicle ? monthSummaries(vehicle, ledger, data.closes) : [],
      checks: data && vehicle ? odometerChecks(vehicle, ledger, data.readings) : [],
      gaps: continuityGaps(ledger),
      company: companyFrom(settings),
      defaultDriver: vehicle?.default_driver || settings.default_driver || "",
      placeLabels,
      placeLabel: (a: string) => placeLabels[placeKey(a)] || null,
    };
  }, [data, loading, error, reload, vehicleId, setVehicleId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData poza DataProvider");
  return v;
}
