"use client";

import { useEffect, useRef, type RefObject } from "react";

/* ============================================================================
   03 MANIFESTO · MOBILE — farfalle di luce
   ----------------------------------------------------------------------------
   Su telefono la farfalla di cifre (desktop, DataButterflies) diventa una
   farfalla vera: sagoma leggera di vetro scuro con il bordo acqua luminoso,
   che affiora dalla faglia, apre le ali e sale via oltre il bordo, lasciando
   un filo di pulviscolo.

     · UN canvas 2D, dpr ≤ 1.5. La farfalla è UNO sprite (mezza farfalla)
       cotto una volta con l'alone dentro: a runtime solo 2 drawImage per
       farfalla (ala destra + specchio), niente shadowBlur né path.
     · ≤ 3 farfalle in aria, 30 fps, rAF SOLO a schermo e a scheda visibile.
     · reduced-motion: un solo fotogramma (una farfalla posata sulla faglia).
   ========================================================================== */

type Props = {
  reducedMotion: boolean;
  /** Il testo: dentro il suo rettangolo le farfalle si attenuano (contrasto AA). */
  avoidRef: RefObject<HTMLElement | null>;
  /** Geometria della faglia CSS, in px dal bordo alto del canvas. */
  rift: { cxFrac: number; cy: number; angleDeg: number; halfLenFrac: number };
};

/** Il canvas sborda sopra la sezione: le farfalle escono "dalla pagina". */
export const MOBILE_BUTTERFLY_BLEED = 72;

const FRAME_MS = 1000 / 30;
const MAX_FLYERS = 3;
const SPAWN_EVERY = 2.9; // s
const T_EMERGE = 1.1; // s: dalla faglia alle ali aperte
const TRAIL = 7;
/** Semi-apertura alare di riferimento in px CSS (apertura totale ≈ 2×). */
const SPAN = 13;
/** Risoluzione dello sprite: lo cuociamo a 3× per restare nitidi a dpr 1.5 e in scala. */
const BAKE = 3;

type Flyer = {
  t: number;
  x: number;
  y: number;
  /** direzione laterale (−1 sinistra, +1 destra) */
  dir: number;
  size: number;
  flap: number;
  flapHz: number;
  sway: number;
  heading: number;
  tx: Float32Array;
  ty: Float32Array;
  head: number;
  alive: boolean;
};

/** Mezza farfalla (lato destro, corpo sull'asse x = 0, testa verso −y). */
function bakeWing(): { img: HTMLCanvasElement; ox: number; oy: number; w: number; h: number } {
  const S = SPAN * BAKE;
  const pad = 6 * BAKE;
  const w = Math.ceil(S * 1.08 + pad * 2);
  const h = Math.ceil(S * 2 + pad * 2);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  const ox = pad; // x del corpo nello sprite
  const oy = pad + S * 1.02; // y del corpo nello sprite
  if (!g) return { img: c, ox, oy, w, h };

  g.translate(ox, oy);
  g.scale(S, S);

  // ala anteriore: ampia, apice appuntito, margine esterno leggermente concavo
  const fore = new Path2D();
  fore.moveTo(0.03, -0.1);
  fore.bezierCurveTo(0.2, -0.56, 0.56, -0.96, 1.02, -0.98);
  fore.bezierCurveTo(1.0, -0.72, 0.86, -0.38, 0.64, -0.14);
  fore.bezierCurveTo(0.44, -0.02, 0.2, 0.0, 0.05, -0.01);
  fore.closePath();

  // ala posteriore: più piccola, tonda, con una breve coda
  const hind = new Path2D();
  hind.moveTo(0.05, 0.01);
  hind.bezierCurveTo(0.46, -0.06, 0.74, 0.14, 0.66, 0.4);
  hind.bezierCurveTo(0.6, 0.58, 0.42, 0.6, 0.3, 0.66);
  hind.bezierCurveTo(0.26, 0.76, 0.24, 0.86, 0.19, 0.9);
  hind.bezierCurveTo(0.14, 0.78, 0.13, 0.66, 0.12, 0.58);
  hind.bezierCurveTo(0.05, 0.42, 0.03, 0.22, 0.03, 0.08);
  hind.closePath();

  // vetro scuro traslucido, acceso verso il corpo
  const fill = g.createRadialGradient(0, 0, 0, 0, 0, 1.05);
  fill.addColorStop(0, "rgba(111,247,222,0.42)");
  fill.addColorStop(0.45, "rgba(63,233,204,0.16)");
  fill.addColorStop(1, "rgba(10,47,63,0.28)");
  g.fillStyle = fill;
  g.fill(fore);
  g.fill(hind);

  // venature appena accennate
  g.strokeStyle = "rgba(168,255,238,0.22)";
  g.lineWidth = (0.6 * BAKE) / S;
  g.beginPath();
  g.moveTo(0.05, -0.06);
  g.quadraticCurveTo(0.46, -0.52, 0.92, -0.9);
  g.moveTo(0.06, -0.04);
  g.quadraticCurveTo(0.5, -0.3, 0.84, -0.5);
  g.moveTo(0.06, 0.04);
  g.quadraticCurveTo(0.36, 0.2, 0.52, 0.5);
  g.stroke();

  // bordo luminoso: alone largo + filo netto
  g.shadowColor = "rgba(63,233,204,0.95)";
  g.shadowBlur = 5 * BAKE;
  g.strokeStyle = "rgba(111,247,222,0.9)";
  g.lineWidth = (1.1 * BAKE) / S;
  g.stroke(fore);
  g.stroke(hind);
  g.shadowBlur = 0;
  g.strokeStyle = "rgba(239,255,251,0.85)";
  g.lineWidth = (0.5 * BAKE) / S;
  g.stroke(fore);
  g.stroke(hind);

  // mezzo corpo + antenna (lo specchio completa l'altra metà)
  g.fillStyle = "rgba(239,255,251,0.9)";
  g.beginPath();
  g.ellipse(0, 0.08, 0.035, 0.34, 0, -Math.PI / 2, Math.PI / 2);
  g.fill();
  g.strokeStyle = "rgba(168,255,238,0.75)";
  g.lineWidth = (0.45 * BAKE) / S;
  g.beginPath();
  g.moveTo(0.01, -0.24);
  g.quadraticCurveTo(0.08, -0.5, 0.2, -0.62);
  g.stroke();
  g.fillStyle = "rgba(239,255,251,0.9)";
  g.beginPath();
  g.arc(0.2, -0.62, 0.028, 0, Math.PI * 2);
  g.fill();

  return { img: c, ox, oy, w, h };
}

/** Punto di luce morbido per scia e bagliore d'uscita. */
function bakeDot(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  if (!g) return c;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(239,255,251,0.95)");
  grad.addColorStop(0.25, "rgba(111,247,222,0.6)");
  grad.addColorStop(1, "rgba(63,233,204,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return c;
}

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));

export function ManifestoButterfliesMobile({ reducedMotion, avoidRef, rift }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !host || !ctx) return;

    const wing = bakeWing();
    const dot = bakeDot();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    let W = 0;
    let H = 0;
    let tx0 = 0;
    let ty0 = 0;
    let tx1 = 0;
    let ty1 = 0;
    let rcx = 0;
    let rcy = 0;
    let rHalf = 0;
    const ang = (rift.angleDeg * Math.PI) / 180;
    const rdx = Math.cos(ang);
    const rdy = Math.sin(ang);

    const measure = () => {
      const r = host.getBoundingClientRect();
      const c = canvas.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(c.height));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      rcx = W * rift.cxFrac;
      rcy = rift.cy;
      rHalf = W * rift.halfLenFrac;
      const t = avoidRef.current?.getBoundingClientRect();
      if (t) {
        tx0 = t.left - c.left - 6;
        ty0 = t.top - c.top - 6;
        tx1 = t.right - c.left + 6;
        ty1 = t.bottom - c.top + 6;
      }
    };

    const dimAt = (x: number, y: number) => (x > tx0 && x < tx1 && y > ty0 && y < ty1 ? 0.3 : 1);

    const flyers: Flyer[] = [];
    let spawnClock = 0.5;
    let flip = Math.random() < 0.5 ? -1 : 1;

    const spawn = () => {
      flip = -flip;
      // un punto del filo, lontano dalle punte sfumate
      const s = (Math.random() * 2 - 1) * rHalf * 0.62;
      const x = rcx + rdx * s;
      const y = rcy + rdy * s;
      const f: Flyer = {
        t: 0,
        x,
        y,
        dir: flip,
        size: 0.8 + Math.random() * 0.35,
        flap: Math.random() * Math.PI * 2,
        flapHz: 2.6 + Math.random() * 0.8,
        sway: Math.random() * Math.PI * 2,
        heading: 0,
        tx: new Float32Array(TRAIL).fill(x),
        ty: new Float32Array(TRAIL).fill(y),
        head: 0,
        alive: true,
      };
      flyers.push(f);
    };

    /** Disegna una farfalla: posizione, rotazione, apertura (0..1), scala, alpha. */
    const drawButterfly = (x: number, y: number, rot: number, open: number, scale: number, a: number) => {
      if (a <= 0.01) return;
      const k = scale / BAKE;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      ctx.globalAlpha = a * dimAt(x, y);
      for (const side of [1, -1]) {
        const sx = k * open * side;
        ctx.setTransform(dpr * cos * sx, dpr * sin * sx, -dpr * sin * k, dpr * cos * k, dpr * x, dpr * y);
        ctx.drawImage(wing.img, -wing.ox, -wing.oy);
      }
    };

    const drawDot = (x: number, y: number, r: number, a: number) => {
      if (a <= 0.01) return;
      ctx.globalAlpha = a * dimAt(x, y);
      ctx.drawImage(dot, x - r, y - r, r * 2, r * 2);
    };

    const step = (dt: number) => {
      spawnClock -= dt;
      if (spawnClock <= 0 && flyers.length < MAX_FLYERS) {
        spawn();
        spawnClock = SPAWN_EVERY * (0.8 + Math.random() * 0.4);
      }
      for (const f of flyers) {
        f.t += dt;
        if (f.t > T_EMERGE * 0.55) {
          // volo: sale e deriva di lato, con un'ondulazione morbida
          const fl = f.t - T_EMERGE * 0.55;
          const v = Math.min(1, fl / 1.2);
          const vx = f.dir * (14 + fl * 5) * v + Math.sin(fl * 1.7 + f.sway) * 16 * v;
          const vy = -(22 + fl * 6) * v + Math.cos(fl * 2.3 + f.sway) * 9 * v;
          f.x += vx * dt;
          f.y += vy * dt;
          // la testa segue la rotta, con inerzia
          const target = Math.atan2(vx, -vy) * 0.55;
          f.heading += (target - f.heading) * Math.min(1, dt * 3);
        }
        f.head = (f.head + 1) % TRAIL;
        f.tx[f.head] = f.x;
        f.ty[f.head] = f.y;
        const m = 40 * f.size;
        if (f.x < -m || f.x > W + m || f.y < -m) f.alive = false;
      }
      for (let i = flyers.length - 1; i >= 0; i -= 1) if (!flyers[i].alive) flyers.splice(i, 1);
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      for (const f of flyers) {
        const e = ease(f.t / T_EMERGE);
        // uscita morbida negli ultimi 36px prima del bordo
        const edge = Math.min(f.x + 20, W - f.x + 20, f.y + 20);
        const fade = Math.min(1, Math.max(0, edge / 36));

        // bagliore sul filo, quando la farfalla affiora
        if (f.t < T_EMERGE) {
          const g = Math.sin(Math.min(1, f.t / T_EMERGE) * Math.PI);
          drawDot(f.x, f.y, 16 * g + 4, 0.55 * g);
        }

        // scia: pochi punti di luce che si spengono
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (f.t > T_EMERGE * 0.6) {
          for (let i = 1; i < TRAIL; i += 1) {
            const j = (f.head - i + TRAIL) % TRAIL;
            const k = 1 - i / TRAIL;
            drawDot(f.tx[j], f.ty[j] + 3, 1.2 + 2.2 * k, 0.32 * k * fade);
          }
        }

        // ali: chiuse all'affioramento, poi battito ampio e lento
        const beat = 0.5 + 0.5 * Math.cos(f.t * f.flapHz * Math.PI * 2 + f.flap);
        const open = (0.18 + 0.82 * (0.22 + 0.78 * beat)) * (0.35 + 0.65 * e);
        drawButterfly(f.x, f.y, f.heading, open, f.size * (0.45 + 0.55 * e), Math.min(1, f.t / 0.35) * fade);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
    };

    function drawStatic() {
      measure();
      flyers.length = 0;
      spawn();
      const f = flyers[0];
      f.x = rcx;
      f.y = rcy - 22;
      f.t = T_EMERGE + 0.2;
      f.flap = 0;
      f.tx.fill(f.x);
      f.ty.fill(f.y);
      draw();
    }

    if (reducedMotion) {
      drawStatic();
      const ro = new ResizeObserver(() => drawStatic());
      ro.observe(host);
      return () => ro.disconnect();
    }

    measure();
    let raf = 0;
    let last = 0;
    let acc = 0;
    let onScreen = false;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!last) last = now;
      acc += now - last;
      last = now;
      if (acc < FRAME_MS) return;
      const dt = Math.min(acc / 1000, 1 / 15);
      acc = 0;
      step(dt);
      draw();
    };
    const start = () => {
      if (raf || !onScreen || document.hidden) return;
      last = 0;
      acc = FRAME_MS;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) start();
        else stop();
      },
      { rootMargin: "80px 0px" },
    );
    io.observe(canvas);

    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);

    // misure ricalcolate quando la sezione cambia davvero taglia (anche in
    // altezza: con content-visibility la prima impaginazione arriva tardi)
    let lastW = 0;
    let lastH = 0;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      const h = Math.round(entries[0].contentRect.height);
      if (w === lastW && Math.abs(h - lastH) < 2) return;
      lastW = w;
      lastH = h;
      measure();
    });
    ro.observe(host);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reducedMotion, avoidRef, rift]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute left-0 w-full"
      style={{
        top: -MOBILE_BUTTERFLY_BLEED,
        height: `calc(100% + ${MOBILE_BUTTERFLY_BLEED}px)`,
        zIndex: 1,
      }}
    />
  );
}
