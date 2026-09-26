/**
 * Geometria della doppia elica — 07 ABOUT/TRAIETTORIA.
 *
 * Modulo PURO (nessun React, nessun DOM): tutto ciò che qui dentro è calcolabile
 * è testabile a mano e non dipende dal ciclo di vita del componente.
 *
 * Il bug della v1 era il modello: due rette campionate su un dominio-t sbagliato
 * producevano due segmenti incrociati a X invece di una sinusoide. Qui il modello
 * è esplicito e invertibile:
 *
 *   filamento ACCADEMICO      x_a(θ) = cx − A·sin(θ)      z_a(θ) = −A·cos(θ)
 *   filamento PROFESSIONALE   x_p(θ) = cx + A·sin(θ)      z_p(θ) = +A·cos(θ)
 *
 * cioè due punti ANTIPODALI sulla stessa elica (sfasamento π, ART-DIRECTION §6
 * "About / Elica"). Le due proprietà che ne discendono e che il vecchio codice
 * non aveva:
 *
 *  · incrocio ⟺ sin θ = 0 (θ ≡ 0 mod π) — i due filamenti si TOCCANO davvero;
 *  · antinodo ⟺ |sin θ| = 1 (θ ≡ π/2 mod π) — massima distanza reciproca,
 *    e soprattutto lato (sinistra/destra) NON ambiguo per agganciare un box.
 *
 * La componente z non si disegna mai, ma governa quale filamento è "davanti":
 * è quello che dà la lettura di rotazione 3D, insieme alle traversine (rungs)
 * la cui lunghezza proiettata è 2A·|sin θ|.
 *
 * ————————————————————————————————————————————————————————————————
 * Il verso della dipendenza (importante): NON è il codice a decidere le altezze
 * delle righe. Le righe sono HTML in flusso normale, si misurano dopo il
 * layout, e la mappa θ(y) viene costruita per PASSARE dalle loro y. Così il
 * testo non viene mai tagliato e non resta mai spazio morto: l'elica si adatta
 * al contenuto, non viceversa.
 *
 * ————————————————————————————————————————————————————————————————
 * REVISIONE "più contenuta" (nota cliente: «Elica graficamente scarsa … la
 * voglio simile, solo più contenuta»). Due assi di lavoro, entrambi DENTRO
 * l'invariante di correttezza qui sopra — che non è stata toccata:
 *
 *  1. PROPORZIONI. L'oggetto smette di occupare tutta la larghezza del
 *     container (§1: `HELIX_MAX_WIDTH`), l'ampiezza scende da 112 a 68px e i
 *     box da 340 a 280px. Prima, a 1280px di container, restavano ~170px di
 *     margine morto per lato: era quel vuoto a far leggere l'elica come un
 *     diagramma sparso invece che come un oggetto.
 *  2. QUALITÀ DI LINEA. I sotto-tratti erano segmentati per Y a passo fisso:
 *     con ~5 giri, un singolo tratto copriva mezzo periodo e riceveva UNA sola
 *     opacità — la profondità si leggeva a bande, non come rotazione. Adesso la
 *     segmentazione è ANGOLARE (§5, passo π/3): ogni tratto copre un sesto di
 *     giro, quindi la sua profondità è ben definita e la gradazione
 *     opacità/spessore/TONO scorre continua lungo il filamento.
 */

import type {
  AchievementBadge,
  TimelineEvent,
  TimelineLane,
  TimelinePhase,
} from "@/content/about";

export const PI = Math.PI;

/* ============================================================================
   1. Metriche responsive
   ========================================================================== */

/**
 * Larghezza massima dell'intero oggetto-elica, in px.
 *
 * È la leva principale del "più contenuta". Il componente la applica come
 * `max-width` sulla radice, quindi dentro un container da 1280px l'elica non si
 * allarga: resta un oggetto centrato di 760px. Tutto il resto delle metriche è
 * derivato dalla larghezza MISURATA, quindi cambiare questa sola costante
 * riproporziona coerentemente ampiezza, corsia centrale e box.
 */
export const HELIX_MAX_WIDTH = 760;

export type HelixMetrics = {
  /** Larghezza utile del contenitore, in px. */
  width: number;
  /** Asse dell'elica. */
  cx: number;
  /** Ampiezza A: escursione massima del filamento dall'asse. */
  amplitude: number;
  /** Lunghezza minima del connettore radiale path → box. */
  connector: number;
  /**
   * Semi-larghezza della corsia centrale riservata ai filamenti.
   * = A + connector ⇒ |x(θ) − cx| ≤ A < gutter per COSTRUZIONE: nessun box
   * può mai finire sopra un filamento, a nessuna y. È la proprietà che
   * sostituisce i tentativi di "spostare il box se collide" della v1.
   */
  gutter: number;
  /** Larghezza massima di un box tappa. */
  boxMax: number;
  /** Periodo bersaglio dell'elica in px (quanti px per un giro completo). */
  period: number;
  /** < 700px: tipografia e connettori compressi. */
  compact: boolean;
  /** Coda dell'elica sopra la prima riga e sotto l'ultima. */
  padY: number;
};

export function helixMetrics(rawWidth: number): HelixMetrics {
  const width = Math.max(rawWidth, 280);
  const compact = width < 700;
  const cx = width / 2;

  // A si ferma a 68px (era 112). Con la larghezza totale ora limitata a
  // HELIX_MAX_WIDTH, un'ampiezza da 112 avrebbe reso il nastro centrale largo
  // quasi un terzo dell'oggetto: grasso, non "contenuto". A 68 il nastro è
  // 136px su 760 — una spirale sottile, che è esattamente la lettura chiesta.
  // Su mobile la frazione resta più alta: lì le righe sono molto più alte (il
  // testo va a capo), quindi il periodo reale si allunga e senza compensare
  // l'elica si appiattirebbe in "due linee mosse" (spec §3).
  const amplitude = Math.min(68, Math.max(26, width * (compact ? 0.1 : 0.095)));
  const connector = compact ? 10 : 16;
  const gutter = amplitude + connector;
  // 280 invece di 340: il box più stretto avvicina il testo al filamento e
  // toglie il margine morto ai lati. Il `max` con 96 protegge i viewport minimi.
  const boxMax = Math.min(280, Math.max(96, cx - gutter - 8));

  // Periodo accorciato (era 270/220/168): più giri sulla stessa altezza ⇒
  // avvolgimento più fitto. Il rapporto 2A/period resta nella finestra
  // leggibile 0.5–0.9 — sotto si legge come "due linee mosse", sopra come una
  // molla schiacciata.
  const period = compact ? 132 : width < 620 ? 150 : 172;
  const padY = compact ? 30 : 46;

  return { width, cx, amplitude, connector, gutter, boxMax, period, compact, padY };
}

/* ============================================================================
   2. Righe: dai dati alla griglia condivisa dalle due corsie
   ========================================================================== */

export type HelixItem =
  | { kind: "event"; lane: TimelineLane; data: TimelineEvent }
  | { kind: "badge"; lane: TimelineLane; data: AchievementBadge };

export type HelixRow = {
  key: string;
  phaseId: string;
  /** true ⟺ ENTRAMBE le corsie hanno una TAPPA (non un badge) su questa riga. */
  crossing: boolean;
  academic?: HelixItem;
  professional?: HelixItem;
};

export type HelixPhaseMark = { phaseId: string; label: TimelinePhase["label"]; beforeRow: number };

export type HelixModel = { rows: HelixRow[]; phaseMarks: HelixPhaseMark[] };

function laneItems(
  phaseId: string,
  lane: TimelineLane,
  events: TimelineEvent[],
  badges: AchievementBadge[],
): HelixItem[] {
  const evs = events
    .filter((e) => e.phaseId === phaseId && e.lane === lane)
    .map((e, i) => ({ item: { kind: "event", lane, data: e } as HelixItem, o: e.order ?? i }))
    .sort((a, b) => a.o - b.o);

  const bgs = badges
    .filter((b) => b.phaseId === phaseId && b.lane === lane)
    .map((b, i) => ({ item: { kind: "badge", lane, data: b } as HelixItem, o: b.order ?? i }))
    .sort((a, b) => a.o - b.o);

  // Le tappe prima dei badge dentro la stessa corsia/fase: è anche l'ordine di
  // lettura per uno screen reader (spec §8, punto 5).
  return [...evs, ...bgs].map((x) => x.item);
}

/**
 * Distribuisce k elementi su R righe in modo uniforme e centrato, invece di
 * impilarli in testa. Serve quando una corsia ha meno elementi dell'altra nella
 * stessa fase (tipicamente: 2 tappe professionali contro 5 badge accademici in
 * Fase 2) — così le due tappe cadono al centro del tratto, non tutte in alto.
 */
function spreadSlots(k: number, rowCount: number): number[] {
  if (k <= 0) return [];
  const taken = new Set<number>();
  const out: number[] = [];
  for (let j = 0; j < k; j++) {
    let slot = Math.min(rowCount - 1, Math.floor(((j + 0.5) * rowCount) / k));
    while (taken.has(slot) && slot < rowCount - 1) slot++;
    while (taken.has(slot) && slot > 0) slot--;
    taken.add(slot);
    out.push(slot);
  }
  return out;
}

export function buildHelixModel(
  phases: TimelinePhase[],
  events: TimelineEvent[],
  badges: AchievementBadge[],
): HelixModel {
  const rows: HelixRow[] = [];
  const phaseMarks: HelixPhaseMark[] = [];

  for (const phase of phases) {
    const acad = laneItems(phase.id, "academic", events, badges);
    const prof = laneItems(phase.id, "professional", events, badges);
    const rowCount = Math.max(acad.length, prof.length, 1);

    phaseMarks.push({ phaseId: phase.id, label: phase.label, beforeRow: rows.length });

    const base = rows.length;
    for (let i = 0; i < rowCount; i++) {
      rows.push({ key: `${phase.id}-${i}`, phaseId: phase.id, crossing: false });
    }
    spreadSlots(acad.length, rowCount).forEach((slot, j) => {
      rows[base + slot].academic = acad[j];
    });
    spreadSlots(prof.length, rowCount).forEach((slot, j) => {
      rows[base + slot].professional = prof[j];
    });
    for (let i = 0; i < rowCount; i++) {
      const r = rows[base + i];
      // §4 / §8.3: l'incrocio è DERIVATO dai dati, mai una lista mantenuta a mano.
      r.crossing = r.academic?.kind === "event" && r.professional?.kind === "event";
    }
  }

  return { rows, phaseMarks };
}

/* ============================================================================
   3. θ(y): la mappa che fa passare l'elica esattamente dalle righe misurate
   ========================================================================== */

/**
 * Assegna a ogni riga la sua fase angolare, dati i centri verticali misurati.
 *
 * Vincoli (è qui che vive la correttezza della sezione):
 *  · riga di incrocio  → θ ≡ 0 mod π  (i due filamenti si toccano davvero lì)
 *  · riga normale      → θ ≡ π/2 mod π (antinodo: lato non ambiguo per il box)
 *
 * Il salto tra due righe è quindi un multiplo ammissibile di π/2, scelto come
 * quello che avvicina di più il periodo reale al `period` bersaglio. È questo
 * che permette all'elica di restare un'elica anche su mobile, dove le righe
 * sono molto più alte: lì il salto diventa semplicemente più corto in numero di
 * mezzi periodi, non si "raddrizza" il tracciato.
 */
export function assignThetas(
  rows: { y: number; crossing: boolean }[],
  period: number,
): number[] {
  if (rows.length === 0) return [];
  const halfPeriod = Math.max(period / 2, 40);
  const thetas: number[] = [rows[0].crossing ? 0 : PI / 2];

  for (let i = 1; i < rows.length; i++) {
    const gap = Math.max(rows[i].y - rows[i - 1].y, 1);
    const raw = gap / halfPeriod; // distanza espressa in mezzi periodi
    let halves: number;

    if (rows[i].crossing === rows[i - 1].crossing) {
      // stesso tipo → salto intero di mezzi periodi
      halves = Math.max(1, Math.round(raw));
      if (!rows[i].crossing && halves % 2 === 0) {
        // antinodo → antinodo: un numero DISPARI di mezzi periodi fa cambiare
        // lato al filamento. È l'alternanza sinistra/destra che si vede.
        halves = raw > halves ? halves + 1 : Math.max(1, halves - 1);
      }
    } else {
      // incrocio ↔ antinodo → salto semi-intero
      halves = Math.max(0, Math.round(raw - 0.5)) + 0.5;
    }
    thetas.push(thetas[i - 1] + halves * PI);
  }
  return thetas;
}

export type ThetaMap = {
  thetaAt: (y: number) => number;
  yAt: (theta: number) => number;
  thetaMin: number;
  thetaMax: number;
};

/**
 * Interpolazione lineare a tratti fra gli ancoraggi (y_i, θ_i), con
 * estrapolazione oltre il primo e l'ultimo (le code dell'elica sopra la prima
 * riga e sotto l'ultima). Monotona per costruzione ⇒ invertibile.
 */
export function makeThetaMap(ys: number[], thetas: number[], yTop: number, yBottom: number): ThetaMap {
  const n = ys.length;

  const thetaAt = (y: number): number => {
    if (n === 0) return 0;
    if (n === 1) return thetas[0];
    if (y <= ys[0]) {
      const slope = (thetas[1] - thetas[0]) / Math.max(ys[1] - ys[0], 1);
      return thetas[0] + (y - ys[0]) * slope;
    }
    if (y >= ys[n - 1]) {
      const slope = (thetas[n - 1] - thetas[n - 2]) / Math.max(ys[n - 1] - ys[n - 2], 1);
      return thetas[n - 1] + (y - ys[n - 1]) * slope;
    }
    let i = 1;
    while (i < n - 1 && ys[i] < y) i++;
    const t = (y - ys[i - 1]) / Math.max(ys[i] - ys[i - 1], 1);
    return thetas[i - 1] + t * (thetas[i] - thetas[i - 1]);
  };

  const yAt = (theta: number): number => {
    if (n === 0) return yTop;
    if (n === 1) return ys[0];
    if (theta <= thetas[0]) {
      const slope = (ys[1] - ys[0]) / Math.max(thetas[1] - thetas[0], 1e-6);
      return ys[0] + (theta - thetas[0]) * slope;
    }
    if (theta >= thetas[n - 1]) {
      const slope = (ys[n - 1] - ys[n - 2]) / Math.max(thetas[n - 1] - thetas[n - 2], 1e-6);
      return ys[n - 1] + (theta - thetas[n - 1]) * slope;
    }
    let i = 1;
    while (i < n - 1 && thetas[i] < theta) i++;
    const t = (theta - thetas[i - 1]) / Math.max(thetas[i] - thetas[i - 1], 1e-6);
    return ys[i - 1] + t * (ys[i] - ys[i - 1]);
  };

  return { thetaAt, yAt, thetaMin: thetaAt(yTop), thetaMax: thetaAt(yBottom) };
}

/* ============================================================================
   4. Campionamento dei filamenti
   ========================================================================== */

export type Pt = { x: number; y: number };

/** Sfasamento del filamento: 0 = professionale (+sin), π = accademico (−sin). */
export const LANE_SIGN: Record<TimelineLane, 1 | -1> = { professional: 1, academic: -1 };

export function strandX(theta: number, lane: TimelineLane, cx: number, amplitude: number): number {
  return cx + LANE_SIGN[lane] * amplitude * Math.sin(theta);
}

/** Profondità normalizzata: 0 = dietro, 1 = davanti. Non si disegna, si legge. */
export function strandDepth(theta: number, lane: TimelineLane): number {
  return (LANE_SIGN[lane] * Math.cos(theta) + 1) / 2;
}

/**
 * Catmull-Rom → Bézier cubica. Serve a produrre `M` + `C` (ART-DIRECTION §6)
 * invece di una polilinea: alle creste una polilinea mostra gli spigoli, ed è
 * proprio lì che si guarda un'elica.
 */
export function toSmoothPath(points: Pt[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

/**
 * Campiona un tratto di filamento UNIFORMEMENTE IN θ (non in y).
 *
 * È il cambio che alza la qualità di linea: campionando in y, i punti si
 * addensano dove la mappa θ(y) è ripida e si diradano proprio sulle creste —
 * dove la curvatura è massima e servirebbero più punti. In θ la spaziatura
 * angolare è costante per costruzione, quindi le creste sono sempre risolte.
 */
export function sampleStrandTheta(
  t0: number,
  t1: number,
  steps: number,
  lane: TimelineLane,
  map: ThetaMap,
  cx: number,
  amplitude: number,
): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const theta = t0 + ((t1 - t0) * i) / steps;
    pts.push({ x: strandX(theta, lane, cx, amplitude), y: map.yAt(theta) });
  }
  return pts;
}

/* ============================================================================
   5. Il pacchetto geometrico completo consumato dal componente
   ========================================================================== */

/**
 * Passo angolare di un sotto-tratto: π/3 ⇒ 6 sotto-tratti per giro.
 *
 * Prima la segmentazione era per Y a passo fisso (14 tratti sull'intera
 * altezza): con ~5 giri un tratto copriva mezzo periodo e riceveva UNA sola
 * opacità, quindi la profondità si leggeva a bande grossolane. A passo angolare
 * ogni tratto copre un sesto di giro e la sua profondità media è
 * rappresentativa: la gradazione scorre e il filamento si legge come un nastro
 * che ruota. π/3 è il compromesso: π/4 sarebbe più liscio ma porterebbe ~80
 * path, che lo scrub deve riscrivere ad ogni frame.
 */
export const SEG_STEP = PI / 3;
/** Risoluzione angolare del campionamento: ~12 punti per mezzo periodo. */
const SAMPLE_STEP = PI / 12;
/**
 * Passo angolare fra due traversine consecutive: 8 per giro. Più fitte e i
 * ventri dell'elica si riempiono e sembrano una rete; più rade e si perde la
 * lettura di "coppie di basi".
 */
const RUNG_STEP = PI / 4;

export type StrandSegment = {
  id: string;
  lane: TimelineLane;
  d: string;
  /** 0 dietro … 1 davanti — pilota opacità, spessore, TONO e ordine di disegno. */
  depth: number;
  opacity: number;
  strokeWidth: number;
  /** Progresso normalizzato di inizio/fine, per il disegno scroll-linked. */
  uStart: number;
  uEnd: number;
  /** Punto medio: usato per il brightening del tratto più vicino al cursore. */
  mid: Pt;
};

/**
 * Traversina, spezzata in DUE metà indipendenti.
 *
 * I due filamenti hanno profondità complementari (z_a = −z_p), quindi una
 * traversina ha sempre un capo vicino e un capo lontano. Disegnandola come una
 * riga sola con un'unica opacità quella informazione andava persa e le
 * traversine leggevano piatte. Con due metà — ognuna con l'opacità e lo
 * spessore del proprio filamento — la traversina "punta" verso chi guarda: è il
 * singolo dettaglio che più fa leggere la rotazione 3D.
 */
export type Rung = {
  id: string;
  y: number;
  u: number;
  /** Estremo sul filamento accademico. */
  ax: number;
  /** Estremo sul filamento professionale. */
  px: number;
  /** Punto di giunzione delle due metà (l'asse). */
  mx: number;
  aOpacity: number;
  pOpacity: number;
  aWidth: number;
  pWidth: number;
  /** Capo in primo piano, marcato con un punto quando la traversina è di traverso. */
  cap: { x: number; opacity: number } | null;
};

export type ItemAnchor = {
  id: string;
  rowIndex: number;
  lane: TimelineLane;
  kind: "event" | "badge";
  /** Punto esatto sul filamento a cui l'elemento è agganciato. */
  x: number;
  y: number;
  /** Lato su cui vive il box. */
  side: "left" | "right";
  /** x del bordo interno del box (fine del connettore). */
  edgeX: number;
  u: number;
  ongoing: boolean;
  /** Profondità del filamento nel punto di aggancio: il marker in primo piano
   *  è più luminoso, coerente col tratto a cui è appeso. */
  depth: number;
};

export type CrossingMark = { id: string; rowIndex: number; y: number; u: number; ember: boolean };

export type HelixGeometry = {
  height: number;
  segments: StrandSegment[];
  bloom: { lane: TimelineLane; d: string }[];
  rungs: Rung[];
  anchors: ItemAnchor[];
  crossings: CrossingMark[];
  map: ThetaMap;
};

export function buildHelixGeometry(
  rows: HelixRow[],
  rowCenters: number[],
  height: number,
  m: HelixMetrics,
  ongoingRowIndex: number,
): HelixGeometry | null {
  if (rows.length === 0 || rowCenters.length !== rows.length || height <= 0) return null;

  const thetas = assignThetas(
    rows.map((r, i) => ({ y: rowCenters[i], crossing: r.crossing })),
    m.period,
  );
  const map = makeThetaMap(rowCenters, thetas, 0, height);
  const u = (y: number) => Math.min(1, Math.max(0, y / height));

  const lanes: TimelineLane[] = ["academic", "professional"];
  const tMin = map.thetaMin;
  const tMax = map.thetaMax;
  const span = Math.max(tMax - tMin, 1e-3);

  /* --- alone a tutta lunghezza ------------------------------------------- */
  const bloomSteps = Math.max(24, Math.ceil(span / SAMPLE_STEP));
  const bloom = lanes.map((lane) => ({
    lane,
    d: toSmoothPath(sampleStrandTheta(tMin, tMax, bloomSteps, lane, map, m.cx, m.amplitude)),
  }));

  /* --- filamenti: sotto-tratti ANGOLARI con profondità ------------------- */
  const segments: StrandSegment[] = [];
  // bordi allineati ai multipli di SEG_STEP, così i tratti cadono sempre negli
  // stessi punti del giro (le giunzioni non "camminano" al variare dell'altezza).
  const edges: number[] = [tMin];
  for (
    let t = Math.ceil(tMin / SEG_STEP) * SEG_STEP;
    t < tMax - 1e-6;
    t += SEG_STEP
  ) {
    if (t > tMin + 1e-6) edges.push(t);
  }
  edges.push(tMax);

  for (const lane of lanes) {
    for (let s = 0; s < edges.length - 1; s++) {
      const t0 = edges[s];
      const t1 = edges[s + 1];
      const arc = t1 - t0;
      if (arc <= 1e-6) continue;
      const steps = Math.max(3, Math.ceil(arc / SAMPLE_STEP));
      const pts = sampleStrandTheta(t0, t1, steps, lane, map, m.cx, m.amplitude);
      const tMid = (t0 + t1) / 2;
      const depth = strandDepth(tMid, lane);
      const y0 = map.yAt(t0);
      const y1 = map.yAt(t1);
      segments.push({
        id: `${lane}-${s}`,
        lane,
        d: toSmoothPath(pts),
        depth,
        // Escursione più ampia di prima (0.30→0.88 diventa 0.20→0.98): con la
        // segmentazione angolare la gradazione è continua, quindi il contrasto
        // fra "dietro" e "davanti" può permettersi di essere netto senza
        // mostrare bande.
        opacity: 0.2 + 0.78 * depth,
        strokeWidth: (m.compact ? 1.05 : 1.2) + (m.compact ? 1.25 : 1.55) * depth,
        uStart: u(Math.min(y0, y1)),
        uEnd: u(Math.max(y0, y1)),
        mid: { x: strandX(tMid, lane, m.cx, m.amplitude), y: map.yAt(tMid) },
      });
    }
  }
  // dietro prima, davanti dopo: l'ordine di disegno È l'occlusione.
  segments.sort((a, b) => a.depth - b.depth);

  /* --- traversine: due metà, una per filamento --------------------------- */
  const rungs: Rung[] = [];
  const start = Math.ceil(tMin / RUNG_STEP) * RUNG_STEP;
  for (let theta = start, i = 0; theta <= tMax; theta += RUNG_STEP, i++) {
    const y = map.yAt(theta);
    if (y < -2 || y > height + 2) continue;
    const s = Math.abs(Math.sin(theta));
    const ax = strandX(theta, "academic", m.cx, m.amplitude);
    const px = strandX(theta, "professional", m.cx, m.amplitude);
    if (Math.abs(px - ax) < 1.5) continue; // traversina di punta: invisibile

    const aDepth = strandDepth(theta, "academic");
    const pDepth = strandDepth(theta, "professional");
    // vicino all'incrocio la traversina punta verso chi guarda ⇒ si accorcia e
    // si spegne. L'esponente > 1 accentua la differenza fra ventre e nodo:
    // senza, tutte le traversine del ventre hanno la stessa opacità e il ventre
    // si legge come una superficie piena invece che come profondità.
    const base = 0.04 + 0.26 * Math.pow(s, 1.7);
    const near = aDepth > pDepth ? ax : px;

    rungs.push({
      id: `rung-${i}`,
      y,
      u: u(y),
      ax,
      px,
      mx: m.cx,
      aOpacity: base * (0.45 + 1.1 * aDepth),
      pOpacity: base * (0.45 + 1.1 * pDepth),
      aWidth: 0.6 + 0.85 * aDepth,
      pWidth: 0.6 + 0.85 * pDepth,
      // punto "coppia di basi" solo sul capo vicino e solo dove la traversina è
      // quasi di traverso: ~2 per giro, non una collana continua.
      cap: s > 0.88 ? { x: near, opacity: base * 2.1 } : null,
    });
  }

  /* --- ancoraggi degli elementi + marker di incrocio --------------------- */
  const anchors: ItemAnchor[] = [];
  const crossings: CrossingMark[] = [];

  rows.forEach((row, i) => {
    const y = rowCenters[i];
    const theta = thetas[i];
    const push = (item: HelixItem | undefined, lane: TimelineLane) => {
      if (!item) return;
      const x = strandX(theta, lane, m.cx, m.amplitude);
      const offset = x - m.cx;
      // Sull'incrocio |offset| ≈ 0 e il lato non è deducibile dalla geometria:
      // si assegna per corsia (accademico a sinistra), l'unico caso in cui la
      // posizione — e non solo la forma del marker — è convenzionale.
      const side: "left" | "right" =
        Math.abs(offset) < 0.5 ? (lane === "academic" ? "left" : "right") : offset < 0 ? "left" : "right";
      anchors.push({
        id: item.data.id,
        rowIndex: i,
        lane,
        kind: item.kind,
        x,
        y,
        side,
        edgeX: side === "left" ? m.cx - m.gutter : m.cx + m.gutter,
        u: u(y),
        ongoing: item.kind === "event" && item.data.isOngoing === true,
        depth: strandDepth(theta, lane),
      });
    };
    push(row.academic, "academic");
    push(row.professional, "professional");

    if (row.crossing) {
      crossings.push({ id: `cross-${i}`, rowIndex: i, y, u: u(y), ember: i === ongoingRowIndex });
    }
  });

  return { height, segments, bloom, rungs, anchors, crossings, map };
}
