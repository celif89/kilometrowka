import { CarFront, ChartColumn, Gauge, LogOut, NotebookPen, Route, Settings, Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { APP_VERSION } from "../changelog";
import { useData } from "../lib/DataContext";
import { supabase } from "../lib/supabase";
import { cx } from "./ui";

const NAV = [
  { to: "/", label: "Pulpit", icon: Gauge, end: true },
  { to: "/ewidencja", label: "Ewidencja", icon: NotebookPen },
  { to: "/trasy", label: "Trasy", icon: Route },
  { to: "/raporty", label: "Raporty", icon: ChartColumn },
  { to: "/ustawienia", label: "Ustawienia", icon: Settings },
];

const SEEN_KEY = "km.seenVersion";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex size-10 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-road-600 text-white shadow-lg shadow-brand-600/30">
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M8 21 11 3" opacity=".9" />
          <path d="M16 21 13 3" opacity=".9" />
          <path d="M12 17v2M12 11v2M12 5.5v1.5" strokeWidth="1.6" />
        </svg>
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="font-display text-[17px] font-bold tracking-tight">Kilometrówka</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">ewidencja przebiegu pojazdu</div>
        </div>
      )}
    </div>
  );
}

function useNewVersion(): [boolean, () => void] {
  const [isNew, setNew] = useState(false);
  useEffect(() => {
    try {
      const seen = localStorage.getItem(SEEN_KEY);
      if (!seen) localStorage.setItem(SEEN_KEY, APP_VERSION);
      else setNew(seen !== APP_VERSION);
    } catch { /* tryb prywatny */ }
  }, []);
  return [isNew, () => { try { localStorage.setItem(SEEN_KEY, APP_VERSION); } catch { /* */ } setNew(false); }];
}

function VehicleSwitch() {
  const { data, vehicle, setVehicleId } = useData();
  const list = data?.vehicles.filter((v) => v.active || v.id === vehicle?.id) ?? [];
  if (!vehicle) return null;
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/5 dark:bg-white/[0.03]">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-xl bg-white text-slate-600 shadow-xs dark:bg-white/10 dark:text-slate-200"><CarFront className="size-4" /></div>
        <div className="min-w-0 flex-1 leading-tight">
          {list.length > 1 ? (
            <select className="w-full truncate bg-transparent text-sm font-semibold outline-none" value={vehicle.id}
              onChange={(e) => setVehicleId(Number(e.target.value))}>
              {list.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          ) : <div className="truncate text-sm font-semibold">{vehicle.name}</div>}
          <div className="font-mono text-[11px] tracking-wider text-slate-500 dark:text-slate-400">{vehicle.plate}</div>
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [isNew, markSeen] = useNewVersion();
  const { vehicle, reminder } = useData();
  const dot = (to: string) => to === "/ewidencja" && reminder
    ? <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-brand-500 ring-2 ring-white lg:static lg:ml-auto lg:ring-0 dark:ring-ink-900" title="Poprzedni miesiąc czeka na zatwierdzenie" />
    : null;
  return (
    <div className="min-h-dvh lg:pl-72">
      {/* boczne menu – komputer */}
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-slate-200/70 bg-white/70 px-5 py-6 backdrop-blur-xl lg:flex dark:border-white/5 dark:bg-ink-900/60">
        <Link to="/" className="px-1"><Logo /></Link>
        <div className="mt-6"><VehicleSwitch /></div>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cx(
              "group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition",
              isActive
                ? "bg-ink-900 text-white shadow-lg shadow-ink-900/20 dark:bg-white dark:text-ink-900"
                : "text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/5",
            )}>
              <Icon className="size-[18px]" /> {label} {dot(to)}
            </NavLink>
          ))}
        </nav>
        <Link to="/co-nowego" onClick={markSeen}
          className="mb-2 flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs text-slate-500 transition hover:bg-slate-900/5 dark:text-slate-400 dark:hover:bg-white/5">
          <span className="flex items-center gap-2"><Sparkles className="size-3.5" /> Co nowego</span>
          <span className={cx("rounded-full px-2 py-0.5 font-mono font-semibold", isNew ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-white/10")}>
            v{APP_VERSION}
          </span>
        </Link>
        <button className="btn btn-ghost justify-start px-3.5" onClick={() => supabase.auth.signOut()}>
          <LogOut className="size-4" /> Wyloguj
        </button>
      </aside>

      {/* nagłówek – telefon */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200/60 bg-white/80 px-4 py-2.5 backdrop-blur-xl lg:hidden dark:border-white/5 dark:bg-ink-950/80">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo compact />
          <div className="leading-tight">
            <div className="font-display text-[15px] font-bold">Kilometrówka</div>
            {vehicle && <div className="font-mono text-[10px] tracking-wider text-slate-500">{vehicle.plate}</div>}
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <Link to="/co-nowego" onClick={markSeen} className={cx("rounded-full px-2 py-1 font-mono text-[11px] font-semibold",
            isNew ? "bg-brand-600 text-white" : "text-slate-400")}>v{APP_VERSION}</Link>
          <button className="btn btn-ghost btn-icon" onClick={() => supabase.auth.signOut()} aria-label="Wyloguj">
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-5 pb-32 sm:px-6 lg:px-10 lg:pt-10 lg:pb-14">{children}</main>

      {/* dolne menu – telefon */}
      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-3xl border border-white/60 bg-white/90 p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-2xl shadow-slate-900/15 backdrop-blur-xl lg:hidden dark:border-white/10 dark:bg-ink-900/90">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cx(
            "relative flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[10.5px] font-semibold transition",
            isActive ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900" : "text-slate-500 dark:text-slate-400",
          )}>
            <Icon className="size-5" /> {label} {dot(to)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
