/**
 * LA STRUTTURA DELLE PARTICELLE — una rete neurale, non una nuvola.
 *
 * Nota del cliente (revisione della build v2):
 *   «immagine troppo inconsistente: la mia idea sarebbe che quando l'utente apre
 *    il sito, tutta la pagina è sparsa di dati, e parte un'animazione incredibile
 *    dove questi dati vengono riordinati in una struttura simil rete neurale.
 *    Ok colori, molto bello e da mantenere effetto trascinamento sul mouse.
 *    Da tenere incorporato anche il concetto di grafo nell'idea.»
 *
 * Quindi: colori e interazione col cursore restano; la FORMA cambia. Il nastro
 * tessuto su nodo toroidale (weaveLattice v2) leggeva come una macchia senza
 * contorno — «inconsistente» — perché non aveva né gerarchia né direzione di
 * lettura. Al suo posto: un GRAFO A STRATI, che è la stessa metafora resa
 * leggibile.
 *
 *   · 5 STRATI di nodi (5 · 9 · 12 · 9 · 5 = 40 nodi), disposti lungo X con una
 *     apertura in Z che alterna strato per strato: da fermo si legge come una
 *     rete, e alla minima rotazione la profondità si rivela.
 *   · ARCHI PESATI fra strati adiacenti (più un pugno di connessioni "skip" fra
 *     strato i e i+2: è un grafo, non solo un perceptron). Il peso non è
 *     decorativo: governa la luminosità dell'arco e la densità di particelle che
 *     ci corrono sopra.
 *   · Le particelle NON sono sparse a caso: sono i FILAMENTI degli archi (una
 *     fila di punti lungo ogni arco, che è anche la geometria con cui gli archi
 *     vengono disegnati) più un alone attorno a ogni nodo. Ogni particella
 *     appartiene a qualcosa — è questo che toglie l'«inconsistente».
 *
 * ── L'INGRESSO: caos → struttura ──────────────────────────────────────────
 * Ogni particella nasce in una CELLA di una lattice jitterata che copre TUTTA la
 * viewport (`cells`, in coordinate normalizzate -1..1 + profondità), non nella
 * silhouette della forma finale: al caricamento la pagina è davvero «sparsa di
 * dati». La lattice è una scelta precisa e non rumore puro — il fondo globale
 * (components/fx/ParticleField) è già un campo casuale in deriva lenta: un
 * secondo campo casuale sopra sarebbe rumore su rumore. Una griglia irregolare
 * di dati, che poi collassa, si legge invece come deliberata contro quel fondo.
 *
 * `delays` ordina la ricomposizione in ONDATE: prima i nodi dello strato 0, poi
 * quelli dello strato 1, e gli archi solo DOPO che entrambi i loro estremi sono
 * atterrati (con un ulteriore ritardo proporzionale a `u`, l'ascissa lungo
 * l'arco: il filamento si disegna dalla sorgente verso il bersaglio). È la
 * differenza fra una coreografia e una dissolvenza incrociata.
 *
 * Tutto è generato una sola volta con un seed fisso: stesso risultato a ogni
 * load, quindi prevedibile e testabile.
 */

export type GraphData = {
  /** Numero di particelle generate. */
  count: number;
  /** count*3 — posizione finale, in unità locali del grafo. */
  positions: Float32Array;
  /** count*3 — cella di partenza: x,y normalizzati in -1..1 sulla viewport, z = 0..1 di profondità. */
  cells: Float32Array;
  /** count — fase 0..1. Costante lungo un arco (i filamenti respirano compatti, non a scatti). */
  seeds: Float32Array;
  /** count*3 — (u lungo l'arco, ritardo di ingresso 0..1, peso 0..1). */
  flow: Float32Array;
  /** count*2 — (tipo: 0 filamento · 0.5 alone · 1 nodo, moltiplicatore di dimensione). */
  look: Float32Array;
  /** Coppie di indici: i filamenti disegnati come LineSegments sugli STESSI buffer. */
  indices: Uint16Array;
  /** count*2 — i due nodi dell'arco a cui la particella appartiene (nodo: a = b = sé). */
  owners: Float32Array;
  /** nodeCount — indice della particella "nucleo" di ogni nodo. */
  nodeParticle: Int32Array;
  /** nodeCount — strato (0..4) di ogni nodo. */
  nodeLayer: Uint8Array;

  /* --- il grafo "logico", usato dal fallback 2D e dai test --- */
  nodeCount: number;
  /** nodeCount*3 — i soli nodi. */
  nodes: Float32Array;
  /** Coppie di indici di nodo. */
  edges: Uint16Array;
  /** Un peso 0..1 per arco. */
  edgeWeights: Float32Array;

  /** Facoltativi (pilastri): cella del glifo in px per particella, e tipo di glifo
   *  (0 = da tipo · 1 = stella con raggi di diffrazione · 2 = corpo · 3 = punta). */
  sizes?: Float32Array;
  glyphHint?: Uint8Array;
  /** Facoltativo: etichetta breve per nodo (intestazione dei satelliti). */
  nodeTag?: string[];

  /** Semi-ingombro della struttura, per farla stare dentro il suo riquadro. */
  halfX: number;
  halfY: number;
};

const SEED = 133713;

/** mulberry32 — PRNG piccolo, veloce, deterministico da un solo intero seed. */
export function mulberry32(seed: number) {
  let s = seed;
  return function random() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* --- forma della rete ---------------------------------------------------- */
const LAYERS = [5, 9, 12, 9, 5];
const SPAN_X = 1.06; // apertura orizzontale (unità di scena)
const SPAN_Y = 0.82; // apertura verticale dello strato più popolato
const Z_FAN = 0.32; // apertura in profondità, alternata strato per strato
const HALO_PER_NODE = 4; // particelle di densità attorno a ogni nodo
const HALO_RADIUS = 0.055;

/* --- coreografia dell'ingresso (frazioni di uProgress) -------------------- */
const LAYER_WAVE = 0.108; // ritardo fra uno strato e il successivo
const EDGE_GAP = 0.055; // l'arco parte DOPO che i suoi estremi sono atterrati
const EDGE_SWEEP = 0.085; // e si disegna da sorgente a bersaglio
/** Frazione di uProgress che dura il volo di UNA particella (uSpan nello shader). */
export const SETTLE_SPAN = 0.34;

const cache = new Map<number, GraphData>();

/**
 * Costruisce la rete con un numero di particelle il più vicino possibile a
 * `target`. Cambia solo la DENSITÀ dei filamenti fra un livello di qualità e
 * l'altro: la forma del grafo è identica su ogni dispositivo.
 */
export function buildGraph(target = 2200): GraphData {
  const cached = cache.get(target);
  if (cached) return cached;

  const rand = mulberry32(SEED);
  const L = LAYERS.length;
  const maxN = Math.max(...LAYERS);

  /* ---------- 1. i nodi ---------- */
  const nx: number[] = [];
  const ny: number[] = [];
  const nz: number[] = [];
  const layerOf: number[] = [];
  const vOf: number[] = []; // posizione normalizzata -1..1 dentro lo strato
  const layerStart: number[] = [];

  for (let i = 0; i < L; i++) {
    layerStart.push(nx.length);
    const n = LAYERS[i];
    const x = L === 1 ? 0 : (i / (L - 1) - 0.5) * 2 * SPAN_X;
    // gli strati più popolati sono anche i più alti: la rete ha una silhouette
    // a lente, non un rettangolo
    const height = SPAN_Y * (0.56 + 0.44 * (n / maxN));
    for (let j = 0; j < n; j++) {
      const v = n === 1 ? 0 : (j / (n - 1) - 0.5) * 2;
      nx.push(x + (rand() - 0.5) * 0.05);
      ny.push(v * height + (rand() - 0.5) * 0.045);
      // ventaglio in Z alternato: da fermo la rete è leggibile, alla minima
      // oscillazione la profondità si rivela
      nz.push(
        Math.sin(v * Math.PI * 0.5) * Z_FAN * (i % 2 === 0 ? 1 : -1) +
          (rand() - 0.5) * 0.1,
      );
      layerOf.push(i);
      vOf.push(v);
    }
  }
  const nodeCount = nx.length;

  /* ---------- 2. gli archi ---------- */
  type Edge = { a: number; b: number; w: number };
  const edges: Edge[] = [];

  const connect = (i: number, jLayer: number, k: number, wScale: number) => {
    const from = layerStart[i];
    const to = layerStart[jLayer];
    const nTo = LAYERS[jLayer];
    for (let a = 0; a < LAYERS[i]; a++) {
      const ia = from + a;
      // i k nodi più "allineati" del layer bersaglio: la rete resta leggibile,
      // una connessione completa sarebbe un gomitolo
      const order = Array.from({ length: nTo }, (_, b) => b).sort(
        (p, q) =>
          Math.abs(vOf[to + p] - vOf[ia]) - Math.abs(vOf[to + q] - vOf[ia]),
      );
      const kk = Math.min(nTo, k + (rand() < 0.45 ? 1 : 0));
      for (let s = 0; s < kk; s++) {
        const ib = to + order[s];
        // pesi sbilanciati: pochi archi forti, molti sottili. Se fossero tutti
        // uguali la rete sembrerebbe una texture, non una struttura.
        const w = (0.26 + 0.74 * Math.pow(rand(), 1.7)) * wScale;
        edges.push({ a: ia, b: ib, w });
      }
      // una connessione lunga ogni tanto: è un grafo, non una griglia
      if (rand() < 0.14) {
        const ib = to + Math.floor(rand() * nTo);
        if (ib !== ia) edges.push({ a: ia, b: ib, w: 0.22 * wScale });
      }
    }
  };

  for (let i = 0; i < L - 1; i++) connect(i, i + 1, 2, 1);
  // skip connections: il concetto di grafo, esplicito
  for (let i = 0; i < L - 2; i++) {
    const from = layerStart[i];
    for (let a = 0; a < LAYERS[i]; a++) {
      if (rand() > 0.22) continue;
      const to = layerStart[i + 2];
      const ib = to + Math.floor(rand() * LAYERS[i + 2]);
      edges.push({ a: from + a, b: ib, w: 0.2 });
    }
  }

  /* ---------- 3. budget delle particelle ---------- */
  const nodeParticles = nodeCount * (1 + HALO_PER_NODE);
  const edgeBudget = Math.max(200, target - nodeParticles);

  const lengths = edges.map((e) =>
    Math.hypot(nx[e.a] - nx[e.b], ny[e.a] - ny[e.b], nz[e.a] - nz[e.b]),
  );
  // il peso conta quanto la lunghezza: un arco forte è anche più denso, quindi
  // più luminoso — è così che il peso si VEDE
  const totalW = lengths.reduce((acc, len, i) => acc + len * (0.55 + edges[i].w), 0);
  const perUnit = edgeBudget / Math.max(totalW, 1e-4);

  /* ---------- 4. i buffer ---------- */
  const px: number[] = [];
  const py: number[] = [];
  const pz: number[] = [];
  const seeds: number[] = [];
  const flow: number[] = []; // u, delay, weight
  const look: number[] = []; // kind, size
  const own: number[] = []; // nodo a, nodo b
  const seg: number[] = [];
  let ownA = 0;
  let ownB = 0;

  const nodeDelay = (i: number) => layerOf[i] * LAYER_WAVE;

  const push = (
    x: number,
    y: number,
    z: number,
    seed: number,
    u: number,
    delay: number,
    weight: number,
    kind: number,
    size: number,
  ) => {
    px.push(x);
    py.push(y);
    pz.push(z);
    seeds.push(seed);
    flow.push(u, delay, weight);
    look.push(kind, size);
    own.push(ownA, ownB);
    return px.length - 1;
  };

  // 4a. i nodi (il "core" luminoso) e il loro alone di densità
  const nodeIndex = new Int32Array(nodeCount);
  for (let i = 0; i < nodeCount; i++) {
    ownA = i;
    ownB = i;
    const d = nodeDelay(i) + rand() * 0.022;
    nodeIndex[i] = push(nx[i], ny[i], nz[i], rand(), 0, d, 1, 1, 2.2);
    for (let h = 0; h < HALO_PER_NODE; h++) {
      const th = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const r = HALO_RADIUS * (0.5 + rand());
      push(
        nx[i] + r * Math.sin(phi) * Math.cos(th),
        ny[i] + r * Math.sin(phi) * Math.sin(th),
        nz[i] + r * Math.cos(phi) * 0.7,
        rand(),
        0,
        d + 0.03 + rand() * 0.03,
        0.75,
        0.5,
        0.8,
      );
    }
  }

  // 4b. i filamenti: una fila di punti lungo ogni arco. Gli stessi punti sono
  //     anche i vertici con cui l'arco viene disegnato (un solo buffer GPU).
  const edgeArr = new Uint16Array(edges.length * 2);
  const edgeW = new Float32Array(edges.length);

  for (let e = 0; e < edges.length; e++) {
    const { a, b, w } = edges[e];
    ownA = a;
    ownB = b;
    edgeArr[e * 2] = a;
    edgeArr[e * 2 + 1] = b;
    edgeW[e] = w;

    const len = lengths[e];
    const n = Math.max(3, Math.round(len * (0.55 + w) * perUnit));
    const seed = rand(); // COSTANTE lungo l'arco: il filamento respira compatto
    const base = Math.max(nodeDelay(a), nodeDelay(b)) + EDGE_GAP;

    let prev = nodeIndex[a];
    for (let s = 1; s <= n; s++) {
      const u = s / (n + 1);
      const jitter = (0.5 - rand()) * 0.012;
      const idx = push(
        nx[a] + (nx[b] - nx[a]) * u + jitter,
        ny[a] + (ny[b] - ny[a]) * u + jitter * 0.8,
        nz[a] + (nz[b] - nz[a]) * u + jitter,
        seed,
        u,
        base + u * EDGE_SWEEP,
        w,
        0,
        0.55 + w * 0.55,
      );
      seg.push(prev, idx);
      prev = idx;
    }
    seg.push(prev, nodeIndex[b]);
  }

  /* ---------- 5. le celle di partenza: una lattice su TUTTA la viewport ---- */
  const count = px.length;
  const cells = new Float32Array(count * 3);
  const cols = Math.max(4, Math.ceil(Math.sqrt(count * 1.7)));
  const rows = Math.max(3, Math.ceil(count / cols));

  // permutazione deterministica: particelle vicine nel grafo NON arrivano da
  // celle vicine — i dati vengono davvero da tutta la pagina
  const order = new Uint32Array(count);
  for (let i = 0; i < count; i++) order[i] = i;
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = order[i];
    order[i] = order[j];
    order[j] = t;
  }

  for (let i = 0; i < count; i++) {
    const slot = order[i];
    const c = slot % cols;
    const r = Math.floor(slot / cols) % rows;
    const jx = (rand() - 0.5) * 1.55; // il jitter sfonda la cella: griglia
    const jy = (rand() - 0.5) * 1.55; // percepita, non griglia disegnata
    cells[i * 3] = ((c + 0.5 + jx) / cols) * 2 - 1;
    cells[i * 3 + 1] = ((r + 0.5 + jy) / rows) * 2 - 1;
    // densità un filo maggiore sul davanti: la sparsa ha profondità vera
    cells[i * 3 + 2] = Math.pow(rand(), 0.85);
  }

  /* ---------- 6. normalizzazione dei ritardi ------------------------------ */
  let maxDelay = 0;
  for (let i = 0; i < count; i++) maxDelay = Math.max(maxDelay, flow[i * 3 + 1]);
  const room = 1 - SETTLE_SPAN;
  const kDelay = maxDelay > 0 ? room / maxDelay : 0;

  const positions = new Float32Array(count * 3);
  const flowArr = new Float32Array(count * 3);
  const lookArr = new Float32Array(count * 2);
  const seedArr = new Float32Array(count);
  let halfX = 0;
  let halfY = 0;

  for (let i = 0; i < count; i++) {
    positions[i * 3] = px[i];
    positions[i * 3 + 1] = py[i];
    positions[i * 3 + 2] = pz[i];
    flowArr[i * 3] = flow[i * 3];
    flowArr[i * 3 + 1] = flow[i * 3 + 1] * kDelay;
    flowArr[i * 3 + 2] = flow[i * 3 + 2];
    lookArr[i * 2] = look[i * 2];
    lookArr[i * 2 + 1] = look[i * 2 + 1];
    seedArr[i] = seeds[i];
    halfX = Math.max(halfX, Math.abs(px[i]));
    halfY = Math.max(halfY, Math.abs(py[i]));
  }

  const nodes = new Float32Array(nodeCount * 3);
  for (let i = 0; i < nodeCount; i++) {
    nodes[i * 3] = nx[i];
    nodes[i * 3 + 1] = ny[i];
    nodes[i * 3 + 2] = nz[i];
  }

  const data: GraphData = {
    count,
    positions,
    cells,
    seeds: seedArr,
    flow: flowArr,
    look: lookArr,
    indices: new Uint16Array(seg),
    owners: new Float32Array(own),
    nodeParticle: nodeIndex,
    nodeLayer: Uint8Array.from(layerOf),
    nodeCount,
    nodes,
    edges: edgeArr,
    edgeWeights: edgeW,
    halfX,
    halfY,
  };
  cache.set(target, data);
  return data;
}

/**
 * Proiezione minima usata dal fallback 2D (nessun WebGL): ruota un punto attorno
 * a Y e X e lo proietta in prospettiva. Sta qui per garantire che il fallback
 * disegni *la stessa rete*, non un'altra figura.
 */
export function projectPoint(
  x: number,
  y: number,
  z: number,
  ry: number,
  rx: number,
  camZ: number,
) {
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const y1 = y * cx - z1 * sx;
  const z2 = y * sx + z1 * cx;
  const d = camZ - z2;
  const k = d > 0.1 ? 1 / d : 10;
  return { x: x1 * k, y: y1 * k, depth: z2 };
}
