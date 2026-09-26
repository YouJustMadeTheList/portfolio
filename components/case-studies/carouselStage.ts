/**
 * Geometria di scena del carosello Case Studies — fonte unica di verità per
 * CaseCarousel (riposo, drag e transizione leggono tutti da qui).
 *
 * Il difetto verificato a schermo sulla v1 era doppio: card gigantesche che
 * sbordavano dal viewport e card laterali solo rimpicciolite e sbiadite, senza
 * profondità. ART-DIRECTION §6 chiede l'opposto: larghezza `min(560px, 88vw)`,
 * niente che esca dal viewport a nessun breakpoint, laterali realmente
 * ARRETRATE — Z negativo, rotazione su Y, sfocatura e scurimento.
 *
 * Modello: il contenitore ha `perspective`; ogni card è centrata in absolute e
 * riceve translate3d(x, 0, z) + rotateY(θ). La posizione di ogni card è una
 * funzione CONTINUA del suo scostamento dall'indice attivo (`offset`), non un
 * set di stati discreti: così il drag può interpolare 1:1 col dito e la
 * transizione è un semplice tween di `offset` verso l'intero successivo.
 */

/** Larghezza della card in foreground — ART-DIRECTION §6, non negoziabile. */
export const CARD_WIDTH_CSS = "min(560px, 88vw)";

/** Prospettiva del palco. Più alta = fuga più dolce, meno distorsione ai bordi. */
export const STAGE_PERSPECTIVE = 1500;

/** Soglie di rilascio del drag — allineate a components/method/deckStack.ts.
 *  Lo spec §7 indicava 0.4 / 0.3: alla prova risultavano poco reattive, e la
 *  sezione Metodo ha già adottato 0.32 / 0.35. Le due sezioni devono trascinare
 *  in modo identico, quindi qui valgono gli stessi numeri. */
export const DRAG_DISTANCE_RATIO = 0.32;
export const DRAG_VELOCITY_PX_MS = 0.35;

/** Quanti px di trascinamento valgono un'intera card (drag 1:1 "pieno"). */
export const DRAG_FULL_RATIO = 0.62;

export type StageSlot = {
  /** offset orizzontale in px (già con segno) */
  x: number;
  /** arretramento su Z in px */
  z: number;
  /** rotazione su Y in gradi (già con segno) */
  rotY: number;
  opacity: number;
  /** raggio della sfocatura in px — quantizzato a 0.5px da `quantize()` */
  blur: number;
  /** opacità dello scrim che affonda la card nel vuoto */
  scrim: number;
};

/** Chiavi della scena a |offset| = 0, 1, 2. Oltre il 2 si resta sul 2, invisibili. */
const KEYS = [
  { z: 0, rotY: 0, opacity: 1, blur: 0, scrim: 0 },
  { z: -300, rotY: 26, opacity: 0.88, blur: 2.6, scrim: 0.52 },
  { z: -620, rotY: 34, opacity: 0.16, blur: 5, scrim: 0.76 },
] as const;

export type StageMetrics = {
  /** larghezza utile del palco in px */
  stageWidth: number;
  /** larghezza reale della card in foreground in px */
  cardWidth: number;
  /** offset orizzontale della card a |offset| = 1 */
  sideX: number;
  /** offset orizzontale della card a |offset| = 2 */
  backX: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Arrotonda a 0.5px: evita di ri-rasterizzare la sfocatura a ogni frame. */
const quantize = (v: number) => Math.round(v * 2) / 2;

/** Fattore di scala prospettica di un piano a distanza z. */
export function perspectiveScale(z: number, perspective = STAGE_PERSPECTIVE) {
  return perspective / (perspective - z);
}

/**
 * Misure del palco a partire dalla larghezza disponibile.
 *
 * `sideX` è il punto in cui la regola "niente sborda" diventa aritmetica: il
 * bordo esterno della card laterale (sideX + mezza larghezza rimpicciolita
 * dalla prospettiva) deve restare dentro il palco, con un margine di sicurezza.
 * Su desktop il vincolo non morde e le laterali si aprono a 0.55 della card;
 * su mobile morde, e le laterali restano quasi del tutto dietro a quella in
 * primo piano, lasciandone scoperta solo una lamella — che è esattamente ciò
 * che lo spec §3 chiede ("si intravede il bordo delle adiacenti").
 */
export function computeStageMetrics(stageWidth: number, cardWidth: number): StageMetrics {
  const safety = 10;
  const side = KEYS[1];
  const back = KEYS[2];

  const sideScale = perspectiveScale(side.z);
  const backScale = perspectiveScale(back.z);

  const sideLimit = Math.max(0, stageWidth / 2 - (cardWidth * sideScale) / 2 - safety);
  const backLimit = Math.max(0, stageWidth / 2 - (cardWidth * backScale) / 2 - safety);

  const sideX = Math.min(cardWidth * 0.55, sideLimit);
  const backX = Math.min(cardWidth * 0.72, backLimit, sideX * 1.35);

  return { stageWidth, cardWidth, sideX, backX };
}

/**
 * Slot per uno scostamento continuo dall'indice attivo.
 * `offset` 0 = foreground, ±1 = laterali, ±2 = fondo scena; i valori
 * intermedi sono quelli che il drag attraversa.
 */
export function slotForOffset(offset: number, m: StageMetrics): StageSlot {
  const sign = offset < 0 ? -1 : 1;
  const a = Math.min(Math.abs(offset), 2);
  const i = a < 1 ? 0 : 1;
  const t = a < 1 ? a : a - 1;

  const from = KEYS[i];
  const to = KEYS[i + 1];
  const xFrom = i === 0 ? 0 : m.sideX;
  const xTo = i === 0 ? m.sideX : m.backX;

  return {
    x: sign * lerp(xFrom, xTo, t),
    z: lerp(from.z, to.z, t),
    rotY: -sign * lerp(from.rotY, to.rotY, t),
    opacity: lerp(from.opacity, to.opacity, t),
    blur: quantize(lerp(from.blur, to.blur, t)),
    scrim: lerp(from.scrim, to.scrim, t),
  };
}

/** Scostamento circolare più breve, con segno (…-2,-1,0,1,2…). */
export function shortestOffset(index: number, active: number, len: number) {
  let d = (index - active) % len;
  if (d < -len / 2) d += len;
  if (d > len / 2) d -= len;
  return d;
}

/** z-index: più la card è vicina al centro, più sta sopra. */
export function zIndexForOffset(offset: number) {
  return 30 - Math.round(Math.abs(offset) * 10);
}
