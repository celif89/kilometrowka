import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function PageHeader({ title, subtitle, actions, eyebrow }: {
  title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs font-semibold tracking-wider text-brand-600 uppercase dark:text-brand-300">{eyebrow}</div>}
        <h1 className="text-[28px] leading-tight font-bold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, subtitle, actions, children, className, pad = true, icon }: {
  title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean;
  icon?: ReactNode;
}) {
  return (
    <section className={cx("card", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            {icon && <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">{icon}</div>}
            <div className="min-w-0">
              {title && <h2 className="text-base font-semibold tracking-tight">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
      )}
      <div className={pad ? "p-5 sm:p-6" : "pt-3"}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, icon, tone = "default" }: {
  label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: "default" | "warn" | "good";
}) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        {icon && <span className="text-brand-500 dark:text-brand-300">{icon}</span>}
        {label}
      </div>
      <div className={cx("font-display mt-2 text-2xl font-bold tracking-tight tnum sm:text-[28px]",
        tone === "warn" && "text-amber-600 dark:text-amber-400", tone === "good" && "text-emerald-600 dark:text-emerald-400")}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children, action }: { tone?: "info" | "warn" | "ok" | "error"; children: ReactNode; action?: ReactNode }) {
  const styles = {
    info: "border-sky-200/70 bg-sky-50/80 text-sky-900 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100",
    warn: "border-amber-200/80 bg-amber-50/80 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100",
    ok: "border-emerald-200/80 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100",
    error: "border-red-200 bg-red-50 text-red-900 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-100",
  }[tone];
  const Icon = tone === "ok" ? CheckCircle2 : tone === "info" ? Info : AlertTriangle;
  return (
    <div className={cx("flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm", styles)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </label>
  );
}

/** Pole liczbowe akceptujące przecinek; pusty tekst = null. */
export function NumberInput({ value, onChange, placeholder, suffix, autoFocus, id }: {
  value: number | null; onChange: (v: number | null) => void; placeholder?: string; suffix?: string; autoFocus?: boolean; id?: string;
}) {
  const show = (v: number | null) => (v === null || v === undefined ? "" : String(v).replace(".", ","));
  const [text, setText] = useState(show(value));
  useEffect(() => {
    const parsed = text.trim() === "" ? null : Number(text.replace(/\s/g, "").replace(",", "."));
    if (parsed !== value) setText(show(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className="relative">
      <input
        id={id}
        className={cx("input tnum", suffix && "pr-12")}
        inputMode="decimal"
        type="text"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          const t = e.target.value;
          if (!/^[\d\s]*[.,]?\d*$/.test(t)) return;
          setText(t);
          const raw = t.replace(/\s/g, "").replace(",", ".");
          if (raw === "") onChange(null);
          else if (!Number.isNaN(Number(raw))) onChange(Number(raw));
        }}
      />
      {suffix && <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs font-medium text-slate-400">{suffix}</span>}
    </div>
  );
}

/** Pole tekstowe z listą podpowiedzi (miejsca, cele wyjazdu). */
export function Combobox({ value, onChange, options, placeholder, autoFocus, id }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; autoFocus?: boolean; id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const q = value.trim().toLowerCase();
  const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");
  const fq = fold(q);
  const matches = options
    .filter((o) => o.toLowerCase() !== q && (!fq || fold(o).includes(fq)))
    .slice(0, 8);
  const pick = (v: string) => { onChange(v); setOpen(false); };
  return (
    <div className="relative">
      <input
        id={id}
        className="input"
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-controls={listId}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!open || matches.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % matches.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + matches.length) % matches.length); }
          else if (e.key === "Enter") { e.preventDefault(); pick(matches[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && matches.length > 0 && (
        <ul id={listId} role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-64 animate-pop overflow-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-ink-800">
          {matches.map((m, i) => (
            <li key={m} role="option" aria-selected={i === active}>
              <button type="button"
                className={cx("w-full rounded-xl px-3 py-2 text-left text-sm", i === active ? "bg-brand-50 text-brand-700 dark:bg-white/10 dark:text-white" : "hover:bg-slate-50 dark:hover:bg-white/5")}
                onMouseDown={(e) => { e.preventDefault(); pick(m); }}>
                {m}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-ink-950/50 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx("flex max-h-[92dvh] w-full animate-slide-up flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl dark:bg-ink-900",
        wide ? "sm:max-w-2xl" : "sm:max-w-lg")}
        role="dialog" aria-modal="true">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-200 sm:hidden dark:bg-white/15" />
        <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-2 sm:px-6 sm:pt-5">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button className="btn btn-ghost btn-icon -mr-2" onClick={onClose} aria-label="Zamknij"><X className="size-4" /></button>
        </div>
        <div className="overflow-y-auto px-5 pt-2 pb-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-6 dark:border-white/5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-500">
      <span className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" />
      {label}
    </div>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "brand" | "green" | "amber" | "red" }) {
  const t = {
    slate: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
    brand: "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
    red: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  }[tone];
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", t)}>{children}</span>;
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-road-400/20 text-brand-600 dark:from-brand-500/20 dark:to-road-500/10 dark:text-brand-300">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[];
}) {
  return (
    <div className="inline-flex rounded-2xl bg-slate-200/60 p-1 dark:bg-white/5">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={cx("rounded-xl px-3 py-1.5 text-sm font-medium transition",
            value === o.value ? "bg-white text-slate-900 shadow-sm dark:bg-ink-700 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// --- powiadomienia („toast”) -----------------------------------------------------
interface ToastItem { id: number; text: ReactNode; tone: "ok" | "error" | "info"; action?: { label: string; run: () => void } }
const ToastCtx = createContext<(t: Omit<ToastItem, "id">) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const push = useCallback((t: Omit<ToastItem, "id">) => {
    const id = next.current++;
    setItems((xs) => [...xs, { ...t, id }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), t.action ? 6000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
        {items.map((t) => (
          <div key={t.id} className={cx("pointer-events-auto flex animate-slide-up items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-2xl",
            t.tone === "error" ? "bg-red-600 text-white" : "bg-ink-900 text-white dark:bg-white dark:text-ink-900")}>
            {t.tone === "ok" && <CheckCircle2 className="size-4 text-road-400 dark:text-road-600" />}
            {t.tone === "error" && <AlertTriangle className="size-4" />}
            <span>{t.text}</span>
            {t.action && (
              <button className="rounded-lg px-2 py-1 font-semibold text-brand-300 hover:bg-white/10 dark:text-brand-600 dark:hover:bg-ink-900/10"
                onClick={() => { t.action!.run(); setItems((xs) => xs.filter((x) => x.id !== t.id)); }}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

/** Wspólny wzorzec: wykonaj zapis, przeładuj dane, pokaż błąd. */
export function useAction(reload: () => Promise<void>) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn: () => Promise<unknown>, okText?: ReactNode, undo?: { label: string; run: () => void }) => {
    setBusy(true);
    try {
      await fn();
      await reload();
      if (okText) toast({ text: okText, tone: "ok", action: undo });
      return true;
    } catch (e) {
      toast({ text: e instanceof Error ? e.message : String(e), tone: "error" });
      return false;
    } finally {
      setBusy(false);
    }
  }, [reload, toast]);
  return { busy, run };
}

export function confirmAction(text: string): boolean {
  return window.confirm(text);
}
