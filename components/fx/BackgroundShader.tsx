"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

import type { ParticleFieldProps } from "./ParticleField";

/**
 * L1 — Fondo globale (ART-DIRECTION §3 e §5-bis, z-index -2).
 *
 * UN SOLO canvas WebGL fisso a tutta pagina che porta DUE effetti:
 *
 * 1. il piano fluido: simplex noise a 2 ottave, macchie di --abyss / --deep /
 *    --aqua-900 che scorrono lentissime (≈0.02) sul --void, più un respiro
 *    globale di ±7% con periodo ≈16s;
 * 2. il campo particellare verde acqua: ~420-900 punti GPU in additivo, con
 *    profondità reale, deriva continua, parallasse e influenza del cursore
 *    (vedi ParticleField.tsx).
 *
 * Insieme rispondono alla nota del cliente sul «background troppo statico»
 * restando ambientali: il fondo non deve mai competere col contenuto né col
 * sistema particellare dell'hero, che resta la stella della pagina.
 *
 * - `dpr={[1, 1.5]}`, mai 2.
 * - Caricato con next/dynamic({ ssr:false }): zero impatto sul primo paint.
 * - Fallback statico a gradiente CSS (gradienti + campo di punti FERMO) su:
 *   SSR, no-WebGL, prefers-reduced-motion.
 * - `frameloop:'never'` quando la scheda è nascosta: il canvas resta montato,
 *   così tornare sulla scheda non ricompila shader né ricarica buffer.
 *
 * Montarlo UNA VOLTA in app/[locale]/layout.tsx, prima di <main>.
 */

const Canvas = dynamic(
  () => import("./BackgroundShaderCanvas").then((m) => m.BackgroundShaderCanvas),
  { ssr: false, loading: () => null },
);

/**
 * Fallback statico: stesso schema cromatico, zero costo, mai nero piatto.
 *
 * Sotto `prefers-reduced-motion` è ANCHE il sostituto del campo particellare:
 * un campo di punti aqua vero ma completamente FERMO, ottenuto con due
 * `radial-gradient` ripetuti su passi diversi (due "profondità": punti piccoli
 * e fiochi, punti più grandi e vicini). Nessuna animazione, nessun canvas.
 */
function StaticFallback() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.5,
          backgroundImage: [
            "radial-gradient(60% 50% at 18% 14%, rgba(10,47,63,0.9), rgba(10,47,63,0) 70%)",
            "radial-gradient(55% 45% at 84% 62%, rgba(6,55,48,0.75), rgba(6,55,48,0) 70%)",
            "radial-gradient(45% 40% at 52% 96%, rgba(7,26,36,0.9), rgba(7,26,36,0) 70%)",
          ].join(","),
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.4,
          backgroundImage: [
            "radial-gradient(1.5px 1.5px at 23px 31px, rgba(111,247,222,0.55), rgba(111,247,222,0) 60%)",
            "radial-gradient(1px 1px at 97px 73px, rgba(63,233,204,0.4), rgba(63,233,204,0) 60%)",
            "radial-gradient(2px 2px at 151px 19px, rgba(168,255,238,0.35), rgba(168,255,238,0) 60%)",
            "radial-gradient(1px 1px at 61px 137px, rgba(63,233,204,0.3), rgba(63,233,204,0) 60%)",
          ].join(","),
          backgroundSize: "181px 173px, 149px 211px, 233px 257px, 127px 163px",
        }}
      />
    </div>
  );
}

function detectWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export interface BackgroundShaderProps {
  /** Opacità del piano fluido. Default 0.5. */
  opacity?: number;
  /** Props del campo particellare; `false` lo spegne (resta il solo piano fluido). */
  particles?: ParticleFieldProps | false;
}

export function BackgroundShader({ opacity = 0.5, particles }: BackgroundShaderProps) {
  const reduced = usePrefersReducedMotion();
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // sondaggio WebGL rimandato di un frame: non blocca il primo paint e non
    // innesca un render a cascata dentro il corpo dell'effetto
    const probe = window.requestAnimationFrame(() => setWebgl(detectWebGL()));
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.cancelAnimationFrame(probe);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  /* `visible` NON entra qui: il canvas resta montato a scheda nascosta e si
     limita a fermare il frameloop. Smontarlo distruggeva il contesto WebGL a
     ogni cambio di scheda — con il campo particellare in scena significa
     ricompilare due shader e ricaricare i buffer, un gruppo di frame persi
     proprio nell'istante in cui l'utente torna a guardare la pagina. */
  const live = webgl === true && !reduced;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-shader)",
        pointerEvents: "none",
        // niente `strict`: includerebbe size containment e collasserebbe il box
        contain: "layout paint style",
      }}
    >
      {live ? (
        <Canvas opacity={opacity} paused={!visible} particles={particles} />
      ) : (
        <StaticFallback />
      )}
    </div>
  );
}

export default BackgroundShader;
