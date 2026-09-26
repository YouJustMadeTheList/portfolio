import type { ReactNode } from "react";
import type { SectionRow } from "@/lib/analytics/queries";
import { fmtDuration, fmtNum, fmtPct, sectionLabel } from "../_lib/format";

export function Card({
  title,
  subtitle,
  children,
  className = "",
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`admin-card min-w-0 p-5 sm:p-6 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-[15px] font-medium tracking-[-0.01em] text-[var(--text-hi)]">{title}</h2>
          {subtitle ? <p className="mt-1 text-[12px] leading-snug text-[var(--text-low)]">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** Delta rispetto al periodo precedente: freccia + testo, mai solo colore. */
export function Delta({ now, prev, invert = false, pct = true }: { now: number; prev: number; invert?: boolean; pct?: boolean }) {
  if (!prev && !now) return <span className="text-[var(--text-low)]">—</span>;
  if (!prev) return <span className="text-[var(--text-low)]">nuovo</span>;
  const diff = pct ? (now - prev) / prev : now - prev;
  if (Math.abs(diff) < 0.005) return <span className="text-[var(--text-low)]">= periodo prec.</span>;
  const up = diff > 0;
  const good = invert ? !up : up;
  return (
    <span className="inline-flex items-center gap-1" style={{ color: good ? "var(--good)" : "var(--bad)" }}>
      <svg aria-hidden="true" width="9" height="9" viewBox="0 0 10 10" className={up ? "" : "rotate-180"}>
        <path d="M5 1l4 6H1z" fill="currentColor" />
      </svg>
      <span className="tabular-nums">{pct ? fmtPct(Math.abs(diff)) : `${fmtPct(Math.abs(diff), 1)}`}</span>
      <span className="text-[var(--text-low)]">vs prec.</span>
    </span>
  );
}

export function Kpi({ label, value, delta, hint }: { label: string; value: string; delta?: ReactNode; hint?: string }) {
  return (
    <div className="admin-card flex flex-col gap-1.5 p-4" title={hint}>
      <p className="text-[12px] text-[var(--text-mid)]">{label}</p>
      <p className="font-[family-name:var(--font-display)] text-[1.65rem] font-medium leading-none tracking-[-0.02em] text-[var(--text-hi)]">{value}</p>
      <p className="min-h-[1.2em] font-[family-name:var(--font-mono)] text-[10.5px]">{delta}</p>
    </div>
  );
}

export function Empty({ children = "Nessun dato nel periodo." }: { children?: ReactNode }) {
  return <p className="py-6 text-center text-[13px] text-[var(--text-low)]">{children}</p>;
}

export function BarList({
  rows,
  total,
  emptyText,
}: {
  rows: { label: ReactNode; value: number; key: string; sub?: ReactNode }[];
  total?: number;
  emptyText?: string;
}) {
  if (rows.length === 0) return <Empty>{emptyText}</Empty>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="-mx-2 space-y-0.5">
      {rows.map((r) => (
        <li
          key={r.key}
          className="admin-row rounded-[var(--radius-sm)] px-2 py-1.5"
          title={`${typeof r.label === "string" ? r.label : r.key}: ${fmtNum(r.value)}${total ? ` (${fmtPct(r.value / total)})` : ""}`}
        >
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-[var(--text-hi)]">{r.label}</span>
            <span className="shrink-0 tabular-nums text-[var(--text-mid)]">
              {fmtNum(r.value)}
              {total ? <span className="ml-2 inline-block w-10 text-right text-[var(--text-low)]">{fmtPct(r.value / total)}</span> : null}
            </span>
          </div>
          {r.sub ? <p className="truncate text-[11px] text-[var(--text-low)]">{r.sub}</p> : null}
          <div className="mt-1 h-[6px] w-full">
            <div className="admin-bar h-full rounded-r-[4px] bg-[var(--chart-1)]" style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Imbuto delle sezioni in ordine di pagina: raggiungimento, calo, permanenza. */
export function SectionFunnel({ rows, homePageviews }: { rows: SectionRow[]; homePageviews: number }) {
  if (rows.length === 0 || homePageviews === 0) return <Empty>Nessuna sezione vista nel periodo.</Empty>;
  const maxDwell = Math.max(...rows.map((r) => r.avgDwellMs), 1);
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="admin-table min-w-[640px]">
        <thead>
          <tr>
            <th className="w-8">#</th>
            <th>Sezione</th>
            <th className="w-[38%]">Raggiunta (% pagine viste home)</th>
            <th className="num">Calo</th>
            <th className="w-[20%]">Permanenza media</th>
            <th className="num" title="Sessioni con consenso che hanno visto la sezione">% sessioni</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const prev = i > 0 ? rows[i - 1]!.reach : null;
            const drop = prev != null ? r.reach - prev : null;
            return (
              <tr key={r.section} className="admin-row">
                <td className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--text-low)] tabular-nums">{String(i + 1).padStart(2, "0")}</td>
                <td className="whitespace-nowrap text-[var(--text-hi)]">{sectionLabel(r.section)}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="h-[8px] flex-1">
                      <div className="admin-bar h-full rounded-r-[4px] bg-[var(--chart-1)]" style={{ width: `${Math.max(1, r.reach * 100)}%` }} />
                    </div>
                    <span className="w-11 text-right tabular-nums text-[var(--text-hi)]">{fmtPct(r.reach)}</span>
                  </div>
                </td>
                <td className="num text-[12px]">
                  {drop == null ? (
                    <span className="text-[var(--text-low)]">—</span>
                  ) : drop < -0.005 ? (
                    <span style={{ color: "var(--bad)" }}>▼ {fmtPct(-drop)}</span>
                  ) : drop > 0.005 ? (
                    <span style={{ color: "var(--good)" }}>▲ {fmtPct(drop)}</span>
                  ) : (
                    <span className="text-[var(--text-low)]">=</span>
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="h-[8px] flex-1">
                      <div className="admin-bar h-full rounded-r-[4px] bg-[var(--chart-1)] opacity-60" style={{ width: `${Math.max(1, (r.avgDwellMs / maxDwell) * 100)}%` }} />
                    </div>
                    <span className="w-14 text-right tabular-nums text-[var(--text-mid)]">{fmtDuration(r.avgDwellMs)}</span>
                  </div>
                </td>
                <td className="num text-[var(--text-mid)]">{r.sessionReach == null ? "—" : fmtPct(r.sessionReach)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Barra di proporzione a un solo valore (es. quota con consenso). */
export function Meter({ ratio, label }: { ratio: number; label: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12px] text-[var(--text-mid)]">
        <span>{label}</span>
        <span className="tabular-nums text-[var(--text-hi)]">{fmtPct(ratio)}</span>
      </div>
      <div className="mt-1.5 h-[8px] w-full rounded-full bg-[rgb(var(--aqua-rgb)/0.1)]">
        <div className="h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }} />
      </div>
    </div>
  );
}
