"use client";

import { useEffect, useRef, type RefObject } from "react";
import {
  AURORA_FRAG,
  AURORA_VERT,
  riftX,
  type RiftParams,
} from "./riftGeometry";
import {
  FOREWING,
  HINDWING,
  butterflySlots,
  type Slot,
} from "./butterflyShape";

/* ============================================================================
   03 MANIFESTO — "la faglia di luce e le farfalle di numeri"
   ----------------------------------------------------------------------------
   Richiesta del cliente (seconda revisione, la prima era un widget a destra):

     «da una faglia di luce a mo' di aurora boreale (colore verde acqua del
      sito) escono piccoli numeri, che si ordinano avvicinandosi tra loro fino
      a fondersi in farfalle che volano via out of bounds della pagina.»
     «l'effetto deve coprire lo spazio vuoto del sito»

   Il racconto, in quattro tempi, perpetuo:
     1. LA FAGLIA — un velo d'aurora aqua attraversa in diagonale tutta la
        sezione (e sborda un poco sopra e sotto, sfumato: niente scatola). È un
        fragment shader a mezza risoluzione su un canvas WebGL di SEZIONE —
        non un secondo fondo a tutto schermo — più un filo incandescente nitido
        disegnato in 2D: la ferita da cui esce la luce.
     2. I NUMERI ne trasudano di continuo: nascono bianchi sul bordo della
        faglia, si raffreddano in aqua, derivano nell'aria.
     3. L'ORDINE — a intervalli uno sciame di 20-34 cifre viene richiamato
        verso un punto: prima si dispongono in una sagoma di farfalla larga e
        rarefatta (già ordinata, ma ancora "dati"), poi la sagoma si stringe,
        le cifre si avvicinano, si scaldano, e con un lampo morbido si FONDONO:
        compare la membrana di luce delle ali.
     4. IL VOLO — la farfalla si sveglia (due battiti lenti), prende quota e
        vola via su una curva lunga fino a uscire dai bordi della pagina,
        battendo le ali (piega in X attorno all'asse del corpo: le cifre si
        comprimono con l'ala) e svanendo mentre esce.
   Più farfalle in stadi diversi, a profondità diverse (dimensione, velocità,
   luminosità), convivono sempre.

   Il testo resta sovrano: il rettangolo della colonna di testo è misurato dal
   vivo e TUTTO (aurora, filo, cifre) vi si attenua dentro — contrasto AA
   garantito; le traiettorie di volo lo evitano.

   COSTO (ART-DIRECTION §7 — il fondo globale è già acceso):
     · aurora: un triangolo a schermo, a 0.5× dei px CSS (≈1/4 dei pixel);
     · glifi: atlante cotto UNA volta (cifre × {freddo, incandescente}, alone
       già dentro), ogni glifo è un drawImage; niente fillText né shadowBlur
       a runtime; tetti per dispositivo (≤150 liberi + ≤5 farfalle desktop,
       circa metà su mobile);
     · dpr ≤ 1.5; un solo rAF; FERMO fuori viewport (IntersectionObserver) e a
       scheda nascosta (visibilitychange);
     · `prefers-reduced-motion`: nessun rAF — un solo fotogramma composto
       (faglia + tre farfalle posate + qualche cifra), ridisegnato solo al resize.
   ========================================================================== */

type DataButterfliesProps = {
  reducedMotion: boolean;
  /** Colonna di testo da rispettare (misurata dal vivo). */
  avoidRef?: RefObject<HTMLElement | null>;
};

/** Quanto il canvas sborda sopra e sotto la sezione (px CSS): la faglia non
    deve leggersi come un riquadro. I bordi sono sfumati da una mask CSS. */
const BLEED = 140;
const NARROW_AT = 760;
const MAX_DT = 1 / 30;
const TAU = Math.PI * 2;

/* ---------------------------------------------------------------- atlante */
const DIGITS = "0123456789";
const ATLAS_FONT = 26; // px nel backing dell'atlante
const ATLAS_CELL = 56;
const ATLAS_SCALE = 2;

/* ------------------------------------------------------ tempi dello sciame */
const T_STREAM = 0.8; // finestra in cui le cifre escono dal tratto di faglia
const T_ORDER = 1.6; // le ultime cifre arrivano: compare la membrana
const T_FUSE = 2.35; // la sagoma si stringe → lampo di fusione
const T_WAKE = 3.1; // due battiti lenti, poi il volo
/** la sagoma, finché si compone, è appena più ampia: alla fusione si stringe */
const SPREAD_LOOSE = 1.18;

type Glyph = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  d: number; // indice cifra
  size: number;
  age: number;
  life: number;
  heat: number; // 1 = incandescente (appena nato / fusione) → 0 = freddo
  seed: number;
  mut: number; // prossimo cambio di cifra
  swarm: Swarm | null;
  slot: number;
  alive: boolean;
  /** viaggio faglia → slot: origine, scarto del punto di controllo, partenza, durata */
  ox: number;
  oy: number;
  kx: number;
  ky: number;
  t0: number;
  fly: number;
};

type Swarm = {
  cx: number;
  cy: number;
  px: number; // centro corrente
  py: number;
  depth: number;
  S: number; // semi-apertura alare (px)
  slots: Slot[];
  taken: boolean[];
  glyphs: Glyph[];
  want: number; // cifre ancora da far uscire dalla faglia
  streamT: number;
  t: number;
  angle: number;
  restAngle: number;
  phase: number;
  path: [number, number][]; // bezier cubica P0..P3
  dur: number;
  alpha: number;
  veerX: number;
  veerY: number;
  flash: number;
  dead: boolean;
  /** scia: ring buffer (x, y, tempo) delle posizioni recenti in volo */
  trail: Float32Array;
  trailHead: number;
  trailN: number;
  sparkT: number;
  /** tratto di faglia da cui escono le cifre (y) e verso del vortice */
  segY: number;
  swirl: number;
  /** volo sinuoso: ampiezza, n. di onde lungo il percorso, fase */
  wAmp: number;
  wFreq: number;
  wPh: number;
};

/** Scintille staccate dalle ali in volo: cifre minuscole che si spengono. */
type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  d: number;
  size: number;
  a: number;
};

const TRAIL_CAP = 48;
const TRAIL_LIFE = 0.7; // s
const MAX_SPARKS = 90;

const rand = Math.random;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => {
  const x = clamp01((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};

function resolveMono(el: HTMLElement): string {
  const fam = getComputedStyle(el).fontFamily;
  return fam && fam.length > 0
    ? fam
    : '"JetBrains Mono", ui-monospace, monospace';
}

/** Atlante: riga 0 = cifre fredde (aqua-300 con alone), riga 1 = incandescenti
    (aqua-100 con alone ampio). Più un disco morbido di luce (cella 10, riga 0). */
function bakeAtlas(family: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  const cell = ATLAS_CELL * ATLAS_SCALE;
  c.width = cell * (DIGITS.length + 1);
  c.height = cell * 2;
  const g = c.getContext("2d");
  if (!g) return c;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `500 ${ATLAS_FONT * ATLAS_SCALE}px ${family}`;
  for (let row = 0; row < 2; row += 1) {
    for (let i = 0; i < DIGITS.length; i += 1) {
      const cx = i * cell + cell / 2;
      const cy = row * cell + cell / 2 + ATLAS_SCALE;
      g.shadowColor =
        row === 0 ? "rgba(63,233,204,0.75)" : "rgba(111,247,222,0.95)";
      g.shadowBlur = (row === 0 ? 9 : 16) * ATLAS_SCALE;
      g.fillStyle = row === 0 ? "#6FF7DE" : "#EFFFFB";
      g.fillText(DIGITS[i], cx, cy);
      g.shadowBlur = 0;
      g.fillText(DIGITS[i], cx, cy);
    }
  }
  // disco di luce (alone delle farfalle e del lampo di fusione)
  const gx = DIGITS.length * cell + cell / 2;
  const grad = g.createRadialGradient(gx, cell / 2, 0, gx, cell / 2, cell / 2);
  grad.addColorStop(0, "rgba(168,255,238,0.9)");
  grad.addColorStop(0.25, "rgba(63,233,204,0.45)");
  grad.addColorStop(0.6, "rgba(15,168,143,0.12)");
  grad.addColorStop(1, "rgba(10,47,63,0)");
  g.fillStyle = grad;
  g.fillRect(DIGITS.length * cell, 0, cell, cell);
  return c;
}

/* ------------------------------------------------------------ aurora (GL) */
type Aurora = {
  draw: (
    t: number,
    rift: RiftParams,
    text: [number, number, number, number],
    dim: [number, number, number],
    cursor: [number, number],
  ) => void;
  resize: (w: number, h: number, scale: number) => void;
  /** true se il contesto è perso o il programma non è (ancora) ricostruito */
  isLost: () => boolean;
  dispose: () => void;
};

/**
 * Il velo d'aurora. Resiste alla perdita del contesto (scheda in background a
 * lungo, GPU sotto pressione, driver resettato): `webglcontextlost` viene
 * intercettato (preventDefault → il browser tenterà il ripristino) e a
 * `webglcontextrestored` programma e buffer vengono ricostruiti da zero —
 * gli oggetti GL del vecchio contesto non valgono più nulla.
 */
function createAurora(
  canvas: HTMLCanvasElement,
  hooks: { onLost: () => void; onRestored: () => void },
): Aurora | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  type Built = {
    prog: WebGLProgram;
    vs: WebGLShader;
    fs: WebGLShader;
    buf: WebGLBuffer | null;
    u: Record<string, WebGLUniformLocation | null>;
  };
  let built: Built | null = null;
  let lost = false;
  let W = 1;
  let H = 1;
  let SC = 0.5;

  const build = (): Built | null => {
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        if (!gl.isContextLost())
          console.warn("[manifesto] aurora shader:", gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, AURORA_VERT);
    const fs = compile(gl.FRAGMENT_SHADER, AURORA_FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return null;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "aPos");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(prog);
    const u: Built["u"] = {};
    for (const n of [
      "uRes",
      "uScale",
      "uT",
      "uRift",
      "uText",
      "uDim",
      "uCursor",
    ]) {
      u[n] = gl.getUniformLocation(prog, n);
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    return { prog, vs, fs, buf, u };
  };

  const onLost = (e: Event) => {
    e.preventDefault(); // senza questo il browser non ripristina mai il contesto
    lost = true;
    built = null;
    hooks.onLost();
  };
  const onRestored = () => {
    lost = false;
    built = build();
    hooks.onRestored();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  built = build();
  if (!built) {
    canvas.removeEventListener("webglcontextlost", onLost);
    canvas.removeEventListener("webglcontextrestored", onRestored);
    return null;
  }

  return {
    resize(w, h, scale) {
      W = w;
      H = h;
      SC = scale;
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      if (!lost) gl.viewport(0, 0, canvas.width, canvas.height);
    },
    isLost: () => lost || !built || gl.isContextLost(),
    draw(t, rift, text, dim, cursor) {
      if (lost || !built || gl.isContextLost()) return;
      const u = built.u;
      gl.uniform2f(u.uRes, W, H);
      gl.uniform1f(u.uScale, canvas.width / W || SC);
      gl.uniform1f(u.uT, t);
      gl.uniform4f(u.uRift, rift.xTop, rift.xBot, rift.bow, rift.amp);
      gl.uniform4f(u.uText, text[0], text[1], text[2], text[3]);
      gl.uniform3f(u.uDim, dim[0], dim[1], dim[2]);
      gl.uniform2f(u.uCursor, cursor[0], cursor[1]);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      if (built && !gl.isContextLost()) {
        gl.deleteBuffer(built.buf);
        gl.deleteProgram(built.prog);
        gl.deleteShader(built.vs);
        gl.deleteShader(built.fs);
      }
      built = null;
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

/* ================================================================ component */
export function DataButterflies({
  reducedMotion,
  avoidRef,
}: DataButterfliesProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let atlas = bakeAtlas(resolveMono(wrap));
    const cellPx = ATLAS_CELL * ATLAS_SCALE;

    /* L'aurora vive su un canvas creato qui e rimosso al cleanup: un contesto
       perso non verrebbe mai restituito da getContext sullo stesso elemento
       (in dev lo StrictMode monta due volte). Se il contesto si perde e il
       browser non lo ripristina entro RESTORE_WAIT — o se si torna sulla
       scheda e risulta ancora perso — il canvas viene SOSTITUITO con uno
       nuovo: il velo non può restare spento. */
    let glCanvas: HTMLCanvasElement | null = null;
    let aurora: Aurora | null = null;
    let restoreTimer = 0;
    let disposed = false;
    const RESTORE_WAIT = 1200;
    const auroraScale = () => (narrow ? 0.6 : 0.5);
    const mountAurora = () => {
      window.clearTimeout(restoreTimer);
      aurora?.dispose();
      glCanvas?.remove();
      const c = document.createElement("canvas");
      c.className = "absolute inset-0 h-full w-full";
      wrap.insertBefore(c, canvas);
      glCanvas = c;
      aurora = createAurora(c, {
        onLost: () => {
          window.clearTimeout(restoreTimer);
          restoreTimer = window.setTimeout(() => {
            if (!disposed && aurora?.isLost()) mountAurora();
          }, RESTORE_WAIT);
        },
        onRestored: () => {
          window.clearTimeout(restoreTimer);
          aurora?.resize(W, H, auroraScale());
          if (!running) draw();
        },
      });
      if (!aurora) {
        c.remove();
        glCanvas = null;
        return;
      }
      aurora.resize(W, H, auroraScale());
    };

    /* ------------------------------------------------------------ misure */
    let W = 1;
    let H = 1;
    let dpr = 1;
    let narrow = false;
    let text: [number, number, number, number] = [-9999, -9999, -9998, -9998];
    const rift: RiftParams = { xTop: 0, xBot: 0, bow: 0, amp: 0, h: 1 };
    let dimText = 0.2; // fattore minimo sotto il testo
    let glyphDim = 0.14;
    let maxFree = 150;
    let maxSwarms = 5;
    let spawnRate = 22;
    let baseGlyph = 11;

    const lowEnd =
      typeof navigator !== "undefined" &&
      typeof navigator.hardwareConcurrency === "number" &&
      navigator.hardwareConcurrency <= 4;

    const measure = () => {
      const r = wrap.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      narrow = W < NARROW_AT;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      aurora?.resize(W, H, auroraScale());

      const av = avoidRef?.current;
      if (av) {
        const a = av.getBoundingClientRect();
        text = [
          a.left - r.left,
          a.top - r.top,
          a.right - r.left,
          a.bottom - r.top,
        ];
      }
      rift.h = H;
      if (narrow) {
        // il testo occupa tutta la larghezza: la faglia gli passa dietro,
        // in diagonale lunga, e lì si attenua
        rift.xTop = W * 0.9;
        rift.xBot = W * 0.14;
        rift.bow = W * 0.06;
        rift.amp = 12;
        dimText = 0.42;
        glyphDim = 0.34;
        maxFree = 60;
        maxSwarms = 3;
        spawnRate = 6;
        baseGlyph = 10;
      } else {
        // la faglia attraversa in diagonale tutta la sezione: nasce in alto a
        // destra, scende verso il centro e passa sotto la chiusa del testo
        // (dove le righe sono corte). Non è "un effetto a destra": è la
        // diagonale che organizza la pagina.
        rift.xTop = W * 0.8;
        rift.xBot = W * 0.54;
        rift.bow = W * 0.05;
        rift.amp = Math.min(30, W * 0.02);
        dimText = 0.22;
        glyphDim = 0.12;
        maxFree = 150;
        maxSwarms = 4;
        spawnRate = 14;
        baseGlyph = 11;
      }
      if (lowEnd) {
        maxFree = Math.round(maxFree * 0.65);
        maxSwarms = Math.max(2, maxSwarms - 2);
        spawnRate *= 0.65;
      }
    };

    /** 1 fuori dal testo → glyphDim dentro, con 70px di sfumatura. */
    const dimAt = (x: number, y: number) => {
      const f = 70;
      const fx =
        smooth(text[0] - f, text[0] + 8, x) *
        (1 - smooth(text[2] - 8, text[2] + f, x));
      const fy =
        smooth(text[1] - f, text[1] + 8, y) *
        (1 - smooth(text[3] - 8, text[3] + f, y));
      return 1 - (1 - glyphDim) * fx * fy;
    };
    const inText = (x: number, y: number, pad: number) =>
      x > text[0] - pad &&
      x < text[2] + pad &&
      y > text[1] - pad &&
      y < text[3] + pad;

    /* --------------------------------------------------------- simulazione */
    let time = 0;
    const glyphs: Glyph[] = [];
    const swarms: Swarm[] = [];
    const sparks: Spark[] = [];
    /** punto d'ala riusato per il contorno (niente allocazioni per frame) */
    const wingPt: Slot = { x: 0, y: 0, wing: 1 };
    /** glifo riusato per disegnare le scintille senza allocare per frame */
    const sparkGlyph: Glyph = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      d: 0,
      size: 1,
      age: 9,
      life: 9,
      heat: 0,
      seed: 0,
      mut: 9,
      swarm: null,
      slot: -1,
      alive: true,
      ox: 0,
      oy: 0,
      kx: 0,
      ky: 0,
      t0: 0,
      fly: 1,
    };
    let spawnAcc = 0;
    let nextSwarm = 0.4;
    let cursorX = -1e5;
    let cursorY = -1e5;

    const newGlyph = (y: number, towardX?: number, towardY?: number): Glyph => {
      const x = riftX(y, time, rift);
      let dir: number;
      if (towardX !== undefined) dir = Math.sign(towardX - x) || 1;
      else dir = narrow ? (rand() < 0.5 ? -1 : 1) : rand() < 0.62 ? 1 : -1;
      const sp = 26 + rand() * 60;
      const g: Glyph = {
        x: x + dir * rand() * 3,
        y,
        vx: dir * sp,
        vy: (rand() - 0.5) * 22,
        d: (rand() * 10) | 0,
        size: baseGlyph * (0.8 + rand() * 0.45),
        age: 0,
        life: 5 + rand() * 4.5,
        heat: 1,
        seed: rand() * 100,
        mut: 0.2 + rand() * 1.2,
        swarm: null,
        slot: -1,
        alive: true,
        ox: 0,
        oy: 0,
        kx: 0,
        ky: 0,
        t0: 0,
        fly: 1,
      };
      if (towardX !== undefined && towardY !== undefined) {
        const dx = towardX - g.x;
        const dy = towardY - g.y;
        const l = Math.hypot(dx, dy) || 1;
        const s = 60 + rand() * 50;
        g.vx = (dx / l) * s;
        g.vy = (dy / l) * s;
      }
      glyphs.push(g);
      return g;
    };

    const slotTarget = (
      sw: Swarm,
      s: Slot,
      spread: number,
      fold: number,
    ): [number, number] => {
      const lx = s.x * (s.wing ? fold : 1);
      const ly = s.y - (s.wing ? (1 - fold) * 0.3 * Math.abs(s.x) : 0);
      const c = Math.cos(sw.angle);
      const si = Math.sin(sw.angle);
      const X = lx * sw.S * spread;
      const Y = ly * sw.S * spread;
      return [sw.px + X * c - Y * si, sw.py + X * si + Y * c];
    };

    const assign = (sw: Swarm, g: Glyph) => {
      let best = -1;
      let bd = Infinity;
      for (let i = 0; i < sw.slots.length; i += 1) {
        if (sw.taken[i]) continue;
        const [tx, ty] = slotTarget(sw, sw.slots[i], 1, 1);
        const dd = (tx - g.x) ** 2 + (ty - g.y) ** 2;
        if (dd < bd) {
          bd = dd;
          best = i;
        }
      }
      if (best < 0) return false;
      sw.taken[best] = true;
      g.swarm = sw;
      g.slot = best;
      sw.glyphs.push(g);
      return true;
    };

    const bezier = (p: [number, number][], u: number): [number, number] => {
      const v = 1 - u;
      const a = v * v * v;
      const b = 3 * v * v * u;
      const c = 3 * v * u * u;
      const d = u * u * u;
      return [
        a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0],
        a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1],
      ];
    };

    const planFlight = (sw: Swarm) => {
      let best: [number, number][] | null = null;
      for (let tries = 0; tries < 8; tries += 1) {
        let ex: number;
        let ey: number;
        if (narrow) {
          const right = rand() < 0.5;
          ex = right ? W + 160 : -160;
          ey = sw.cy - 120 - rand() * 380;
        } else {
          const r = rand();
          if (r < 0.55) {
            ex = W + 180;
            ey = H * (0.05 + rand() * 0.75);
          } else if (r < 0.85) {
            ex = rift.xTop + (rand() - 0.3) * (W - rift.xTop) * 1.2;
            ey = -200;
          } else {
            ex = W * (0.7 + rand() * 0.4);
            ey = H + 200;
          }
        }
        const p1: [number, number] = [
          sw.cx + (rand() - 0.5) * 120,
          sw.cy - (110 + rand() * 90) * sw.depth,
        ];
        const mx = (sw.cx + ex) / 2;
        const my = (sw.cy + ey) / 2;
        const nx = -(ey - sw.cy);
        const ny = ex - sw.cx;
        const nl = Math.hypot(nx, ny) || 1;
        const off = (rand() - 0.5) * 360;
        const p2: [number, number] = [
          mx + (nx / nl) * off,
          my + (ny / nl) * off,
        ];
        const path: [number, number][] = [[sw.cx, sw.cy], p1, p2, [ex, ey]];
        let ok = true;
        for (let k = 1; k <= 16 && ok; k += 1) {
          const [x, y] = bezier(path, k / 16);
          if (!narrow && inText(x, y, 50)) ok = false;
        }
        best = path;
        if (ok) break;
      }
      sw.path = best!;
      let len = 0;
      let prev = sw.path[0];
      for (let k = 1; k <= 20; k += 1) {
        const q = bezier(sw.path, k / 20);
        len += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
        prev = q;
      }
      // più lento del volo "dritto": la farfalla ondeggia, non attraversa
      sw.dur = len / ((narrow ? 52 : 64) + 44 * sw.depth);
      sw.wAmp = (narrow ? 26 : 38) + rand() * (narrow ? 18 : 30) * sw.depth;
      sw.wFreq = 1.1 + rand() * 0.9 + len / 900;
      sw.wPh = rand() * TAU;
    };

    const newSwarm = (force?: { x: number; y: number; depth: number }) => {
      let cx = 0;
      let cy = 0;
      let ok = false;
      const depth =
        force?.depth ?? (narrow ? 0.6 + rand() * 0.4 : 0.7 + rand() * 0.65);
      for (let tries = 0; tries < 12 && !ok; tries += 1) {
        if (force) {
          cx = force.x;
          cy = force.y;
          ok = true;
          break;
        }
        cy = H * (0.14 + rand() * 0.72);
        const rx = riftX(cy, time, rift);
        const side = narrow ? (rand() < 0.5 ? -1 : 1) : rand() < 0.68 ? 1 : -1;
        cx = rx + side * (narrow ? 50 + rand() * 90 : 90 + rand() * 170);
        const S = 50 * depth;
        if (cx < S * 1.1 + 10 || cx > W - S * 1.1 - 10) continue;
        // su desktop mai sopra il testo; su mobile lo si evita finché si può
        // (sopra e sotto la frase), poi si accetta di formarsi dietro, attenuati
        if (
          inText(cx, cy, narrow ? S * 0.6 : S * 1.4) &&
          (!narrow || tries < 9)
        )
          continue;
        ok = swarms.every(
          (o) => o.t > T_WAKE || Math.hypot(o.cx - cx, o.cy - cy) > 170,
        );
      }
      if (!ok) return;
      const K = narrow
        ? Math.round(17 + 4 * ((depth - 0.6) / 0.4))
        : Math.round(19 + 8 * ((depth - 0.7) / 0.65));
      const slots = butterflySlots(K);
      const sw: Swarm = {
        cx,
        cy,
        px: cx,
        py: cy,
        depth,
        S: (narrow ? 38 : 50) * depth,
        slots,
        taken: slots.map(() => false),
        glyphs: [],
        want: 0,
        streamT: 0,
        t: 0,
        angle: 0,
        restAngle: (rand() - 0.5) * 0.35,
        phase: 0,
        path: [],
        dur: 1,
        alpha: 0.5 + 0.5 * clamp01((depth - 0.6) / 0.7),
        veerX: 0,
        veerY: 0,
        flash: 0,
        dead: false,
        trail: new Float32Array(TRAIL_CAP * 3),
        trailHead: 0,
        trailN: 0,
        sparkT: 0,
        segY: cy + (rand() - 0.5) * 60,
        swirl: rand() < 0.5 ? -1 : 1,
        wAmp: 0,
        wFreq: 1,
        wPh: 0,
      };
      // TUTTE le cifre della farfalla escono dalla faglia, da un tratto corto
      // all'altezza del punto di formazione: lo spettatore deve vederle
      // lasciare la luce e volare a comporre la sagoma
      sw.want = slots.length - sw.glyphs.length;
      swarms.push(sw);
      if (force) {
        // posa immediata (reduced motion / pre-riscaldamento)
        while (sw.want > 0) emitInto(sw);
      }
    };

    /** Una cifra esce dal tratto di faglia e parte, su una curva, verso il suo slot. */
    const emitInto = (sw: Swarm) => {
      const y = sw.segY + (rand() - 0.5) * 56;
      const g = newGlyph(y);
      g.size = baseGlyph * (0.66 + 0.26 * sw.depth);
      if (!assign(sw, g)) {
        g.alive = false;
        sw.want = 0;
        return;
      }
      sw.want -= 1;
      g.ox = g.x;
      g.oy = g.y;
      g.t0 = sw.t;
      g.fly = 0.95 + rand() * 0.4;
      g.heat = 1;
      // punto di controllo: di lato rispetto alla corda, con un verso comune
      // (le cifre avvolgono la sagoma come un vortice) più un po' di caso
      const [tx, ty] = slotTarget(sw, sw.slots[g.slot], SPREAD_LOOSE, 1);
      const dx = tx - g.x;
      const dy = ty - g.y;
      const bend = sw.swirl * 0.32 + (rand() - 0.5) * 0.5;
      g.kx = -dy * bend;
      g.ky = dx * bend - Math.hypot(dx, dy) * 0.12;
    };

    /** Battito ampio: l'ala si chiude quasi del tutto (piega fino al 4%). */
    const flapFold = (phase: number) =>
      0.04 + 0.96 * Math.pow(0.5 + 0.5 * Math.cos(phase), 0.9);

    const swarmState = (sw: Swarm) => {
      // spread + fold + posa del centro
      let spread = 1;
      let fold = 1;
      if (sw.t < T_ORDER) spread = SPREAD_LOOSE;
      else if (sw.t < T_FUSE)
        spread =
          SPREAD_LOOSE + (1 - SPREAD_LOOSE) * smooth(T_ORDER, T_FUSE, sw.t);
      if (sw.t > T_FUSE - 0.1) fold = flapFold(sw.phase);
      return { spread, fold };
    };

    /** Posizione in volo: la curva di fondo + un'ondulazione laterale a S
        (in ampiezza piena dopo il decollo), per un volo sinuoso e lento. */
    const flightPos = (sw: Swarm, tau: number): [number, number] => {
      const u = 0.45 * tau + 0.55 * tau * tau;
      const [x, y] = bezier(sw.path, u);
      const [xa, ya] = bezier(sw.path, Math.min(1, u + 0.01));
      const [xb, yb] = bezier(sw.path, Math.max(0, u - 0.01));
      const tx = xa - xb;
      const ty = ya - yb;
      const tl = Math.hypot(tx, ty) || 1;
      const w =
        sw.wAmp *
        smooth(0, 0.14, tau) *
        Math.sin(u * sw.wFreq * TAU + sw.wPh) *
        (1 + 0.25 * Math.sin(u * sw.wFreq * 2.3 * TAU));
      return [x - (ty / tl) * w, y + (tx / tl) * w];
    };

    const stepSwarm = (sw: Swarm, dt: number) => {
      sw.t += dt;
      // streaming dalla faglia
      if (sw.want > 0) {
        sw.streamT -= dt;
        while (sw.streamT <= 0 && sw.want > 0) {
          emitInto(sw);
          sw.streamT += T_STREAM / sw.slots.length;
        }
      }
      // battito
      let rate = 0;
      if (sw.t > T_FUSE - 0.1 && sw.t < T_WAKE) rate = 0.7;
      else if (sw.t >= T_WAKE) {
        const glide = 0.5 + 0.5 * Math.sin(sw.t * 0.9 + sw.cx);
        rate = 1.5 + 0.8 * sw.depth * (0.35 + 0.65 * smooth(0.25, 0.6, glide));
      }
      sw.phase += rate * TAU * dt;

      // lampo di fusione
      if (sw.t > T_FUSE - 0.35 && sw.t < T_FUSE + 0.9) {
        const u = (sw.t - (T_FUSE - 0.35)) / 1.25;
        sw.flash = Math.sin(Math.PI * u) ** 2;
      } else sw.flash = 0;

      // cursore: la farfalla devia con garbo
      const dxC = sw.px - cursorX;
      const dyC = sw.py - cursorY;
      const dC = Math.hypot(dxC, dyC);
      let tvx = 0;
      let tvy = 0;
      if (dC < 180 && sw.t > T_FUSE) {
        const f = (1 - dC / 180) * 70;
        tvx = (dxC / (dC || 1)) * f;
        tvy = (dyC / (dC || 1)) * f;
      }
      const kv = 1 - Math.exp(-3 * dt);
      sw.veerX += (tvx - sw.veerX) * kv;
      sw.veerY += (tvy - sw.veerY) * kv;

      let targetAngle = sw.restAngle;
      if (sw.t < T_WAKE) {
        const hover = sw.t > T_FUSE ? Math.sin((sw.t - T_FUSE) * 2.2) * 3 : 0;
        sw.px = sw.cx + sw.veerX;
        sw.py = sw.cy + hover + sw.veerY;
        if (sw.t < T_FUSE)
          targetAngle = sw.restAngle * smooth(T_ORDER, T_FUSE, sw.t);
      } else {
        if (sw.path.length === 0) planFlight(sw);
        const tau = clamp01((sw.t - T_WAKE) / sw.dur);
        const [x, y] = flightPos(sw, tau);
        const [x2, y2] = flightPos(sw, Math.min(1, tau + 0.012));
        const bob = Math.sin(sw.phase) * 5 * sw.depth;
        sw.px = x + sw.veerX;
        sw.py = y + bob + sw.veerY;
        targetAngle = Math.atan2(y2 - y, x2 - x) + Math.PI / 2;
        // ingresso nel volo: dall'assetto di riposo alla direzione di volo
        const w = smooth(0, 0.12, tau);
        let da = targetAngle - sw.restAngle;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        targetAngle = sw.restAngle + da * w;
        sw.alpha =
          (0.5 + 0.5 * clamp01((sw.depth - 0.6) / 0.7)) *
          (1 - smooth(0.7, 1, tau));
        if (tau >= 1) sw.dead = true;
        // scia: registra il centro (senza il bob, così la scia è un filo
        // morbido e non una sinusoide) e stacca qualche scintilla dalle ali
        const i3 = sw.trailHead * 3;
        // la scia parte dalla CODA (non dal centro, dove le ali la coprirebbero)
        const tailX = x + sw.veerX - Math.sin(sw.angle) * 0.5 * sw.S;
        const tailY = y + sw.veerY + Math.cos(sw.angle) * 0.5 * sw.S;
        sw.trail[i3] = tailX;
        sw.trail[i3 + 1] = tailY;
        sw.trail[i3 + 2] = time;
        sw.trailHead = (sw.trailHead + 1) % TRAIL_CAP;
        sw.trailN = Math.min(TRAIL_CAP, sw.trailN + 1);
        sw.sparkT -= dt;
        if (
          sw.sparkT <= 0 &&
          sw.glyphs.length > 0 &&
          sparks.length < MAX_SPARKS &&
          tau < 0.85
        ) {
          sw.sparkT = 0.05 + rand() * 0.06;
          const g = sw.glyphs[(rand() * sw.glyphs.length) | 0];
          const hx = Math.cos(sw.angle - Math.PI / 2);
          const hy = Math.sin(sw.angle - Math.PI / 2);
          sparks.push({
            x: g.x,
            y: g.y,
            vx: -hx * (18 + rand() * 16) + (rand() - 0.5) * 12,
            vy: -hy * (18 + rand() * 16) + (rand() - 0.5) * 12 + 6,
            age: 0,
            life: 0.4 + rand() * 0.3,
            d: (rand() * 10) | 0,
            size: g.size * 0.62,
            a: sw.alpha,
          });
        }
      }
      let da = targetAngle - sw.angle;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      sw.angle += da * (1 - Math.exp(-4 * dt));
    };

    const step = (dt: number) => {
      time += dt;
      // cifre libere dalla faglia
      const free =
        glyphs.length - swarms.reduce((n, s) => n + s.glyphs.length, 0);
      spawnAcc += dt * spawnRate;
      while (spawnAcc >= 1) {
        spawnAcc -= 1;
        if (free < maxFree) newGlyph(-BLEED * 0.3 + rand() * (H + BLEED * 0.6));
      }
      // nuovi sciami
      nextSwarm -= dt;
      const forming = swarms.filter((s) => s.t < T_WAKE).length;
      if (nextSwarm <= 0 && swarms.length < maxSwarms && forming < 2) {
        newSwarm();
        nextSwarm = narrow ? 3.0 + rand() * 1.8 : 1.9 + rand() * 1.5;
      }
      for (const sw of swarms) stepSwarm(sw, dt);

      for (const g of glyphs) {
        g.age += dt;
        g.mut -= dt;
        const sw = g.swarm;
        if (sw) {
          const s = sw.slots[g.slot];
          const { spread, fold } = swarmState(sw);
          const [tx, ty] = slotTarget(sw, s, spread, fold);
          const u = clamp01((sw.t - g.t0) / g.fly);
          if (u < 1) {
            // in viaggio dalla faglia: curva quadratica, partenza morbida e
            // arrivo "a scatto" (decelera e si incastra nello slot)
            const e = 1 - Math.pow(1 - u, 2.6);
            const cx = (g.ox + tx) / 2 + g.kx;
            const cy = (g.oy + ty) / 2 + g.ky;
            const v = 1 - e;
            const nx = v * v * g.ox + 2 * v * e * cx + e * e * tx;
            const ny = v * v * g.oy + 2 * v * e * cy + e * e * ty;
            // velocità stimata: serve solo a disegnare la scia della cifra
            g.vx = (nx - g.x) / dt;
            g.vy = (ny - g.y) / dt;
            g.x = nx;
            g.y = ny;
          } else {
            const kf = 1 - Math.exp(-42 * dt);
            g.x += (tx - g.x) * kf;
            g.y += (ty - g.y) * kf;
          }
          // in viaggio le cifre sfarfallano; posate, si fermano
          if (u < 1 && g.mut <= 0) {
            g.d = (rand() * 10) | 0;
            g.mut = 0.1 + rand() * 0.25;
          }
          // incandescenti dalla faglia, poi una luce stabile quasi bianca
          // (leggibili), di nuovo al massimo nel lampo di fusione
          const want = Math.max(u < 1 ? 1 : 0.78, sw.flash);
          g.heat += (want - g.heat) * (1 - Math.exp(-5 * dt));
          if (sw.dead) g.alive = false;
          continue;
        }
        // cifra libera: deriva fluida, galleggia, si allontana dalla luce
        const drag = Math.exp(-0.75 * dt);
        g.vx *= drag;
        g.vy *= drag;
        g.vx += Math.sin(g.y * 0.012 + time * 0.5 + g.seed) * 9 * dt;
        g.vy += (Math.cos(g.x * 0.011 - time * 0.4 + g.seed) * 9 - 3) * dt;
        const dx = g.x - cursorX;
        const dy = g.y - cursorY;
        const d2 = dx * dx + dy * dy;
        if (d2 < 110 * 110) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / 110) ** 2 * 900;
          g.vx += (dx / d) * f * dt;
          g.vy += (dy / d) * f * dt;
        }
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        g.heat = Math.max(0, 1 - g.age / 1.3);
        if (g.mut <= 0) {
          g.d = (rand() * 10) | 0;
          g.mut = 0.9 + rand() * 2.8;
        }
        if (g.age > g.life || g.x < -40 || g.x > W + 40) g.alive = false;
      }
      for (const sp of sparks) {
        sp.age += dt;
        const k = Math.exp(-1.8 * dt);
        sp.vx *= k;
        sp.vy *= k;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
      }
      {
        let n = 0;
        for (let i = 0; i < sparks.length; i += 1)
          if (sparks[i].age < sparks[i].life) sparks[n++] = sparks[i];
        sparks.length = n;
      }
      // compattazione
      let j = 0;
      for (let i = 0; i < glyphs.length; i += 1)
        if (glyphs[i].alive) glyphs[j++] = glyphs[i];
      glyphs.length = j;
      for (let i = swarms.length - 1; i >= 0; i -= 1)
        if (swarms[i].dead) swarms.splice(i, 1);
    };

    /* ------------------------------------------------------------ disegno */
    const drawGlyph = (
      g: Glyph,
      alpha: number,
      a: number,
      b: number,
      c: number,
      d: number,
    ) => {
      if (alpha <= 0.01) return;
      const dw = g.size * (ATLAS_CELL / ATLAS_FONT);
      ctx.setTransform(
        a * dpr,
        b * dpr,
        c * dpr,
        d * dpr,
        g.x * dpr,
        g.y * dpr,
      );
      const sx = g.d * cellPx;
      if (g.heat < 0.98) {
        ctx.globalAlpha = alpha * (1 - g.heat);
        ctx.drawImage(atlas, sx, 0, cellPx, cellPx, -dw / 2, -dw / 2, dw, dw);
      }
      if (g.heat > 0.02) {
        ctx.globalAlpha = alpha * g.heat;
        ctx.drawImage(
          atlas,
          sx,
          cellPx,
          cellPx,
          cellPx,
          -dw / 2,
          -dw / 2,
          dw,
          dw,
        );
      }
    };

    const drawDisc = (x: number, y: number, r: number, alpha: number) => {
      if (alpha <= 0.01) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = alpha;
      ctx.drawImage(
        atlas,
        DIGITS.length * cellPx,
        0,
        cellPx,
        cellPx,
        x - r,
        y - r,
        r * 2,
        r * 2,
      );
    };

    const drawCore = () => {
      // il filo incandescente: un nastro a larghezza variabile, due passate
      const step = 10;
      const n = Math.ceil(H / step) + 1;
      const xs = new Float32Array(n);
      const ws = new Float32Array(n);
      for (let i = 0; i < n; i += 1) {
        const y = i * step;
        xs[i] = riftX(y, time, rift);
        const p =
          0.5 +
          0.5 *
            Math.sin(y * 0.021 - time * 1.2) *
            Math.sin(y * 0.0067 + time * 0.37);
        ws[i] = 0.35 + 1.35 * p * p;
      }
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      const t0 = clamp01(text[1] / H);
      const t1 = clamp01(text[3] / H);
      const inside = narrow ? 0.2 : 1;
      grad.addColorStop(0, "rgba(223,255,248,1)");
      if (t1 > t0) {
        grad.addColorStop(Math.max(0, t0 - 0.04), "rgba(223,255,248,1)");
        grad.addColorStop(
          Math.min(1, t0 + 0.02),
          `rgba(223,255,248,${inside})`,
        );
        grad.addColorStop(
          Math.max(0, t1 - 0.02),
          `rgba(223,255,248,${inside})`,
        );
        grad.addColorStop(Math.min(1, t1 + 0.04), "rgba(223,255,248,1)");
      }
      grad.addColorStop(1, "rgba(223,255,248,1)");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = grad;
      for (const [mul, al] of [
        [6, 0.05],
        [2.2, 0.12],
        [0.75, 0.5],
      ] as const) {
        ctx.globalAlpha = al;
        ctx.beginPath();
        for (let i = 0; i < n; i += 1)
          ctx.lineTo(xs[i] - ws[i] * mul, i * step);
        for (let i = n - 1; i >= 0; i -= 1)
          ctx.lineTo(xs[i] + ws[i] * mul, i * step);
        ctx.closePath();
        ctx.fill();
      }
    };

    const draw = () => {
      if (aurora) {
        aurora.draw(
          time,
          rift,
          text,
          [dimText, narrow ? 0.72 : 0.95, narrow ? 1 : 1],
          [cursorX, cursorY],
        );
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "lighter";

      drawCore();

      // cifre libere
      for (const g of glyphs) {
        if (g.swarm) continue;
        const fin =
          smooth(0, 0.5, g.age) * (1 - smooth(g.life - 1.6, g.life, g.age));
        const dist = Math.abs(g.x - riftX(g.y, time, rift));
        const far = 1 - 0.65 * smooth(120, 420, dist);
        const s = 0.7 + 0.3 * smooth(0, 0.6, g.age);
        drawGlyph(g, 0.62 * fin * far * dimAt(g.x, g.y), s, 0, 0, s);
      }

      // scie: un filo di luce affusolato lungo il percorso recente (spessore e
      // alpha scendono con l'età del punto) + le scintille-cifra
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      for (const sw of swarms) {
        if (sw.trailN < 2) continue;
        const dim = dimAt(sw.px, sw.py);
        let px = NaN;
        let py = NaN;
        for (let k = sw.trailN - 1; k >= 0; k -= 1) {
          const idx = ((sw.trailHead - 1 - k + TRAIL_CAP * 2) % TRAIL_CAP) * 3;
          const x = sw.trail[idx];
          const y = sw.trail[idx + 1];
          const age = (time - sw.trail[idx + 2]) / TRAIL_LIFE;
          if (age < 1 && px === px) {
            // due passate additive, come la faglia: alone aqua + anima quasi bianca
            const f = 1 - age;
            const a = f * f * sw.alpha * dim;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(x, y);
            ctx.strokeStyle = "#3FE9CC";
            ctx.globalAlpha = a * 0.3;
            ctx.lineWidth = 1.5 + 5 * f * sw.depth;
            ctx.stroke();
            ctx.strokeStyle = "#DFFFF8";
            ctx.globalAlpha = a * 0.85;
            ctx.lineWidth = 0.4 + 1.3 * f * sw.depth;
            ctx.stroke();
          }
          px = x;
          py = y;
        }
      }
      for (const sp of sparks) {
        const f = 1 - sp.age / sp.life;
        sparkGlyph.x = sp.x;
        sparkGlyph.y = sp.y;
        sparkGlyph.d = sp.d;
        sparkGlyph.size = sp.size * (0.6 + 0.4 * f);
        sparkGlyph.heat = 0.5 + 0.5 * f;
        drawGlyph(
          sparkGlyph,
          f * f * 0.75 * sp.a * dimAt(sp.x, sp.y),
          1,
          0,
          0,
          1,
        );
      }

      // farfalle (dalle lontane alle vicine)
      const order = swarms.slice().sort((a, b) => a.depth - b.depth);
      for (const sw of order) {
        const { spread, fold } = swarmState(sw);
        const dim = dimAt(sw.px, sw.py);
        // il contorno si accende mentre le cifre arrivano, non dopo
        const formed = smooth(T_ORDER - 0.35, T_FUSE, sw.t);
        const A = sw.alpha * dim;
        // la faglia "si apre" nel tratto da cui escono le cifre
        if (sw.t < T_STREAM + 0.6) {
          const e =
            smooth(0, 0.15, sw.t) *
            (1 - smooth(T_STREAM, T_STREAM + 0.6, sw.t));
          const ey = sw.segY;
          const ex = riftX(ey, time, rift);
          const ed = dimAt(ex, ey);
          const pulse = 0.85 + 0.15 * Math.sin(sw.t * 18);
          drawDisc(ex, ey, 46 + 24 * sw.depth, e * 0.7 * ed * pulse);
          drawDisc(ex, ey, 16, e * 0.95 * ed);
        }
        // alone e lampo
        drawDisc(
          sw.px,
          sw.py,
          sw.S * (1.5 + 0.4 * formed),
          A * (0.1 + 0.28 * formed) + sw.flash * 0.45 * dim,
        );
        if (sw.flash > 0.02)
          drawDisc(
            sw.px,
            sw.py,
            sw.S * 3.2 * (0.6 + 0.4 * sw.flash),
            sw.flash * 0.28 * dim,
          );
        // membrane di luce delle ali + contorno luminoso. Il tracciato è
        // calcolato in coordinate schermo con la stessa trasformazione dei
        // glifi (piega + sollevamento delle punte): lo spessore del filo resta
        // costante anche ad ala chiusa.
        if (formed > 0.01) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.beginPath();
          for (const poly of [FOREWING, HINDWING]) {
            for (const side of [1, -1]) {
              for (let i = 0; i < poly.length; i += 1) {
                wingPt.x = poly[i][0] * side;
                wingPt.y = poly[i][1];
                const [X, Y] = slotTarget(sw, wingPt, spread, fold);
                if (i === 0) ctx.moveTo(X, Y);
                else ctx.lineTo(X, Y);
              }
              ctx.closePath();
            }
          }
          ctx.globalAlpha = A * formed * 0.14;
          ctx.fillStyle = "#3FE9CC";
          ctx.fill();
          ctx.lineJoin = "round";
          ctx.strokeStyle = "#3FE9CC";
          ctx.globalAlpha = A * formed * 0.3;
          ctx.lineWidth = 3.2;
          ctx.stroke();
          ctx.strokeStyle = "#A8FFEE";
          ctx.globalAlpha = A * formed * 0.75;
          ctx.lineWidth = 0.9;
          ctx.stroke();
        }
        // i numeri che compongono la farfalla
        const c = Math.cos(sw.angle);
        const s = Math.sin(sw.angle);
        const ga = A * (0.85 + 0.15 * formed);
        // cifre in viaggio dalla faglia: ognuna lascia un filo di luce breve
        // lungo la propria curva — il flusso si legge come un getto
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineCap = "round";
        for (const g of sw.glyphs) {
          const u = (sw.t - g.t0) / g.fly;
          if (u >= 1 || u <= 0) continue;
          const f = 1 - smooth(0.6, 1, u);
          const x0 = g.x - g.vx * 0.09;
          const y0 = g.y - g.vy * 0.09;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(g.x, g.y);
          ctx.strokeStyle = "#3FE9CC";
          ctx.globalAlpha = 0.3 * f * A;
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.strokeStyle = "#DFFFF8";
          ctx.globalAlpha = 0.6 * f * A;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
        for (const g of sw.glyphs) {
          const slot = sw.slots[g.slot];
          const fx = slot.wing ? Math.max(0.2, fold) : 1;
          const pre = smooth(0, 0.2, g.age);
          drawGlyph(g, ga * pre, c * fx, s * fx, -s, c);
        }
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    };

    /* ----------------------------------------------------------- avvio */
    measure();
    mountAurora();

    const staticFrame = () => {
      glyphs.length = 0;
      swarms.length = 0;
      time = 12;
      const picks = narrow
        ? [
            [0.72, 0.1, 0.9],
            [0.3, 0.93, 0.75],
          ]
        : [
            [0.85, 0.3, 1.2],
            [0.95, 0.62, 0.8],
            [0.2, 0.78, 0.95],
          ];
      for (const [fx, fy, depth] of picks) {
        const y = H * fy;
        const rx = riftX(y, time, rift);
        const x = narrow ? W * fx : rx + (fx - 0.5) * 520;
        newSwarm({ x: Math.max(80, Math.min(W - 80, x)), y, depth });
      }
      for (const sw of swarms) sw.t = T_FUSE + 0.5;
      for (let i = 0; i < (narrow ? 30 : 70); i += 1) {
        const g = newGlyph(rand() * H);
        g.age = 1.5 + rand() * 2;
        g.heat = 0;
        const off = (rand() - 0.3) * 160;
        g.x += off;
        g.life = 99;
      }
      for (const g of glyphs) {
        const sw = g.swarm;
        if (!sw) continue;
        g.age = 2;
        g.heat = 0;
        const [tx, ty] = slotTarget(
          sw,
          sw.slots[g.slot],
          1,
          flapFold(sw.phase + 0.9),
        );
        g.x = tx;
        g.y = ty;
      }
      for (const sw of swarms) sw.phase = 0.9;
      draw();
    };

    const prewarm = () => {
      // la scena è già viva quando la si incontra: 7s simulati a 30Hz
      for (let i = 0; i < 210; i += 1) step(1 / 30);
    };

    let raf = 0;
    let last = 0;
    let running = false;
    let inView = false;

    const frame = (now: number) => {
      raf = 0;
      if (!running) return;
      // un intoppo di qualche frame si recupera a passi piccoli (la molla resta
      // stabile); dopo una pausa `last` è azzerato, quindi nessun salto
      let dt = last ? Math.min(0.25, (now - last) / 1000) : 1 / 60;
      last = now;
      while (dt > 1e-4) {
        const h = Math.min(MAX_DT, dt);
        step(h);
        dt -= h;
      }
      draw();
      raf = requestAnimationFrame(frame);
    };
    let frozen = false; // solo per l'ispezione in sviluppo (vedi __manifestoFX)
    const start = () => {
      if (frozen || reducedMotion || running || !inView || document.hidden)
        return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    if (reducedMotion) staticFrame();
    else {
      prewarm();
      draw();
    }

    /* Ispezione deterministica, SOLO in sviluppo: in headless il rAF è troppo
       lento per vedere il ciclo di vita. `__manifestoFX.freeze()` ferma il
       loop, `solo(fx, fy)` lascia una sola farfalla in un punto (frazioni del
       canvas), `advance(s)` fa avanzare la simulazione a passi di 1/60 e
       ridisegna. In produzione il blocco è eliminato dal bundler. */
    let devHook: Record<string, unknown> | null = null;
    if (process.env.NODE_ENV !== "production" && !reducedMotion) {
      devHook = {
        freeze: () => {
          frozen = true;
          stop();
        },
        resume: () => {
          frozen = false;
          start();
        },
        solo: (fx: number, fy: number, depth = 1.1) => {
          swarms.length = 0;
          for (const g of glyphs) if (g.swarm) g.alive = false;
          nextSwarm = 1e9;
          newSwarm({ x: W * fx, y: H * fy, depth });
          const sw = swarms[swarms.length - 1];
          if (sw) {
            // la posa forzata è istantanea: qui invece si vuole il racconto
            for (const g of sw.glyphs) g.alive = false;
            sw.glyphs.length = 0;
            sw.taken.fill(false);
            sw.want = sw.slots.length;
          }
          draw();
        },
        advance: (sec: number) => {
          for (let t = 0; t < sec; t += 1 / 60) step(1 / 60);
          draw();
        },
        info: () => swarms.map((s) => ({ t: s.t, x: s.px, y: s.py })),
      };
      (window as unknown as { __manifestoFX?: unknown }).__manifestoFX =
        devHook;
    }

    const io = new IntersectionObserver(
      (entries) => {
        inView = entries.some((e) => e.isIntersecting);
        if (inView) start();
        else stop();
      },
      { rootMargin: "80px 0px" },
    );
    io.observe(wrap);

    /* Ritorno sulla scheda dopo un'assenza lunga: il browser può aver perso il
       contesto WebGL (e, in Chrome, persino svuotato i canvas 2D fuori schermo
       come l'atlante). Si verifica tutto e si ricostruisce ciò che manca PRIMA
       di ripartire; `start()` azzera `last`, quindi il primo dt è 1/60 e la
       scena riprende da dov'era, senza salti. */
    const recover = () => {
      if (!aurora || aurora.isLost()) mountAurora();
      atlas = bakeAtlas(resolveMono(wrap));
      if (reducedMotion) draw();
    };
    const onVis = () => {
      if (document.hidden) {
        stop();
        return;
      }
      recover();
      start();
    };
    document.addEventListener("visibilitychange", onVis);
    const onVisible2 = () => {
      if (!document.hidden) onVis();
    };
    // bfcache / ritorno sulla finestra: stesse verifiche
    window.addEventListener("pageshow", onVisible2);

    // il canvas 2D può perdere il backing store (Chrome: contextlost/restored)
    const on2dRestored = () => {
      atlas = bakeAtlas(resolveMono(wrap));
      draw();
    };
    canvas.addEventListener("contextrestored", on2dRestored);

    const ro = new ResizeObserver(() => {
      measure();
      if (reducedMotion) staticFrame();
      else if (!running) draw();
    });
    ro.observe(wrap);
    if (avoidRef?.current) ro.observe(avoidRef.current);

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = wrap.getBoundingClientRect();
      cursorX = e.clientX - r.left;
      cursorY = e.clientY - r.top;
    };
    const onLeave = () => {
      cursorX = -1e5;
      cursorY = -1e5;
    };
    if (!reducedMotion) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      document.addEventListener("pointerleave", onLeave);
    }

    // il mono vero arriva con next/font: ricuoci l'atlante quando è pronto
    let alive = true;
    document.fonts?.ready.then(() => {
      if (!alive) return;
      atlas = bakeAtlas(resolveMono(wrap));
      if (reducedMotion) draw();
    });

    return () => {
      alive = false;
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pageshow", onVisible2);
      canvas.removeEventListener("contextrestored", on2dRestored);
      disposed = true;
      if (devHook)
        delete (window as unknown as { __manifestoFX?: unknown }).__manifestoFX;
      window.clearTimeout(restoreTimer);
      aurora?.dispose();
      glCanvas?.remove();
    };
  }, [reducedMotion, avoidRef]);

  const mask = `linear-gradient(to bottom, transparent 0, #000 ${BLEED * 1.15}px, #000 calc(100% - ${BLEED * 1.15}px), transparent 100%)`;

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 z-0 select-none"
      style={{
        top: -BLEED,
        bottom: -BLEED,
        fontFamily: "var(--font-mono)",
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
