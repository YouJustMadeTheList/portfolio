/* ============================================================================
   LA SAGOMA — dove si posano i numeri quando diventano farfalla.

   Unità locali: il corpo sta sull'asse x = 0, la testa verso y < 0, la punta
   dell'ala anteriore a x ≈ ±1. Le ali sono contorni chiusi (lato destro; il
   sinistro è lo specchio): i numeri si dispongono LUNGO il contorno, a passo
   costante sull'arco — è il contorno che fa leggere "farfalla" con poche
   decine di glifi, un riempimento servirebbe il triplo dei punti.
   ========================================================================== */

export type Pt = readonly [number, number];

/** Ala anteriore (destra): ampia, tesa verso l'alto e in fuori. */
export const FOREWING: readonly Pt[] = [
  [0.05, -0.06],
  [0.16, -0.36],
  [0.36, -0.64],
  [0.62, -0.84],
  [0.88, -0.9],
  [1.0, -0.76],
  [0.98, -0.52],
  [0.86, -0.3],
  [0.64, -0.14],
  [0.34, -0.03],
];

/** Ala posteriore (destra): più corta, arrotondata, ricade verso il basso. */
export const HINDWING: readonly Pt[] = [
  [0.05, 0.05],
  [0.3, 0.07],
  [0.56, 0.17],
  [0.72, 0.35],
  [0.74, 0.55],
  [0.62, 0.75],
  [0.42, 0.87],
  [0.24, 0.8],
  [0.12, 0.56],
  [0.06, 0.3],
];

export type Slot = {
  x: number;
  y: number;
  /** 1 = sull'ala (piega col battito), 0 = corpo/antenne (rigido) */
  wing: 0 | 1;
};

function sampleClosed(poly: readonly Pt[], n: number, phase: number): Pt[] {
  const segs: number[] = [];
  let total = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push(l);
    total += l;
  }
  const out: Pt[] = [];
  for (let k = 0; k < n; k += 1) {
    let target = ((k + phase) / n) * total;
    let i = 0;
    while (i < segs.length - 1 && target > segs[i]) {
      target -= segs[i];
      i += 1;
    }
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const f = segs[i] > 0 ? Math.min(1, target / segs[i]) : 0;
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return out;
}

/** Sagoma per ~K glifi (il numero reale può differire di 1). */
export function butterflySlots(K: number): Slot[] {
  const body = K >= 26 ? 4 : 3;
  const perSide = Math.max(8, Math.floor((K - body - 2) / 2));
  const nF = Math.round(perSide * 0.6);
  const nH = perSide - nF;
  const slots: Slot[] = [];
  // il tratto di contorno che corre lungo il corpo resta vuoto: lì i numeri
  // si ammasserebbero sul torace e la sagoma si impasterebbe
  const outer = (poly: readonly Pt[], n: number, phase: number) => {
    let m = n;
    let pts = sampleClosed(poly, m, phase).filter((p) => p[0] > 0.16);
    while (pts.length < n && m < n * 2) {
      m += 1;
      pts = sampleClosed(poly, m, phase).filter((p) => p[0] > 0.16);
    }
    return pts;
  };
  const fore = outer(FOREWING, nF, 0.35);
  const hind = outer(HINDWING, nH, 0.55);
  // una "vena" interna per ala: dà corpo alla membrana
  fore.push([0.56, -0.5]);
  hind.push([0.4, 0.44]);
  for (const side of [1, -1]) {
    for (const [x, y] of fore) slots.push({ x: x * side, y, wing: 1 });
    for (const [x, y] of hind) slots.push({ x: x * side, y, wing: 1 });
  }
  for (let i = 0; i < body; i += 1) {
    slots.push({ x: 0, y: -0.26 + (0.66 * i) / (body - 1), wing: 0 });
  }
  // antenne: due puntini che rendono inequivocabile la lettura
  slots.push({ x: 0.16, y: -0.58, wing: 0 });
  slots.push({ x: -0.16, y: -0.58, wing: 0 });
  return slots;
}

/**
 * Sagoma "lite" per la variante mobile: 18 glifi (4+3 per ala e lato, 2 sul
 * corpo, 2 antenne). Con due farfalle in volo si resta sotto il tetto di 40
 * glifi del budget mobile; la lettura "farfalla" la regge la membrana
 * disegnata sotto, non la densità dei numeri.
 */
export function butterflySlotsLite(): Slot[] {
  const fore = sampleClosed(FOREWING, 6, 0.35).filter((p) => p[0] > 0.16).slice(0, 4);
  const hind = sampleClosed(HINDWING, 5, 0.55).filter((p) => p[0] > 0.16).slice(0, 3);
  const slots: Slot[] = [];
  for (const side of [1, -1]) {
    for (const [x, y] of fore) slots.push({ x: x * side, y, wing: 1 });
    for (const [x, y] of hind) slots.push({ x: x * side, y, wing: 1 });
  }
  slots.push({ x: 0, y: -0.2, wing: 0 });
  slots.push({ x: 0, y: 0.3, wing: 0 });
  slots.push({ x: 0.16, y: -0.58, wing: 0 });
  slots.push({ x: -0.16, y: -0.58, wing: 0 });
  return slots;
}
