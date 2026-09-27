/**
 * L'ATLANTE DEI GLIFI — i dati dell'hero sono caratteri, non puntini.
 *
 * Una sola texture, generata a runtime su un canvas 2D con il mono del sito
 * (JetBrains Mono, già caricato da next/font): 16×8 celle quadrate. Due canali:
 *
 *   R → il glifo nitido
 *   G → lo stesso glifo sfocato (shadowBlur): l'alone. Lo shader lo somma con
 *       un peso suo, così ogni carattere "emette" luce aqua senza un secondo
 *       passaggio di bloom — ART-DIRECTION §3 L5, «la profondità si fa con la
 *       luce», a costo zero.
 *
 * La cella 0 non è un carattere: è un disco morbido (i nodi della rete e i
 * satelliti). Le celle 1..CHAOS_COUNT sono l'alfabeto del CAOS — cifre, hex e
 * pochi simboli — contiguo apposta: lo shader ne pesca uno a caso con un solo
 * `floor(hash * CHAOS_COUNT)`, senza tabelle.
 */

import * as THREE from "three";
import { ATLAS_COLS, ATLAS_ROWS, CELL, FONT_PX, paintGlyphAtlas as paint, resolveMonoFamily } from "./glyphAtlasCore";

// Il disegno dell'atlante vive in glyphAtlasCore (senza three): qui resta solo
// la texture condivisa. API e risultato identici a prima.
export {
  ATLAS_COLS,
  ATLAS_ROWS,
  GLYPH_FONT_RATIO,
  MONO_ADVANCE,
  CHAOS_COUNT,
  DOT_GLYPH,
  STAR_CHAR,
  glyphIndex,
} from "./glyphAtlasCore";

let shared: { texture: THREE.CanvasTexture; ready: Promise<void> } | null = null;

/**
 * La texture condivisa (una per pagina). Disegnata subito col font che c'è, e
 * ridisegnata appena JetBrains Mono è davvero pronto: nessun frame aspetta.
 */
export function getGlyphAtlas() {
  if (shared) return shared;
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_COLS * CELL;
  canvas.height = ATLAS_ROWS * CELL;
  const family = resolveMonoFamily();
  paint(canvas, family);

  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 1;
  texture.colorSpace = THREE.NoColorSpace;

  const ready = (document.fonts?.load(`500 ${FONT_PX}px ${family}`, "0Aa→▮") ?? Promise.resolve())
    .then(() => {
      paint(canvas, family);
      texture.needsUpdate = true;
    })
    .catch(() => {});

  shared = { texture, ready: ready.then(() => undefined) };
  return shared;
}
