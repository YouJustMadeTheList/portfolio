"use client";

import { useNearViewport } from "@/lib/hooks/useNearViewport";
import { useEffect, useRef, useState } from "react";

/**
 * Il Dealer — figura di SCENA della sezione Metodo, a sinistra del mazzo.
 *
 * Una fotografia trattata con `scripts/stylize-dealer.py`: solo contorni in
 * aqua su vetro scuro traslucido (`public/dealer/dealer.webp`) più un livello
 * di sole linee (`dealer-lines.webp`) che qui diventa alone luminoso sfocato.
 * Finché i file non esistono il componente non disegna nulla.
 *
 * Strati, dal fondo:
 *   1. pulviscolo di stelle (canvas) — fitto sulla figura, rado lontano;
 *   2. la figura, divisa in due con maschere complementari sfumate: il corpo
 *      e l'avambraccio alzato, che ruota di pochi gradi attorno al gomito;
 *   3. per ciascuna parte, l'alone: le linee sfocate e schiarite in `screen`;
 *   4. scintille (stesso canvas) che nascono SUI contorni e se ne staccano.
 *
 * Braccio e scintille sono guidati dallo stesso requestAnimationFrame, così
 * le scintille del braccio seguono il braccio. Solo sfondo: pointer-events
 * none, nessun legame col mazzo. In pausa fuori viewport / a scheda nascosta;
 * sotto reduced motion un solo fotogramma statico, senza movimento.
 */
export const DEALER_SRC = "/dealer/dealer.webp";
export const DEALER_LINES_SRC = "/dealer/dealer-lines.webp";
/* Varianti ridotte (stessa grafica): il browser sceglie in base alla
   larghezza reale della figura (≈ 51vw − 272px, vedi MethodSection) e al dpr. */
const DEALER_SRCSET = "/dealer/dealer-560.webp 560w, /dealer/dealer-840.webp 840w, /dealer/dealer.webp 1121w";
const DEALER_LINES_SRCSET = "/dealer/dealer-lines-560.webp 560w, /dealer/dealer-lines.webp 1121w";
const DEALER_LINES_SMALL = "/dealer/dealer-lines-560.webp";
const DEALER_SIZES = "(min-width: 1024px) calc(51vw - 272px), 1px";

/* --------------------------------------------------------------------------
   Il braccio alzato (coordinate normalizzate sull'immagine rifilata).
   Poligono che racchiude mano, mazzetto e avambraccio; il perno è il gomito.
   -------------------------------------------------------------------------- */
const ARM_POLY: Array<[number, number]> = [
  [0.0, 0.15],
  [0.33, 0.15],
  [0.33, 0.265],
  [0.415, 0.285],
  [0.415, 0.445],
  [0.3, 0.47],
  [0.21, 0.68],
  [0.0, 0.7],
];
const ARM_PIVOT: [number, number] = [0.12, 0.78];
/** Ampiezza del gesto, in gradi, e periodo in secondi. */
const ARM_AMP = 1.8;
const ARM_PERIOD = 6.2;

function armAngle(t: number) {
  // un respiro del braccio con un piccolo "colpo di polso" nel mezzo del ciclo:
  // mai un pendolo meccanico, mai un tremolio
  const p = (t / ARM_PERIOD) * Math.PI * 2;
  return ARM_AMP * (0.75 * Math.sin(p) + 0.25 * Math.sin(2 * p + 0.8));
}

function polySvg(fillInside: boolean) {
  const pts = ARM_POLY.map(([x, y]) => `${x * 100},${y * 100}`).join(" ");
  const body = fillInside
    ? `<polygon points='${pts}' fill='white' filter='url(%23b)'/>`
    : `<rect x='-10' y='-10' width='120' height='120' fill='white'/><polygon points='${pts}' fill='black' filter='url(%23b)'/>`;
  return `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><defs><filter id='b' x='-20%' y='-20%' width='140%' height='140%'><feGaussianBlur stdDeviation='1.3'/></filter></defs>${body}</svg>")`;
}
const MASK_ARM = polySvg(true);
const MASK_BODY = polySvg(false);

function pointInPoly(x: number, y: number) {
  let inside = false;
  for (let i = 0, j = ARM_POLY.length - 1; i < ARM_POLY.length; j = i++) {
    const [xi, yi] = ARM_POLY[i];
    const [xj, yj] = ARM_POLY[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function Dealer({ reducedMotion }: { reducedMotion: boolean }) {
  const [ok, setOk] = useState(true);
  const armRef = useRef<HTMLDivElement>(null);
  if (!ok) return null;

  const layers = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={DEALER_SRC} srcSet={DEALER_SRCSET} sizes={DEALER_SIZES} alt="" draggable={false} loading="lazy" decoding="async" className="dealer-img" onError={() => setOk(false)} />
      {/* alone largo: linee molto sfocate e schiarite */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={DEALER_LINES_SMALL} alt="" draggable={false} loading="lazy" decoding="async" className="dealer-glow dealer-glow--wide" />
      {/* alone stretto: il contorno "offuscato" subito attorno alla linea */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={DEALER_LINES_SRC} srcSet={DEALER_LINES_SRCSET} sizes={DEALER_SIZES} alt="" draggable={false} loading="lazy" decoding="async" className="dealer-glow dealer-glow--near" />
    </>
  );

  return (
    <div className="dealer-root" data-reduced={reducedMotion ? "true" : "false"} aria-hidden="true">
      <style>{CSS}</style>
      <div className="dealer-figure">
        <div className="dealer-part" style={{ WebkitMaskImage: MASK_BODY, maskImage: MASK_BODY }}>
          {layers}
        </div>
        <div
          ref={armRef}
          className="dealer-part dealer-arm"
          style={{
            WebkitMaskImage: MASK_ARM,
            maskImage: MASK_ARM,
            transformOrigin: `${ARM_PIVOT[0] * 100}% ${ARM_PIVOT[1] * 100}%`,
          }}
        >
          {layers}
        </div>
      </div>
      <Particles reducedMotion={reducedMotion} armRef={armRef} />
    </div>
  );
}

/* ============================================================================
   Canvas: pulviscolo di stelle + scintille dai contorni + guida del braccio.
   ========================================================================== */
type Star = { x: number; y: number; r: number; a: number; ph: number; sp: number; hue: number };
type Spark = { u: number; v: number; arm: boolean; dx: number; dy: number; age: number; life: number; r: number; hue: number };

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STAR_COLORS = ["223,255,248", "168,255,238", "111,247,222", "63,233,204"];

/** Il canvas sborda attorno alla figura: riquadro dell'immagine al suo interno. */
const BOX = { x0: 0.125, x1: 0.75, y0: 0.143, y1: 0.857 };

function Particles({
  reducedMotion,
  armRef,
}: {
  reducedMotion: boolean;
  armRef: React.RefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  // stelle, contorni e scintille si preparano solo quando il mazzo è vicino
  const near = useNearViewport(ref);

  useEffect(() => {
    const canvas = ref.current;
    if (!near || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stars: Star[] = [];
    let contour: Array<[number, number]> = []; // punti dei contorni, normalizzati
    const sparks: Spark[] = [];
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const rnd = mulberry32(90210);

    /* --- pulviscolo --- */
    const build = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const srnd = mulberry32(7331);
      const bx0 = w * BOX.x0, bx1 = w * BOX.x1, by0 = h * BOX.y0, by1 = h * BOX.y1;
      const sigma = Math.max(w, h) * 0.12;
      const n = Math.round(Math.min(1000, (w * h) / 420));
      stars = [];
      let guard = 0;
      while (stars.length < n && guard++ < n * 40) {
        const x = srnd() * w;
        const y = srnd() * h;
        const dist = Math.hypot(Math.max(bx0 - x, 0, x - bx1), Math.max(by0 - y, 0, y - by1));
        const near = Math.exp(-dist / sigma);
        if (srnd() > 0.12 + 0.88 * near) continue;
        const big = srnd() < 0.06 * near + 0.008;
        stars.push({
          x,
          y,
          r: big ? 1.1 + srnd() * 1.1 : 0.35 + srnd() * 0.8,
          a: Math.min(1, (0.12 + 0.8 * near) * (0.55 + srnd() * 0.5)),
          ph: srnd() * Math.PI * 2,
          sp: 0.4 + srnd() * 1.3,
          hue: Math.floor(srnd() * STAR_COLORS.length),
        });
      }
    };

    /* --- i contorni: letti una volta dal livello di sole linee --- */
    const img = new Image();
    img.decoding = "async";
    img.src = DEALER_LINES_SMALL; // campionato a 260px: la variante piccola basta
    img.onload = () => {
      const sw = 260;
      const sh = Math.round((img.height / img.width) * sw);
      const off = document.createElement("canvas");
      off.width = sw;
      off.height = sh;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;
      octx.drawImage(img, 0, 0, sw, sh);
      const data = octx.getImageData(0, 0, sw, sh).data;
      const pts: Array<[number, number]> = [];
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          if (data[(y * sw + x) * 4 + 3] > 110) pts.push([(x + 0.5) / sw, (y + 0.5) / sh]);
        }
      }
      contour = pts;
    };

    /* coordinate immagine → canvas, applicando la rotazione del braccio */
    const toCanvas = (u: number, v: number, arm: boolean, angDeg: number): [number, number] => {
      if (arm && angDeg) {
        const a = (angDeg * Math.PI) / 180;
        const iw = w * (BOX.x1 - BOX.x0);
        const ih = h * (BOX.y1 - BOX.y0);
        const px = (u - ARM_PIVOT[0]) * iw;
        const py = (v - ARM_PIVOT[1]) * ih;
        u = ARM_PIVOT[0] + (px * Math.cos(a) - py * Math.sin(a)) / iw;
        v = ARM_PIVOT[1] + (px * Math.sin(a) + py * Math.cos(a)) / ih;
      }
      return [w * (BOX.x0 + u * (BOX.x1 - BOX.x0)), h * (BOX.y0 + v * (BOX.y1 - BOX.y0))];
    };

    const spawn = () => {
      if (!contour.length) return;
      const [u, v] = contour[Math.floor(rnd() * contour.length)];
      const ang = rnd() * Math.PI * 2;
      const sp = 4 + rnd() * 10; // px/s: si stacca piano dal contorno
      sparks.push({
        u,
        v,
        arm: pointInPoly(u, v),
        dx: Math.cos(ang) * sp,
        dy: Math.sin(ang) * sp - (4 + rnd() * 8), // leggera deriva verso l'alto
        age: 0,
        life: 1.2 + rnd() * 1.8,
        r: 0.5 + rnd() * 1.0,
        hue: Math.floor(rnd() * 3),
      });
    };

    const draw = (time: number, dt: number) => {
      const t = time / 1000;
      const ang = reducedMotion ? 0 : armAngle(t);
      if (armRef.current) armRef.current.style.transform = ang ? `rotate(${ang.toFixed(3)}deg)` : "";

      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        const tw = reducedMotion ? 1 : 0.62 + 0.38 * Math.sin(t * s.sp + s.ph);
        const alpha = s.a * tw;
        const c = STAR_COLORS[s.hue];
        if (s.r > 1) {
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
          g.addColorStop(0, `rgba(${c},${alpha * 0.55})`);
          g.addColorStop(1, `rgba(${c},0)`);
          ctx.fillStyle = g;
          ctx.fillRect(s.x - s.r * 5, s.y - s.r * 5, s.r * 10, s.r * 10);
        }
        ctx.fillStyle = `rgba(${c},${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (reducedMotion) return;

      // scintille dai contorni: ~55 vive in media
      const target = 55;
      const rate = (target / 2.1) * dt;
      let k = rate;
      while (k > 0) {
        if (rnd() < k) spawn();
        k -= 1;
      }
      ctx.globalCompositeOperation = "lighter";
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.age += dt;
        if (p.age >= p.life) {
          sparks.splice(i, 1);
          continue;
        }
        const [bx, by] = toCanvas(p.u, p.v, p.arm, ang);
        const x = bx + p.dx * p.age;
        const y = by + p.dy * p.age;
        const k2 = p.age / p.life;
        const alpha = Math.sin(Math.PI * k2) * 0.9;
        const c = STAR_COLORS[p.hue];
        const g = ctx.createRadialGradient(x, y, 0, x, y, p.r * 4);
        g.addColorStop(0, `rgba(${c},${alpha})`);
        g.addColorStop(0.35, `rgba(${c},${alpha * 0.35})`);
        g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x - p.r * 4, y - p.r * 4, p.r * 8, p.r * 8);
      }
      ctx.globalCompositeOperation = "source-over";
    };

    build();
    draw(0, 0);
    if (reducedMotion) {
      const onResize = () => { build(); draw(0, 0); };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    let raf = 0;
    let last = 0;
    let inView = false;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
      last = now;
      draw(now, dt);
    };
    const start = () => {
      if (!raf && inView && !document.hidden) {
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const io = new IntersectionObserver(([e]) => {
      inView = !!e?.isIntersecting;
      if (inView) start();
      else stop();
    });
    io.observe(canvas);
    const onVis = () => (document.hidden ? stop() : start());
    const onResize = () => build();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", onResize);
    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
    };
  }, [near, reducedMotion, armRef]);

  return <canvas ref={ref} className="dealer-dust" aria-hidden="true" />;
}

const CSS = `
.dealer-root {
  /* il riquadro coincide con l'immagine: pulviscolo e scintille si misurano su di lei */
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  aspect-ratio: 1121 / 1138;
  pointer-events: none;
  overflow: visible;
}
.dealer-dust {
  position: absolute;
  top: -20%;
  left: -20%;
  width: 160%;
  height: 140%;
  pointer-events: none;
  z-index: 2;
  mix-blend-mode: screen;
}
.dealer-figure {
  position: absolute;
  inset: 0;
  z-index: 1;
  /* dissolve verso il bordo sinistro: è scena, non un riquadro */
  -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 20%, #000 100%);
          mask-image: linear-gradient(to right, transparent 0%, #000 20%, #000 100%);
  transform-origin: 50% 90%;
  animation: dealer-breathe 9s ease-in-out infinite;
}
.dealer-part {
  position: absolute;
  inset: 0;
  -webkit-mask-size: 100% 100%;
          mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
          mask-repeat: no-repeat;
  will-change: transform;
}
.dealer-part > img {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  user-select: none;
}
.dealer-img { opacity: 0.85; }
.dealer-glow { mix-blend-mode: screen; }
.dealer-glow--wide {
  filter: blur(9px) brightness(1.9) saturate(1.2);
  opacity: 0.55;
}
.dealer-glow--near {
  filter: blur(2.2px) brightness(1.5);
  opacity: 0.75;
  animation: dealer-glow-pulse 5.5s ease-in-out infinite;
}
.dealer-root[data-reduced="true"] .dealer-figure,
.dealer-root[data-reduced="true"] .dealer-glow--near { animation: none; }
@keyframes dealer-breathe {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50%      { transform: translate3d(0, -4px, 0) scale(1.008); }
}
@keyframes dealer-glow-pulse {
  0%, 100% { opacity: 0.6; }
  50%      { opacity: 0.9; }
}
`;

export default Dealer;
