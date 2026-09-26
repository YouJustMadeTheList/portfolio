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

export const ATLAS_COLS = 16;
export const ATLAS_ROWS = 8;
const CELL = 64;
/** Corpo del font dentro la cella (px). La cella è più grande: serve spazio all'alone. */
const FONT_PX = 38;
/** Rapporto corpo-font / cella: serve al layout per sapere quanto è largo un carattere. */
export const GLYPH_FONT_RATIO = FONT_PX / CELL;
/** Avanzamento di un mono, in em. */
export const MONO_ADVANCE = 0.6;

/** L'alfabeto del caos: ciò che si vede volare e sfarfallare nella fase 1-2. */
const CHAOS = "0123456789ABCDEF.:{}=→▮+-*/<>01";
export const CHAOS_COUNT = CHAOS.length;

const REST =
  "abcdefghijklmnopqrstuvwxyz" +
  "GHIJKLMNOPQRSTUVWXYZ" +
  "()[];,'\"_%$#@!?&|~^" +
  "─│└┼•×·Δλ±≈▲▼…µσ§✦";

/** Indice di cella → carattere (0 è il disco). */
const CHARS: string[] = ["●", ...Array.from(CHAOS), ...Array.from(REST)];
const INDEX = new Map<string, number>();
CHARS.forEach((c, i) => {
  if (!INDEX.has(c)) INDEX.set(c, i);
});

export const DOT_GLYPH = 0;
/** La stella con i raggi di diffrazione a sei punte (disegnata, non dal font). */
export const STAR_CHAR = "✦";

/** Indice di atlante per un carattere; sconosciuti → "·". */
export function glyphIndex(ch: string): number {
  return INDEX.get(ch) ?? INDEX.get(ch.toLowerCase()) ?? INDEX.get("·") ?? 1;
}

function resolveMonoFamily(): string {
  try {
    const probe = document.createElement("span");
    probe.style.fontFamily = "var(--font-mono)";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    document.body.appendChild(probe);
    const fam = getComputedStyle(probe).fontFamily;
    probe.remove();
    if (fam) return fam;
  } catch {
    /* noop */
  }
  return '"JetBrains Mono", ui-monospace, monospace';
}

function paint(canvas: HTMLCanvasElement, family: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  // Fondo NERO OPACO, non trasparente: il canvas 2D conserva i pixel
  // premoltiplicati e WebGL, al caricamento, li de-moltiplica — un alone con
  // alpha 0.05 diventava intensità 1.0, e ogni glifo si portava dietro un
  // riquadro pieno. Con alpha = 1 ovunque i canali sono l'intensità vera.
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `500 ${FONT_PX}px ${family}`;

  // Due passate per canale: prima l'alone (G) sfocato, poi il glifo nitido
  // (R). `lighter` impedisce che il secondo cancelli il primo.
  ctx.globalCompositeOperation = "lighter";

  for (let i = 0; i < CHARS.length && i < ATLAS_COLS * ATLAS_ROWS; i++) {
    const cx = (i % ATLAS_COLS) * CELL + CELL / 2;
    const cy = Math.floor(i / ATLAS_COLS) * CELL + CELL / 2;

    if (i === DOT_GLYPH) {
      // il disco: nucleo pieno in R, alone largo in G
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, CELL * 0.2);
      core.addColorStop(0, "rgba(255,0,0,1)");
      core.addColorStop(0.55, "rgba(255,0,0,0.85)");
      core.addColorStop(1, "rgba(255,0,0,0)");
      ctx.fillStyle = core;
      ctx.fillRect(cx - CELL / 2, cy - CELL / 2, CELL, CELL);
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, CELL * 0.5);
      halo.addColorStop(0, "rgba(0,255,0,0.9)");
      halo.addColorStop(0.35, "rgba(0,255,0,0.32)");
      halo.addColorStop(1, "rgba(0,255,0,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(cx - CELL / 2, cy - CELL / 2, CELL, CELL);
      continue;
    }

    const ch = CHARS[i];
    if (ch === "✦") {
      // stella "JWST": nucleo + sei raggi a 60° (uno verticale) + due brevi
      // orizzontali. Raggi sottili che si spengono verso l'esterno.
      const spike = (ang: number, len: number, lw: number, a: number) => {
        const dx = Math.cos(ang);
        const dy = Math.sin(ang);
        for (const [chan, blur] of [["0,255,0", 4], ["255,0,0", 0]] as const) {
          const g = ctx.createLinearGradient(cx, cy, cx + dx * len, cy + dy * len);
          g.addColorStop(0, `rgba(${chan},${a})`);
          g.addColorStop(1, `rgba(${chan},0)`);
          ctx.save();
          ctx.shadowColor = blur ? "rgba(0,255,0,1)" : "transparent";
          ctx.shadowBlur = blur;
          ctx.strokeStyle = g;
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + dx * len, cy + dy * len);
          ctx.stroke();
          ctx.restore();
        }
      };
      for (let k = 0; k < 6; k++) spike(Math.PI / 2 + (k * Math.PI) / 3, CELL * 0.48, 1.6, 0.95);
      spike(0, CELL * 0.22, 1.2, 0.6);
      spike(Math.PI, CELL * 0.22, 1.2, 0.6);
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, CELL * 0.12);
      core.addColorStop(0, "rgba(255,255,0,1)");
      core.addColorStop(0.5, "rgba(255,160,0,0.8)");
      core.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = core;
      ctx.fillRect(cx - CELL / 2, cy - CELL / 2, CELL, CELL);
      continue;
    }
    if (ch === "▮") {
      // disegnato, non preso dal font: è il "mattone" degli istogrammi e deve
      // esistere identico su ogni sistema (molti font non lo hanno)
      const w = FONT_PX * 0.42;
      const hgt = FONT_PX * 0.6;
      ctx.save();
      ctx.shadowColor = "rgba(0,255,0,1)";
      ctx.shadowBlur = 9;
      ctx.fillStyle = "rgba(0,200,0,1)";
      ctx.fillRect(cx - w / 2, cy - hgt / 2, w, hgt);
      ctx.restore();
      ctx.fillStyle = "rgba(255,0,0,1)";
      ctx.fillRect(cx - w / 2, cy - hgt / 2, w, hgt);
      continue;
    }
    // alone
    ctx.save();
    ctx.shadowColor = "rgba(0,255,0,1)";
    ctx.shadowBlur = 9;
    ctx.fillStyle = "rgba(0,255,0,0.75)";
    ctx.fillText(ch, cx, cy + 1);
    ctx.fillText(ch, cx, cy + 1);
    ctx.restore();
    // glifo
    ctx.fillStyle = "rgba(255,0,0,1)";
    ctx.fillText(ch, cx, cy + 1);
  }
}

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
