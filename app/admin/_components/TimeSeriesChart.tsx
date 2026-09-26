"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Series = { key: string; label: string; color: string; area?: boolean };
type Point = { day: string } & Record<string, number | string>;

const H = 260;
const M = { top: 16, right: 16, bottom: 30, left: 44 };

/** Passo "tondo" (1/2/5 x 10^n), al massimo 5 intervalli: tick sempre puliti. */
function niceStep(max: number): number {
  const raw = Math.max(1, max) / 5;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

const nf = new Intl.NumberFormat("it-IT");
const dayFmt = new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", day: "numeric", month: "short" });
const dayLong = new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", weekday: "short", day: "numeric", month: "long" });
const d = (s: string) => new Date(`${s}T00:00:00Z`);

export function TimeSeriesChart({ points, series, title }: { points: Point[]; series: Series[]; title: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e!.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = points.length;
  const innerW = w - M.left - M.right;
  const innerH = H - M.top - M.bottom;
  const step = useMemo(
    () => niceStep(Math.max(0, ...points.flatMap((p) => series.map((s) => Number(p[s.key]) || 0)))),
    [points, series],
  );
  const maxData = Math.max(0, ...points.flatMap((p) => series.map((s) => Number(p[s.key]) || 0)));
  const intervals = Math.max(1, Math.ceil(maxData / step));
  const max = step * intervals;
  const x = (i: number) => M.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => M.top + innerH - (v / max) * innerH;
  const ticks = Array.from({ length: intervals + 1 }, (_, t) => t * step);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 70))));

  const path = (key: string) => points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(Number(p[key]) || 0).toFixed(1)}`).join("");
  const area = (key: string) => `${path(key)}L${x(n - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = n <= 1 ? 0 : Math.round((px / rect.width) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
    else if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n) - 1));
    else if (e.key === "Escape") setHover(null);
    else return;
    e.preventDefault();
  };

  const hp = hover != null ? points[hover] : null;
  const tipLeft = hover != null ? Math.min(Math.max(x(hover) - 90, 4), w - 184) : 0;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1" aria-hidden="true">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-2 text-[12px] text-[var(--text-mid)]">
            <span className="h-[2px] w-4 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div ref={wrap} className="relative w-full min-w-0 overflow-hidden">
        <svg
          width={w}
          height={H}
          role="img"
          aria-label={`${title}. Usa le frecce per leggere i valori giorno per giorno.`}
          tabIndex={0}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
          className="block overflow-visible outline-none focus-visible:[outline:2px_solid_var(--focus-ring)] rounded-[var(--radius-sm)]"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={w - M.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--chart-axis)" : "var(--chart-grid)"} strokeWidth={1} />
              <text x={M.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-[var(--text-low)] text-[10.5px] tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                {nf.format(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            (i % labelEvery === 0 && (n - 1 - i >= labelEvery || i === 0)) || i === n - 1 ? (
              <text key={p.day} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-[var(--text-low)] text-[10.5px]" style={{ fontFamily: "var(--font-mono)" }}>
                {dayFmt.format(d(p.day))}
              </text>
            ) : null,
          )}
          {series.map((s) => (s.area ? <path key={`a-${s.key}`} d={area(s.key)} fill={s.color} opacity={0.1} /> : null))}
          {series.map((s) => (
            <path key={s.key} d={path(s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {/* end-dot + etichetta diretta sulla prima serie */}
          {n > 0 ? (
            <circle cx={x(n - 1)} cy={y(Number(points[n - 1]![series[0]!.key]) || 0)} r={4} fill={series[0]!.color} stroke="var(--raised)" strokeWidth={2} />
          ) : null}
          {hp ? (
            <g pointerEvents="none">
              <line x1={x(hover!)} x2={x(hover!)} y1={M.top} y2={M.top + innerH} stroke="var(--line-hi)" strokeWidth={1} />
              {series.map((s) => (
                <circle key={s.key} cx={x(hover!)} cy={y(Number(hp[s.key]) || 0)} r={4.5} fill={s.color} stroke="var(--raised)" strokeWidth={2} />
              ))}
            </g>
          ) : null}
          <rect
            x={M.left}
            y={M.top}
            width={Math.max(0, innerW)}
            height={innerH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
        {hp ? (
          <div
            role="status"
            className="pointer-events-none absolute top-2 w-[180px] rounded-[var(--radius-sm)] border border-[var(--line-hi)] bg-[rgb(var(--void-rgb)/0.92)] px-3 py-2.5 shadow-[var(--shadow-float)] backdrop-blur"
            style={{ left: tipLeft }}
          >
            <p className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.1em] text-[var(--text-low)]">
              {dayLong.format(d(hp.day))}
            </p>
            {series.map((s) => (
              <p key={s.key} className="mt-1.5 flex items-center gap-2 text-[12px] text-[var(--text-mid)]">
                <span className="h-[2px] w-3 rounded-full" style={{ background: s.color }} />
                <strong className="font-[family-name:var(--font-display)] text-[15px] font-medium text-[var(--text-hi)] tabular-nums">
                  {nf.format(Number(hp[s.key]) || 0)}
                </strong>
                {s.label.toLowerCase()}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      <details className="mt-3 text-[12px] text-[var(--text-mid)]">
        <summary className="cursor-pointer select-none font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.12em] text-[var(--text-low)] hover:text-[var(--aqua-300)]">
          Vedi come tabella
        </summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Giorno</th>
                {series.map((s) => (
                  <th key={s.key} className="num">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.day}>
                  <td>{dayLong.format(d(p.day))}</td>
                  {series.map((s) => (
                    <td key={s.key} className="num">
                      {nf.format(Number(p[s.key]) || 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
