"use client";

import { useWebGLRecovery } from "@/lib/hooks/useWebGLRecovery";
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ParticleField, type ParticleFieldProps } from "./ParticleField";

/**
 * L1 — Shader di fondo (ART-DIRECTION §3) + campo particellare aqua.
 * Non importare questo file direttamente: usare `BackgroundShader.tsx`, che lo
 * carica con next/dynamic({ ssr:false }) e gestisce il fallback statico.
 *
 * I DUE effetti condividono UN SOLO canvas, quindi un solo contesto WebGL, un
 * solo layer di compositing e un solo rAF. Un secondo canvas a schermo intero
 * sarebbe costato un intero contesto e una seconda composizione full-screen per
 * frame, per tutta la sessione, su ogni schermata — inaccettabile accanto alle
 * ~2800 particelle dell'hero (ART-DIRECTION §7).
 *
 * Ordine di disegno: piano fluido (renderOrder 0) → particelle in additivo
 * (renderOrder 1). Entrambi con depthTest/depthWrite off.
 */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * Simplex noise 2D (Ashima / Stefan Gustavson, MIT) + fbm a 2 ottave.
 * Due campi di rumore che scorrono a velocità diverse (0.02 e 0.013) fanno
 * migrare macchie di --abyss e --aqua-900 sul --void. Costo: ~12 istruzioni
 * di noise per pixel, trascurabile anche su GPU integrata.
 */
const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform vec2  uResolution;
  uniform vec3  uVoid;
  uniform vec3  uAbyss;
  uniform vec3  uDeep;
  uniform vec3  uAqua;
  uniform float uOpacity;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                            + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                            dot(x12.zw, x12.zw)), 0.0);
    m = m * m; m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    v += 0.62 * snoise(p);
    v += 0.38 * snoise(p * 2.07 + 17.3);
    return v;
  }

  void main() {
    // aspect-correct, così le macchie non si stirano sugli schermi larghi
    vec2 uv = vUv;
    uv.x *= uResolution.x / max(uResolution.y, 1.0);

    float t = uTime;

    // due campi fluidi sfasati: il secondo fa da "domain warp" del primo
    vec2 warp = vec2(
      fbm(uv * 1.15 + vec2(t * 0.013, -t * 0.009)),
      fbm(uv * 1.15 + vec2(-t * 0.011, t * 0.016))
    );

    float n1 = fbm(uv * 0.85 + warp * 0.55 + vec2(t * 0.02, t * 0.012));
    float n2 = fbm(uv * 1.6  - warp * 0.4  + vec2(-t * 0.013, t * 0.018));

    float m1 = smoothstep(-0.25, 0.85, n1);
    float m2 = smoothstep(0.05, 0.95, n2);

    vec3 col = uVoid;
    col = mix(col, uDeep,  m1 * 0.85);
    col = mix(col, uAbyss, m2 * 0.55);

    // filamento aqua: solo nelle creste più alte, molto stretto → resta luce, non vernice
    float filament = smoothstep(0.72, 0.99, n1 * 0.6 + n2 * 0.55);
    col += uAqua * filament * 0.16;

    // vignettatura fredda: tiene lo sguardo al centro e nasconde i bordi del noise
    vec2 c = vUv - 0.5;
    float vig = 1.0 - smoothstep(0.32, 0.92, length(c) * 1.28);
    col *= mix(0.55, 1.0, vig);

    // RESPIRO — stesso periodo del campo particellare (≈16s), stessa fase.
    // Il cliente lamentava un fondo "troppo statico": il noise da solo si muove
    // ma non pulsa, e una deriva senza respiro si legge ancora come immobile.
    // ±7% di luminosità è sotto la soglia della coscienza ma il fondo "vive".
    float breath = 0.93 + 0.07 * sin(uTime * 0.39);
    col *= breath;

    gl_FragColor = vec4(col, uOpacity);
  }
`;

function FluidPlane({ opacity }: { opacity: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uVoid: { value: new THREE.Color("#03070A") },
      uAbyss: { value: new THREE.Color("#0A2F3F") },
      uDeep: { value: new THREE.Color("#071A24") },
      uAqua: { value: new THREE.Color("#3FE9CC") },
      uOpacity: { value: opacity },
    }),
    [opacity],
  );

  useFrame((state, delta) => {
    const m = mat.current;
    if (!m) return;
    // delta clampato: dopo un tab in background il tempo non fa un salto
    m.uniforms.uTime.value += Math.min(delta, 0.05);
    m.uniforms.uResolution.value.set(
      state.size.width,
      state.size.height,
    );
  });

  return (
    <mesh frustumCulled={false} renderOrder={0}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

export interface BackgroundShaderCanvasProps {
  opacity?: number;
  /**
   * Congela il rendering senza smontare il canvas (tab in background).
   * Smontarlo distruggerebbe il contesto WebGL e costringerebbe a ricompilare
   * gli shader e a ricaricare i buffer a ogni ritorno sulla scheda.
   */
  paused?: boolean;
  /** Props passate al campo particellare; `false` lo spegne del tutto. */
  particles?: ParticleFieldProps | false;
}

export function BackgroundShaderCanvas({
  opacity = 0.5,
  paused = false,
  particles,
}: BackgroundShaderCanvasProps) {
  const { canvasKey, onCreated } = useWebGLRecovery();
  return (
    <Canvas
      key={canvasKey}
      onCreated={onCreated}
      aria-hidden="true"
      dpr={[1, 1.5]}
      frameloop={paused ? "never" : "always"}
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      style={{ position: "absolute", inset: 0 }}
      // Entrambi gli effetti calcolano da sé la propria proiezione (il piano è
      // in clip-space, le particelle si proiettano in GLSL): la camera non è
      // usata da nessuno dei due, ma R3F ne vuole comunque una.
      orthographic
      camera={{ position: [0, 0, 1], near: 0, far: 2 }}
    >
      <FluidPlane opacity={opacity} />
      {particles === false ? null : <ParticleField {...particles} />}
    </Canvas>
  );
}

export default BackgroundShaderCanvas;
