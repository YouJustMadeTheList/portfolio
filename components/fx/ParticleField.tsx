"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { colors } from "@/lib/animation/tokens";

/* ============================================================================
   Campo particellare verde acqua — il "respiro" del fondo
   ----------------------------------------------------------------------------
   Nota del cliente: «un problema di fondo del sito è il background troppo
   statico. L'effetto visivo potrebbe trarre beneficio da qualcosa di più
   dinamico (anche un effetto particellare verde acqua) nello sfondo.»

   Questo NON è un secondo canvas: è un nodo di scena che vive DENTRO il canvas
   di BackgroundShaderCanvas, disegnato dopo il piano fluido e in additivo.
   Un solo contesto WebGL, un solo layer di compositing, un solo rAF per tutto
   il fondo del sito — che è la ragione per cui può stare acceso su ogni
   schermata senza rubare frame all'hero (ART-DIRECTION §7: l'hero è la stella).

   Divisione del lavoro — il punto dell'intero file:
   · CPU per frame → DUE uniform (uTime, uPointer lerpato). Nessun loop sulle
     particelle, nessuna scrittura di BufferAttribute, nessun upload GPU.
     Costo misurabile: sotto i 0.02 ms, cioè rumore di fondo del profiler.
   · GPU (vertex) → TUTTO il moto: deriva verticale ciclica, sway laterale,
     parallasse in profondità dal puntatore, spinta gentile lontano dal cursore,
     respiro globale. Il campo è quindi completamente stateless: niente stato
     per-particella da mantenere (al contrario dell'hero, che ha una fisica a
     molla e lo stato della velocità — lì la CPU serve, qui no).

   Profondità VERA, non uno starfield 2D: ogni particella ha una distanza `z`
   propria in [uNear, uFar]; la posizione X/Y è espressa in unità normalizzate e
   riproiettata nel piano di QUELLA distanza, così la densità a schermo resta
   uniforme a ogni aspect ratio e il parallasse è geometrico, non simulato.

   Budget: `count` particelle = `count` vertici, 1 draw call, sprite piccoli
   (≤9px) in additivo. Il fill rate è una frazione di quello del piano fluido a
   schermo intero che sta sotto, quindi il costo incrementale del campo è
   dominato dal vertex shader: ~30 ALU × 700 vertici per frame.
   ========================================================================== */

/** Quanto lontano si spinge il campo, in unità di scena (camera nell'origine). */
const NEAR_Z = 2.2;
const FAR_Z = 17.0;

/** Semi-apertura verticale della proiezione usata per riproiettare le particelle. */
const FOV_HALF = (34 * Math.PI) / 180;

/** Margine oltre il bordo dello schermo: nessun "vuoto" agli angoli in wrap. */
const OVERSCAN = 1.14;

/** Seme del campo: la distribuzione è identica a ogni caricamento e a ogni build. */
const FIELD_SEED = 0x3fe9cc;

/**
 * mulberry32 — PRNG deterministico da un solo intero.
 *
 * Non è una preferenza stilistica su `Math.random`: la generazione avviene in
 * fase di render (dentro un useMemo) e `Math.random` è una funzione impura, che
 * React 19 segnala e che produrrebbe un campo diverso a ogni rimontaggio. Con
 * un seme fisso la nuvola è sempre la stessa, quindi riproducibile e ispezionabile.
 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VERTEX_SHADER = /* glsl */ `
  // L'attributo 'position' NON è una posizione: è la cella normalizzata.
  //   position.xy ∈ [-1,1]  → posizione nel piano della sua profondità
  //   position.z  ∈ [0,1]   → frazione di profondità fra uNear e uFar
  attribute float aSeed;   // 0..1, decorrela fase, velocità e scintillio
  attribute float aSize;   // 0.55..1.7, dispersione delle dimensioni
  attribute float aTint;   // 0..1, posizione nella rampa aqua

  uniform float uTime;
  uniform float uAspect;
  uniform vec2  uPointer;     // -1..1, già lerpato sulla CPU
  uniform float uPointScale;  // world→px per la dimensione dei punti
  uniform float uOpacity;
  uniform float uParallax;    // ampiezza del parallasse, in frazioni di viewport
  uniform float uPush;        // spinta lontano dal cursore, in unità di scena
  uniform float uNear;
  uniform float uFar;
  uniform float uFovHalf;
  uniform float uOverscan;

  varying float vAlpha;
  varying float vTint;

  const float TAU = 6.2831853;

  void main() {
    /* --- profondità: fissa, è l'identità della particella --- */
    float depth01 = position.z;                    // 0 = vicina, 1 = lontana
    float z = mix(uNear, uFar, depth01);
    float near01 = 1.0 - depth01;                  // 1 = vicina

    /* --- mezza estensione del piano a QUESTA distanza --- */
    float halfH = tan(uFovHalf) * z * uOverscan;
    float halfW = halfH * uAspect;

    /* --- deriva verticale ciclica: le vicine salgono più in fretta (parallasse
           di movimento, non solo di posizione) --- */
    float speed = mix(0.010, 0.030, aSeed) * mix(0.55, 1.0, near01);
    float ny = fract((position.y * 0.5 + 0.5) + uTime * speed) * 2.0 - 1.0;

    /* --- sway laterale lentissimo, sfasato per particella --- */
    float nx = position.x + sin(uTime * 0.085 + aSeed * TAU) * 0.055;

    vec2 p = vec2(nx * halfW, ny * halfH);

    /* --- parallasse dal puntatore: le vicine scorrono di più --- */
    p += uPointer * vec2(halfW, halfH) * uParallax * (0.18 + near01 * 0.82);

    /* --- influenza del cursore: una spinta morbida e locale, non un vortice.
           Gaussiana su una distanza normalizzata al piano, così il raggio
           d'azione resta lo stesso a schermo a ogni profondità. --- */
    vec2 pw = uPointer * vec2(halfW, halfH);
    vec2 d = p - pw;
    vec2 dn = d / vec2(halfW, halfH);
    float r2 = dot(dn, dn);
    float infl = exp(-r2 * 13.0);
    p += normalize(d + vec2(1e-4)) * infl * uPush * near01;

    /* --- proiezione fatta a mano, NON con projectionMatrix.
           La prospettiva è già tutta dentro halfW/halfH (che scalano con z):
           la divisione qui sotto è esattamente la proiezione prospettica di una
           camera con questo fov. Farla a mano rende il campo indipendente dalla
           camera del Canvas ospite — che è ortografica, perché serve al piano
           fluido — e toglie di mezzo ogni sorpresa su lookAt e near/far. --- */
    float pw2 = tan(uFovHalf) * z;
    gl_Position = vec4(p.x / (pw2 * uAspect), p.y / pw2, 0.0, 1.0);

    /* --- respiro globale: ~16s di periodo, sotto la soglia della coscienza --- */
    float breath = 0.80 + 0.20 * sin(uTime * 0.39);

    /* --- dimensione: attenuazione prospettica reale (1/z) --- */
    gl_PointSize = clamp(aSize * uPointScale / z * (0.94 + breath * 0.06), 0.7, 11.0);

    /* --- alpha: lontane più fioche, scintillio lento, dissolvenza sulla
           cucitura del wrap (nessun "pop" quando la particella rientra) --- */
    float twinkle = 0.70 + 0.30 * sin(uTime * (0.22 + aSeed * 0.34) + aSeed * TAU * 3.0);
    float seam = 1.0 - smoothstep(0.78, 1.0, abs(ny));
    vAlpha = uOpacity * mix(0.16, 1.0, near01) * twinkle * breath * seam;
    vTint = aTint;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  // niente override di precisione qui: three antepone già un highp float
  // a ENTRAMBI gli shader, e in GLSL ES 1.00 le varying devono combaciare anche
  // nel qualificatore di precisione — un mediump solo di qua fa fallire il link
  // sui driver severi.
  uniform vec3 uAquaFar;
  uniform vec3 uAquaMid;
  uniform vec3 uAquaNear;

  varying float vAlpha;
  varying float vTint;

  void main() {
    // sprite tondo morbido, generato: zero texture, zero fetch
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);                       // niente sqrt: basta il quadrato
    float a = smoothstep(0.25, 0.005, d);
    if (a <= 0.003) discard;

    vec3 col = vTint < 0.5
      ? mix(uAquaFar, uAquaMid, vTint * 2.0)
      : mix(uAquaMid, uAquaNear, (vTint - 0.5) * 2.0);

    gl_FragColor = vec4(col, a * vAlpha);
  }
`;

/** Valori di riposo: usati sia come default delle props sia come init degli uniform. */
const DEFAULTS = {
  opacity: 0.55,
  parallax: 0.045,
  push: 0.24,
} as const;

export interface ParticleFieldProps {
  /** Numero di particelle. Default derivato dal dispositivo (420 / 700 / 900). */
  count?: number;
  /** Opacità complessiva del campo. Default 0.55 — deve restare ambientale. */
  opacity?: number;
  /** Ampiezza del parallasse legato al puntatore, in frazioni di viewport. Default 0.045. */
  parallax?: number;
  /** Spinta massima lontano dal cursore, in unità di scena. Default 0.24 — deve restare un accenno. */
  push?: number;
}

/**
 * Sceglie il numero di particelle una volta sola, al mount.
 *
 * Non è una "detection" del dispositivo: è un budget. Su uno schermo piccolo o
 * su una macchina con pochi core il campo è comunque percepito, e togliere
 * metà dei vertici è l'unica leva che non peggiora l'estetica.
 */
function defaultCount(): number {
  if (typeof window === "undefined") return 700;
  const cores = navigator.hardwareConcurrency ?? 8;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mem = (navigator as any).deviceMemory as number | undefined;
  const small = window.innerWidth < 768;
  if (small || cores <= 4 || (mem != null && mem <= 4)) return 420;
  if (window.innerWidth > 1600 && cores >= 8) return 900;
  return 700;
}

export function ParticleField({
  count,
  opacity = DEFAULTS.opacity,
  parallax = DEFAULTS.parallax,
  push = DEFAULTS.push,
}: ParticleFieldProps) {
  const { size, gl } = useThree();
  const matRef = useRef<THREE.ShaderMaterial>(null);

  /* Il conteggio si fissa al primo render: un `count` che cambia a ogni resize
     ricostruirebbe la geometria e farebbe sfarfallare il campo. */
  const resolvedCount = useMemo(() => count ?? defaultCount(), [count]);

  /* --- geometria: generata una volta, mai più toccata --- */
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const cell = new Float32Array(resolvedCount * 3);
    const seed = new Float32Array(resolvedCount);
    const psize = new Float32Array(resolvedCount);
    const tint = new Float32Array(resolvedCount);

    const rand = mulberry32(FIELD_SEED);
    for (let i = 0; i < resolvedCount; i++) {
      cell[i * 3] = rand() * 2 - 1;
      cell[i * 3 + 1] = rand() * 2 - 1;
      // ^0.72: un filo più dense sul davanti, così la profondità si legge
      cell[i * 3 + 2] = Math.pow(rand(), 0.72);
      seed[i] = rand();
      psize[i] = 0.55 + rand() * 1.15;
      tint[i] = rand();
    }

    g.setAttribute("position", new THREE.BufferAttribute(cell, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(psize, 1));
    g.setAttribute("aTint", new THREE.BufferAttribute(tint, 1));
    // `position` è una cella normalizzata, non una posizione: il bounding
    // sphere calcolato da three non descrive nulla di reale → culling off.
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    return g;
  }, [resolvedCount]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  /* Gli uniform si CREANO qui (valore di default, nessuna prop letta: così le
     deps del memo sono onestamente vuote) e si MODIFICANO solo attraverso
     `matRef.current.uniforms`, mai attraverso questo oggetto memoizzato. Un
     valore memoizzato va trattato come immutabile; l'oggetto vivo che la GPU
     legge è quello appeso al materiale, ed è raggiungibile da una ref. */
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uPointScale: { value: 16 },
      uOpacity: { value: DEFAULTS.opacity },
      uParallax: { value: DEFAULTS.parallax },
      uPush: { value: DEFAULTS.push },
      uNear: { value: NEAR_Z },
      uFar: { value: FAR_Z },
      uFovHalf: { value: FOV_HALF },
      uOverscan: { value: OVERSCAN },
      /* Rampa cromatica. I colori restano CHIARI anche in fondo: la profondità
         si legge dall'alpha e dalla dimensione, non da un colore spento. Nota:
         come tutto il WebGL del sito (hero compreso), `new THREE.Color(hex)`
         converte sRGB→lineare e lo shader scrive senza riconvertire — quindi i
         valori resi sono più scuri del token. La rampa è tarata su questo, non
         "corretta" a metà: cambiarla qui e non nell'hero spaccherebbe l'unità. */
      uAquaFar: { value: new THREE.Color(colors.aqua500) },
      uAquaMid: { value: new THREE.Color(colors.aqua300) },
      uAquaNear: { value: new THREE.Color(colors.aqua100) },
    }),
    [],
  );

  useEffect(() => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uOpacity.value = opacity;
    m.uniforms.uParallax.value = parallax;
    m.uniforms.uPush.value = push;
  }, [opacity, parallax, push]);

  /* --- puntatore: un listener passivo sul window, nessun lavoro per frame --- */
  const target = useRef(new THREE.Vector2(0, 0));
  useEffect(() => {
    // su touch non esiste un puntatore che stazioni: il campo resta al centro
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      target.current.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1),
      );
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  /* --- aspect e scala dei punti: solo al resize, non per frame --- */
  useEffect(() => {
    const m = matRef.current;
    if (!m) return;
    const dpr = gl.getPixelRatio();
    m.uniforms.uAspect.value = size.width / Math.max(size.height, 1);
    // world→px alla distanza 1: metà altezza viewport / tan(fovHalf).
    // Diviso poi per z nel vertex shader → attenuazione prospettica esatta.
    m.uniforms.uPointScale.value =
      ((size.height * dpr) / (2 * Math.tan(FOV_HALF))) * 0.02;
  }, [size.width, size.height, gl]);

  useFrame((_state, delta) => {
    const m = matRef.current;
    if (!m) return;
    // delta clampato: al rientro da un tab in background il tempo non salta
    const dt = Math.min(delta, 0.05);
    m.uniforms.uTime.value += dt;
    // lerp del puntatore: il campo insegue il cursore con ritardo, mai a scatti
    const p = m.uniforms.uPointer.value as THREE.Vector2;
    p.x += (target.current.x - p.x) * Math.min(1, dt * 2.6);
    p.y += (target.current.y - p.y) * Math.min(1, dt * 2.6);
  });

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={1}>
      <shaderMaterial
        ref={matRef}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default ParticleField;
