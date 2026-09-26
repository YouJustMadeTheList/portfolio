/**
 * I PILASTRI DELLA CREAZIONE — la rete costruita DALL'IMMAGINE, non disegnata
 * a mano.
 *
 * Cliente (v3): «segui l'immagine alla lettera, compreso quel pseudo-braccio;
 * tieni le stelline attorno». Le spine di Bézier della v2 approssimavano la
 * forma e ne perdevano metà. Qui la forma è un CAMPO cotto dall'immagine JWST
 * (pillarsField.ts: maschera del gas + luminanza, 72×125) e il grafo ne è
 * ricavato:
 *
 *   · NODI DI CONTORNO — campionati lungo il bordo della maschera con una
 *     distanza minima: la silhouette si legge netta, braccio e seconda punta
 *     in basso a sinistra compresi;
 *   · NODI INTERNI — campionati per luminanza (le creste chiare ne hanno di
 *     più delle pieghe scure);
 *   · ARCHI — k vicini più prossimi, accettati solo se il segmento resta DENTRO
 *     il gas (niente fili tesi sul cielo fra un pilastro e l'altro); i nodi di
 *     contorno si legano anche fra loro, così il profilo è un tracciato;
 *   · CORPO — glifi distribuiti sulle celle del gas, luminosi dove l'immagine è
 *     luminosa: si vede la struttura interna, non una sagoma piatta;
 *   · FRANGE — glifi radi spinti fuori dal bordo: l'evaporazione;
 *   · APICI — i nodi più luminosi (le teste, le punte) diventano nuclei
 *     brillanti;
 *   · STELLE — le stelle più brillanti dell'immagine, alle loro posizioni; le
 *     tre più grandi con i raggi di diffrazione.
 *
 * Stesso contratto GraphData: Scene3D non sa quale forma disegna. Seed fisso.
 */

import { mulberry32, type GraphData } from "./neuralGraph";
import { FIELD, FIELD_ASPECT, FIELD_H, FIELD_W, STARS, TIPS } from "./pillarsField";

const SEED = 20221019; // la data della pubblicazione dell'immagine JWST
const CONTOUR_SPACING = 0.085;
const INTERIOR_SPACING = 0.2;
const K_NEAREST = 4;
const MAX_EDGE = 0.26;
const APEX_COUNT = 0; // gli apici ora sono le forme cotte in TIPS
const SPIKED_STARS = 3;

type Field = { lvl: Uint8Array; inside: (x: number, y: number) => number };

let fieldCache: Field | null = null;
function field(): Field {
  if (fieldCache) return fieldCache;
  const lvl = new Uint8Array(FIELD_W * FIELD_H);
  for (let i = 0; i < lvl.length; i++) lvl[i] = parseInt(FIELD[i] ?? "0", 36) || 0;
  /** Livello (0 = cielo, 1..35) nel punto locale (x, y). */
  const inside = (x: number, y: number) => {
    const cx = Math.floor((x / (2 * FIELD_ASPECT) + 0.5) * FIELD_W);
    const cy = Math.floor((0.5 - y / 2) * FIELD_H);
    if (cx < 0 || cy < 0 || cx >= FIELD_W || cy >= FIELD_H) return 0;
    return lvl[cy * FIELD_W + cx];
  };
  fieldCache = { lvl, inside };
  return fieldCache;
}

/** Centro della cella in coordinate locali: x ∈ ±ASPECT, y ∈ ±1 (ritratto). */
const cellX = (cx: number) => ((cx + 0.5) / FIELD_W - 0.5) * 2 * FIELD_ASPECT;
const cellY = (cy: number) => (0.5 - (cy + 0.5) / FIELD_H) * 2;
const CELL = 2 / FIELD_H;

export function buildPillars(target = 1500): GraphData {
  const rand = mulberry32(SEED);
  const { lvl, inside } = field();
  const L = (i: number) => lvl[i] / 35;

  // celle del gas e celle di contorno
  const gas: number[] = [];
  const contour: number[] = [];
  for (let cy = 0; cy < FIELD_H; cy++) {
    for (let cx = 0; cx < FIELD_W; cx++) {
      const i = cy * FIELD_W + cx;
      if (!lvl[i]) continue;
      gas.push(i);
      const out =
        cx === 0 || cy === 0 || cx === FIELD_W - 1 || cy === FIELD_H - 1 ||
        !lvl[i - 1] || !lvl[i + 1] || !lvl[i - FIELD_W] || !lvl[i + FIELD_W];
      // il bordo dell'immagine non è un contorno: i pilastri continuano oltre
      const frame = cx === 0 || cy === FIELD_H - 1;
      if (out && !frame) contour.push(i);
    }
  }
  const shuffle = <T,>(a: T[]) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /* ---------- 1. i nodi ---------- */
  const nx: number[] = [];
  const ny: number[] = [];
  const nz: number[] = [];
  const nLum: number[] = [];
  const nKind: number[] = []; // 0 contorno · 1 interno · 2 stella · 3 stella con raggi · 4 apice
  const farFrom = (x: number, y: number, r: number) => {
    for (let k = 0; k < nx.length; k++) {
      const dx = nx[k] - x;
      const dy = ny[k] - y;
      if (dx * dx + dy * dy < r * r) return false;
    }
    return true;
  };
  const addNode = (i: number, kind: number) => {
    const cx = i % FIELD_W;
    const cy = Math.floor(i / FIELD_W);
    const x = cellX(cx);
    const y = cellY(cy);
    nx.push(x);
    ny.push(y);
    nz.push((L(i) - 0.5) * 0.14 + (rand() - 0.5) * 0.05);
    nLum.push(L(i));
    nKind.push(kind);
  };
  for (const i of shuffle([...contour])) {
    if (farFrom(cellX(i % FIELD_W), cellY(Math.floor(i / FIELD_W)), CONTOUR_SPACING)) addNode(i, 0);
  }
  // interni: i più luminosi prima (le creste attirano i nodi)
  const interior = shuffle([...gas]).sort((a, b) => L(b) + rand() * 0.25 - (L(a) + rand() * 0.25));
  for (const i of interior) {
    const x = cellX(i % FIELD_W);
    const y = cellY(Math.floor(i / FIELD_W));
    if (farFrom(x, y, INTERIOR_SPACING * (1.15 - L(i) * 0.4))) addNode(i, 1);
  }
  // apici: i nodi più luminosi, distanti fra loro
  const byLum = nx.map((_, k) => k).sort((a, b) => nLum[b] - nLum[a]);
  let apex = 0;
  for (const k of byLum) {
    if (apex >= APEX_COUNT) break;
    let ok = true;
    for (let j = 0; j < nx.length; j++) {
      if (nKind[j] === 4 && Math.hypot(nx[j] - nx[k], ny[j] - ny[k]) < 0.3) ok = false;
    }
    if (!ok) continue;
    nKind[k] = 4;
    apex++;
  }
  // le forme da riconoscere: testa ricurva, punta incandescente, mano del
  // braccio, picco basso — nodi brillanti esattamente lì
  const tipNode: number[] = [];
  for (const [u, v] of TIPS) {
    const x = (u - 0.5) * 2 * FIELD_ASPECT;
    const y = (0.5 - v) * 2;
    // un nodo troppo vicino verrebbe assorbito: lo si sostituisce
    let near = -1;
    for (let k = 0; k < nx.length; k++) if (Math.hypot(nx[k] - x, ny[k] - y) < 0.05) near = k;
    if (near >= 0) {
      nx[near] = x;
      ny[near] = y;
      nKind[near] = 4;
      nLum[near] = 1;
      tipNode.push(near);
    } else {
      nx.push(x);
      ny.push(y);
      nz.push(0.04);
      nLum.push(1);
      nKind.push(4);
      tipNode.push(nx.length - 1);
    }
  }
  const pillarNodes = nx.length;

  // le stelle dell'immagine, alle loro posizioni
  let spiked = 0;
  STARS.forEach(([u, v]) => {
    const x = (u - 0.5) * 2 * FIELD_ASPECT;
    const y = (0.5 - v) * 2;
    // le stelle stanno nel CIELO: nessuna sopra il gas o a ridosso del bordo
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (inside(x + dx * CELL, y + dy * CELL)) return;
    const s = spiked++;
    nx.push(x);
    ny.push(y);
    nz.push((rand() - 0.5) * 0.3);
    nLum.push(1);
    nKind.push(s < SPIKED_STARS ? 3 : 2);
  });
  const nodeCount = nx.length;

  /* ---------- 2. gli archi, dentro il gas ---------- */
  type Edge = { a: number; b: number; w: number };
  const edges: Edge[] = [];
  const has = new Set<string>();
  /** Cielo "profondo": nessun gas nella cella né in quelle attorno. */
  const deepSky = (x: number, y: number) =>
    !inside(x, y) && !inside(x + CELL, y) && !inside(x - CELL, y) && !inside(x, y + CELL) && !inside(x, y - CELL);
  const segInside = (a: number, b: number, tolerance: number) => {
    let miss = 0;
    for (let s = 1; s < 14; s++) {
      const t = s / 14;
      const x = nx[a] + (nx[b] - nx[a]) * t;
      const y = ny[a] + (ny[b] - ny[a]) * t;
      // un arco non attraversa MAI un canale di cielo fra due colonne
      if (deepSky(x, y)) return false;
      if (!inside(x, y)) miss++;
    }
    return miss <= tolerance;
  };
  const add = (a: number, b: number, w: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (a === b || has.has(key)) return;
    has.add(key);
    edges.push({ a, b, w });
  };
  for (let a = 0; a < pillarNodes; a++) {
    const near = [];
    for (let b = 0; b < pillarNodes; b++) {
      if (b === a) continue;
      const d = Math.hypot(nx[a] - nx[b], ny[a] - ny[b]);
      if (d < MAX_EDGE) near.push({ b, d });
    }
    near.sort((p, q) => p.d - q.d);
    let made = 0;
    for (const { b } of near) {
      if (made >= K_NEAREST) break;
      const outline = nKind[a] === 0 && nKind[b] === 0;
      // sul contorno il segmento può sfiorare il cielo di una cella
      if (!segInside(a, b, outline ? 3 : 0)) continue;
      const w = outline ? 0.55 + rand() * 0.35 : 0.2 + (nLum[a] + nLum[b]) * 0.3 + rand() * 0.15;
      add(a, b, Math.min(1, w));
      made++;
    }
  }

  /* ---------- 3. budget ---------- */
  const lengths = edges.map((e) => Math.hypot(nx[e.a] - nx[e.b], ny[e.a] - ny[e.b]));
  const filBudget = Math.max(120, Math.round((target - nodeCount) * 0.12));
  const bodyBudget = Math.max(200, target - nodeCount - filBudget);
  const totalW = lengths.reduce((acc, l, i) => acc + l * (0.5 + edges[i].w), 0);
  const perUnit = filBudget / Math.max(totalW, 1e-4);

  /* ---------- 4. i buffer ---------- */
  const px: number[] = [];
  const py: number[] = [];
  const pz: number[] = [];
  const seeds: number[] = [];
  const flow: number[] = [];
  const own: number[] = [];
  const kinds: number[] = [];
  const size: number[] = [];
  const hint: number[] = [];
  const seg: number[] = [];
  // il riordino SALE: dalla base dei pilastri alle teste
  const wave = (y: number) => ((y + 1) / 2) * 0.85;
  const push = (
    x: number, y: number, z: number, seed: number, u: number, delay: number,
    weight: number, kind: number, oa: number, ob: number, sz: number, gh: number,
  ) => {
    px.push(x);
    py.push(y);
    pz.push(z);
    seeds.push(seed);
    flow.push(u, delay, weight);
    kinds.push(kind);
    own.push(oa, ob);
    size.push(sz);
    hint.push(gh);
    return px.length - 1;
  };

  const nodeIndex = new Int32Array(nodeCount);
  for (let k = 0; k < nodeCount; k++) {
    const kind = nKind[k];
    const sz =
      kind === 4 ? 22 : kind === 3 ? 34 : kind === 2 ? 9 + Math.min(5, (STARS[k - pillarNodes]?.[2] ?? 60) / 40) : kind === 0 ? 7 + nLum[k] * 3 : 10 + nLum[k] * 4;
    const hintK = kind === 3 ? 1 : kind === 4 ? 3 : 0;
    const delay = kind >= 2 && kind <= 3 ? 0.3 + rand() * 0.6 : wave(ny[k]);
    nodeIndex[k] = push(nx[k], ny[k], nz[k], rand(), 0, delay, 1, 1, k, k, sz, hintK);
  }

  const edgeArr = new Uint16Array(edges.length * 2);
  const edgeW = new Float32Array(edges.length);
  edges.forEach((e, ei) => {
    edgeArr[ei * 2] = e.a;
    edgeArr[ei * 2 + 1] = e.b;
    edgeW[ei] = e.w;
    const n = Math.max(1, Math.round(lengths[ei] * (0.5 + e.w) * perUnit));
    const seed = rand();
    const base = Math.max(wave(ny[e.a]), wave(ny[e.b])) + 0.04;
    let prev = nodeIndex[e.a];
    for (let s = 1; s <= n; s++) {
      const u = s / (n + 1);
      const j = (rand() - 0.5) * 0.006;
      const idx = push(
        nx[e.a] + (nx[e.b] - nx[e.a]) * u + j,
        ny[e.a] + (ny[e.b] - ny[e.a]) * u + j,
        nz[e.a] + (nz[e.b] - nz[e.a]) * u,
        seed, u, base + u * 0.05, e.w, 0, e.a, e.b, 8.5 + e.w * 3, 0,
      );
      seg.push(prev, idx);
      prev = idx;
    }
    seg.push(prev, nodeIndex[e.b]);
  });

  const nearestNode = (x: number, y: number) => {
    let best = 0;
    let bd = Infinity;
    for (let k = 0; k < pillarNodes; k++) {
      const d = (nx[k] - x) ** 2 + (ny[k] - y) ** 2;
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    return best;
  };

  // il CORPO: campionato sulle celle, con probabilità legata alla luce
  const wispN = Math.round(bodyBudget * 0.04);
  const rimN = Math.round(bodyBudget * 0.3);
  const haloN = TIPS.length * 14;
  // ALONE degli apici: un piccolo grappolo luminoso attorno a ogni forma
  tipNode.forEach((k) => {
    for (let h = 0; h < 14; h++) {
      const a = rand() * Math.PI * 2;
      const r = CELL * (0.6 + Math.pow(rand(), 1.4) * 2.6);
      const x = nx[k] + Math.cos(a) * r;
      const y = ny[k] + Math.sin(a) * r;
      if (deepSky(x, y)) continue;
      push(x, y, 0.03 + (rand() - 0.5) * 0.04, rand(), rand(), wave(y) + 0.04, 0.85 + rand() * 0.15, 0.5, k, k, 7 + rand() * 3, 2);
    }
  });
  const bodyN = bodyBudget - wispN - rimN - haloN;
  // il BORDO: glifi fitti sul contorno, perché la silhouette si legga netta
  for (let n = 0; n < rimN && contour.length; n++) {
    const i = contour[Math.floor(rand() * contour.length)];
    const l = L(i);
    const x = cellX(i % FIELD_W) + (rand() - 0.5) * CELL * 0.6;
    const y = cellY(Math.floor(i / FIELD_W)) + (rand() - 0.5) * CELL * 0.6;
    const o = nearestNode(x, y);
    // le facce in alto a destra sono quelle illuminate: bordo più acceso
    const cx0 = i % FIELD_W;
    const cy0 = Math.floor(i / FIELD_W);
    let lit = 0;
    if (cx0 + 1 < FIELD_W && !lvl[i + 1]) lit += 0.5;
    if (cy0 > 0 && !lvl[i - FIELD_W]) lit += 0.5;
    const w = Math.min(1, 0.4 + l * 0.35 + lit * 0.45);
    push(x, y, (rand() - 0.5) * 0.06, rand(), rand(), wave(y) + 0.03, w, 0.5, o, o, 6 + w * 3.5, 2);
  }
  const cum = new Float32Array(gas.length);
  let acc = 0;
  gas.forEach((i, k) => {
    // le creste luminose pesano molto più delle pieghe scure
    acc += 0.6 + Math.pow(L(i), 1.7);
    cum[k] = acc;
  });
  const pick = () => {
    const r = rand() * acc;
    let lo = 0;
    let hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    return gas[lo];
  };
  for (let n = 0; n < bodyN; n++) {
    const i = pick();
    const l = L(i);
    const x = cellX(i % FIELD_W) + (rand() - 0.5) * CELL * 0.95;
    const y = cellY(Math.floor(i / FIELD_W)) + (rand() - 0.5) * CELL * 0.95;
    const o = nearestNode(x, y);
    push(x, y, (l - 0.5) * 0.14 + (rand() - 0.5) * 0.08, rand(), rand(), wave(y) + 0.03, 0.26 + Math.pow(l, 1.3) * 0.74, 0.5, o, o, 7 + l * 4, 2);
  }
  // le FRANGE: fuori dal bordo, verso il cielo
  for (let n = 0; n < wispN && contour.length; n++) {
    const i = contour[Math.floor(rand() * contour.length)];
    const cx = i % FIELD_W;
    const cy = Math.floor(i / FIELD_W);
    // direzione d'uscita: dal gas verso il cielo (media dei vicini vuoti)
    let ox = 0;
    let oy = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const xx = cx + dx;
        const yy = cy + dy;
        if (xx < 0 || yy < 0 || xx >= FIELD_W || yy >= FIELD_H) continue;
        if (!lvl[yy * FIELD_W + xx]) {
          ox += dx;
          oy -= dy;
        }
      }
    }
    const len = Math.hypot(ox, oy) || 1;
    const dist = CELL * (0.6 + Math.pow(rand(), 2.2) * 2.2);
    const x = cellX(cx) + (ox / len) * dist + (rand() - 0.5) * CELL;
    const y = cellY(cy) + (oy / len) * dist + (rand() - 0.5) * CELL;
    // niente foschia nei canali: se oltre il bordo, poco più in là, c'è
    // ancora gas, questo è un varco fra due colonne e resta vuoto
    const far1 = inside(x + (ox / len) * CELL * 2, y + (oy / len) * CELL * 2);
    const far2 = inside(x + (ox / len) * CELL * 4, y + (oy / len) * CELL * 4);
    if (far1 || far2) continue;
    const o = nearestNode(x, y);
    const w = 0.06 + rand() * 0.2;
    push(x, y, (rand() - 0.5) * 0.08, rand(), rand(), wave(y) + 0.05, w, 0.5, o, o, 6.5 + w * 4, 2);
  }

  /* ---------- 5. buffer finali ---------- */
  const count = px.length;
  let maxDelay = 0;
  for (let i = 0; i < count; i++) maxDelay = Math.max(maxDelay, flow[i * 3 + 1]);
  const positions = new Float32Array(count * 3);
  const flowArr = new Float32Array(count * 3);
  const lookArr = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = px[i];
    positions[i * 3 + 1] = py[i];
    positions[i * 3 + 2] = pz[i];
    flowArr[i * 3] = flow[i * 3];
    flowArr[i * 3 + 1] = (flow[i * 3 + 1] / Math.max(maxDelay, 1e-3)) * 0.66;
    flowArr[i * 3 + 2] = flow[i * 3 + 2];
    lookArr[i * 2] = kinds[i];
    lookArr[i * 2 + 1] = 1;
  }
  const nodes = new Float32Array(nodeCount * 3);
  for (let k = 0; k < nodeCount; k++) {
    nodes[k * 3] = nx[k];
    nodes[k * 3 + 1] = ny[k];
    nodes[k * 3 + 2] = nz[k];
  }
  const nodeTag = nKind.map((k) => (k === 2 || k === 3 ? "*" : k === 4 ? "APEX" : k === 0 ? "EDGE" : "CORE"));

  return {
    count,
    positions,
    cells: new Float32Array(count * 3),
    seeds: Float32Array.from(seeds),
    flow: flowArr,
    look: lookArr,
    indices: new Uint16Array(seg),
    owners: Float32Array.from(own),
    nodeParticle: nodeIndex,
    nodeLayer: Uint8Array.from(nKind),
    nodeCount,
    nodes,
    edges: edgeArr,
    edgeWeights: edgeW,
    sizes: Float32Array.from(size),
    glyphHint: Uint8Array.from(hint),
    nodeTag,
    // l'inquadratura è l'IMMAGINE intera (ritratto), non l'ingombro del gas:
    // nulla viene tagliato, stelle comprese
    halfX: FIELD_ASPECT,
    halfY: 1,
  };
}
