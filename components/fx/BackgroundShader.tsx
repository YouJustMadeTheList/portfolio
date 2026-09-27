"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

import { StaticFallback } from "./BackgroundStatic";
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
 * Montarlo UNA VOLTA in app/[locale]/d|m/layout.tsx, prima di <main>.
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
