import { Bug, Sparkles, Wrench } from "lucide-react";
import { useEffect } from "react";
import { Card, cx, PageHeader } from "../components/ui";
import { APP_VERSION, RELEASES } from "../changelog";
import { dayLabel } from "../lib/format";

const KIND = {
  new: { label: "Nowe", icon: Sparkles, cls: "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200" },
  improved: { label: "Ulepszone", icon: Wrench, cls: "bg-road-400/20 text-road-600 dark:text-road-400" },
  fixed: { label: "Poprawione", icon: Bug, cls: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
} as const;

export function ChangelogPage() {
  useEffect(() => { try { localStorage.setItem("km.seenVersion", APP_VERSION); } catch { /* */ } }, []);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow={`Wersja ${APP_VERSION}`} title="Co nowego" subtitle="Historia zmian w kolejnych wydaniach aplikacji." />
      <ol className="relative space-y-6 border-l-2 border-dashed border-slate-200 pl-6 dark:border-white/10">
        {RELEASES.map((r, i) => (
          <li key={r.version} className="relative">
            <span className={cx("absolute top-6 -left-[33px] size-4 rounded-full border-4 border-slate-100 dark:border-ink-950", i === 0 ? "bg-brand-600" : "bg-slate-300 dark:bg-white/20")} />
            <Card>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl font-bold">
                  v{r.version}
                  {i === 0 && <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 align-middle font-sans text-[11px] font-semibold text-white">aktualna</span>}
                </h2>
                <span className="text-sm text-slate-500">{dayLabel(r.date)}</span>
              </div>
              {r.title && <p className="mt-1 font-medium text-slate-600 dark:text-slate-300">{r.title}</p>}
              <ul className="mt-4 space-y-2.5">
                {r.changes.map((c, j) => {
                  const k = KIND[c.kind];
                  return (
                    <li key={j} className="flex items-start gap-3 text-sm">
                      <span className={cx("mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", k.cls)}>
                        <k.icon className="size-3" /> {k.label}
                      </span>
                      <span>{c.text}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
