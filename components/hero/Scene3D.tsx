"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32, type GraphData } from "./neuralGraph";
import { buildPillars } from "./pillarsGraph";
import { STAR_CHAR, CHAOS_COUNT, DOT_GLYPH, getGlyphAtlas, glyphIndex, GLYPH_FONT_RATIO, MONO_ADVANCE } from "./glyphAtlas";
import { buildStructures, layoutStructures } from "./dataStructures";
import { colors } from "@/lib/animation/tokens";
import { useWebGLRecovery } from "@/lib/hooks/useWebGLRecovery";
import { heroSceneCopy, type Locale } from "@/content/hero";

export type SceneQuality = "full" | "lite" | "static";

type Scene3DProps = {
  reducedMotion: boolean;
  quality: SceneQuality;
  /** Il riquadro (in flusso) dove la rete si va a posare a fine animazione. */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** La colonna di testo dell'hero: le strutture di dati non ci vanno MAI sopra. */
  contentRef: React.RefObject<HTMLElement | null>;
  locale: Locale;
  onFormationComplete?: () => void;
};

/* ============================================================================
   L'APERTURA — «un'esplosione di numeri e dati alla matrix»
   ----------------------------------------------------------------------------
   Cliente: «Quando il sito viene aperto vorrei vedere un'esplosione di numeri
   e dati alla matrix (prima esplosione, effetto wow, poi numeri che
   rapidamente da sparsi in maniera confusa nella pagina si riordinano
   rapidamente in diverse strutture dati (tabelle, cluster, frasi, codice),
   mantieni in maniera armoniosa ed estetica il grafico a nodi espandibile ed
   interagibile)».

   Le particelle sono GLIFI (cifre, hex, simboli) campionati da un atlante
   generato a runtime col mono del sito. La coreografia, in secondi:

     0.18        ESPLOSIONE  — un nucleo aqua detona dove poi nascerà la rete:
                               lampo + onda d'urto (CSS, sotto), i glifi
                               schizzano su TUTTA la viewport con scie di luce,
                               decelerando in modo esponenziale.
     ~0.9–1.2    CAOS        — sparsi, in deriva, sfarfallano come pioggia
                               digitale: ogni glifo cambia carattere 8-22 volte
                               al secondo.
     1.2–2.7     ORDINE      — per ondate, i glifi scattano in strutture di dati
                               impaginate nello spazio VUOTO della pagina
                               (tabella, cluster k=3, codice, frase, barre).
                               Il carattere si "decifra" all'atterraggio.
     3.25–4.8    RETE        — tengono un istante, poi la maggior parte dei
                               glifi fluisce nella rete neurale; le strutture
                               fuori dalla rete restano come FANTASMI (alpha
                               bassa, respiro lento, cifre che ogni tanto si
                               aggiornano): la pagina non torna mai un vuoto.

   Tutto il volo è nel vertex shader, funzione pura del tempo: la CPU non tocca
   una particella durante l'intro. Dopo, la sola fisica del cursore (repulsione
   + trascinamento) gira sulle particelle della rete (≤900, ≈0.05ms).

   La rete è ESPANDIBILE: hover su un nodo → si accende con i suoi archi; click
   o tap → il nodo sboccia in satelliti con metriche vive; click altrove / Esc
   → si richiude. Il puntatore si ascolta su window e si sceglie il nodo in
   spazio schermo: il canvas resta `pointer-events: none` e non ruba MAI un
   click al testo (un "hotspot" DOM compare solo sopra un nodo libero, per il
   cursore custom).
   ========================================================================== */

type Budget = { graph: number; ghost: number; spark: number };
const BUDGET: Record<SceneQuality, Budget> = {
  full: { graph: 2000, ghost: 300, spark: 100 },
  lite: { graph: 1150, ghost: 330, spark: 80 },
  static: { graph: 640, ghost: 260, spark: 0 },
};

const CAM_Z = 3.75;
const FOV = 45;
const FOV_HALF_RAD = (FOV * Math.PI) / 360;
const NEAR_D = 2.5;
const FAR_D = 7.2;

/* --- la coreografia (s) ---------------------------------------------------- */
// 0. COMPRESSIONE (supernova): il nucleo si raccoglie da T_PRE a T_BURST.
//    Tutto ciò che viene DOPO è identico alla v1, solo traslato di PRE_SHIFT.
const T_PRE = 0.1;
const PRE_SHIFT = 0.72;
const T_BURST = 0.18 + PRE_SHIFT;
const T_ORDER = 1.2 + PRE_SHIFT;
const D_ORDER = 0.62;
const ORDER_SPREAD = 0.55; // ritardo interno a una struttura
const T_GRAPH = 3.25 + PRE_SHIFT;
const D_GRAPH = 0.95;
const GRAPH_WAVE = 0.62; // la rete si compone per strati, da sinistra
const TRAIL = 0.07;
const GHOST_ALPHA = 0.3;

/* --- fisica del cursore (spazio locale del grafo) -------------------------- */
const REPEL_RADIUS = 0.6;
const REPEL_FORCE = 9.0;
const DRAG_GAIN_IDLE = 0.2;
const DRAG_GAIN_HELD = 0.62;
const SPRING_K = 26.0;
const DAMPING = 5.0;
const MAX_DISP = 0.3;
const ENERGY_SCALE = 5.0;

/* --- satelliti (nodo espanso) ---------------------------------------------- */
const SAT_COUNT = 5;
const SAT_CHARS = 11;
const SAT_HEADER = 12;
const SAT_POINTS = SAT_COUNT * (1 + SAT_CHARS) + SAT_HEADER;

const f = (n: number) => n.toFixed(6);

/* ============================================================================
   SHADER — una sola sorgente, tre usi (#define): glifi, archi, scie.
   ========================================================================== */
const COMMON = /* glsl */ `
  #define FOV_HALF_TAN ${f(Math.tan(FOV_HALF_RAD))}
  #define T_PRE ${f(T_PRE)}
  #define T_BURST ${f(T_BURST)}
  #define T_ORDER ${f(T_ORDER)}
  #define D_ORDER ${f(D_ORDER)}
  #define T_GRAPH uGraphT
  #define D_GRAPH ${f(D_GRAPH)}
  #define CHAOS_COUNT ${f(CHAOS_COUNT)}

  attribute vec3 aChaos;    // xy -1..1 sulla viewport, z profondità 0..1
  attribute vec4 aForm;     // struttura: x,y px di documento · cella px · luce
  attribute vec4 aTime;     // ritardo esplosione · velocità · ritardo ordine · ritardo rete
  attribute vec4 aGraph;    // u sull'arco · peso · tipo (0 arco .5 alone 1 nodo) · cella px
  attribute vec4 aGlyph;    // glifo in struttura · glifo in rete · cifra viva · destino
  attribute vec2 aOwner;    // i due nodi dell'arco
  attribute vec3 aDisplace;
  attribute float aEnergy;
  attribute float aSeed;

  uniform float uT;
  uniform float uGraphT;
  uniform float uClock;
  uniform vec2 uViewport;
  uniform vec2 uOrigin;
  uniform float uScroll;
  uniform float uPxToWorld;
  uniform float uAspect;
  uniform float uFit;
  uniform float uDrift;
  uniform float uDpr;
  uniform float uGraphDim;
  uniform float uHover;
  uniform float uHoverAmt;
  uniform float uOpen;
  uniform float uOpenAmt;

  float hash11(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453); }

  vec3 docToView(vec2 px) {
    return vec3(
      (px.x - 0.5 * uViewport.x) * uPxToWorld,
      (0.5 * uViewport.y - (px.y - uScroll)) * uPxToWorld,
      -${f(CAM_Z)}
    );
  }

  float matchOwner(float n) {
    return (abs(aOwner.x - n) < 0.5 || abs(aOwner.y - n) < 0.5) ? 1.0 : 0.0;
  }

  /* La traiettoria completa di un glifo: funzione pura del tempo. */
  vec3 flight(float T, float clock, out float kb, out float eo, out float eg, out float sz) {
    float dest = aGlyph.w;
    float hasForm = step(0.5, aForm.z);
    float isG = 1.0 - step(0.5, dest);
    float spark = step(1.5, dest) * (1.0 - step(2.5, dest));
    float ph = aSeed * 6.2831853;

    // 1. ESPLOSIONE → CAOS: decelerazione esponenziale dall'origine alla cella
    float tb = T - T_BURST - aTime.x;
    kb = tb <= 0.0 ? 0.0 : 1.0 - exp(-tb * aTime.y);

    vec3 o = docToView(uOrigin);
    float dist = mix(${f(NEAR_D)}, ${f(FAR_D)}, aChaos.z);
    float hh = FOV_HALF_TAN * dist;
    float hw = hh * uAspect;
    vec3 c = vec3(aChaos.x * hw, aChaos.y * hh, -dist);
    float settle = smoothstep(0.4, 1.0, kb);
    c.x += sin(clock * (0.45 + aSeed * 0.6) + ph) * hw * 0.018 * settle;
    c.y += cos(clock * (0.38 + aSeed * 0.5) + ph * 1.3) * hh * 0.022 * settle;
    // le scintille non trovano posto: piovono giù mentre si spengono
    c.y -= spark * max(T - T_ORDER - aTime.z * 0.4, 0.0) * hh * 0.18;

    vec3 d = c - o;
    vec3 p = mix(o, c, kb);
    // una lieve spirale: l'esplosione ha un verso, non è una stella a raggi dritti
    vec3 perp = normalize(vec3(-d.y, d.x, 0.0) + vec3(1e-5, 0.0, 0.0));
    p += perp * (aSeed - 0.5) * length(d) * 0.55 * kb * (1.0 - kb);
    float s = mix(13.0, 23.0, fract(aSeed * 7.13)) * ${f(CAM_Z)} / dist;

    // 0. COMPRESSIONE: prima del lampo i glifi vengono RISUCCHIATI nel nucleo,
    //    a spirale e accelerando (gravità), e arrivano all'origine esattamente
    //    quando parte l'esplosione — l'implosione diventa lo scoppio.
    if (tb <= 0.0) {
      float pre = clamp((T - T_PRE) / (T_BURST + aTime.x - T_PRE), 0.0, 1.0);
      float ci = pre * pre * pre;
      vec3 inStart = o + d * (0.2 + 0.3 * fract(aSeed * 11.3));
      p = mix(inStart, o, ci) + perp * (aSeed - 0.5) * length(d) * 0.3 * (1.0 - ci) * pre;
      s *= 0.72;
    }

    // 2. ORDINE: lo scatto nella struttura, ad arco
    float to = hasForm * clamp((T - T_ORDER - aTime.z) / D_ORDER, 0.0, 1.0);
    eo = to < 0.5 ? 8.0 * to * to * to * to : 1.0 - pow(-2.0 * to + 2.0, 4.0) * 0.5;
    vec3 fp = docToView(aForm.xy);
    vec3 df = fp - p;
    vec3 perp2 = normalize(vec3(-df.y, df.x, 0.0) + vec3(1e-5, 0.0, 0.0));
    p = mix(p, fp, eo) + perp2 * (aSeed - 0.5) * length(df) * 0.9 * eo * (1.0 - eo);
    s = mix(s, aForm.z, eo);

    // 3. RETE: dal suo posto (struttura o polvere) al grafo 3D
    float tg = isG * clamp((T - T_GRAPH - aTime.w) / D_GRAPH, 0.0, 1.0);
    eg = tg < 0.5 ? 4.0 * tg * tg * tg : 1.0 - pow(-2.0 * tg + 2.0, 3.0) * 0.5;
    vec3 local = position + aDisplace * eg;
    local.x += sin(clock * 0.31 + ph) * uDrift * eg;
    local.y += cos(clock * 0.26 + ph * 1.7) * uDrift * eg;
    local.z += sin(clock * 0.19 + ph * 2.3) * uDrift * 0.8 * eg;
    vec3 g = (modelViewMatrix * vec4(local, 1.0)).xyz;
    vec3 dg = g - p;
    vec3 perp3 = normalize(cross(dg, vec3(0.0, 0.0, 1.0)) + vec3(0.0, 0.0, 1e-4));
    p = mix(p, g, eg) + perp3 * (aSeed - 0.5) * length(dg) * 1.1 * eg * (1.0 - eg);
    float gd = max(-g.z, 0.1);
    s = mix(s, aGraph.w * uFit * ${f(CAM_Z)} / gd, eg);

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

    float dest = aGlyph.w;
    float hasForm = step(0.5, aForm.z);
    float isG = 1.0 - step(0.5, dest);
    float spark = step(1.5, dest) * (1.0 - step(2.5, dest));
    float fadeOut = step(2.5, dest);
    float appear = smoothstep(0.0, 0.05, uT - T_BURST - aTime.x);
    // la compressione si vede solo su un terzo dei glifi, tenui: "leggera"
    float tb0 = uT - T_BURST - aTime.x;
    float preT = clamp((uT - T_PRE) / (T_BURST + aTime.x - T_PRE), 0.0, 1.0);
    float preA = (1.0 - step(0.0, tb0)) * step(fract(aSeed * 7.77), 0.32)
      * smoothstep(0.0, 0.3, preT) * (0.2 + 0.34 * preT * preT * preT) * mix(1.0, 0.4, aChaos.z);

    float kind = aGraph.z;
    float node = step(0.75, kind) * isG;
    float halo = step(0.25, kind) * (1.0 - step(0.75, kind)) * isG;
    float edge = (1.0 - step(0.25, kind)) * isG;

    float mh = matchOwner(uHover) * isG;
    float mo = matchOwner(uOpen) * isG;
    float hl = max(mh * uHoverAmt, mo * uOpenAmt);
    float focus = mix(1.0, 0.42, uOpenAmt * (1.0 - mo));

    float head = fract(uClock * 0.23 + aSeed);
    float dd = aGraph.x - head;
    dd -= floor(dd + 0.5);
    float pulse = exp(-dd * dd * 170.0) * edge * eg;
    float gDepth = max(-p.z, 0.1);
    float near = smoothstep(8.5, 2.0, gDepth);

    float burstHeat = (1.0 - kb) * (1.0 - kb);
    // in compressione i glifi sono aqua, e si scaldano solo vicino al nucleo
    burstHeat *= tb0 < 0.0 ? 0.2 + 0.55 * preT * preT * preT : 1.0;

  #ifdef EDGES
    gl_Position = projectionMatrix * vec4(p, 1.0);
    float form = smoothstep(0.82, 1.0, eg);
    vAlpha = form * uGraphDim * mix(0.2, 1.0, aGraph.y) * (0.16 + 0.84 * near) * focus * (1.0 + hl * 3.2);
    vHeat = clamp(hl * 0.85 + pulse + aEnergy * 0.8, 0.0, 1.0);
    vTone = 0.2;
    vGlyph = 0.0;
    vGlow = 0.0;
  #else

    // --- alpha: caos → struttura → (fantasma | rete) ---
    float chaosA = mix(0.26, 1.0, fract(aSeed * 3.71)) * mix(1.0, 0.32, aChaos.z);
    float dust = (1.0 - hasForm) * isG * smoothstep(0.0, 0.6, uT - T_ORDER - aTime.w * 0.3);
    chaosA *= 1.0 - dust * 0.84;
    chaosA *= 1.0 - spark * smoothstep(0.05, 0.75, uT - T_ORDER - aTime.z);
    float a = mix(chaosA, mix(0.3, 1.0, aForm.w), eo);
    float ghost = step(0.5, dest) * (1.0 - spark) * (1.0 - fadeOut) * hasForm;
    float gf = ghost * smoothstep(0.0, 1.0, uT - T_GRAPH - 0.1 - aTime.z * 0.3);
    a *= 1.0 - fadeOut * smoothstep(0.0, 0.8, uT - T_GRAPH - 0.1 - aTime.z * 0.3);
    float breathe = 0.72 + 0.28 * sin(uClock * 0.55 + aForm.x * 0.005 + aForm.y * 0.009);
    a *= mix(1.0, ${f(GHOST_ALPHA)} * breathe, gf);

    float gA = (node + halo * mix(0.16, 0.78, aGraph.y) + edge * mix(0.32, 0.85, aGraph.y)) * (0.35 + 0.65 * near);
    gA = gA * uGraphDim * focus * (1.0 + hl * 1.5) + pulse * 0.45 * uGraphDim;
    a = mix(a, gA, eg) * appear + preA;

    float qo = (uT - T_ORDER - aTime.z - D_ORDER * 0.8) * 6.0;
    float qg = (uT - T_GRAPH - aTime.w - D_GRAPH * 0.85) * 5.0;
    float landO = hasForm * exp(-qo * qo);
    float landG = isG * exp(-qg * qg);
    float beat = (0.5 + 0.5 * sin(uClock * 0.85 + aSeed * 6.28)) * node * 0.3;

    #ifdef STREAK
      // la coda: lo stesso volo, un istante fa
      float kb2; float eo2; float eg2; float sz2;
      vec3 pt = flight(uT - ${f(TRAIL)}, uClock - ${f(TRAIL)}, kb2, eo2, eg2, sz2);
      vec2 sh = p.xy / max(-p.z, 0.1);
      vec2 st = pt.xy / max(-pt.z, 0.1);
      float lenPx = length(sh - st) * ${f(CAM_Z)} / uPxToWorld;
      float speed = smoothstep(6.0, 70.0, lenPx);
      vec3 q = mix(p, pt, aTail);
      gl_Position = projectionMatrix * vec4(q, 1.0);
      // a rete formata le scie non servono più
      vAlpha = speed * (1.0 - aTail) * a * (1.0 - smoothstep(0.9, 1.0, eg)) * 0.55;
      vHeat = clamp(burstHeat * 1.2 + 0.2, 0.0, 1.0);
      vTone = 0.6;
      vGlyph = 0.0;
      vGlow = 0.0;
    #else
      gl_Position = projectionMatrix * vec4(p, 1.0);
      vAlpha = a;
      vHeat = clamp(
        burstHeat * 0.95 + landO * 0.75 + landG * 0.55 + hl * 0.7 + pulse * 0.8 + aEnergy * 0.8 * eg + beat,
        0.0, 1.0);
      float chaosTone = fract(aSeed * 5.31) * 0.55;
      vTone = mix(mix(chaosTone, aForm.w, eo), node * 1.0 + halo * 0.45 + edge * 0.25, eg);
      vGlow = mix(mix(0.5, 1.0, burstHeat), 0.75 + node * 0.5, eg);

      sz *= 1.0 + burstHeat * 0.55 + landO * 0.22 + (hl * 0.35 + aEnergy * 0.9) * eg;
      gl_PointSize = clamp(sz * uDpr, 1.0, 72.0);
      // invisibile = fuori dal clip space: nessun frammento rasterizzato
      // (a intro finita le scintille e i glifi senza posto non costano nulla)
      if (a < 0.002) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        gl_PointSize = 0.0;
      }

      // --- il carattere: sfarfalla in volo, si DECIFRA all'atterraggio ---
      float rate = 8.0 + aSeed * 14.0;
      float g = 1.0 + floor(hash11(aSeed * 97.0 + floor(uClock * rate)) * CHAOS_COUNT);
      if (hasForm > 0.5 && eo > 0.93 && eg < 0.07) g = aGlyph.x;
      // le cifre vive dei fantasmi: ogni tanto il dato si aggiorna
      if (aGlyph.z > 0.5 && gf > 0.5 && fract(uClock * 0.11 + aSeed * 7.0) < 0.035) {
        g = 1.0 + floor(hash11(aSeed * 13.0 + floor(uClock * 12.0)) * 10.0);
      }
      if (eg > 0.93) {
        g = aGlyph.y;
        // il segnale che corre sull'arco trasporta DATI: le cifre cambiano al passaggio
        if (pulse > 0.35) g = 1.0 + floor(hash11(aSeed * 31.0 + floor(uClock * 16.0)) * 16.0);
      }
      vGlyph = g;
    #endif
  #endif
  }
`;

const GLYPH_FRAGMENT = /* glsl */ `
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
    vec2 cell = vec2(mod(gi, 16.0), floor(gi / 16.0));
    vec2 uv = (cell + 0.03 + gl_PointCoord * 0.94) / vec2(16.0, 8.0);
    vec4 t = texture2D(uAtlas, uv);
    float a = (t.r + t.g * vGlow * 0.55) * vAlpha * uOpacity;
    if (a < 0.003) discard;
    vec3 col = mix(uThread, uNode, clamp(vTone, 0.0, 1.0));
    col = mix(col, uHot, vHeat);
    gl_FragColor = vec4(col, min(a, 1.0));
  }
`;

const LINE_FRAGMENT = /* glsl */ `
  uniform vec3 uThread;
  uniform vec3 uHot;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vHeat;
  void main() {
    float a = vAlpha * uOpacity;
    if (a < 0.002) discard;
    gl_FragColor = vec4(mix(uThread, uHot, vHeat), min(a, 1.0));
  }
`;

/* --- satelliti: glifi in spazio mondo, scritti dalla CPU (pochi, solo quando
       un nodo è aperto) --- */
const SAT_VERTEX = /* glsl */ `
  attribute vec4 aSat;   // glifo · cella px · alpha · luce
  uniform float uDpr;
  varying float vGlyph;
  varying float vAlpha;
  varying float vHeat;
  varying float vTone;
  varying float vGlow;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSat.y * uDpr;
    vGlyph = aSat.x;
    vAlpha = aSat.z;
    vTone = aSat.w;
    vHeat = aSat.w * 0.5;
    vGlow = 0.7;
  }
`;
const SAT_LINE_VERTEX = /* glsl */ `
  attribute float aAlpha;
  varying float vAlpha;
  varying float vHeat;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vAlpha = aAlpha;
    vHeat = 0.35;
  }
`;

/* ============================================================================
   IL BUNDLE — geometrie, materiali e stato, fuori da React (cache per qualità)
   ========================================================================== */

type Uniforms = Record<string, { value: unknown }> & {
  uT: { value: number };
  uGraphT: { value: number };
  uClock: { value: number };
  uViewport: { value: THREE.Vector2 };
  uOrigin: { value: THREE.Vector2 };
  uScroll: { value: number };
  uPxToWorld: { value: number };
  uAspect: { value: number };
  uFit: { value: number };
  uDrift: { value: number };
  uDpr: { value: number };
  uGraphDim: { value: number };
  uHover: { value: number };
  uHoverAmt: { value: number };
  uOpen: { value: number };
  uOpenAmt: { value: number };
};

type FieldBundle = {
  count: number;
  G: number;
  /** Fine del pool dei fantasmi: [G, ghostEnd). Oltre: scintille. */
  ghostEnd: number;
  graph: GraphData;
  displace: Float32Array;
  velocity: Float32Array;
  energy: Float32Array;
  form: Float32Array;
  time: Float32Array;
  glyph: Float32Array;
  pointsGeometry: THREE.BufferGeometry;
  linesGeometry: THREE.BufferGeometry;
  streakGeometry: THREE.BufferGeometry;
  dynAttrs: THREE.BufferAttribute[];
  streakDyn: { attr: THREE.BufferAttribute; src: Float32Array; size: number }[];
  dispAttr: THREE.BufferAttribute;
  energyAttr: THREE.BufferAttribute;
  pointsMaterial: THREE.ShaderMaterial;
  linesMaterial: THREE.ShaderMaterial;
  streakMaterial: THREE.ShaderMaterial;
  uniforms: Uniforms;
  runtime: Runtime;
  sat: {
    geometry: THREE.BufferGeometry;
    lineGeometry: THREE.BufferGeometry;
    pos: Float32Array;
    data: Float32Array;
    linePos: Float32Array;
    lineAlpha: Float32Array;
    material: THREE.ShaderMaterial;
    lineMaterial: THREE.ShaderMaterial;
  };
};

const bundleCache = new Map<SceneQuality, FieldBundle>();

function createFieldBundle(quality: SceneQuality): FieldBundle {
  const budget = BUDGET[quality];
  const graph = buildPillars(budget.graph);
  const G = graph.count;
  const count = G + budget.ghost + budget.spark;
  const rand = mulberry32(777);

  const position = new Float32Array(count * 3);
  position.set(graph.positions);
  const chaos = new Float32Array(count * 3);
  const form = new Float32Array(count * 4);
  const time = new Float32Array(count * 4);
  const graphA = new Float32Array(count * 4);
  const glyph = new Float32Array(count * 4);
  const owner = new Float32Array(count * 2).fill(-9);
  owner.set(graph.owners);
  const seeds = new Float32Array(count);
  const displace = new Float32Array(count * 3);
  const velocity = new Float32Array(count * 3);
  const energy = new Float32Array(count);

  // il caos: una lattice irregolare su tutta la viewport, permutata
  const cols = Math.ceil(Math.sqrt(count * 1.7));
  const rows = Math.ceil(count / cols);
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const edgeGlyphs = "0123456789ABCDEF01";
  let maxDelay = 0;
  for (let i = 0; i < G; i++) maxDelay = Math.max(maxDelay, graph.flow[i * 3 + 1]);

  for (let i = 0; i < count; i++) {
    const slot = order[i];
    const c = slot % cols;
    const r = Math.floor(slot / cols);
    chaos[i * 3] = (((c + 0.5 + (rand() - 0.5) * 1.5) / cols) * 2 - 1) * 1.04;
    chaos[i * 3 + 1] = (((r + 0.5 + (rand() - 0.5) * 1.5) / rows) * 2 - 1) * 1.04;
    chaos[i * 3 + 2] = Math.pow(rand(), 0.9);
    seeds[i] = i < G ? graph.seeds[i] * 0.5 + rand() * 0.5 : rand();

    time[i * 4] = rand() * 0.07;
    time[i * 4 + 1] = 3.2 + rand() * 6.0;
    time[i * 4 + 2] = 0;
    time[i * 4 + 3] = i < G ? (graph.flow[i * 3 + 1] / Math.max(maxDelay, 1e-3)) * GRAPH_WAVE : 0;

    if (i < G) {
      const kind = graph.look[i * 2];
      graphA[i * 4] = graph.flow[i * 3];
      graphA[i * 4 + 1] = graph.flow[i * 3 + 2];
      graphA[i * 4 + 2] = kind;
      const hint = graph.glyphHint?.[i] ?? 0;
      graphA[i * 4 + 3] =
        graph.sizes?.[i] ?? (kind > 0.75 ? 15 : kind > 0.25 ? 9.5 : 9.5 + graph.flow[i * 3 + 2] * 3.5);
      glyph[i * 4 + 1] =
        hint === 1
          ? glyphIndex(STAR_CHAR)
          : kind > 0.75
            ? DOT_GLYPH
            : hint === 2
              ? // il corpo della nebulosa: cifre e punti, più punti ai bordi
                glyphIndex(rand() < 0.35 + (1 - graph.flow[i * 3 + 2]) * 0.4 ? "·" : edgeGlyphs[Math.floor(rand() * edgeGlyphs.length)])
              : kind > 0.25
                ? glyphIndex(rand() < 0.5 ? "·" : "0")
                : glyphIndex(edgeGlyphs[Math.floor(rand() * edgeGlyphs.length)]);
    } else {
      graphA[i * 4 + 2] = -1;
      glyph[i * 4 + 3] = 2;
    }
  }

  const attr = (arr: Float32Array, size: number, dynamic = false) => {
    const a = new THREE.BufferAttribute(arr, size);
    if (dynamic) a.setUsage(THREE.DynamicDrawUsage);
    return a;
  };
  const posAttr = attr(position, 3);
  const chaosAttr = attr(chaos, 3);
  const formAttr = attr(form, 4, true);
  const timeAttr = attr(time, 4, true);
  const graphAttr = attr(graphA, 4);
  const glyphAttr = attr(glyph, 4, true);
  const ownerAttr = attr(owner, 2);
  const seedAttr = attr(seeds, 1);
  const dispAttr = attr(displace, 3, true);
  const energyAttr = attr(energy, 1, true);

  const pointsGeometry = new THREE.BufferGeometry();
  const linesGeometry = new THREE.BufferGeometry();
  for (const g of [pointsGeometry, linesGeometry]) {
    g.setAttribute("position", posAttr);
    g.setAttribute("aChaos", chaosAttr);
    g.setAttribute("aForm", formAttr);
    g.setAttribute("aTime", timeAttr);
    g.setAttribute("aGraph", graphAttr);
    g.setAttribute("aGlyph", glyphAttr);
    g.setAttribute("aOwner", ownerAttr);
    g.setAttribute("aSeed", seedAttr);
    g.setAttribute("aDisplace", dispAttr);
    g.setAttribute("aEnergy", energyAttr);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  }
  linesGeometry.setIndex(new THREE.BufferAttribute(graph.indices, 1));

  // le scie: ogni particella due volte (testa, coda). Stessi dati, duplicati.
  const dup = (src: Float32Array, size: number) => {
    const out = new Float32Array(src.length * 2);
    for (let i = 0; i < src.length / size; i++) {
      for (let k = 0; k < size; k++) {
        out[i * 2 * size + k] = src[i * size + k];
        out[i * 2 * size + size + k] = src[i * size + k];
      }
    }
    return out;
  };
  const streakGeometry = new THREE.BufferGeometry();
  const streakDyn: FieldBundle["streakDyn"] = [];
  const setDup = (name: string, src: Float32Array, size: number, dynamic = false) => {
    const a = attr(dup(src, size), size, dynamic);
    streakGeometry.setAttribute(name, a);
    if (dynamic) streakDyn.push({ attr: a, src, size });
  };
  setDup("position", position, 3);
  setDup("aChaos", chaos, 3);
  setDup("aForm", form, 4, true);
  setDup("aTime", time, 4, true);
  setDup("aGraph", graphA, 4);
  setDup("aGlyph", glyph, 4, true);
  setDup("aOwner", owner, 2);
  setDup("aSeed", seeds, 1);
  streakGeometry.setAttribute("aDisplace", attr(new Float32Array(count * 6), 3));
  streakGeometry.setAttribute("aEnergy", attr(new Float32Array(count * 2), 1));
  const tail = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) tail[i * 2 + 1] = 1;
  streakGeometry.setAttribute("aTail", attr(tail, 1));
  streakGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

  const atlas = getGlyphAtlas().texture;
  const uniforms: Uniforms = {
    uT: { value: 0 },
    uGraphT: { value: T_GRAPH },
    uClock: { value: 0 },
    uViewport: { value: new THREE.Vector2(1, 1) },
    uOrigin: { value: new THREE.Vector2(0, 0) },
    uScroll: { value: 0 },
    uPxToWorld: { value: 0.003 },
    uAspect: { value: 1 },
    uFit: { value: 1 },
    uDrift: { value: 0.016 },
    uDpr: { value: 1 },
    uGraphDim: { value: 1 },
    uHover: { value: -9 },
    uHoverAmt: { value: 0 },
    uOpen: { value: -9 },
    uOpenAmt: { value: 0 },
    uAtlas: { value: atlas },
    uThread: { value: new THREE.Color(colors.aqua500) },
    uNode: { value: new THREE.Color(colors.aqua200) },
    uHot: { value: new THREE.Color(colors.aqua100) },
  };

  const mat = (opacity: number, defines: Record<string, string>, fragment: string) =>
    new THREE.ShaderMaterial({
      uniforms: { ...uniforms, uOpacity: { value: opacity } },
      defines,
      vertexShader: VERTEX,
      fragmentShader: fragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

  const pointsMaterial = mat(0.95, {}, GLYPH_FRAGMENT);
  const linesMaterial = mat(0.26, { EDGES: "" }, LINE_FRAGMENT);
  const streakMaterial = mat(0.8, { STREAK: "" }, LINE_FRAGMENT);

  /* --- satelliti --- */
  const satPos = new Float32Array(SAT_POINTS * 3);
  const satData = new Float32Array(SAT_POINTS * 4);
  const satGeometry = new THREE.BufferGeometry();
  satGeometry.setAttribute("position", attr(satPos, 3, true));
  satGeometry.setAttribute("aSat", attr(satData, 4, true));
  satGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const linePos = new Float32Array(SAT_COUNT * 2 * 3);
  const lineAlpha = new Float32Array(SAT_COUNT * 2);
  const satLineGeometry = new THREE.BufferGeometry();
  satLineGeometry.setAttribute("position", attr(linePos, 3, true));
  satLineGeometry.setAttribute("aAlpha", attr(lineAlpha, 1, true));
  satLineGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const satMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uAtlas: uniforms.uAtlas,
      uThread: uniforms.uThread,
      uNode: uniforms.uNode,
      uHot: uniforms.uHot,
      uDpr: uniforms.uDpr,
      uOpacity: { value: 1 },
    },
    vertexShader: SAT_VERTEX,
    fragmentShader: GLYPH_FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const satLineMaterial = new THREE.ShaderMaterial({
    uniforms: { uThread: uniforms.uThread, uHot: uniforms.uHot, uOpacity: { value: 0.55 } },
    vertexShader: SAT_LINE_VERTEX,
    fragmentShader: LINE_FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return {
    count,
    G,
    ghostEnd: G + budget.ghost,
    graph,
    displace,
    velocity,
    energy,
    form,
    time,
    glyph,
    pointsGeometry,
    linesGeometry,
    streakGeometry,
    dynAttrs: [formAttr, timeAttr, glyphAttr],
    streakDyn,
    dispAttr,
    energyAttr,
    pointsMaterial,
    linesMaterial,
    streakMaterial,
    uniforms,
    runtime: createRuntime(),
    sat: {
      geometry: satGeometry,
      lineGeometry: satLineGeometry,
      pos: satPos,
      data: satData,
      linePos,
      lineAlpha,
      material: satMaterial,
      lineMaterial: satLineMaterial,
    },
  };
}

function getFieldBundle(quality: SceneQuality) {
  let b = bundleCache.get(quality);
  if (!b) {
    b = createFieldBundle(quality);
    bundleCache.set(quality, b);
  }
  return b;
}

/* ============================================================================
   IMPAGINAZIONE delle strutture → attributi (solo al mount / resize / font)
   ========================================================================== */

type Rect = { left: number; top: number; right: number; bottom: number };

function collectObstacles(content: HTMLElement | null): Rect[] {
  if (!content) return [];
  const out: Rect[] = [];
  const els = content.querySelectorAll<HTMLElement>(
    ".eyebrow, .hh-w, .hh-controls button, p, button, a, [data-hero-block]",
  );
  els.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
  });
  // i comandi del titolo ("Sfascia / Ricomponi") compaiono a reveal finito,
  // DOPO questa misura: il loro spazio (già riservato nel flusso) si prenota qui
  const controls = content.querySelector<HTMLElement>(".hh-controls");
  if (controls) {
    const r = controls.getBoundingClientRect();
    out.push({ left: r.left, top: r.top, right: r.left + Math.min(r.width, 460), bottom: r.bottom });
  }
  return out;
}

function applyLayout(
  b: FieldBundle,
  locale: Locale,
  content: HTMLElement | null,
  graphRect: Rect | null,
) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const cell = Math.max(15, Math.min(21, (W / 1440) * 21));
  const structures = buildStructures(heroSceneCopy[locale] ?? heroSceneCopy.it, cell);
  const placed = layoutStructures(structures, {
    width: W,
    height: H,
    scrollY: window.scrollY,
    obstacles: collectObstacles(content),
    graphRect,
    topReserve: 84,
    bottomReserve: W < 640 ? 70 : 96,
  });

  type S = { x: number; y: number; size: number; bright: number; glyph: number; live: number; delay: number };
  const ghostSlots: S[] = [];
  const dissolveSlots: S[] = [];
  for (const p of placed) {
    for (const s of p.structure.slots) {
      const slot: S = {
        x: p.left + s.x,
        y: p.top + s.y,
        size: s.size,
        bright: s.bright,
        glyph: s.glyph,
        live: s.live,
        delay: p.structure.start + s.order * ORDER_SPREAD,
      };
      (p.ghost ? ghostSlots : dissolveSlots).push(slot);
    }
  }

  const { form, time, glyph, G, count, ghostEnd } = b;
  const write = (i: number, s: S | null, dest: number) => {
    if (s) {
      form[i * 4] = s.x;
      form[i * 4 + 1] = s.y;
      form[i * 4 + 2] = s.size;
      form[i * 4 + 3] = s.bright;
      time[i * 4 + 2] = s.delay;
      glyph[i * 4] = s.glyph;
      glyph[i * 4 + 2] = s.live;
    } else {
      form[i * 4] = form[i * 4 + 1] = form[i * 4 + 2] = form[i * 4 + 3] = 0;
      // senza struttura: si spegne con lo stesso ritmo delle ondate
      time[i * 4 + 2] = ((i * 0.61803) % 1) * 0.6;
      glyph[i * 4] = 0;
      glyph[i * 4 + 2] = 0;
    }
    glyph[i * 4 + 3] = dest;
  };

  // i fantasmi prendono il pool dedicato; ciò che avanza va alla rete
  let gs = 0;
  for (let i = G; i < ghostEnd; i++) {
    const s = gs < ghostSlots.length ? ghostSlots[gs++] : null;
    write(i, s, s ? 1 : 2);
  }
  for (let i = ghostEnd; i < count; i++) write(i, null, 2);
  const rest = [...dissolveSlots, ...ghostSlots.slice(gs)];
  // la rete: prima gli archi, i nodi restano nel caos fino all'ultimo —
  // così nessun nodo "salta" da una tabella al grafo
  const stride = 7919; // primo: permutazione deterministica
  let r = 0;
  for (let k = 0; k < G; k++) {
    const i = (k * stride) % G;
    const isNode = b.graph.look[i * 2] > 0.75;
    const s = !isNode && r < rest.length ? rest[r++] : null;
    write(i, s, 0);
  }
  // Se la rete non basta a riempire le strutture (qualità ridotta), le
  // completano i glifi senza destino: si formano, e quando la rete nasce si
  // spengono sul posto (destino 3) invece di restare come fantasmi.
  for (let i = G; i < count && r < rest.length; i++) {
    if (glyph[i * 4 + 3] !== 2) continue;
    write(i, rest[r++], 3);
  }

  // Nessuna struttura ha trovato posto (mobile: il testo occupa tutto): non
  // si aspetta a vuoto — dal caos si passa direttamente alla rete.
  b.uniforms.uGraphT.value = placed.length === 0 ? T_ORDER + 0.15 : T_GRAPH;

  for (const a of b.dynAttrs) a.needsUpdate = true;
  for (const d of b.streakDyn) {
    const out = d.attr.array as Float32Array;
    const n = d.src.length / d.size;
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < d.size; k++) {
        const v = d.src[i * d.size + k];
        out[i * 2 * d.size + k] = v;
        out[i * 2 * d.size + d.size + k] = v;
      }
    }
    d.attr.needsUpdate = true;
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
      const v = (base - 0.35) * 4 + wob * 0.3;
      return (v >= 0 ? "+" : "") + v.toFixed(2);
    }
    case 3:
      return String(Math.round(18 + base * 60 + wob * 6));
    default:
      return (0.05 + base * 0.3 + wob * 0.02).toFixed(3);
  }
}

function easeOutBack(t: number) {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

const INTERACTIVE_TEXT =
  "a, button, input, textarea, select, label, summary, [role='button'], [role='link'], h1, h2, h3, p, li, nav, header, .eyebrow, .hh-g";

/** Il `?heroT=2.5` congela l'intro a quel secondo — solo in sviluppo, per le verifiche visive. */
function debugIntroTime(): number | null {
  if (process.env.NODE_ENV === "production") return null;
  try {
    const v = new URLSearchParams(window.location.search).get("heroT");
    return v === null ? null : Math.max(0, parseFloat(v) || 0);
  } catch {
    return null;
  }
}

/* ============================================================================
   LA SCENA
   ========================================================================== */

/* Lo stato runtime della scena: cambia a ogni frame, quindi NON è stato
   React. Vive nel bundle (fuori da React, come geometrie e buffer), così la
   mutazione è legittima e non viene mai letta durante il render. */
function createRuntime() {
  return {
    start: -1,
    debugT: null as number | null,
    clock: 0,
    completed: false,
    anchor: { x: 0, gx: 0, yDoc: 0, w: 0, h: 0, ready: false },
    scrollY: 0,
    pointerX: -9999,
    pointerY: -9999,
    inside: false,
    held: false,
    touch: false,
    strength: 0,
    camLocal: new THREE.Vector3(),
    mouseLocal: new THREE.Vector3(),
    prevMouseLocal: new THREE.Vector3(),
    hasPrev: false,
    dragX: 0,
    dragY: 0,
    dragZ: 0,
    nodeScreen: new Float32Array(0),
    nodesValid: false,
    hover: -1,
    hoverAmt: 0,
    open: -1,
    openShown: -1,
    openAmt: 0,
    blockKey: "",
    blocked: false,
    tmp: new THREE.Vector3(),
  };
}
type Runtime = ReturnType<typeof createRuntime>;

type FieldProps = Scene3DProps & {
  /** Istante d'inizio dell'intro (performance.now), posseduto da Scene3D:
   *  sopravvive al rimontaggio del Canvas (perdita del contesto WebGL), così
   *  al ritorno la scena riprende dov'era invece di ri-esplodere. */
  introRef: React.RefObject<{ start: number }>;
  flashRef: React.RefObject<HTMLDivElement | null>;
  hotspotRef: React.RefObject<HTMLDivElement | null>;
};

function GraphField({
  reducedMotion,
  quality,
  anchorRef,
  contentRef,
  locale,
  onFormationComplete,
  introRef,
  flashRef,
  hotspotRef,
}: FieldProps) {
  const { camera, gl, size, invalidate } = useThree();
  const bundle = getFieldBundle(quality);
  const bundleRef = useRef<FieldBundle>(bundle);
  const groupRef = useRef<THREE.Group>(null);
  const streakRef = useRef<THREE.LineSegments>(null);
  const doneRef = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    doneRef.current = onFormationComplete;
  }, [onFormationComplete]);

  // stato runtime (mai stato React: cambia a ogni frame)


  /* --- mount / cambio qualità: si riparte dall'esplosione --- */
  useEffect(() => {
    const b = getFieldBundle(quality);
    bundleRef.current = b;
    const rt = b.runtime;
    b.displace.fill(0);
    b.velocity.fill(0);
    b.energy.fill(0);
    b.dispAttr.needsUpdate = true;
    b.energyAttr.needsUpdate = true;
    b.uniforms.uDrift.value = reducedMotion ? 0 : 0.016;
    // NIENTE reset dell'istante d'inizio: se il Canvas rinasce (contesto WebGL
    // perso dopo ore in background) la scena riprende dal suo tempo reale.
    rt.completed = false;
    rt.held = false;
    rt.inside = false;
    rt.debugT = debugIntroTime();
    rt.nodeScreen = new Float32Array(b.graph.nodeCount * 2);
    if (reducedMotion) {
      // struttura già formata: rete + fantasmi, nessuna transizione
      b.uniforms.uT.value = 99;
      rt.completed = true;
      doneRef.current?.();
    }
    invalidate();
  }, [quality, reducedMotion, invalidate]);

  /* --- dimensioni --- */
  useEffect(() => {
    const u = bundleRef.current.uniforms;
    const h = Math.max(size.height, 1);
    u.uViewport.value.set(size.width, h);
    u.uAspect.value = size.width / h;
    u.uPxToWorld.value = (2 * Math.tan(FOV_HALF_RAD) * CAM_Z) / h;
    u.uDpr.value = gl.getPixelRatio();
    // sotto lg la rete sta DIETRO al testo: lì si abbassa, il contrasto AA
    // viene prima dell'effetto (prima lo faceva l'opacità del wrapper, che
    // però spegneva anche l'esplosione)
    u.uGraphDim.value = size.width < 640 ? 0.52 : size.width < 1024 ? 0.62 : 1;
    invalidate();
  }, [size, gl, invalidate]);

  /* --- ancoraggio + impaginazione delle strutture --- */
  useEffect(() => {
    const rt = getFieldBundle(quality).runtime;
    const measure = () => {
      const b = bundleRef.current;
      const el = anchorRef.current;
      let graphRect: Rect | null = null;
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 1 && r.height > 1) {
          // il riquadro sborda a destra (right: -3%): la rete no, resta intera
          // dentro il viewport
          const right = Math.min(r.right, window.innerWidth - 12);
          const aw = Math.max(1, right - r.left);
          rt.anchor.x = r.left + aw / 2;
          rt.anchor.yDoc = r.top + window.scrollY + r.height / 2;
          rt.anchor.w = aw;
          // la nebulosa è un RITRATTO intero: mai più alta dello spazio sotto
          // la nav (nulla tagliato, stelle comprese)
          rt.anchor.h = Math.min(r.height, window.innerHeight - 104);
          rt.anchor.ready = true;
          {
            const H0 = Math.max(window.innerHeight, 1);
            const pxW0 = (2 * Math.tan(FOV_HALF_RAD) * CAM_Z) / H0;
            const fit0 = Math.max(
              0.3,
              Math.min(1.25, (aw * pxW0) / 2 / b.graph.halfX, (rt.anchor.h * pxW0) / 2 / b.graph.halfY),
            );
            const halfPx = (b.graph.halfX * fit0) / pxW0;
            const halfPy = (b.graph.halfY * fit0) / pxW0;
            // verticale: tutta sotto la nav e sopra il fondo del viewport
            const top = window.scrollY + 92 + halfPy;
            const bottom = window.scrollY + H0 - 12 - halfPy;
            rt.anchor.yDoc = Math.max(Math.min(rt.anchor.yDoc, bottom), Math.min(top, bottom));
            // da lg la forma si appoggia al bordo destro del riquadro (lontana
            // dal titolo); sotto lg resta centrata dietro al testo
            rt.anchor.gx =
              window.innerWidth >= 1024 ? Math.min(rt.anchor.x, right - halfPx - 8) : rt.anchor.x;
          }
          // da lg la rete ha un suo posto: le strutture che ci cadono sopra
          // vi confluiscono; sotto lg la rete è uno sfondo, e le strutture
          // fuori dal testo restano tutte
          if (window.innerWidth >= 1024) {
            // l'ingombro VERO della rete (non tutto il riquadro): stessa
            // formula di `fit` del frame loop, più un margine per l'oscillazione
            const H = Math.max(window.innerHeight, 1);
            const pxW = (2 * Math.tan(FOV_HALF_RAD) * CAM_Z) / H;
            const gr = b.graph;
            const fit = Math.max(
              0.3,
              Math.min(1.25, (rt.anchor.w * pxW) / 2 / gr.halfX, (rt.anchor.h * pxW) / 2 / gr.halfY),
            );
            const hx = ((gr.halfX * fit) / pxW) * 0.98 + 12;
            const hy = ((gr.halfY * fit) / pxW) * 1.02 + 12;
            const cx = rt.anchor.gx;
            const cy = rt.anchor.yDoc - window.scrollY * 0.78;
            graphRect = { left: cx - hx, top: cy - hy, right: cx + hx, bottom: cy + hy };
          }
        }
      }
      rt.scrollY = window.scrollY;
      b.uniforms.uScroll.value = rt.scrollY;
      b.uniforms.uOrigin.value.set(rt.anchor.gx, rt.anchor.yDoc);
      applyLayout(b, locale, contentRef.current, graphRect);
      invalidate();
    };

    const onScroll = () => {
      rt.scrollY = window.scrollY;
      bundleRef.current.uniforms.uScroll.value = rt.scrollY;
      if (window.scrollY < window.innerHeight * 1.2) invalidate();
    };

    measure();
    const raf = requestAnimationFrame(measure);
    let resizeT = 0;
    const onResize = () => {
      window.clearTimeout(resizeT);
      resizeT = window.setTimeout(measure, 120);
    };
    const ro = new ResizeObserver(onResize);
    if (anchorRef.current) ro.observe(anchorRef.current);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.fonts?.ready.then(measure).catch(() => {});
    getGlyphAtlas().ready.then(() => invalidate());

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeT);
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [anchorRef, contentRef, locale, invalidate, quality]);

  /* --- puntatore: su window, mai sul canvas --- */
  useEffect(() => {
    const rt = getFieldBundle(quality).runtime;
    const onMove = (e: PointerEvent) => {
      rt.pointerX = e.clientX;
      rt.pointerY = e.clientY;
      rt.inside = true;
      rt.touch = e.pointerType === "touch";
      if (reducedMotion) invalidate();
    };
    const onDown = (e: PointerEvent) => {
      onMove(e);
      rt.held = true;
    };
    const onUp = () => {
      rt.held = false;
    };
    const onLeave = () => {
      rt.inside = false;
      rt.held = false;
      rt.hasPrev = false;
      if (reducedMotion) invalidate();
    };

    const pick = (x: number, y: number, radius: number) => {
      if (!rt.nodesValid) return -1;
      const ns = rt.nodeScreen;
      let best = -1;
      let bestD = radius * radius;
      for (let k = 0; k < ns.length / 2; k++) {
        const dx = ns[k * 2] - x;
        const dy = ns[k * 2 + 1] - y;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      }
      return best;
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const onHotspot = target === hotspotRef.current;
      const blockedTarget = !onHotspot && !!target?.closest?.(INTERACTIVE_TEXT);
      const touch = (e as PointerEvent).pointerType === "touch";
      let k = blockedTarget ? -1 : onHotspot && rt.hover >= 0 ? rt.hover : pick(e.clientX, e.clientY, touch ? 36 : 30);
      // il nodo che si stava puntando un istante fa vince, se il click cade
      // ancora nei suoi paraggi: la rete oscilla, il bersaglio non deve sfuggire
      if (k < 0 && !blockedTarget && rt.hover >= 0 && rt.hoverAmt > 0.3) {
        const hx = rt.nodeScreen[rt.hover * 2] - e.clientX;
        const hy = rt.nodeScreen[rt.hover * 2 + 1] - e.clientY;
        if (hx * hx + hy * hy < 48 * 48) k = rt.hover;
      }
      if (k >= 0) {
        rt.open = rt.open === k ? -1 : k;
      } else if (rt.open >= 0 && !blockedTarget) {
        rt.open = -1;
      }
      invalidate();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && rt.open >= 0) {
        rt.open = -1;
        invalidate();
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    window.addEventListener("click", onClick, { passive: true });
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    // scheda nascosta = puntatore "fuori": nessun tasto resta premuto, nessun
    // hover resta acceso al ritorno
    const onVis = () => {
      if (document.hidden) onLeave();
      else invalidate();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, [reducedMotion, invalidate, hotspotRef, quality]);

  /* --- il lampo dell'esplosione (DOM, sotto al canvas) --- */
  const fireFlash = (rt: Runtime, introT: number) => {
    const el = flashRef.current;
    if (!el || reducedMotion) return;
    el.style.transform = `translate3d(${rt.anchor.gx}px, ${rt.anchor.yDoc - rt.scrollY}px, 0)`;
    el.style.setProperty("--hf-delay", `${(T_BURST - introT).toFixed(3)}s`);
    el.style.setProperty("--hf-pre-delay", `${(T_PRE - introT).toFixed(3)}s`);
    el.style.setProperty("--hf-pre-dur", `${(T_BURST - T_PRE).toFixed(3)}s`);
    el.style.setProperty("--hf-state", rt.debugT !== null ? "paused" : "running");
    el.classList.add("hf-go");
  };

  useFrame((_state, rawDelta) => {
    const group = groupRef.current;
    if (!group) return;
    const b = bundleRef.current;
    const rt = b.runtime;
    const u = b.uniforms;
    const dt = Math.min(rawDelta, 1 / 30);
    const W = Math.max(size.width, 1);
    const h = Math.max(size.height, 1);

    /* 1. il tempo dell'intro: orologio REALE (performance.now), così anche su
          un frame lento l'intro dura quello che deve e resta in sincrono con
          il lampo CSS */
    if (!reducedMotion) {
      const intro = introRef.current;
      if (intro.start < 0 && rt.anchor.ready) {
        intro.start = performance.now();
        fireFlash(rt, rt.debugT ?? 0);
      }
      const T = rt.debugT ?? (introRef.current.start < 0 ? 0 : (performance.now() - introRef.current.start) / 1000);
      u.uT.value = T;
      rt.clock += dt;
      u.uClock.value = rt.clock;
      if (T >= u.uGraphT.value + GRAPH_WAVE + D_GRAPH + 0.1 && !rt.completed) {
        rt.completed = true;
        doneRef.current?.();
      }
    }
    const T = u.uT.value;

    /* 2. l'ancoraggio della rete (con parallasse allo scroll) */
    const pxToWorld = (2 * Math.tan(FOV_HALF_RAD) * CAM_Z) / h;
    let fit = 1;
    if (rt.anchor.ready) {
      const cy = rt.anchor.yDoc - rt.scrollY * (reducedMotion ? 1 : 0.78);
      group.position.x = (rt.anchor.gx - W / 2) * pxToWorld;
      group.position.y = (h / 2 - cy) * pxToWorld;
      fit = Math.min(
        ((rt.anchor.w * pxToWorld) / 2) / Math.max(b.graph.halfX, 1e-3),
        ((rt.anchor.h * pxToWorld) / 2) / Math.max(b.graph.halfY, 1e-3),
      );
      fit = Math.max(0.3, Math.min(1.25, fit));
      group.scale.setScalar(fit);
      u.uFit.value = fit;
    }
    if (reducedMotion) {
      group.rotation.set(-0.04, 0.1, 0);
    } else {
      const t = rt.clock;
      group.rotation.y = Math.sin(t * 0.16) * 0.16;
      group.rotation.x = -0.05 + Math.sin(t * 0.12) * 0.06;
      group.rotation.z = Math.cos(t * 0.09) * 0.02;
    }
    group.updateMatrixWorld();

    const graphLive = reducedMotion || T > u.uGraphT.value + GRAPH_WAVE + D_GRAPH * 0.8;

    // a intro finita: via le scie (2 valutazioni del volo per vertice) e via
    // la coda del buffer (le scintille, ormai spente)
    const introOver = reducedMotion || T > u.uGraphT.value + GRAPH_WAVE + D_GRAPH + 0.2;
    if (streakRef.current) streakRef.current.visible = !introOver;
    b.pointsGeometry.setDrawRange(0, introOver ? b.ghostEnd : b.count);

    /* 3. i nodi in spazio schermo (40 proiezioni): servono a hover e click */
    const G = b.graph;
    if (graphLive) {
      const ns = rt.nodeScreen;
      const v = rt.tmp;
      for (let k = 0; k < G.nodeCount; k++) {
        const i = G.nodeParticle[k];
        v.set(
          G.positions[i * 3] + b.displace[i * 3],
          G.positions[i * 3 + 1] + b.displace[i * 3 + 1],
          G.positions[i * 3 + 2] + b.displace[i * 3 + 2],
        );
        v.applyMatrix4(group.matrixWorld).project(camera);
        ns[k * 2] = (v.x * 0.5 + 0.5) * W;
        ns[k * 2 + 1] = (0.5 - v.y * 0.5) * h;
      }
      rt.nodesValid = true;
    } else {
      rt.nodesValid = false;
    }

    /* 4. hover: il nodo più vicino al cursore, se lì sotto non c'è testo */
    let hover = -1;
    if (rt.nodesValid && rt.inside && !rt.touch) {
      const ns = rt.nodeScreen;
      let bestD = 20 * 20;
      for (let k = 0; k < G.nodeCount; k++) {
        const dx = ns[k * 2] - rt.pointerX;
        const dy = ns[k * 2 + 1] - rt.pointerY;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          hover = k;
        }
      }
      if (hover >= 0) {
        // elementFromPoint solo quando cambia qualcosa: niente layout per frame
        const key = `${hover}:${rt.pointerX >> 3}:${rt.pointerY >> 3}`;
        if (key !== rt.blockKey) {
          rt.blockKey = key;
          const hs = hotspotRef.current;
          const prev = hs?.style.pointerEvents;
          if (hs) hs.style.pointerEvents = "none";
          const under = document.elementFromPoint(rt.pointerX, rt.pointerY);
          if (hs) hs.style.pointerEvents = prev ?? "";
          rt.blocked = !!under?.closest?.(INTERACTIVE_TEXT);
        }
        if (rt.blocked) hover = -1;
      }
    }
    if (hover >= 0) rt.hover = hover;
    const hs = hotspotRef.current;
    if (hs) {
      if (hover >= 0) {
        hs.style.display = "block";
        hs.style.transform = `translate3d(${rt.nodeScreen[hover * 2]}px, ${rt.nodeScreen[hover * 2 + 1]}px, 0)`;
      } else if (hs.style.display !== "none") {
        hs.style.display = "none";
      }
    }
    const k7 = reducedMotion ? 1 : Math.min(1, dt * 9);
    rt.hoverAmt += ((hover >= 0 ? 1 : 0) - rt.hoverAmt) * k7;
    if (hover < 0 && rt.hoverAmt < 0.01) rt.hover = -1;
    u.uHover.value = rt.hover;
    u.uHoverAmt.value = rt.hoverAmt;

    /* 5. il nodo aperto: sboccia / si richiude */
    if (rt.open !== rt.openShown) {
      if (rt.openAmt <= 0.02 || rt.openShown < 0) {
        rt.openShown = rt.open;
        rt.openAmt = 0;
      }
    }
    const wantOpen = rt.open >= 0 && rt.open === rt.openShown ? 1 : 0;
    if (reducedMotion) rt.openAmt = wantOpen;
    else {
      const speed = wantOpen ? 2.6 : 4.2;
      rt.openAmt = Math.max(0, Math.min(1, rt.openAmt + (wantOpen ? 1 : -1) * dt * speed));
    }
    if (rt.openAmt <= 0 && !wantOpen) rt.openShown = rt.open;
    u.uOpen.value = rt.openShown;
    u.uOpenAmt.value = rt.openAmt;
    writeSatellites(b, rt, W, h, pxToWorld, locale);

    if (reducedMotion) return;

    /* 6. fisica del cursore — solo a rete formata, solo sulle sue particelle */
    if (!graphLive) return;
    let wantStrength = 0;
    if (rt.inside && W > 0) {
      const wx = (rt.pointerX - W / 2) * pxToWorld;
      const wy = (h / 2 - rt.pointerY) * pxToWorld;
      rt.mouseLocal.set(wx, wy, 0);
      group.worldToLocal(rt.mouseLocal);
      // sopra un nodo la repulsione quasi si spegne: il bersaglio non scappa
      wantStrength = hover >= 0 || rt.openAmt > 0.5 ? 0.18 : 1;
    }
    rt.strength += (wantStrength - rt.strength) * Math.min(1, dt * 7);

    if (rt.inside && rt.hasPrev && dt > 1e-4) {
      const k = Math.min(1, dt * 14);
      rt.dragX += ((rt.mouseLocal.x - rt.prevMouseLocal.x) / dt - rt.dragX) * k;
      rt.dragY += ((rt.mouseLocal.y - rt.prevMouseLocal.y) / dt - rt.dragY) * k;
      rt.dragZ += ((rt.mouseLocal.z - rt.prevMouseLocal.z) / dt - rt.dragZ) * k;
    } else {
      rt.dragX *= 0.9;
      rt.dragY *= 0.9;
      rt.dragZ *= 0.9;
    }
    rt.prevMouseLocal.copy(rt.mouseLocal);
    rt.hasPrev = rt.inside;

    rt.camLocal.copy(camera.position);
    group.worldToLocal(rt.camLocal);
    const cam = rt.camLocal;
    let dx = rt.mouseLocal.x - cam.x;
    let dy = rt.mouseLocal.y - cam.y;
    let dz = rt.mouseLocal.z - cam.z;
    const dlen = Math.hypot(dx, dy, dz) || 1;
    dx /= dlen;
    dy /= dlen;
    dz /= dlen;

    const invFit = 1 / Math.max(fit, 0.2);
    const repelR = REPEL_RADIUS * invFit;
    const maxDisp = MAX_DISP * invFit;
    const base = G.positions;
    const disp = b.displace;
    const vel = b.velocity;
    const en = b.energy;
    const count = b.G;
    const damp = Math.exp(-DAMPING * dt);
    const strength = rt.strength;
    const R2 = repelR * repelR;
    const dragGain = (rt.held ? DRAG_GAIN_HELD : DRAG_GAIN_IDLE) * strength;
    const energyScale = ENERGY_SCALE * fit;

    const look = G.look;
    for (let i = 0; i < count; i++) {
      // i NODI restano fermi: sono i bersagli del click, e un bersaglio che
      // scappa dal cursore non si può prendere. Si muovono fili e aloni.
      if (look[i * 2] > 0.75) continue;
      const i3 = i * 3;
      let ox = disp[i3];
      let oy = disp[i3 + 1];
      let oz = disp[i3 + 2];
      let vx = vel[i3];
      let vy = vel[i3 + 1];
      let vz = vel[i3 + 2];

      if (strength > 0.002) {
        const wx = base[i3] + ox - cam.x;
        const wy = base[i3 + 1] + oy - cam.y;
        const wz = base[i3 + 2] + oz - cam.z;
        const proj = wx * dx + wy * dy + wz * dz;
        if (proj > 0) {
          const cx = wx - proj * dx;
          const cy = wy - proj * dy;
          const cz = wz - proj * dz;
          const d2 = cx * cx + cy * cy + cz * cz;
          if (d2 < R2) {
            const dist = Math.sqrt(d2);
            const fall = 1 - dist / repelR;
            const fo = fall * fall * REPEL_FORCE * strength * dt;
            const inv = 1 / (dist + 1e-4);
            vx += cx * inv * fo;
            vy += cy * inv * fo;
            vz += cz * inv * fo;
            const g = fall * dragGain * dt * 9.0;
            vx += rt.dragX * g;
            vy += rt.dragY * g;
            vz += rt.dragZ * g;
          }
        }
      }

      vx = (vx - SPRING_K * ox * dt) * damp;
      vy = (vy - SPRING_K * oy * dt) * damp;
      vz = (vz - SPRING_K * oz * dt) * damp;
      ox += vx * dt;
      oy += vy * dt;
      oz += vz * dt;
      const mag = Math.hypot(ox, oy, oz);
      if (mag > maxDisp) {
        const k = maxDisp / mag;
        ox *= k;
        oy *= k;
        oz *= k;
      }
      disp[i3] = ox;
      disp[i3 + 1] = oy;
      disp[i3 + 2] = oz;
      vel[i3] = vx;
      vel[i3 + 1] = vy;
      vel[i3 + 2] = vz;
      en[i] = Math.min(1, mag * energyScale);
    }
    b.dispAttr.needsUpdate = true;
    b.energyAttr.needsUpdate = true;
  });

  return (
    <>
      <group ref={groupRef}>
        <lineSegments
          ref={streakRef}
          geometry={bundle.streakGeometry}
          material={bundle.streakMaterial}
          frustumCulled={false}
          dispose={null}
        />
        <lineSegments geometry={bundle.linesGeometry} material={bundle.linesMaterial} frustumCulled={false}
          dispose={null} />
        <points geometry={bundle.pointsGeometry} material={bundle.pointsMaterial} frustumCulled={false}
          dispose={null} />
      </group>
      <lineSegments geometry={bundle.sat.lineGeometry} material={bundle.sat.lineMaterial} frustumCulled={false}
          dispose={null} />
      <points geometry={bundle.sat.geometry} material={bundle.sat.material} frustumCulled={false}
          dispose={null} />
    </>
  );
}

/* --- i satelliti del nodo aperto, scritti in spazio mondo (z = 0) --- */
type SatRuntime = {
  openShown: number;
  openAmt: number;
  nodeScreen: Float32Array;
  nodesValid: boolean;
  clock: number;
};

function writeSatellites(
  b: FieldBundle,
  rt: SatRuntime,
  W: number,
  H: number,
  pxToWorld: number,
  locale: Locale,
) {
  const { pos, data, linePos, lineAlpha, geometry, lineGeometry } = b.sat;
  const amt = rt.openAmt;
  const k = rt.openShown;
  if (amt <= 0 || k < 0 || !rt.nodesValid) {
    if (data[2] !== 0 || data[data.length - 2] !== 0 || lineAlpha[0] !== 0) {
      data.fill(0);
      lineAlpha.fill(0);
      geometry.attributes.aSat.needsUpdate = true;
      lineGeometry.attributes.aAlpha.needsUpdate = true;
    }
    return;
  }
  const toW = (px: number, py: number, out: Float32Array, o: number) => {
    out[o] = (px - W / 2) * pxToWorld;
    out[o + 1] = (H / 2 - py) * pxToWorld;
    out[o + 2] = 0;
  };
  const nx = rt.nodeScreen[k * 2];
  const ny = rt.nodeScreen[k * 2 + 1];
  // il centro della rete: i satelliti sbocciano VERSO L'ESTERNO
  let cx = 0;
  let cy = 0;
  const n = rt.nodeScreen.length / 2;
  for (let i = 0; i < n; i++) {
    cx += rt.nodeScreen[i * 2];
    cy += rt.nodeScreen[i * 2 + 1];
  }
  cx /= n;
  cy /= n;
  let baseAng = Math.atan2(ny - cy, nx - cx);
  if (!Number.isFinite(baseAng)) baseAng = 0;

  const metrics = heroSceneCopy[locale]?.nodeMetrics ?? heroSceneCopy.it.nodeMetrics;
  const cell = 17;
  const adv = cell * GLYPH_FONT_RATIO * MONO_ADVANCE;
  let p = 0;
  const put = (px: number, py: number, glyph: number, sz: number, alpha: number, tone: number) => {
    if (p >= SAT_POINTS) return;
    toW(px, py, pos, p * 3);
    data[p * 4] = glyph;
    data[p * 4 + 1] = sz;
    data[p * 4 + 2] = alpha;
    data[p * 4 + 3] = tone;
    p++;
  };
  const text = (str: string, x0: number, y: number, reveal: number, alpha: number, tone: number, maxChars: number, alignRight: boolean) => {
    const chars = Array.from(str).slice(0, maxChars);
    const start = alignRight ? x0 - chars.length * adv : x0;
    chars.forEach((ch, j) => {
      const shown = reveal * (chars.length + 2) - j;
      if (ch === " " || shown <= 0) {
        put(0, 0, 0, 0, 0, 0);
        return;
      }
      // decifrazione: gli ultimi caratteri scritti sfarfallano ancora
      const g = shown < 1.6 ? 1 + Math.floor(Math.random() * CHAOS_COUNT) : glyphIndex(ch);
      put(start + j * adv + adv / 2, y, g, cell, alpha * Math.min(1, shown), tone);
    });
    for (let j = chars.length; j < maxChars; j++) put(0, 0, 0, 0, 0, 0);
  };

  const spread = 2.9;
  for (let s = 0; s < SAT_COUNT; s++) {
    const ps = Math.max(0, Math.min(1, amt * 1.5 - s * 0.1));
    const e = easeOutBack(ps);
    const ang = baseAng + (s / (SAT_COUNT - 1) - 0.5) * spread;
    const r = (72 + (s % 2) * 30) * e;
    // dentro il viewport (e sotto la nav), qualunque sia il nodo aperto
    const sx = Math.max(24, Math.min(W - 24, nx + Math.cos(ang) * r));
    const sy = Math.max(96, Math.min(H - 36, ny + Math.sin(ang) * r));
    put(sx, sy, DOT_GLYPH, 13, ps * 0.95, 0.85);
    const label = metrics[s % metrics.length].replace("{v}", metricValue(k, s, rt.clock));
    const labelW = Array.from(label).length * adv + 12;
    const right = (Math.cos(ang) >= -0.15 && sx + labelW < W - 8) || sx - labelW < 8;
    const vertical = Math.abs(Math.sin(ang)) > 0.78;
    if (vertical) {
      // satelliti in alto/in basso: etichetta centrata sopra/sotto il punto,
      // così due etichette vicine non si scontrano in orizzontale
      const lx = Math.max(8, Math.min(W - 8 - labelW, sx - (labelW - 12) / 2));
      text(label, lx, sy + (Math.sin(ang) < 0 ? -15 : 15), ps, 0.9 * ps, 0.55, SAT_CHARS, false);
    } else {
      text(label, right ? sx + 10 : sx - 10, sy, ps, 0.9 * ps, 0.55, SAT_CHARS, !right);
    }
    toW(nx, ny, linePos, s * 6);
    toW(sx, sy, linePos, s * 6 + 3);
    lineAlpha[s * 2] = 0.9 * ps;
    lineAlpha[s * 2 + 1] = 0.5 * ps;
  }
  // intestazione del nodo: id e strato
  const tag = b.graph.nodeTag?.[k] ?? `L${b.graph.nodeLayer[k] ?? 0}`;
  const header = `N·${String(k).padStart(2, "0")} ${tag}`;
  const up = Math.sin(baseAng) > 0.3 ? 1 : -1;
  const hw = Array.from(header).length * adv;
  const hx = Math.max(12, Math.min(W - 12 - hw, nx - hw / 2));
  const hy = Math.max(96, Math.min(H - 36, ny - up * 26));
  text(header, hx, hy, Math.min(1, amt * 1.3), 0.75 * amt, 0.3, SAT_HEADER, false);

  for (; p < SAT_POINTS; p++) data[p * 4 + 2] = 0;
  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.aSat.needsUpdate = true;
  lineGeometry.attributes.position.needsUpdate = true;
  lineGeometry.attributes.aAlpha.needsUpdate = true;
}

/**
 * Scroll: dissolvenza della scena e PAUSA del render loop quando l'hero esce
 * dal viewport (ART-DIRECTION §7): `frameloop` passa a "demand".
 */
function useHeroViewport(ref: React.RefObject<HTMLElement | null>) {
  const [state, setState] = useState({ opacity: 1, visible: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    // Due fatti distinti: "l'hero interseca il viewport" (IntersectionObserver)
    // e "la scheda è in primo piano". Prima erano un'unica variabile: nascondere
    // la scheda la metteva a false e, al ritorno, nessuno la rimetteva a true
    // (l'IO non riemette se l'intersezione non è cambiata) — la scena restava
    // spenta per sempre finché non si scrollava via e indietro.
    let intersecting = true;
    const update = () => {
      raf = 0;
      const h = window.innerHeight || 1;
      const progress = Math.min(Math.max(window.scrollY / h, 0), 1);
      setState({
        opacity: 1 - progress * progress,
        visible: intersecting && !document.hidden,
      });
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const io = new IntersectionObserver(
      (entries) => {
        intersecting = entries[0]?.isIntersecting ?? true;
        schedule();
      },
      { rootMargin: "120px" },
    );
    io.observe(el);
    // rAF non gira a scheda nascosta: aggiornare subito, senza schedule().
    const onVisibility = () => update();
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", onVisibility);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref]);

  return state;
}

const FLASH_CSS = `
.hf { position: absolute; left: 0; top: 0; width: 0; height: 0; pointer-events: none; }
.hf > span {
  position: absolute; left: 0; top: 0; border-radius: 50%;
  transform: translate(-50%, -50%) scale(0); opacity: 0;
  animation-delay: var(--hf-delay, 0s);
  animation-play-state: var(--hf-state, running);
  animation-fill-mode: both;
}
/* --- compressione: il nucleo si raccoglie, un'onda converge, attorno si
       abbassa appena la luce. Poi il nucleo cede all'esplosione (hf-core). --- */
.hf > .hf-pre, .hf > .hf-in, .hf > .hf-dim { animation-delay: var(--hf-pre-delay, 0s); }
.hf-pre {
  width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(223,255,248,.85) 0%, rgba(111,247,222,.42) 16%, rgba(63,233,204,.1) 42%, rgba(63,233,204,0) 68%);
}
.hf-in {
  width: 240px; height: 240px;
  border: 1px solid rgba(111,247,222,.5);
  box-shadow: 0 0 18px rgba(63,233,204,.28), inset 0 0 18px rgba(63,233,204,.2);
}
.hf-dim {
  width: 3200px; height: 3200px;
  background: radial-gradient(circle, rgba(3,7,10,0) 0%, rgba(3,7,10,0) 9%, rgba(3,7,10,.5) 32%, rgba(3,7,10,.5) 100%);
}
.hf-go .hf-pre { animation-name: hf-pre; animation-duration: var(--hf-pre-dur, .8s); animation-timing-function: cubic-bezier(.55,0,.9,.4); }
.hf-go .hf-in  { animation-name: hf-in;  animation-duration: var(--hf-pre-dur, .8s); animation-timing-function: cubic-bezier(.6,0,.9,.5); }
.hf-go .hf-dim { animation-name: hf-dim; animation-duration: 1.7s; animation-timing-function: ease-in-out; }
@keyframes hf-pre {
  0%   { opacity: 0;   transform: translate(-50%,-50%) scale(1.5); }
  35%  { opacity: .35; }
  93%  { opacity: .95; transform: translate(-50%,-50%) scale(.24); }
  /* il nucleo cede al lampo dell'esplosione (hf-core): non resta acceso */
  100% { opacity: 0;   transform: translate(-50%,-50%) scale(.2); }
}
@keyframes hf-in {
  0%   { opacity: 0;   transform: translate(-50%,-50%) scale(3.4); }
  30%  { opacity: .5; }
  100% { opacity: 0;   transform: translate(-50%,-50%) scale(.1); }
}
@keyframes hf-dim {
  0%   { opacity: 0; transform: translate(-50%,-50%); }
  46%  { opacity: .75; transform: translate(-50%,-50%); }
  58%  { opacity: .6; transform: translate(-50%,-50%); }
  100% { opacity: 0; transform: translate(-50%,-50%); }
}
.hf-core {
  width: 380px; height: 380px;
  background: radial-gradient(circle, rgba(223,255,248,.92) 0%, rgba(111,247,222,.5) 12%, rgba(63,233,204,.16) 36%, rgba(63,233,204,0) 66%);
}
.hf-ring {
  width: 220px; height: 220px;
  border: 1px solid rgba(168,255,238,.75);
  box-shadow: 0 0 26px 2px rgba(63,233,204,.4), inset 0 0 26px rgba(63,233,204,.3);
}
.hf-ring2 { width: 220px; height: 220px; border: 1px solid rgba(63,233,204,.4); }
.hf-wash {
  width: 1700px; height: 1700px;
  background: radial-gradient(circle, rgba(63,233,204,.13) 0%, rgba(10,47,63,.12) 36%, rgba(3,7,10,0) 68%);
}
.hf-go .hf-core  { animation-name: hf-core;  animation-duration: 1.1s; animation-timing-function: cubic-bezier(.16,1,.3,1); }
.hf-go .hf-ring  { animation-name: hf-ring;  animation-duration: 1.25s; animation-timing-function: cubic-bezier(.1,.9,.2,1); }
.hf-go .hf-ring2 { animation-name: hf-ring2; animation-duration: 1.6s; animation-timing-function: cubic-bezier(.1,.9,.2,1); }
.hf-go .hf-wash  { animation-name: hf-wash;  animation-duration: 2.2s; animation-timing-function: cubic-bezier(.2,.8,.2,1); }
@keyframes hf-core {
  0%   { opacity: 0; transform: translate(-50%,-50%) scale(.04); }
  9%   { opacity: 1; transform: translate(-50%,-50%) scale(.5); }
  100% { opacity: 0; transform: translate(-50%,-50%) scale(2.1); }
}
@keyframes hf-ring {
  0%   { opacity: .95; transform: translate(-50%,-50%) scale(.04); }
  100% { opacity: 0;   transform: translate(-50%,-50%) scale(8.5); }
}
@keyframes hf-ring2 {
  0%   { opacity: 0;   transform: translate(-50%,-50%) scale(.04); }
  12%  { opacity: .6; }
  100% { opacity: 0;   transform: translate(-50%,-50%) scale(12); }
}
@keyframes hf-wash {
  0%   { opacity: 0; transform: translate(-50%,-50%) scale(.25); }
  14%  { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%,-50%) scale(1.15); }
}
`;

export function Scene3D({
  reducedMotion,
  quality,
  anchorRef,
  contentRef,
  locale,
  onFormationComplete,
}: Scene3DProps) {
  const { opacity, visible } = useHeroViewport(anchorRef);
  const running = !reducedMotion && visible;
  const flashRef = useRef<HTMLDivElement>(null);
  const hotspotRef = useRef<HTMLDivElement>(null);
  const introRef = useRef({ start: -1 });
  const { canvasKey, onCreated } = useWebGLRecovery();
  // scena spenta (fuori campo o scheda nascosta): l'hotspot vive nel body, fuori
  // dal wrapper che si nasconde — va spento a mano, o resterebbe un bersaglio
  // invisibile sopra la pagina
  useEffect(() => {
    if (!visible && hotspotRef.current) hotspotRef.current.style.display = "none";
  }, [visible]);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // il portale esiste solo lato client e dopo il mount
    const id = requestAnimationFrame(() => setPortalHost(document.body));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        // Anche sotto reduced motion il canvas FISSO deve sparire con lo scroll:
        // altrimenti le strutture dati dell'hero restano dipinte sopra le
        // sezioni successive. La dissolvenza legata allo scroll non è "moto".
        opacity: visible ? opacity : 0,
        visibility: visible ? "visible" : "hidden",
        pointerEvents: "none",
        contain: "layout paint style",
        willChange: reducedMotion ? undefined : "opacity",
      }}
    >
      <style>{FLASH_CSS}</style>
      <div ref={flashRef} className="hf">
        <span className="hf-dim" />
        <span className="hf-pre" />
        <span className="hf-in" />
        <span className="hf-wash" />
        <span className="hf-core" />
        <span className="hf-ring" />
        <span className="hf-ring2" />
      </div>
      <Canvas
        key={canvasKey}
        onCreated={onCreated}
        camera={{ position: [0, 0, CAM_Z], fov: FOV }}
        dpr={[1, 1.5]}
        frameloop={running ? "always" : "demand"}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      >
        <GraphField
          reducedMotion={reducedMotion}
          quality={quality}
          anchorRef={anchorRef}
          contentRef={contentRef}
          locale={locale}
          onFormationComplete={onFormationComplete}
          introRef={introRef}
          flashRef={flashRef}
          hotspotRef={hotspotRef}
        />
      </Canvas>
      {portalHost &&
        createPortal(
          // L'unico elemento della scena che riceve il puntatore: compare SOLO
          // sopra un nodo libero (mai sopra il testo) e serve al cursore custom
          // per mostrare che lì si può cliccare. Il click lo gestisce window.
          <div
            ref={hotspotRef}
            aria-hidden="true"
            data-cursor=""
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              width: 52,
              height: 52,
              marginLeft: -26,
              marginTop: -26,
              borderRadius: "50%",
              zIndex: 30,
              display: "none",
              pointerEvents: "auto",
              cursor: "pointer",
              background: "transparent",
            }}
          />,
          portalHost,
        )}
    </div>
  );
}

export default Scene3D;
