"use client";

import { useNearViewport } from "@/lib/hooks/useNearViewport";
import { useEffect, useMemo, useRef, useState } from "react";
import { colors } from "@/lib/animation/tokens";
import { CountUp } from "@/components/shared/CountUp";
import type { CaseDataMetric } from "@/content/case-studies";
import styles from "./case-studies.module.css";

export type DataScatterMetric = CaseDataMetric;

export type DataScatterProps = {
  seed: number; // seed fisso per layout scatter deterministico (stesso principio dell'Hero)
  pointCount: number; // 60-90
  metrics: DataScatterMetric[]; // valori già risolti dal detailLevel — [] per "no-numbers"
  reducedMotion: boolean;
  onRevealStart?: () => void;
  /** Non nel contratto §7 letterale — separatore delle migliaia di CountUp. */
  locale?: "it" | "en";
  /** La card è in foreground: fa partire il disegno e tiene vivo il drift. */
  active?: boolean;
  caption: string;
  readout: string;
};

type Point = { x: number; y: number; r: number; accent: boolean; phase: number; period: number };
type Link = { a: number; b: number; d: number };

/** Mulberry32 — PRNG deterministico seedato, stesso principio "seed fisso" dell'Hero. */
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildPoints(seed: number, count: number): Point[] {
  const rand = mulberry32(seed);
  const points: Point[] = [];
  // Cluster centers — dà una lettura "a coorti", non uniforme casuale.
  const clusters = [
    { cx: 0.2, cy: 0.34 },
    { cx: 0.47, cy: 0.66 },
    { cx: 0.7, cy: 0.3 },
    { cx: 0.87, cy: 0.62 },
  ];
  for (let i = 0; i < count; i++) {
    const cluster = clusters[i % clusters.length];
    const spread = 0.13;
    const x = Math.min(0.97, Math.max(0.03, cluster.cx + (rand() - 0.5) * spread * 2));
    const y = Math.min(0.94, Math.max(0.06, cluster.cy + (rand() - 0.5) * spread * 2.4));
    points.push({
      x,
      y,
      r: 1.6 + rand() * 2.4,
      accent: rand() < 0.2,
      phase: rand() * Math.PI * 2,
      period: 4000 + rand() * 2000,
    });
  }
  return points;
}

/** Collegamenti fra punti vicini: il pannello legge come un grafo, non come coriandoli. */
function buildLinks(points: Point[], maxDist: number, perPoint: number): Link[] {
  const links: Link[] = [];
  for (let i = 0; i < points.length; i++) {
    const near: Link[] = [];
    for (let j = i + 1; j < points.length; j++) {
      const d = Math.hypot(points[i].x - points[j].x, (points[i].y - points[j].y) * 0.6);
      if (d < maxDist) near.push({ a: i, b: j, d });
    }
    near.sort((l, r) => l.d - r.d);
    links.push(...near.slice(0, perPoint));
  }
  return links;
}

/** Il pannello è una fascia, non un quadrato: la card non deve crescere in
 *  altezza per ospitarlo. */
const HEIGHT_WIDE = 108;
const HEIGHT_NARROW = 92;

/**
 * Card A — pannello strumento: grafo di cluster/coorti disegnato su canvas 2D,
 * con filamenti e punti che emettono luce aqua (ART-DIRECTION §3 L5: su nero la
 * profondità si fa con la luce). È ILLUSTRATIVO, non un grafico di dati puntuali
 * reali — dichiarato in caption, vedi 04-case-studies.md §5.2.
 *
 * Nessun nome di piattaforma/prodotto interno compare qui (§7/§8).
 */
export function DataScatter({
  seed,
  pointCount,
  metrics,
  reducedMotion,
  onRevealStart,
  locale = "it",
  active = true,
  caption,
  readout,
}: DataScatterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<number>(-1);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const [width, setWidth] = useState(320);

  const height = width < 260 ? HEIGHT_NARROW : HEIGHT_WIDE;
  const points = useMemo(() => buildPoints(seed, pointCount), [seed, pointCount]);
  const links = useMemo(() => buildLinks(points, 0.14, 2), [points]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    setWidth(el.clientWidth || 320);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (active) onRevealStart?.();
  }, [active, onRevealStart]);

  // il canvas si prepara (e il suo loop gira) solo quando la sezione è vicina
  // (margine anche orizzontale: le card del carosello possono stare di lato)
  const near = useNearViewport(wrapRef, "150% 100%");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!near || !canvas || width <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const padX = 10;
    const padY = 12;
    const px = (p: Point, drift: number) => padX + p.x * (width - padX * 2) + drift;
    const py = (p: Point, drift: number) => padY + p.y * (height - padY * 2) + drift * 0.6;

    let raf = 0;
    const start = performance.now();
    const staggerMs = 8;
    const enterMs = 320;

    const render = (now: number) => {
      const elapsed = active ? now - start : Number.POSITIVE_INFINITY;
      const still = reducedMotion || !active;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // posizioni del frame (drift lentissimo, "vita a riposo")
      const xs = new Float32Array(points.length);
      const ys = new Float32Array(points.length);
      const es = new Float32Array(points.length);
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const delay = still ? 0 : i * staggerMs;
        const t = still ? 1 : Math.min(1, Math.max(0, (elapsed - delay) / enterMs));
        es[i] = 1 - Math.pow(1 - t, 3);
        const drift = still ? 0 : Math.sin((elapsed / p.period) * Math.PI * 2 + p.phase) * 1.5;
        xs[i] = px(p, drift);
        ys[i] = py(p, drift);
      }

      // punto sotto il cursore
      let hover = -1;
      const ptr = pointerRef.current;
      if (ptr) {
        let best = 16;
        for (let i = 0; i < points.length; i++) {
          const d = Math.hypot(xs[i] - ptr.x, ys[i] - ptr.y);
          if (d < best) {
            best = d;
            hover = i;
          }
        }
      }
      hoverRef.current = hover;

      // filamenti
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = 1;
      for (const l of links) {
        const e = Math.min(es[l.a], es[l.b]);
        if (e <= 0.02) continue;
        const near = hover === l.a || hover === l.b;
        ctx.strokeStyle = `rgba(63, 233, 204, ${(near ? 0.34 : 0.1) * e})`;
        ctx.beginPath();
        ctx.moveTo(xs[l.a], ys[l.a]);
        ctx.lineTo(xs[l.b], ys[l.b]);
        ctx.stroke();
      }

      // punti, in composite additivo: la sovrapposizione accende i cluster
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < points.length; i++) {
        const e = es[i];
        if (e <= 0.02) continue;
        const p = points[i];
        const isHover = hover === i;
        const r = Math.max(0.4, p.r * e * (isHover ? 1.4 : 1));
        const core = p.accent ? colors.aqua200 : colors.aqua400;

        const halo = ctx.createRadialGradient(xs[i], ys[i], 0, xs[i], ys[i], r * 4.5);
        halo.addColorStop(0, `rgba(63, 233, 204, ${0.32 * e})`);
        halo.addColorStop(1, "rgba(63, 233, 204, 0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(xs[i], ys[i], r * 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = e * (isHover ? 1 : 0.9);
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(xs[i], ys[i], r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = "source-over";

      // il loop vive solo finché la card è in foreground: fuori, zero rAF
      if (!reducedMotion && active) raf = requestAnimationFrame(render);
    };

    if (reducedMotion || !active) {
      render(performance.now());
    } else {
      raf = requestAnimationFrame(render);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [near, width, height, reducedMotion, active, points, links]);

  return (
    <div className={styles.instrument}>
      <div className={styles.instrumentHead}>
        <span className={styles.readout}>{readout}</span>
        <span className={styles.readout} aria-hidden="true">
          ES · QDRANT
        </span>
      </div>

      <div className={styles.instrumentBody} ref={wrapRef}>
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            pointerRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          }}
          onPointerLeave={() => {
            pointerRef.current = null;
          }}
          style={{ display: "block" }}
        />
      </div>

      {metrics.length > 0 ? (
        <dl className={styles.metrics} style={{ marginTop: "var(--space-4)" }}>
          {metrics.slice(1).map((m, i) => (
            <div key={m.label} className={styles.metric}>
              <dt className={styles.metricLabel} title={m.label}>
                {m.label}
              </dt>
              <dd className={styles.metricValue}>
                <CountUp
                  from={0}
                  to={m.value}
                  decimals={m.decimals}
                  prefix={m.prefix}
                  suffix={m.suffix}
                  formatted={m.formatted}
                  durationMs={1200}
                  delayMs={120 + i * 60}
                  locale={locale}
                  reducedMotion={reducedMotion}
                  active={active}
                />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <p className={styles.caption}>{caption}</p>
    </div>
  );
}

export default DataScatter;
