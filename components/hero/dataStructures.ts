/**
 * LE STRUTTURE DI DATI — dove i numeri si riordinano dopo l'esplosione.
 *
 * Cliente: «un'esplosione di numeri e dati alla matrix, poi numeri che
 * rapidamente da sparsi in maniera confusa nella pagina si riordinano in
 * diverse strutture dati (tabelle, cluster, frasi, codice)».
 *
 * Questo modulo è PURO (niente three, niente React): costruisce le strutture
 * come liste di "slot" — un glifo in una posizione — e le IMPAGINA nello spazio
 * vuoto della pagina. Lo spazio vuoto non si indovina: si misura. Il chiamante
 * passa i rettangoli reali del testo dell'hero (parole del titolo, paragrafo,
 * chip, bottoni) e il posto della rete; qui si costruisce una griglia di
 * occupazione con una tabella a somme cumulative e si cerca, per ogni
 * struttura, la posizione libera più vicina al suo punto preferito.
 *
 * Nessuna struttura può toccare il testo: è la regola del contrasto AA prima
 * ancora che dell'estetica.
 */

import { GLYPH_FONT_RATIO, MONO_ADVANCE, glyphIndex, DOT_GLYPH } from "./glyphAtlas";
import { mulberry32 } from "./neuralGraph";
import type { HeroSceneCopy } from "@/content/hero";

export type Slot = {
  /** Offset dal vertice alto-sinistro della struttura (px). */
  x: number;
  y: number;
  glyph: number;
  /** Lato della cella del glifo (px CSS). */
  size: number;
  /** 0..1 — gerarchia tipografica resa con la luce. */
  bright: number;
  /** 0..1 — ordine di comparsa DENTRO la struttura. */
  order: number;
  /** 1 = cifra "viva": da fantasma, ogni tanto si aggiorna. */
  live: number;
};

export type Structure = {
  id: "table" | "cluster" | "phrase" | "code" | "bars";
  w: number;
  h: number;
  slots: Slot[];
  /** Punto preferito (frazioni del viewport) — la composizione di massima. */
  pref: [number, number];
  /** Ritardo (s) della struttura dentro la finestra di riordino. */
  start: number;
};

export type PlacedStructure = {
  structure: Structure;
  /** Vertice alto-sinistro in coordinate di DOCUMENTO (px). */
  left: number;
  top: number;
  /** true = resta come fantasma quando la rete si forma (non sta sotto la rete). */
  ghost: boolean;
};

type Rect = { left: number; top: number; right: number; bottom: number };

/* ------------------------------------------------------------------------ */
/* costruttori                                                               */
/* ------------------------------------------------------------------------ */

const isDigit = (c: string) => c >= "0" && c <= "9";

function textSlots(
  out: Slot[],
  line: string,
  x0: number,
  y: number,
  cell: number,
  bright: (ch: string, i: number) => number,
  order: (i: number, n: number) => number,
  tracking = 0,
) {
  const adv = cell * GLYPH_FONT_RATIO * (MONO_ADVANCE + tracking);
  const chars = Array.from(line);
  chars.forEach((ch, i) => {
    if (ch === " ") return;
    out.push({
      x: x0 + i * adv + adv / 2,
      y,
      glyph: glyphIndex(ch),
      size: cell,
      bright: bright(ch, i),
      order: order(i, chars.length),
      live: isDigit(ch) ? 1 : 0,
    });
  });
  return chars.length * adv;
}

function lineH(cell: number, k = 1.62) {
  return cell * GLYPH_FONT_RATIO * k;
}

function buildTable(copy: HeroSceneCopy, cell: number): Structure {
  const slots: Slot[] = [];
  const cap = cell * 0.82;
  let y = lineH(cap) / 2;
  const nRows = copy.tableRows.length + 3;
  let row = 0;
  let w = textSlots(slots, copy.tableCaption, 0, y, cap, () => 0.34, (i, n) => (i / n) * 0.1, 0.18);
  y += lineH(cap) * 1.25;
  row++;
  w = Math.max(
    w,
    textSlots(slots, copy.tableHeader, 0, y, cell, () => 0.95, (i, n) => (row + i / n) / nRows),
  );
  y += lineH(cell) * 0.72;
  row++;
  const width = Array.from(copy.tableHeader).length;
  textSlots(slots, "─".repeat(width), 0, y, cell, () => 0.3, (i, n) => (row + i / n) / nRows);
  y += lineH(cell) * 0.78;
  row++;
  for (const r of copy.tableRows) {
    const plus = r.indexOf("+");
    const minus = r.indexOf("-");
    const deltaAt = plus >= 0 ? plus : minus;
    const rr = row;
    w = Math.max(
      w,
      textSlots(
        slots,
        r,
        0,
        y,
        cell,
        (ch, i) => {
          if (i < 5) return 0.42; // l'ora: la colonna indice è sommessa
          if (deltaAt >= 0 && i >= deltaAt && i < deltaAt + 5) return plus >= 0 ? 0.98 : 0.36;
          return 0.66;
        },
        (i, n) => (rr + i / n) / nRows,
      ),
    );
    y += lineH(cell);
    row++;
  }
  return { id: "table", w, h: y, slots, pref: [0.8, 0.26], start: 0 };
}

function buildCluster(copy: HeroSceneCopy, cell: number): Structure {
  const slots: Slot[] = [];
  const rand = mulberry32(4242);
  const cap = cell * 0.82;
  const capH = lineH(cap) * 1.35;
  const capW = textSlots(slots, copy.clusterCaption, 0, lineH(cap) / 2, cap, () => 0.34, (i, n) => (i / n) * 0.1, 0.18);

  const PW = cell * 11;
  const PH = cell * 6.6;
  const top = capH;
  const axisCell = cell * 0.9;
  const adv = axisCell * GLYPH_FONT_RATIO * MONO_ADVANCE;
  const vstep = lineH(axisCell, 1.0);
  // asse Y
  for (let y = vstep * 0.5; y < PH; y += vstep) {
    slots.push({ x: 0, y: top + y, glyph: glyphIndex("│"), size: axisCell, bright: 0.24, order: 0.05 + (1 - y / PH) * 0.12, live: 0 });
  }
  slots.push({ x: 0, y: top + PH, glyph: glyphIndex("└"), size: axisCell, bright: 0.3, order: 0.02, live: 0 });
  for (let x = adv; x < PW; x += adv) {
    slots.push({ x, y: top + PH, glyph: glyphIndex("─"), size: axisCell, bright: 0.24, order: 0.05 + (x / PW) * 0.12, live: 0 });
  }

  const blobs = [
    { cx: 0.26, cy: 0.62, s: 0.085, mark: "•", n: 34, b: 0.9 },
    { cx: 0.6, cy: 0.3, s: 0.1, mark: "×", n: 30, b: 0.72 },
    { cx: 0.82, cy: 0.7, s: 0.07, mark: "+", n: 24, b: 0.62 },
  ];
  blobs.forEach((bl, k) => {
    for (let i = 0; i < bl.n; i++) {
      // Box-Muller: gaussiane vere, non un disco uniforme
      const u = Math.max(rand(), 1e-6);
      const v = rand();
      const r = Math.sqrt(-2 * Math.log(u));
      const gx = r * Math.cos(2 * Math.PI * v);
      const gy = r * Math.sin(2 * Math.PI * v);
      const x = Math.min(0.97, Math.max(0.06, bl.cx + gx * bl.s * 1.15));
      const y = Math.min(0.94, Math.max(0.04, bl.cy + gy * bl.s));
      const d = Math.min(1, Math.hypot(gx, gy) / 2.6);
      slots.push({
        x: x * PW,
        y: top + y * PH,
        glyph: glyphIndex(bl.mark),
        size: cell * 0.8,
        bright: bl.b * (1 - d * 0.45),
        order: 0.22 + k * 0.16 + d * 0.45,
        live: 0,
      });
    }
    // il centroide: un disco, il dato che il cluster "dice"
    slots.push({
      x: bl.cx * PW,
      y: top + bl.cy * PH,
      glyph: DOT_GLYPH,
      size: cell * 0.95,
      bright: 1,
      order: 0.9,
      live: 0,
    });
  });
  return { id: "cluster", w: Math.max(PW, capW), h: top + PH + lineH(axisCell) * 0.6, slots, pref: [0.88, 0.62], start: 0.14 };
}

function buildPhrase(copy: HeroSceneCopy, cell: number): Structure {
  const slots: Slot[] = [];
  const big = cell * 1.9;
  const w = textSlots(
    slots,
    copy.phrase,
    0,
    lineH(big) / 2,
    big,
    (ch) => (ch === "→" ? 1 : 0.92),
    (i, n) => i / Math.max(n - 1, 1),
    0.16,
  );
  return { id: "phrase", w, h: lineH(big), slots, pref: [0.66, 0.13], start: 0.3 };
}

const KEYWORDS = new Set(["const", "await", "for", "of", "export", "default", "return"]);

function buildCode(copy: HeroSceneCopy, cell: number): Structure {
  const slots: Slot[] = [];
  const cap = cell * 0.82;
  let y = lineH(cap) / 2;
  let w = textSlots(slots, copy.codeCaption, 0, y, cap, () => 0.34, (i, n) => (i / n) * 0.08, 0.18);
  y += lineH(cap) * 1.3;
  const n = copy.code.length;
  copy.code.forEach((line, li) => {
    // colorazione sintattica fatta con la luce: parole chiave e numeri
    // accesi, identificatori a metà, punteggiatura spenta
    const bright = new Array<number>(line.length).fill(0.6);
    const re = /[A-Za-z_]+|\d+|[^\sA-Za-z_\d]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      const tok = m[0];
      const b = KEYWORDS.has(tok)
        ? 0.98
        : /^\d+$/.test(tok)
          ? 1
          : /^[A-Za-z_]/.test(tok)
            ? 0.6
            : 0.3;
      for (let k = 0; k < tok.length; k++) bright[m.index + k] = b;
    }
    // si scrive riga per riga, carattere per carattere: una tastiera veloce
    w = Math.max(
      w,
      textSlots(slots, line, 0, y, cell, (_c, i) => bright[i] ?? 0.6, (i, len) => (li + (i / len) * 0.92) / n),
    );
    y += lineH(cell, 1.7);
  });
  return { id: "code", w, h: y, slots, pref: [0.64, 0.84], start: 0.24 };
}

function buildBars(copy: HeroSceneCopy, cell: number): Structure {
  const slots: Slot[] = [];
  const cap = cell * 0.82;
  const capH = lineH(cap) * 1.35;
  const capW = textSlots(slots, copy.barsCaption, 0, lineH(cap) / 2, cap, () => 0.34, (i, n) => (i / n) * 0.1, 0.18);
  const data = [3, 5, 4, 6, 8, 7, 9, 6, 5, 7, 10, 8, 6, 9, 11, 9];
  const bc = cell * 0.78;
  const colW = bc * GLYPH_FONT_RATIO * 1.05;
  const step = bc * GLYPH_FONT_RATIO * 0.62;
  const maxH = Math.max(...data);
  data.forEach((v, i) => {
    for (let k = 0; k < v; k++) {
      slots.push({
        x: i * colW + colW / 2,
        y: capH + (maxH - k - 0.5) * step,
        glyph: glyphIndex("▮"),
        size: bc,
        bright: 0.34 + 0.6 * (k / maxH) * (v === maxH ? 1.2 : 1),
        order: (i / data.length) * 0.7 + (k / maxH) * 0.3,
        live: 0,
      });
    }
  });
  return { id: "bars", w: Math.max(capW, data.length * colW), h: capH + maxH * step, slots, pref: [0.9, 0.86], start: 0.36 };
}

export function buildStructures(copy: HeroSceneCopy, cell: number): Structure[] {
  // ordine = priorità d'impaginazione: prima le più ingombranti
  return [
    buildCode(copy, cell),
    buildTable(copy, cell),
    buildCluster(copy, cell),
    buildBars(copy, cell),
    buildPhrase(copy, cell),
  ];
}

/* ------------------------------------------------------------------------ */
/* impaginazione                                                             */
/* ------------------------------------------------------------------------ */

const GRID = 12;

export type LayoutInput = {
  width: number;
  height: number;
  scrollY: number;
  /** Rettangoli del testo, in coordinate CLIENT. */
  obstacles: Rect[];
  /** Dove si poserà la rete, in coordinate CLIENT (null = sconosciuto). */
  graphRect: Rect | null;
  topReserve: number;
  bottomReserve: number;
};

export function layoutStructures(structures: Structure[], input: LayoutInput): PlacedStructure[] {
  const { width: W, height: H } = input;
  const cols = Math.max(1, Math.ceil(W / GRID));
  const rows = Math.max(1, Math.ceil(H / GRID));
  const blocked = new Uint8Array(cols * rows);

  const block = (r: Rect, pad: number) => {
    const c0 = Math.max(0, Math.floor((r.left - pad) / GRID));
    const c1 = Math.min(cols - 1, Math.floor((r.right + pad) / GRID));
    const r0 = Math.max(0, Math.floor((r.top - pad) / GRID));
    const r1 = Math.min(rows - 1, Math.floor((r.bottom + pad) / GRID));
    for (let y = r0; y <= r1; y++) for (let x = c0; x <= c1; x++) blocked[y * cols + x] = 1;
  };

  const margin = Math.max(16, Math.min(W, H) * 0.028);
  for (const o of input.obstacles) block(o, margin);
  block({ left: 0, top: 0, right: W, bottom: input.topReserve }, 0);
  block({ left: 0, top: H - input.bottomReserve, right: W, bottom: H }, 0);
  block({ left: 0, top: 0, right: 14, bottom: H }, 0);
  block({ left: W - 18, top: 0, right: W, bottom: H }, 0);

  // tabella a somme cumulative: "questo rettangolo è libero?" in O(1)
  const sat = new Int32Array((cols + 1) * (rows + 1));
  const rebuild = () => {
    for (let y = 1; y <= rows; y++) {
      let rowSum = 0;
      for (let x = 1; x <= cols; x++) {
        rowSum += blocked[(y - 1) * cols + (x - 1)];
        sat[y * (cols + 1) + x] = sat[(y - 1) * (cols + 1) + x] + rowSum;
      }
    }
  };
  const sum = (c0: number, r0: number, c1: number, r1: number) =>
    sat[(r1 + 1) * (cols + 1) + (c1 + 1)] -
    sat[r0 * (cols + 1) + (c1 + 1)] -
    sat[(r1 + 1) * (cols + 1) + c0] +
    sat[r0 * (cols + 1) + c0];
  rebuild();

  const g = input.graphRect;
  const hitsGraph = (l: number, t: number, w: number, h: number) =>
    !!g && l < g.right && l + w > g.left && t < g.bottom && t + h > g.top;

  const placed: PlacedStructure[] = [];
  const find = (s: Structure, allowGraph: boolean) => {
    const cw = Math.ceil(s.w / GRID);
    const ch = Math.ceil(s.h / GRID);
    if (cw >= cols || ch >= rows) return null;
    const px = s.pref[0] * W;
    const py = s.pref[1] * H;
    let best: { l: number; t: number; score: number; graph: boolean } | null = null;
    for (let r = 0; r + ch < rows; r++) {
      for (let c = 0; c + cw < cols; c++) {
        if (sum(c, r, c + cw, r + ch) > 0) continue;
        const l = c * GRID;
        const t = r * GRID;
        const graph = hitsGraph(l, t, s.w, s.h);
        if (graph && !allowGraph) continue;
        const score = Math.hypot(l + s.w / 2 - px, t + s.h / 2 - py);
        if (!best || score < best.score) best = { l, t, score, graph };
      }
    }
    return best;
  };
  const commit = (s: Structure, l: number, t: number, graph: boolean) => {
    placed.push({ structure: s, left: l, top: t + input.scrollY, ghost: !graph });
    // la struttura diventa un ostacolo per le successive (con aria attorno)
    block({ left: l, top: t, right: l + s.w, bottom: t + s.h }, Math.max(22, margin * 1.4));
    rebuild();
  };

  // 1ª passata: solo FUORI dalla rete — lì la struttura resterà come fantasma,
  // ed è lo spazio più prezioso: le strutture che ci stanno lo prendono prima.
  const pending: Structure[] = [];
  for (const s of structures) {
    const best = find(s, false);
    if (best) commit(s, best.l, best.t, false);
    else pending.push(s);
  }
  // 2ª passata: le altre possono stare dove nascerà la rete — vi confluiranno.
  for (const s of pending) {
    const best = find(s, true);
    if (best) commit(s, best.l, best.t, best.graph);
  }
  // l'ordine d'ingresso resta quello della composizione, non dell'impaginazione
  placed.sort((a, b) => a.structure.start - b.structure.start);
  return placed;
}
