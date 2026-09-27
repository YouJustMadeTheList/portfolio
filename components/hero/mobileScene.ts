/**
 * LA SCENA DELL'HERO — VARIANTE MOBILE, in WebGL puro (niente three, niente R3F).
 *
 * Stessa storia della desktop (Scene3D.tsx), riscritta per il budget di un
 * telefono:
 *
 *   0.05–0.50  SUPERNOVA  — il nucleo risucchia i glifi (lampo CSS sotto)
 *   0.50       ESPLOSIONE — i glifi schizzano su tutto il primo schermo, con scie
 *   1.00–1.85  ORDINE     — UNA frase e una mini-tabella, sotto al testo
 *   1.85–2.95  PILASTRI   — tutto confluisce nella nebulosa, centrata e bassa
 *   poi        AMBIENTE   — deriva lenta a 30 fps; pausa fuori schermo / scheda
 *                            nascosta; zero lavoro CPU per particella
 *
 * Perché non Scene3D con un budget ridotto: three + react-three-fiber sono
 * ~200 KB gzip da scaricare, analizzare e compilare sul main thread di un
 * telefono, per disegnare DUE draw call di punti e una di linee. Qui il motore
 * è questo file (~10 KB): un programma per i glifi, uno per gli archi, uno per
 * le scie, un solo buffer interlacciato, un atlante 512×256. La CPU per frame
 * scrive 4 uniform.
 *
 * Il canvas NON riceve mai il puntatore (pointer-events: none): lo scroll
 * verticale nativo non passa mai dalla scena. Il tap su un nodo si ascolta come
 * `click` su window — che il browser NON emette dopo un gesto di scroll — e il
 * nodo si sceglie in spazio schermo solo in quell'istante.
 */

import { buildPillars } from "./pillarsGraph";
import { mulberry32 } from "./neuralGraph";
import {
  ATLAS_COLS,
  ATLAS_ROWS,
  CHAOS_COUNT,
  DOT_GLYPH,
  GLYPH_FONT_RATIO,
  MONO_ADVANCE,
  STAR_CHAR,
  glyphIndex,
  paintGlyphAtlas,
  resolveMonoFamily,
} from "./glyphAtlasCore";
import { colors } from "@/lib/animation/tokens";
import { heroSceneCopy, type Locale } from "@/content/hero";

/* --- budget ---------------------------------------------------------------- */
const GRAPH_BUDGET = 760;
const SPARKS = 70;
const STREAKS = 300;
const ATLAS_CELL = 32; // 512×256: i glifi a dpr ≤ 1.25 non superano ~30px

/* --- camera ---------------------------------------------------------------- */
const CAM_Z = 3.75;
const FOV_HALF_TAN = Math.tan((45 * Math.PI) / 360);
const NEAR_D = 2.6;
const FAR_D = 6.6;

/* --- coreografia (s): ≤ 3s dall'avvio alla nebulosa posata ----------------- */
const T_PRE = 0.05;
const T_BURST = 0.5;
const T_ORDER = 1.0;
const D_ORDER = 0.42;
const ORDER_SPREAD = 0.28;
const T_GRAPH = 1.85;
const D_GRAPH = 0.7;
const GRAPH_WAVE = 0.4;
const T_SETTLED = T_GRAPH + GRAPH_WAVE + D_GRAPH; // 2.95
const TRAIL = 0.07;
const AMBIENT_FPS = 30;

/* --- layout vertice: 24 float ----------------------------------------------
   aPos(3) aChaos(3) aForm(4) aTime(4) aInfo(4) aGlyph(4) aOwner(2) */
const STRIDE = 24;
const ATTRS: [string, number, number][] = [
  ["aPos", 3, 0],
  ["aChaos", 3, 3],
  ["aForm", 4, 6],
  ["aTime", 4, 10],
  ["aInfo", 4, 14],
  ["aGlyph", 4, 18],
  ["aOwner", 2, 22],
];

const f = (n: number) => n.toFixed(6);

const COMMON = /* glsl */ `
precision highp float;
#define CAM_Z ${f(CAM_Z)}
#define TANH ${f(FOV_HALF_TAN)}
#define T_PRE ${f(T_PRE)}
#define T_BURST ${f(T_BURST)}
#define T_ORDER ${f(T_ORDER)}
#define D_ORDER ${f(D_ORDER)}
#define D_GRAPH ${f(D_GRAPH)}
#define CHAOS_COUNT ${f(CHAOS_COUNT)}

attribute vec3 aPos;    // posizione nella nebulosa (spazio locale)
attribute vec3 aChaos;  // xy -1..1 sul canvas, z profondità 0..1
attribute vec4 aForm;   // struttura: x,y px · cella px (0 = nessuna) · luce
attribute vec4 aTime;   // ritardo esplosione · velocità · ritardo ordine · ritardo rete
attribute vec4 aInfo;   // tipo (-1 scintilla, 0 arco, .5 corpo, 1 nodo) · peso · cella px · seme
attribute vec4 aGlyph;  // glifo in struttura · glifo in rete · u sull'arco · -
attribute vec2 aOwner;  // i due nodi dell'arco

uniform float uT;
uniform float uGraphT;
uniform float uClock;
uniform vec2 uView;
uniform vec2 uOrigin;
uniform float uK;
uniform float uAspect;
uniform vec3 uCenter;
uniform mat3 uRot;
uniform float uFit;
uniform float uDrift;
uniform float uDpr;
uniform float uDim;
uniform float uSize;
uniform float uOpen;
uniform float uOpenAmt;

float hash11(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453); }

vec3 pxToView(vec2 px) {
  return vec3((px.x - 0.5 * uView.x) * uK, (0.5 * uView.y - px.y) * uK, -CAM_Z);
}
vec4 project(vec3 p) {
  return vec4(p.x / (TANH * uAspect), p.y / TANH, 0.0, -p.z);
}
float matchOwner(float n) {
  return (abs(aOwner.x - n) < 0.5 || abs(aOwner.y - n) < 0.5) ? 1.0 : 0.0;
}

vec3 flight(float T, float clock, out float kb, out float eo, out float eg, out float sz) {
  float isG = step(-0.5, aInfo.x);
  float spark = 1.0 - isG;
  float hasForm = step(0.5, aForm.z);
  float seed = aInfo.w;
  float ph = seed * 6.2831853;

  // 1. esplosione → caos
  float tb = T - T_BURST - aTime.x;
  kb = tb <= 0.0 ? 0.0 : 1.0 - exp(-tb * aTime.y);
  vec3 o = pxToView(uOrigin);
  float dist = mix(${f(NEAR_D)}, ${f(FAR_D)}, aChaos.z);
  float hh = TANH * dist;
  float hw = hh * uAspect;
  vec3 c = vec3(aChaos.x * hw, aChaos.y * hh, -dist);
  float settle = smoothstep(0.4, 1.0, kb);
  c.x += sin(clock * (0.45 + seed * 0.6) + ph) * hw * 0.018 * settle;
  c.y += cos(clock * (0.38 + seed * 0.5) + ph * 1.3) * hh * 0.022 * settle;
  c.y -= spark * max(T - T_ORDER - aTime.z * 0.4, 0.0) * hh * 0.22;
  vec3 d = c - o;
  vec3 p = mix(o, c, kb);
  vec3 perp = normalize(vec3(-d.y, d.x, 0.0) + vec3(1e-5, 0.0, 0.0));
  p += perp * (seed - 0.5) * length(d) * 0.55 * kb * (1.0 - kb);
  float s = mix(12.0, 20.0, fract(seed * 7.13)) * CAM_Z / dist;

  // 0. compressione: risucchiati nel nucleo, arrivano all'origine allo scoppio
  if (tb <= 0.0) {
    float pre = clamp((T - T_PRE) / (T_BURST + aTime.x - T_PRE), 0.0, 1.0);
    float ci = pre * pre * pre;
    vec3 inStart = o + d * (0.2 + 0.3 * fract(seed * 11.3));
    p = mix(inStart, o, ci) + perp * (seed - 0.5) * length(d) * 0.3 * (1.0 - ci) * pre;
    s *= 0.72;
  }

  // 2. ordine: lo scatto nella struttura
  float to = hasForm * clamp((T - T_ORDER - aTime.z) / D_ORDER, 0.0, 1.0);
  eo = to < 0.5 ? 8.0 * to * to * to * to : 1.0 - pow(-2.0 * to + 2.0, 4.0) * 0.5;
  vec3 fp = pxToView(aForm.xy);
  vec3 df = fp - p;
  vec3 perp2 = normalize(vec3(-df.y, df.x, 0.0) + vec3(1e-5, 0.0, 0.0));
  p = mix(p, fp, eo) + perp2 * (seed - 0.5) * length(df) * 0.9 * eo * (1.0 - eo);
  s = mix(s, aForm.z, eo);

  // 3. i pilastri
  float tg = isG * clamp((T - uGraphT - aTime.w) / D_GRAPH, 0.0, 1.0);
  eg = tg < 0.5 ? 4.0 * tg * tg * tg : 1.0 - pow(-2.0 * tg + 2.0, 3.0) * 0.5;
  vec3 local = aPos;
  local.x += sin(clock * 0.31 + ph) * uDrift * eg;
  local.y += cos(clock * 0.26 + ph * 1.7) * uDrift * eg;
  local.z += sin(clock * 0.19 + ph * 2.3) * uDrift * 0.8 * eg;
  vec3 g = uCenter + uRot * (local * uFit);
  vec3 dg = g - p;
  vec3 perp3 = normalize(cross(dg, vec3(0.0, 0.0, 1.0)) + vec3(0.0, 0.0, 1e-4));
  p = mix(p, g, eg) + perp3 * (seed - 0.5) * length(dg) * 1.1 * eg * (1.0 - eg);
  float gd = max(-g.z, 0.1);
  s = mix(s, aInfo.z * uSize * CAM_Z / gd, eg);

  sz = s;
  return p;
}
`;

const VERTEX = /* glsl */ `
${COMMON}
#ifdef STREAK
attribute float aTail;
#endif
varying float vGlyph;
varying float vAlpha;
varying float vHeat;
varying float vTone;
varying float vGlow;

void main() {
  float kb; float eo; float eg; float sz;
  vec3 p = flight(uT, uClock, kb, eo, eg, sz);

  float kind = aInfo.x;
  float w = aInfo.y;
  float seed = aInfo.w;
  float isG = step(-0.5, kind);
  float spark = 1.0 - isG;
  float hasForm = step(0.5, aForm.z);
  float node = step(0.75, kind) * isG;
  float halo = step(0.25, kind) * (1.0 - step(0.75, kind)) * isG;
  float edge = (1.0 - step(0.25, kind)) * isG;

  float tb0 = uT - T_BURST - aTime.x;
  float appear = smoothstep(0.0, 0.05, tb0);
  float preT = clamp((uT - T_PRE) / (T_BURST + aTime.x - T_PRE), 0.0, 1.0);
  float preA = (1.0 - step(0.0, tb0)) * step(fract(seed * 7.77), 0.32)
    * smoothstep(0.0, 0.3, preT) * (0.2 + 0.34 * preT * preT * preT) * mix(1.0, 0.4, aChaos.z);

  float mo = matchOwner(uOpen) * isG;
  float hl = mo * uOpenAmt;
  float focus = mix(1.0, 0.42, uOpenAmt * (1.0 - mo));

  float head = fract(uClock * 0.23 + seed);
  float dd = aGlyph.z - head;
  dd -= floor(dd + 0.5);
  float pulse = exp(-dd * dd * 170.0) * edge * eg;
  float near = smoothstep(8.5, 2.0, max(-p.z, 0.1));
  float burstHeat = (1.0 - kb) * (1.0 - kb);
  burstHeat *= tb0 < 0.0 ? 0.2 + 0.55 * preT * preT * preT : 1.0;

#ifdef EDGES
  gl_Position = project(p);
  float form = smoothstep(0.82, 1.0, eg);
  vAlpha = form * uDim * mix(0.2, 1.0, w) * (0.16 + 0.84 * near) * focus * (1.0 + hl * 3.2);
  vHeat = clamp(hl * 0.85 + pulse, 0.0, 1.0);
  vTone = 0.2; vGlyph = 0.0; vGlow = 0.0;
#else
  float chaosA = mix(0.26, 1.0, fract(seed * 3.71)) * mix(1.0, 0.32, aChaos.z);
  float dust = (1.0 - hasForm) * isG * smoothstep(0.0, 0.5, uT - T_ORDER - aTime.w * 0.3);
  chaosA *= 1.0 - dust * 0.8;
  chaosA *= 1.0 - spark * smoothstep(0.05, 0.7, uT - T_ORDER - aTime.z);
  float a = mix(chaosA, mix(0.3, 1.0, aForm.w), eo);
  float gA = (node + halo * mix(0.16, 0.78, w) + edge * mix(0.32, 0.85, w)) * (0.35 + 0.65 * near);
  gA = gA * uDim * focus * (1.0 + hl * 1.5) + pulse * 0.45 * uDim;
  a = mix(a, gA, eg) * appear + preA;

  float qo = (uT - T_ORDER - aTime.z - D_ORDER * 0.8) * 6.0;
  float qg = (uT - uGraphT - aTime.w - D_GRAPH * 0.85) * 5.0;
  float landO = hasForm * exp(-qo * qo);
  float landG = isG * exp(-qg * qg);
  float beat = (0.5 + 0.5 * sin(uClock * 0.85 + seed * 6.28)) * node * 0.3;

  #ifdef STREAK
    float kb2; float eo2; float eg2; float sz2;
    vec3 pt = flight(uT - ${f(TRAIL)}, uClock - ${f(TRAIL)}, kb2, eo2, eg2, sz2);
    vec2 sh = p.xy / max(-p.z, 0.1);
    vec2 st = pt.xy / max(-pt.z, 0.1);
    float lenPx = length(sh - st) * CAM_Z / uK;
    float speed = smoothstep(6.0, 70.0, lenPx);
    gl_Position = project(mix(p, pt, aTail));
    vAlpha = speed * (1.0 - aTail) * a * (1.0 - smoothstep(0.9, 1.0, eg)) * 0.55;
    vHeat = clamp(burstHeat * 1.2 + 0.2, 0.0, 1.0);
    vTone = 0.6; vGlyph = 0.0; vGlow = 0.0;
  #else
    gl_Position = project(p);
    vAlpha = a;
    vHeat = clamp(burstHeat * 0.95 + landO * 0.75 + landG * 0.55 + hl * 0.7 + pulse * 0.8 + beat, 0.0, 1.0);
    float chaosTone = fract(seed * 5.31) * 0.55;
    vTone = mix(mix(chaosTone, aForm.w, eo), node + halo * 0.45 + edge * 0.25, eg);
    vGlow = mix(mix(0.5, 1.0, burstHeat), 0.75 + node * 0.5, eg);
    sz *= 1.0 + burstHeat * 0.55 + landO * 0.22 + hl * 0.35 * eg;
    gl_PointSize = clamp(sz * uDpr, 1.0, 64.0);
    if (a < 0.002) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
    }
    float rate = 8.0 + seed * 14.0;
    float g = 1.0 + floor(hash11(seed * 97.0 + floor(uClock * rate)) * CHAOS_COUNT);
    if (hasForm > 0.5 && eo > 0.93 && eg < 0.07) g = aGlyph.x;
    if (eg > 0.93) {
      g = aGlyph.y;
      if (pulse > 0.35) g = 1.0 + floor(hash11(seed * 31.0 + floor(uClock * 16.0)) * 16.0);
    }
    vGlyph = g;
  #endif
#endif
}
`;

const GLYPH_FRAGMENT = /* glsl */ `
precision mediump float;
uniform sampler2D uAtlas;
uniform vec3 uThread;
uniform vec3 uNode;
uniform vec3 uHot;
uniform float uOpacity;
varying float vGlyph;
varying float vAlpha;
varying float vHeat;
varying float vTone;
varying float vGlow;
void main() {
  float gi = floor(vGlyph + 0.5);
  vec2 cell = vec2(mod(gi, ${f(ATLAS_COLS)}), floor(gi / ${f(ATLAS_COLS)}));
  vec2 uv = (cell + 0.03 + gl_PointCoord * 0.94) / vec2(${f(ATLAS_COLS)}, ${f(ATLAS_ROWS)});
  vec4 t = texture2D(uAtlas, uv);
  float a = (t.r + t.g * vGlow * 0.55) * vAlpha * uOpacity;
  if (a < 0.003) discard;
  vec3 col = mix(uThread, uNode, clamp(vTone, 0.0, 1.0));
  col = mix(col, uHot, vHeat);
  gl_FragColor = vec4(col, min(a, 1.0));
}
`;

const LINE_FRAGMENT = /* glsl */ `
precision mediump float;
uniform vec3 uThread;
uniform vec3 uHot;
uniform float uOpacity;
varying float vAlpha;
varying float vHeat;
varying float vGlyph;
varying float vTone;
varying float vGlow;
void main() {
  float a = vAlpha * uOpacity;
  if (a < 0.002) discard;
  gl_FragColor = vec4(mix(uThread, uHot, vHeat), min(a, 1.0));
}
`;

/* ============================================================================
   DATI (CPU, una volta sola)
   ========================================================================== */

type SceneData = {
  count: number;
  G: number;
  vertices: Float32Array;
  indices: Uint16Array;
  streak: Float32Array;
  streakTail: Float32Array;
  streakCount: number;
  nodeCount: number;
  nodePos: Float32Array;
  nodeTag: string[];
  halfX: number;
  halfY: number;
};

function buildData(): SceneData {
  const graph = buildPillars(GRAPH_BUDGET);
  const G = graph.count;
  const count = G + SPARKS;
  const rand = mulberry32(777);
  const v = new Float32Array(count * STRIDE);

  const cols = Math.ceil(Math.sqrt(count * 0.5)); // ritratto: più righe che colonne
  const rows = Math.ceil(count / cols);
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const edgeGlyphs = "0123456789ABCDEF01";
  const sizes = graph.sizes;
  const hints = graph.glyphHint;

  for (let i = 0; i < count; i++) {
    const o = i * STRIDE;
    const slot = order[i];
    const c = slot % cols;
    const r = Math.floor(slot / cols);
    if (i < G) {
      v[o] = graph.positions[i * 3];
      v[o + 1] = graph.positions[i * 3 + 1];
      v[o + 2] = graph.positions[i * 3 + 2];
    }
    v[o + 3] = (((c + 0.5 + (rand() - 0.5) * 1.5) / cols) * 2 - 1) * 1.02;
    v[o + 4] = (((r + 0.5 + (rand() - 0.5) * 1.5) / rows) * 2 - 1) * 1.02;
    v[o + 5] = Math.pow(rand(), 0.9);
    // aForm: vuoto finché il layout non assegna una struttura
    v[o + 10] = rand() * 0.06;
    v[o + 11] = 3.6 + rand() * 6.0;
    v[o + 12] = ((i * 0.61803) % 1) * 0.5;
    v[o + 13] = i < G ? graph.flow[i * 3 + 1] * (GRAPH_WAVE / 0.66) : 0;
    const seed = i < G ? graph.seeds[i] * 0.5 + rand() * 0.5 : rand();
    v[o + 17] = seed;
    if (i < G) {
      const kind = graph.look[i * 2];
      v[o + 14] = kind;
      v[o + 15] = graph.flow[i * 3 + 2];
      v[o + 16] = sizes?.[i] ?? (kind > 0.75 ? 15 : 9.5);
      const hint = hints?.[i] ?? 0;
      v[o + 19] =
        hint === 1
          ? glyphIndex(STAR_CHAR)
          : kind > 0.75
            ? DOT_GLYPH
            : hint === 2
              ? glyphIndex(rand() < 0.35 + (1 - graph.flow[i * 3 + 2]) * 0.4 ? "·" : edgeGlyphs[Math.floor(rand() * edgeGlyphs.length)])
              : kind > 0.25
                ? glyphIndex(rand() < 0.5 ? "·" : "0")
                : glyphIndex(edgeGlyphs[Math.floor(rand() * edgeGlyphs.length)]);
      v[o + 20] = graph.flow[i * 3];
      v[o + 22] = graph.owners[i * 2];
      v[o + 23] = graph.owners[i * 2 + 1];
    } else {
      v[o + 14] = -1;
      v[o + 22] = v[o + 23] = -9;
    }
  }

  // le scie: un sottoinsieme a passo fisso (scintille comprese), testa + coda
  const step = count / STREAKS;
  const streakCount = Math.min(STREAKS, count);
  const streak = new Float32Array(streakCount * 2 * STRIDE);
  const streakTail = new Float32Array(streakCount * 2);
  for (let s = 0; s < streakCount; s++) {
    const i = Math.min(count - 1, Math.floor(s * step));
    streak.set(v.subarray(i * STRIDE, (i + 1) * STRIDE), s * 2 * STRIDE);
    streak.set(v.subarray(i * STRIDE, (i + 1) * STRIDE), (s * 2 + 1) * STRIDE);
    streakTail[s * 2 + 1] = 1;
  }

  const nodeCount = graph.nodeCount;
  const nodePos = new Float32Array(nodeCount * 3);
  for (let k = 0; k < nodeCount; k++) {
    const i = graph.nodeParticle[k];
    nodePos.set(graph.positions.subarray(i * 3, i * 3 + 3), k * 3);
  }

  return {
    count,
    G,
    vertices: v,
    indices: graph.indices,
    streak,
    streakTail,
    streakCount,
    nodeCount,
    nodePos,
    nodeTag: graph.nodeTag ?? [],
    halfX: graph.halfX,
    halfY: graph.halfY,
  };
}

/** La frase e la mini-tabella, impaginate sotto al testo; scritte in aForm. */
function layoutStructures(d: SceneData, locale: Locale, W: number, H: number) {
  const copy = heroSceneCopy[locale] ?? heroSceneCopy.it;
  const v = d.vertices;
  type Slot = { x: number; y: number; size: number; bright: number; glyph: number; delay: number };
  const slots: Slot[] = [];
  const line = (text: string, cell: number, cy: number, bright: number, start: number) => {
    const chars = Array.from(text);
    const adv = cell * GLYPH_FONT_RATIO * MONO_ADVANCE;
    const x0 = W / 2 - (chars.length * adv) / 2;
    chars.forEach((ch, j) => {
      if (ch === " ") return;
      slots.push({
        x: x0 + j * adv + adv / 2,
        y: cy,
        size: cell,
        bright,
        glyph: glyphIndex(ch),
        delay: start + (j / Math.max(chars.length, 1)) * ORDER_SPREAD,
      });
    });
  };
  const phraseCell = Math.min(38, (W * 0.8) / (Array.from(copy.phrase).length * GLYPH_FONT_RATIO * MONO_ADVANCE));
  const rowCell = Math.min(21, (W * 0.86) / (Array.from(copy.tableRows[0] ?? "").length * GLYPH_FONT_RATIO * MONO_ADVANCE));
  const rowH = rowCell * 0.7;
  // in fondo al primo schermo, sotto le CTA: l'ultima riga a 16px dal bordo
  const blockH = phraseCell * 0.7 + rowH * (1.8 + 1.15) + rowH * 0.5;
  const base = Math.max(H * 0.6, H - 16 - blockH);
  line(copy.phrase, phraseCell, base, 1, 0);
  line(copy.tableHeader, rowCell, base + phraseCell * 0.7 + rowH * 0.6, 0.5, 0.12);
  copy.tableRows.slice(0, 2).forEach((row, r) => line(row, rowCell, base + phraseCell * 0.7 + rowH * (1.8 + r * 1.15), 0.85, 0.18 + r * 0.06));

  // reset
  for (let i = 0; i < d.count; i++) {
    const o = i * STRIDE;
    v[o + 6] = v[o + 7] = v[o + 8] = v[o + 9] = 0;
    v[o + 12] = ((i * 0.61803) % 1) * 0.5;
    v[o + 18] = 0;
  }
  // le strutture le compongono i glifi degli ARCHI: i nodi restano nel caos
  // fino all'ultimo, così nessun nodo "salta" da una frase ai pilastri
  let s = 0;
  const G = d.G;
  for (let k = 0; k < G && s < slots.length; k++) {
    const i = (k * 7919) % G;
    const o = i * STRIDE;
    if (v[o + 14] > 0.75) continue;
    const sl = slots[s++];
    v[o + 6] = sl.x;
    v[o + 7] = sl.y;
    v[o + 8] = sl.size;
    v[o + 9] = sl.bright;
    v[o + 12] = sl.delay;
    v[o + 18] = sl.glyph;
  }
  // le scie condividono i dati: si ricopiano
  const step = d.count / STREAKS;
  for (let q = 0; q < d.streakCount; q++) {
    const i = Math.min(d.count - 1, Math.floor(q * step));
    const src = v.subarray(i * STRIDE, (i + 1) * STRIDE);
    d.streak.set(src, q * 2 * STRIDE);
    d.streak.set(src, (q * 2 + 1) * STRIDE);
  }
}

/* --- metriche dei satelliti: deterministiche per nodo, vive nel tempo --- */
function metricValue(node: number, s: number, clock: number) {
  const r = mulberry32(node * 97 + s * 13 + 5);
  const base = r();
  const wob = Math.sin(clock * (0.4 + r() * 0.5) + r() * 6) * 0.5 + 0.5;
  switch (s) {
    case 0:
      return (0.2 + base * 0.7 + wob * 0.06).toFixed(2);
    case 1:
      return (0.001 + base * 0.02 + wob * 0.002).toFixed(3);
    case 2: {
      const x = (base - 0.35) * 4 + wob * 0.3;
      return (x >= 0 ? "+" : "") + x.toFixed(2);
    }
    case 3:
      return String(Math.round(18 + base * 60 + wob * 6));
    default:
      return (0.05 + base * 0.3 + wob * 0.02).toFixed(3);
  }
}

const srgbToLinear = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace("#", ""), 16);
  const c = (x: number) => {
    const v = x / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return [c((n >> 16) & 255), c((n >> 8) & 255), c(n & 255)];
};

const INTERACTIVE =
  "a, button, input, textarea, select, label, summary, [role='button'], [role='link'], h1, h2, h3, p, li, nav, header, .eyebrow, .hh-g";

/* ============================================================================
   IL MOTORE
   ========================================================================== */

export type MobileSceneOptions = {
  canvas: HTMLCanvasElement;
  locale: Locale;
  /** Il lampo CSS dell'esplosione (figli .hmf-*): riceve i ritardi. */
  flash: HTMLElement | null;
  /** Lo strato DOM dei satelliti del nodo aperto (pointer-events: none). */
  satLayer: HTMLElement | null;
  reducedMotion: boolean;
  dprCap: number;
  onSettled?: () => void;
};

export type MobileScene = {
  setActive: (active: boolean) => void;
  destroy: () => void;
};

type Prog = {
  p: WebGLProgram;
  u: Record<string, WebGLUniformLocation | null>;
  a: Record<string, number>;
};

const UNIFORMS = [
  "uT", "uGraphT", "uClock", "uView", "uOrigin", "uK", "uAspect", "uCenter", "uRot", "uFit",
  "uDrift", "uDpr", "uDim", "uSize", "uOpen", "uOpenAmt", "uAtlas", "uThread", "uNode", "uHot", "uOpacity",
];

export function createMobileScene(opts: MobileSceneOptions): MobileScene | null {
  const { canvas, locale, flash, satLayer, reducedMotion } = opts;
  const glOrNull = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: "default",
  }) as WebGLRenderingContext | null;
  if (!glOrNull) return null;
  const gl: WebGLRenderingContext = glOrNull;

  const data = buildData();
  const thread = srgbToLinear(colors.aqua500);
  const nodeCol = srgbToLinear(colors.aqua200);
  const hot = srgbToLinear(colors.aqua100);

  /* --- atlante (canvas 2D, dipinto una volta; ridipinto a font pronto) --- */
  const atlas = document.createElement("canvas");
  atlas.width = ATLAS_COLS * ATLAS_CELL;
  atlas.height = ATLAS_ROWS * ATLAS_CELL;
  const family = resolveMonoFamily();
  paintGlyphAtlas(atlas, family, ATLAS_CELL);

  /* --- risorse GL (ricreabili dopo la perdita del contesto) --- */
  let progs: { glyph: Prog; edge: Prog; streak: Prog } | null = null;
  let vbo: WebGLBuffer | null = null;
  let ibo: WebGLBuffer | null = null;
  let sbo: WebGLBuffer | null = null;
  let tbo: WebGLBuffer | null = null;
  let tex: WebGLTexture | null = null;
  let lost = false;

  const compile = (defines: string, frag: string): Prog => {
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
        throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      }
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, defines + VERTEX));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(p);
    const u: Prog["u"] = {};
    for (const n of UNIFORMS) u[n] = gl.getUniformLocation(p, n);
    const a: Prog["a"] = {};
    for (const [n] of ATTRS) a[n] = gl.getAttribLocation(p, n);
    a.aTail = gl.getAttribLocation(p, "aTail");
    return { p, u, a };
  };

  const uploadAtlas = () => {
    if (!tex) return;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };

  const uploadVertices = () => {
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, sbo);
    gl.bufferData(gl.ARRAY_BUFFER, data.streak, gl.STATIC_DRAW);
  };

  const initGL = () => {
    progs = {
      glyph: compile("", GLYPH_FRAGMENT),
      edge: compile("#define EDGES\n", LINE_FRAGMENT),
      streak: compile("#define STREAK\n", LINE_FRAGMENT),
    };
    vbo = gl.createBuffer();
    sbo = gl.createBuffer();
    tbo = gl.createBuffer();
    ibo = gl.createBuffer();
    uploadVertices();
    gl.bindBuffer(gl.ARRAY_BUFFER, tbo);
    gl.bufferData(gl.ARRAY_BUFFER, data.streakTail, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);
    tex = gl.createTexture();
    uploadAtlas();
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.clearColor(0, 0, 0, 0);
    for (const pr of Object.values(progs)) {
      gl.useProgram(pr.p);
      gl.uniform1i(pr.u.uAtlas, 0);
      gl.uniform3fv(pr.u.uThread, thread);
      gl.uniform3fv(pr.u.uNode, nodeCol);
      gl.uniform3fv(pr.u.uHot, hot);
      gl.uniform1f(pr.u.uGraphT, T_GRAPH);
      gl.uniform1f(pr.u.uDrift, reducedMotion ? 0 : 0.016);
      gl.uniform1f(pr.u.uSize, 1.0);
      gl.uniform1f(pr.u.uDim, 0.95);
      gl.uniform1f(pr.u.uOpacity, pr === progs.glyph ? 0.95 : pr === progs.edge ? 0.26 : 0.8);
    }
    gen++;
  };

  /* --- stato --- */
  let W = 1;
  let H = 1;
  let dpr = 1;
  let k = 0.003;
  let fit = 1;
  const center = new Float32Array([0, 0, -CAM_Z]);
  const rot = new Float32Array(9);
  let originX = 0;
  let originY = 0;
  // generazione delle uniform di dimensione: ogni programma le riscrive
  // al primo uso dopo un cambio (anche quelli che entrano in scena dopo)
  let gen = 1;
  const applied = new Map<Prog, number>();
  let active = false;
  let raf = 0;
  let start = -1;
  let clock = 0;
  let lastNow = 0;
  let lastDraw = 0;
  let settled = reducedMotion;
  let open = -1;
  let openAmt = 0;
  let destroyed = false;
  // `?heroT=1.2` congela l'intro a quel secondo — solo in sviluppo (verifiche visive)
  let debugT: number | null = null;
  if (process.env.NODE_ENV !== "production") {
    const q = new URLSearchParams(window.location.search).get("heroT");
    if (q !== null) debugT = Math.max(0, parseFloat(q) || 0);
  }

  const measure = () => {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, opts.dprCap);
    const bw = Math.round(W * dpr);
    const bh = Math.round(H * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    k = (2 * FOV_HALF_TAN * CAM_Z) / H;
    // la nebulosa: centrata in orizzontale, intera, appoggiata in basso
    fit = Math.max(
      0.3,
      Math.min(1.25, (W * 0.94 * k) / 2 / data.halfX, (H * 0.8 * k) / 2 / data.halfY),
    );
    const halfPy = (data.halfY * fit) / k;
    const cy = Math.max(H * 0.5, H - 12 - halfPy);
    originX = W / 2;
    originY = cy;
    center[0] = 0;
    center[1] = (H / 2 - cy) * k;
    layoutStructures(data, locale, W, H);
    if (vbo && !lost) uploadVertices();
    gen++;
  };

  const setRotation = (t: number) => {
    const ry = reducedMotion ? 0.1 : Math.sin(t * 0.16) * 0.16;
    const rx = reducedMotion ? -0.04 : -0.05 + Math.sin(t * 0.12) * 0.06;
    const rz = reducedMotion ? 0 : Math.cos(t * 0.09) * 0.02;
    // Euler XYZ (come three): R = Rx · Ry · Rz, in colonna
    const cx = Math.cos(rx), sx = Math.sin(rx);
    const cy = Math.cos(ry), sy = Math.sin(ry);
    const cz = Math.cos(rz), sz = Math.sin(rz);
    rot[0] = cy * cz;
    rot[1] = cx * sz + sx * sy * cz;
    rot[2] = sx * sz - cx * sy * cz;
    rot[3] = -cy * sz;
    rot[4] = cx * cz - sx * sy * sz;
    rot[5] = sx * cz + cx * sy * sz;
    rot[6] = sy;
    rot[7] = -sx * cy;
    rot[8] = cx * cy;
  };

  /** Nodo k → px del canvas, con la rotazione corrente (senza deriva). */
  const nodeScreen = (n: number, out: [number, number]) => {
    const x = data.nodePos[n * 3] * fit;
    const y = data.nodePos[n * 3 + 1] * fit;
    const z = data.nodePos[n * 3 + 2] * fit;
    const wx = center[0] + rot[0] * x + rot[3] * y + rot[6] * z;
    const wy = center[1] + rot[1] * x + rot[4] * y + rot[7] * z;
    const wz = center[2] + rot[2] * x + rot[5] * y + rot[8] * z;
    const d = Math.max(-wz, 0.1);
    out[0] = W / 2 + (wx / (d * FOV_HALF_TAN * (W / H))) * (W / 2);
    out[1] = H / 2 - (wy / (d * FOV_HALF_TAN)) * (H / 2);
    return out;
  };

  /* --- il lampo (CSS): parte con l'intro, dal centro della nebulosa --- */
  const fireFlash = () => {
    if (!flash || reducedMotion) return;
    flash.style.transform = `translate3d(${originX}px, ${originY}px, 0)`;
    flash.style.setProperty("--hf-delay", `${T_BURST}s`);
    flash.style.setProperty("--hf-pre-delay", `${T_PRE}s`);
    flash.style.setProperty("--hf-pre-dur", `${(T_BURST - T_PRE).toFixed(3)}s`);
    flash.classList.add("hmf-go");
  };

  /* --- i satelliti del nodo aperto: DOM, non glifi (sono ≤ 16 elementi) --- */
  let satBox: HTMLElement | null = null;
  let satTimer = 0;
  const pt: [number, number] = [0, 0];
  const closeSat = () => {
    window.clearInterval(satTimer);
    const box = satBox;
    satBox = null;
    if (!box) return;
    box.classList.remove("is-open");
    window.setTimeout(() => box.remove(), reducedMotion ? 0 : 320);
  };
  const openSat = (n: number) => {
    closeSat();
    if (!satLayer) return;
    const metrics = (heroSceneCopy[locale] ?? heroSceneCopy.it).nodeMetrics;
    nodeScreen(n, pt);
    const nx = pt[0];
    const ny = pt[1];
    let base = Math.atan2(ny - originY, nx - originX);
    if (!Number.isFinite(base)) base = -Math.PI / 2;
    // vicino a un bordo il ventaglio si apre verso l'interno (niente satelliti
    // schiacciati contro il bordo)
    if (nx < 110 || nx > W - 110 || ny > H - 110) base = Math.atan2(H * 0.45 - ny, W / 2 - nx);
    const box = document.createElement("div");
    box.className = "hms";
    box.style.transform = `translate3d(${nx}px, ${ny}px, 0)`;
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "hms-lines");
    box.appendChild(svg);
    const labels: HTMLElement[] = [];
    const N = 5;
    for (let s = 0; s < N; s++) {
      const ang = base + (s / (N - 1) - 0.5) * 2.7;
      const r = 58 + (s % 2) * 26;
      let dx = Math.cos(ang) * r;
      let dy = Math.sin(ang) * r;
      // dentro il canvas, qualunque sia il nodo
      dx = Math.max(18 - nx, Math.min(W - 18 - nx, dx));
      dy = Math.max(H * 0.12 - ny, Math.min(H - 16 - ny, dy));
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", "0");
      line.setAttribute("y1", "0");
      line.setAttribute("x2", dx.toFixed(1));
      line.setAttribute("y2", dy.toFixed(1));
      line.style.transitionDelay = `${s * 45}ms`;
      svg.appendChild(line);
      const sat = document.createElement("span");
      sat.className = "hms-sat";
      sat.style.setProperty("--x", `${dx.toFixed(1)}px`);
      sat.style.setProperty("--y", `${dy.toFixed(1)}px`);
      sat.style.transitionDelay = `${s * 45}ms`;
      const label = document.createElement("span");
      label.className = "hms-label";
      const right = Math.cos(ang) >= -0.15 ? nx + dx + 120 < W : nx + dx - 120 < 0;
      label.dataset.side = right ? "r" : "l";
      sat.appendChild(label);
      box.appendChild(sat);
      labels.push(label);
    }
    const head = document.createElement("span");
    head.className = "hms-head";
    const tag = data.nodeTag[n] ?? "";
    head.textContent = `N·${String(n).padStart(2, "0")} ${tag}`;
    head.dataset.up = Math.sin(base) > 0.3 ? "0" : "1";
    box.appendChild(head);
    const write = () => {
      labels.forEach((l, s) => {
        l.textContent = metrics[s % metrics.length].replace("{v}", metricValue(n, s, clock));
      });
    };
    write();
    satLayer.appendChild(box);
    satBox = box;
    // un frame dopo: la transizione parte dallo stato chiuso
    requestAnimationFrame(() => box.classList.add("is-open"));
    if (!reducedMotion) satTimer = window.setInterval(write, 480);
  };

  const pick = (x: number, y: number) => {
    let best = -1;
    let bestD = 34 * 34;
    for (let n = 0; n < data.nodeCount; n++) {
      nodeScreen(n, pt);
      const dx = pt[0] - x;
      const dy = pt[1] - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  };

  const onClick = (e: MouseEvent) => {
    if (!settled || lost) return;
    const target = e.target as Element | null;
    if (target?.closest?.(INTERACTIVE)) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) {
      if (open >= 0) setOpen(-1);
      return;
    }
    const n = pick(x, y);
    setOpen(n >= 0 && n !== open ? n : -1);
  };

  const setOpen = (n: number) => {
    open = n;
    if (n >= 0) openSat(n);
    else closeSat();
    if (reducedMotion) {
      openAmt = n >= 0 ? 1 : 0;
      draw();
    } else if (!raf && active) {
      loop();
    }
  };

  /* --- disegno --- */
  const bindAttrs = (pr: Prog, buf: WebGLBuffer | null) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    for (const [n, size, off] of ATTRS) {
      const loc = pr.a[n];
      if (loc < 0) continue;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE * 4, off * 4);
    }
  };

  const setCommon = (pr: Prog, T: number) => {
    gl.useProgram(pr.p);
    gl.uniform1f(pr.u.uT, T);
    gl.uniform1f(pr.u.uClock, clock);
    gl.uniformMatrix3fv(pr.u.uRot, false, rot);
    gl.uniform1f(pr.u.uOpen, open >= 0 ? open : -9);
    gl.uniform1f(pr.u.uOpenAmt, openAmt);
    if (applied.get(pr) !== gen) {
      applied.set(pr, gen);
      gl.uniform2f(pr.u.uView, W, H);
      gl.uniform2f(pr.u.uOrigin, originX, originY);
      gl.uniform1f(pr.u.uK, k);
      gl.uniform1f(pr.u.uAspect, W / H);
      gl.uniform3fv(pr.u.uCenter, center);
      gl.uniform1f(pr.u.uFit, fit);
      gl.uniform1f(pr.u.uDpr, dpr);
    }
  };

  const draw = () => {
    if (!progs || lost || destroyed) return;
    const T = reducedMotion ? 99 : debugT ?? (start < 0 ? 0 : (performance.now() - start) / 1000);
    setRotation(clock);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const introOver = T > T_SETTLED + 0.15;

    // scie: solo durante il volo
    if (!introOver && T < T_GRAPH + GRAPH_WAVE + D_GRAPH * 0.9) {
      const pr = progs.streak;
      setCommon(pr, T);
      bindAttrs(pr, sbo);
      if (pr.a.aTail >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, tbo);
        gl.enableVertexAttribArray(pr.a.aTail);
        gl.vertexAttribPointer(pr.a.aTail, 1, gl.FLOAT, false, 4, 0);
      }
      gl.drawArrays(gl.LINES, 0, data.streakCount * 2);
      if (pr.a.aTail >= 0) gl.disableVertexAttribArray(pr.a.aTail);
    }
    // archi: solo a nebulosa quasi formata
    if (T > T_GRAPH + D_GRAPH * 0.6) {
      const pr = progs.edge;
      setCommon(pr, T);
      bindAttrs(pr, vbo);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.drawElements(gl.LINES, data.indices.length, gl.UNSIGNED_SHORT, 0);
    }
    // glifi (a intro finita, senza le scintille in coda al buffer)
    {
      const pr = progs.glyph;
      setCommon(pr, T);
      bindAttrs(pr, vbo);
      gl.drawArrays(gl.POINTS, 0, introOver ? data.G : data.count);
    }

    if (satBox && open >= 0) {
      nodeScreen(open, pt);
      satBox.style.transform = `translate3d(${pt[0].toFixed(1)}px, ${pt[1].toFixed(1)}px, 0)`;
    }
    if (!settled && T >= T_SETTLED) {
      settled = true;
      opts.onSettled?.();
    }
  };

  const loop = () => {
    raf = requestAnimationFrame(frame);
  };
  const frame = (now: number) => {
    raf = 0;
    if (!active || lost || destroyed) return;
    const dt = lastNow ? Math.min((now - lastNow) / 1000, 1 / 20) : 1 / 60;
    lastNow = now;
    if (start < 0) {
      start = performance.now();
      fireFlash();
    }
    const opening = Math.abs(openAmt - (open >= 0 ? 1 : 0)) > 0.001;
    if (opening) {
      openAmt = Math.max(0, Math.min(1, openAmt + (open >= 0 ? 1 : -1) * dt * (open >= 0 ? 3 : 4.5)));
    }
    clock += dt;
    // intro a 60 fps; poi ambiente a 30 fps (metà dei frame: deriva lenta)
    if (!settled || opening || now - lastDraw >= 1000 / AMBIENT_FPS - 4) {
      lastDraw = now;
      draw();
    }
    loop();
  };

  /* --- ciclo di vita --- */
  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const onRestored = () => {
    lost = false;
    initGL();
    if (reducedMotion) draw();
    else if (active) loop();
  };
  canvas.addEventListener("webglcontextlost", onLost, false);
  canvas.addEventListener("webglcontextrestored", onRestored, false);

  let resizeT = 0;
  const onResize = () => {
    window.clearTimeout(resizeT);
    resizeT = window.setTimeout(() => {
      measure();
      if (open >= 0) setOpen(-1);
      if (reducedMotion || settled) draw();
    }, 150);
  };
  const ro = new ResizeObserver(onResize);
  ro.observe(canvas);
  window.addEventListener("click", onClick, { passive: true });

  measure();
  setRotation(0);
  initGL();
  document.fonts?.ready
    .then(() => {
      if (destroyed) return;
      paintGlyphAtlas(atlas, family, ATLAS_CELL);
      if (!lost) uploadAtlas();
      if (reducedMotion) draw();
    })
    .catch(() => {});

  if (reducedMotion) draw();

  return {
    setActive(next: boolean) {
      if (reducedMotion) return;
      active = next;
      if (next && !raf && !lost) {
        lastNow = 0;
        loop();
      } else if (!next && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    destroy() {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      closeSat();
      window.clearTimeout(resizeT);
      ro.disconnect();
      window.removeEventListener("click", onClick);
      canvas.removeEventListener("webglcontextlost", onLost, false);
      canvas.removeEventListener("webglcontextrestored", onRestored, false);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
