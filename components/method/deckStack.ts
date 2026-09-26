/**
 * Geometria del mazzo — fonte unica di verità per PhaseDeck e PhaseCard.
 *
 * specs/05-metodo.md §7 chiede esplicitamente che offset/opacità/rotazione delle
 * carte vivano in UN solo posto, così intro (§5.2), navigazione (§5.3) e stato di
 * riposo non divergono nel tempo. ART-DIRECTION §6 ("Metodo") alza l'asticella:
 * lo stack non è più un offset piatto verso il basso ma un vero fan 3D —
 * `perspective` sul contenitore, `preserve-3d`, ogni carta arretrata su Z,
 * sollevata su Y e ruotata di ±3-6° così che i bordi si aprano a ventaglio.
 *
 * REQUISITO CLIENTE (spec §5.2, checklist §8): lo spessore deve essere visibile
 * dal PRIMO FRAME DIPINTO, prima di qualunque hover, click o idratazione. Per
 * questo `restStyle()` produce la stessa trasformazione che GSAP applicherà poi:
 * le carte arrivano dal server già impilate, e l'idratazione non sposta un pixel.
 */

import type { CSSProperties } from "react";

/** Prospettiva del contenitore del mazzo. Più alta = fuga più dolce. */
export const DECK_PERSPECTIVE = 1500;

/** Quanto si apre il mazzo quando il cursore entra nella sua area. */
export const HOVER_SPREAD = 1.14;

/** Soglie di rilascio del drag — identiche a components/case-studies/carouselStage.ts
 *  (DRAG_DISTANCE_RATIO / DRAG_VELOCITY_PX_MS). Gli spec 04 §7 e 05 §5.3 citavano
 *  0.4 / 0.3: erano poco reattivi alla prova e sono stati abbassati in entrambe le
 *  sezioni; gli spec sono stati allineati a questi valori. */
export const THROW_DISTANCE_RATIO = 0.32;
export const THROW_VELOCITY_PX_MS = 0.35;

export type StackSlot = {
  /** offset orizzontale in px */
  x: number;
  /** offset verticale in px — NEGATIVO: le carte sotto sbucano dal bordo alto */
  y: number;
  /** arretramento su Z in px (la prospettiva fa il resto della rimpicciolimento) */
  z: number;
  /** rotazione sul piano, in gradi — alternata, è ciò che apre il ventaglio */
  rot: number;
  /** opacità dello scrim che affonda la carta nel vuoto (0 = carta in cima) */
  scrim: number;
};

/**
 * Le quattro posizioni del mazzo, dalla cima al fondo.
 *
 * Nota sul segno di `y`: con la prospettiva, una carta arretrata rimpicciolisce
 * e il suo bordo superiore SCENDE rispetto a quello della carta in cima. Per
 * lasciare scoperta una lamella di ~10-16px sopra ogni carta bisogna quindi
 * sollevarla di più di quanto la prospettiva la accorci — da qui i valori di y
 * ben maggiori dei +6/+12/+17 della v1.0 dello spec (che infatti producevano
 * "una carta piatta, nessuno spessore").
 */
export const SLOTS: readonly StackSlot[] = [
  { x: 0, y: 0, z: 0, rot: 0, scrim: 0 },
  { x: 14, y: -28, z: -62, rot: 3.1, scrim: 0.3 },
  { x: -16, y: -54, z: -128, rot: -4.2, scrim: 0.5 },
  { x: 8, y: -78, z: -198, rot: 5.6, scrim: 0.66 },
] as const;

/**
 * Lamelle scoperte che ne risultano (carta 560×424, prospettiva 1500):
 * 18.5px sopra la carta in cima, poi 14.6px, poi 11.1px. Tre bordi illuminati
 * sfalsati sono ciò che, insieme alle rotazioni alternate, fa leggere la pila
 * come un mazzo e non come una card con un'ombra.
 */

export function slotAt(depth: number): StackSlot {
  return SLOTS[Math.min(Math.max(depth, 0), SLOTS.length - 1)];
}

export type StackVars = { x: number; y: number; z: number; rotation: number };

const sign = (n: number) => (n < 0 ? -1 : 1);

/**
 * Trasformazione di riposo per una carta a profondità `depth`.
 *
 * @param spread   1 = mazzo chiuso, >1 = mazzo aperto (cursore dentro l'area).
 * @param emphasis true = questa carta di spessore è sotto il cursore: esce di
 *                 qualche pixel lungo la propria direzione di ventaglio. Serve a
 *                 soddisfare "anche le carte dietro devono reagire".
 */
export function stackVars(
  depth: number,
  opts: { spread?: number; emphasis?: boolean } = {},
): StackVars {
  const s = slotAt(depth);
  if (depth <= 0) return { x: s.x, y: s.y, z: s.z, rotation: s.rot };
  const k = opts.spread ?? 1;
  const e = opts.emphasis ? 1 : 0;
  return {
    x: s.x * k + sign(s.x) * 10 * e,
    y: s.y * k - 8 * e,
    z: s.z * k + 26 * e,
    rotation: s.rot * k + sign(s.rot) * 1.4 * e,
  };
}

/** z-index coerente con la profondità: la cima sta sopra a tutte. */
export function zIndexFor(depth: number): number {
  return 40 - depth * 10;
}

/**
 * Stile inline renderizzato dal SERVER. Deve coincidere con ciò che GSAP
 * calcolerà all'idratazione (`xPercent/yPercent: -50` + x/y/z/rotation), così il
 * mazzo è già impilato nel primo frame e non c'è alcuno scatto al mount.
 */
export function restStyle(depth: number): CSSProperties {
  const v = stackVars(depth);
  return {
    transform: `translate(-50%, -50%) translate3d(${v.x}px, ${v.y}px, ${v.z}px) rotate(${v.rotation}deg)`,
    zIndex: zIndexFor(depth),
  };
}
