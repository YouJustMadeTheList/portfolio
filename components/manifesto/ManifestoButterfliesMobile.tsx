"use client";

import { useEffect, useRef, type RefObject } from "react";
import { FOREWING, HINDWING, butterflySlotsLite, type Pt, type Slot } from "./butterflyShape";

/* ============================================================================
   03 MANIFESTO · MOBILE — le farfalle di numeri, versione tascabile
   ----------------------------------------------------------------------------
   Stesso racconto della versione desktop (DataButterflies) — le cifre escono
   dalla faglia, si ordinano in sagoma, si fondono in farfalla e volano via
   oltre il bordo — ma con il budget di un telefono:

     · UN canvas 2D a dpr 1 (niente WebGL: sulla pagina mobile l'unico
       contesto GL è l'hero). La faglia è CSS (vedi ManifestoMobile).
     · ≤ 2 farfalle contemporaneamente, 18 glifi l'una, + ≤ 4 cifre libere:
       tetto rigido di 40 glifi. Ogni glifo è un drawImage da un atlante
       cotto una volta (alone già dentro): niente fillText né shadowBlur a
       runtime.
     · 30 fps: il volo è lento, il doppio dei frame non si vedrebbe ma si
       pagherebbe in batteria.
     · rAF SOLO con la sezione a schermo (IntersectionObserver) e scheda
       visibile (visibilitychange). Misure al resize (ResizeObserver), mai nel
       loop: zero letture di layout per frame.
     · reduced-motion: nessun rAF — un solo fotogramma (una farfalla posata
       sulla faglia), ridisegnato solo al resize.
   ========================================================================== */

type Props = {
  reducedMotion: boolean;
  /** Il testo: dentro il suo rettangolo i glifi si attenuano (contrasto AA). */
  avoidRef: RefObject<HTMLElement | null>;
  /** Geometria della faglia CSS, in px dal bordo alto del canvas. */
  rift: { cxFrac: number; cy: number; angleDeg: number };
};

/** Il canvas sborda sopra la sezione: le farfalle escono "dalla pagina". */
export const MOBILE_BUTTERFLY_BLEED = 72;

const DIGITS = "0123456789";
const CELL = 22; // px, dpr 1
const FONT = 11;
const MAX_GLYPHS = 40;
const MAX_SWARMS = 2;
const FRAME_MS = 1000 / 30;
const SPAWN_EVERY = 3.4; // s — con un ciclo di ~6.5s restano 1–2 farfalle in aria
const T_GATHER = 1.3;
const T_FUSE = 1.9;
const T_WAKE = 2.5;

const SLOTS: Slot[] = butterflySlotsLite();

type Swarm = {
  t: number;
  cx: number;
  cy: number;
  x: number;
  y: number;
  S: number;
  /** direzione di volo (−1 sinistra, +1 destra) e quota */
  dir: number;
  flap: number;
  /** origini delle cifre sul filo della faglia */
  ox: Float32Array;
  oy: Float32Array;
  d: Uint8Array;
  alive: boolean;
};

type Free = { x: number; y: number; vx: number; vy: number; age: number; life: number; d: number };

function bakeAtlas(family: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = CELL * (DIGITS.length + 1);
  c.height = CELL * 2;
  const g = c.getContext("2d");
  if (!g) return c;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `500 ${FONT}px ${family}`;
  for (let row = 0; row < 2; row += 1) {
    for (let i = 0; i < DIGITS.length; i += 1) {
      const x = i * CELL + CELL / 2;
      const y = row * CELL + CELL / 2 + 0.5;
      g.shadowColor = row === 0 ? "rgba(63,233,204,0.8)" : "rgba(168,255,238,0.95)";
      g.shadowBlur = row === 0 ? 5 : 8;
      g.fillStyle = row === 0 ? "#6FF7DE" : "#EFFFFB";
      g.fillText(DIGITS[i], x, y);
      g.shadowBlur = 0;
      g.fillText(DIGITS[i], x, y);
    }
  }
  // disco di luce per il lampo di fusione
  const gx = DIGITS.length * CELL + CELL / 2;
  const grad = g.createRadialGradient(gx, CELL / 2, 0, gx, CELL / 2, CELL / 2);
  grad.addColorStop(0, "rgba(168,255,238,0.9)");
  grad.addColorStop(0.35, "rgba(63,233,204,0.35)");
  grad.addColorStop(1, "rgba(10,47,63,0)");
  g.fillStyle = grad;
  g.fillRect(DIGITS.length * CELL, 0, CELL, CELL);
  return c;
}

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export function ManifestoButterfliesMobile({ reducedMotion, avoidRef, rift }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !host || !ctx) return;

    const family =
      getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || "monospace";
    let atlas = bakeAtlas(family);
    // il font mono può arrivare dopo il primo effetto: ricuoci una volta
    document.fonts?.ready.then(() => {
      atlas = bakeAtlas(family);
      if (reducedMotion) drawStatic();
    });

    let W = 0;
    let H = 0;
    // rettangolo del testo nel sistema del canvas
    let tx0 = 0;
    let ty0 = 0;
    let tx1 = 0;
    let ty1 = 0;
    // la faglia: punto centrale + direzione unitaria
    let rcx = 0;
    let rcy = 0;
    const ang = (rift.angleDeg * Math.PI) / 180;
    const rdx = Math.cos(ang);
    const rdy = Math.sin(ang);

    const measure = () => {
      const r = host.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(canvas.getBoundingClientRect().height));
      canvas.width = W; // dpr 1, voluto
      canvas.height = H;
      rcx = W * rift.cxFrac;
      rcy = rift.cy;
      const t = avoidRef.current?.getBoundingClientRect();
      const c = canvas.getBoundingClientRect();
      if (t) {
        tx0 = t.left - c.left - 6;
        ty0 = t.top - c.top - 6;
        tx1 = t.right - c.left + 6;
        ty1 = t.bottom - c.top + 6;
      }
    };

    const dimAt = (x: number, y: number) => (x > tx0 && x < tx1 && y > ty0 && y < ty1 ? 0.28 : 1);

    const swarms: Swarm[] = [];
    const free: Free[] = [];
    let spawnClock = 0.6;
    let flip = Math.random() < 0.5 ? -1 : 1;

    const spawnSwarm = () => {
      const n = SLOTS.length;
      const ox = new Float32Array(n);
      const oy = new Float32Array(n);
      const d = new Uint8Array(n);
      // tratto di faglia da cui trasudano le cifre
      const along = (Math.random() - 0.5) * Math.min(W, 320) * 0.5;
      for (let i = 0; i < n; i += 1) {
        const s = along + (Math.random() - 0.5) * 70;
        ox[i] = rcx + rdx * s + (Math.random() - 0.5) * 6;
        oy[i] = rcy + rdy * s + (Math.random() - 0.5) * 6;
        d[i] = (Math.random() * 10) | 0;
      }
      flip = -flip;
      // la farfalla si compone poco sopra la faglia, nel "palco" alto della sezione
      const cx = Math.min(W - 40, Math.max(40, rcx + rdx * along - flip * 30));
      const cy = Math.max(28, rcy + rdy * along - 34);
      swarms.push({
        t: 0,
        cx,
        cy,
        x: cx,
        y: cy,
        S: 25 + Math.random() * 7,
        dir: flip,
        flap: Math.random() * 6,
        ox,
        oy,
        d,
        alive: true,
      });
    };

    const drawGlyph = (d: number, hot: number, x: number, y: number, a: number, s: number) => {
      if (a <= 0.01) return;
      ctx.globalAlpha = a * dimAt(x, y);
      const sz = CELL * s;
      ctx.drawImage(atlas, d * CELL, hot > 0.5 ? CELL : 0, CELL, CELL, x - sz / 2, y - sz / 2, sz, sz);
    };

    const wingPath = (poly: readonly Pt[], x: number, y: number, S: number, fold: number, side: number) => {
      ctx.moveTo(x + poly[0][0] * S * fold * side, y + poly[0][1] * S);
      for (let i = 1; i < poly.length; i += 1) {
        ctx.lineTo(x + poly[i][0] * S * fold * side, y + poly[i][1] * S);
      }
      ctx.closePath();
    };

    const drawSwarm = (sw: Swarm) => {
      const t = sw.t;
      // 0 → 1: cifre dalla faglia alla sagoma (sagoma larga)
      const gather = ease(t / T_GATHER);
      // la sagoma si stringe fino alla fusione
      const tight = ease((t - T_GATHER) / (T_FUSE - T_GATHER));
      const spread = 1.2 - 0.2 * tight;
      const fused = t >= T_FUSE;
      const flash = fused ? Math.max(0, 1 - (t - T_FUSE) / 0.45) : 0;
      // battito: lento al risveglio, poi regolare
      const flapPhase = sw.flap + Math.max(0, t - T_FUSE) * (t > T_WAKE ? 7.5 : 3.2);
      const fold = fused ? 0.3 + 0.7 * Math.abs(Math.cos(flapPhase)) : 1;
      // uscita: dissolvenza sugli ultimi 40px prima del bordo
      const edge = Math.min(sw.x + sw.S, W - sw.x + sw.S, sw.y + sw.S);
      const fadeOut = Math.min(1, Math.max(0, edge / 40));
      const S = sw.S * spread;

      if (fused) {
        const memA = Math.min(1, (t - T_FUSE) / 0.3) * 0.22 * fadeOut * dimAt(sw.x, sw.y);
        ctx.globalAlpha = memA;
        ctx.beginPath();
        wingPath(FOREWING, sw.x, sw.y, S, fold, 1);
        wingPath(FOREWING, sw.x, sw.y, S, fold, -1);
        wingPath(HINDWING, sw.x, sw.y, S, fold, 1);
        wingPath(HINDWING, sw.x, sw.y, S, fold, -1);
        ctx.fill();
        if (flash > 0) {
          ctx.globalAlpha = flash * 0.8 * dimAt(sw.x, sw.y);
          const r = S * 2.4;
          ctx.drawImage(atlas, DIGITS.length * CELL, 0, CELL, CELL, sw.x - r, sw.y - r, r * 2, r * 2);
        }
      }

      for (let i = 0; i < SLOTS.length; i += 1) {
        const sl = SLOTS[i];
        const fx = sl.wing ? sl.x * fold : sl.x;
        const tx = sw.x + fx * S;
        const ty = sw.y + sl.y * S;
        // arrivi scaglionati: ogni cifra parte un po' dopo la precedente
        const k = ease((gather * 1.6 - (i / SLOTS.length) * 0.6) / 1);
        const x = sw.ox[i] + (tx - sw.ox[i]) * k;
        const y = sw.oy[i] + (ty - sw.oy[i]) * k - Math.sin(k * Math.PI) * 14;
        const hot = t < 0.25 || (t > T_FUSE - 0.2 && t < T_FUSE + 0.35) ? 1 : 0;
        const a = Math.min(1, t / 0.25) * (fused ? 0.9 : 0.75) * fadeOut;
        drawGlyph(sw.d[i], hot, x, y, a, sl.wing ? 0.9 : 0.75);
      }
    };

    const step = (dt: number) => {
      spawnClock -= dt;
      if (spawnClock <= 0 && swarms.length < MAX_SWARMS) {
        spawnSwarm();
        spawnClock = SPAWN_EVERY * (0.85 + Math.random() * 0.3);
      }
      for (const sw of swarms) {
        sw.t += dt;
        if (sw.t > T_WAKE) {
          // volo: curva ascendente e laterale, accelera dolcemente
          const f = sw.t - T_WAKE;
          const v = 26 + f * 22;
          sw.x += sw.dir * v * 0.85 * dt;
          sw.y -= (v * 0.55 + Math.sin(f * 2.2) * 10) * dt;
        } else if (sw.t > T_FUSE) {
          sw.y = sw.cy - Math.sin(((sw.t - T_FUSE) / (T_WAKE - T_FUSE)) * Math.PI) * 3;
        }
        if (sw.x < -sw.S * 2 || sw.x > W + sw.S * 2 || sw.y < -sw.S * 2) sw.alive = false;
        // una cifra ogni tanto cambia: sono dati, non decorazione
        if (Math.random() < dt * 1.5) sw.d[(Math.random() * sw.d.length) | 0] = (Math.random() * 10) | 0;
      }
      for (let i = swarms.length - 1; i >= 0; i -= 1) if (!swarms[i].alive) swarms.splice(i, 1);

      // poche cifre libere che trasudano dal filo (entro il tetto dei 40 glifi)
      const budget = MAX_GLYPHS - swarms.length * SLOTS.length;
      if (free.length < Math.min(4, budget) && Math.random() < dt * 2.2) {
        const s = (Math.random() - 0.5) * Math.min(W, 360);
        free.push({
          x: rcx + rdx * s,
          y: rcy + rdy * s,
          vx: (Math.random() - 0.5) * 8,
          vy: -6 - Math.random() * 8,
          age: 0,
          life: 2.2 + Math.random() * 1.4,
          d: (Math.random() * 10) | 0,
        });
      }
      for (let i = free.length - 1; i >= 0; i -= 1) {
        const g = free[i];
        g.age += dt;
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        if (g.age > g.life) free.splice(i, 1);
      }
    };

    const draw = () => {
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgb(63,233,204)";
      for (const g of free) {
        const k = g.age / g.life;
        drawGlyph(g.d, k < 0.15 ? 1 : 0, g.x, g.y, Math.sin(k * Math.PI) * 0.55, 0.8);
      }
      for (const sw of swarms) drawSwarm(sw);
      ctx.globalAlpha = 1;
    };

    function drawStatic() {
      measure();
      swarms.length = 0;
      free.length = 0;
      spawnSwarm();
      const sw = swarms[0];
      sw.t = T_FUSE + 0.8; // posata, ali aperte, senza lampo
      sw.flap = 0;
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

    // solo i cambi di LARGHEZZA contano (la barra URL di iOS cambia l'altezza
    // del viewport, non quella della sezione)
    let lastW = 0;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w === lastW) return;
      lastW = w;
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
