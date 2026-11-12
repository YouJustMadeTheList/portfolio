"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

import { StaticFallback } from "./BackgroundStatic";
import { hasRichWebGLAsync } from "@/lib/gfx/gpu";
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
 *   SSR, no-WebGL, WebGL solo software (lib/gfx/gpu.ts), prefers-reduced-motion.
 * - `frameloop:'never'` quando la scheda è nascosta: il canvas resta montato,
 *   così tornare sulla scheda non ricompila shader né ricarica buffer.
 *
 * Montarlo UNA VOLTA in app/[locale]/d|m/layout.tsx, prima di <main>.
 */

const Canvas = dynamic(
  () => import("./BackgroundShaderCanvas").then((m) => m.BackgroundShaderCanvas),
  { ssr: false, loading: () => null },
);

/** Quanto aspettare l'apertura dell'hero (la rete si forma in ~5s) prima di avviare il fondo animato. */
const HERO_INTRO_MS = 4500;

/**
 * Fallback statico: stesso schema cromatico, zero costo, mai nero piatto.
 *
 * Sotto `prefers-reduced-motion` è ANCHE il sostituto del campo particellare:
 * un campo di punti aqua vero ma completamente FERMO, ottenuto con due
 * `radial-gradient` ripetuti su passi diversi (due "profondità": punti piccoli
 * e fiochi, punti più grandi e vicini). Nessuna animazione, nessun canvas.
 */
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
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    // Sonda e canvas partono DOPO l'apertura dell'hero, quando c'è: l'hero
    // compila il suo shader e anima il titolo nei primi secondi, e un secondo
    // contesto WebGL a tutto schermo che compila nello stesso momento porta i
    // primi frame a scattare. Il fondo statico c'è da subito; il campo
    // animato arriva a rete già formata. Senza hero (pagine di testo) parte
    // subito, come prima.
    let alive = true;
    let probe = 0;
    let idle = 0;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const run = () => {
      probe = window.requestAnimationFrame(() => {
        hasRichWebGLAsync().then((ok) => {
          if (alive) setWebgl(ok);
        });
      });
    };
    const hasHero = !!document.getElementById("hero");
    const startId = window.setTimeout(
      () => {
        if (!alive) return;
        if (w.requestIdleCallback) idle = w.requestIdleCallback(run, { timeout: 1500 });
        else run();
      },
      hasHero ? HERO_INTRO_MS : 0,
    );
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      window.clearTimeout(startId);
      if (idle && w.cancelIdleCallback) w.cancelIdleCallback(idle);
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

  // il fondo statico resta sotto finché il canvas non è sfumato del tutto:
  // nessun istante senza punti, anche se il canvas compare a hero avviata.
  useEffect(() => {
    if (!live) return;
    const t = window.setTimeout(() => setSettled(true), 1400);
    return () => window.clearTimeout(t);
  }, [live]);

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
      {(!live || !settled) && <StaticFallback />}
      {live && (
        <div style={{ position: "absolute", inset: 0, animation: "bg-canvas-in 1.2s ease-out both" }}>
          <style>{`@keyframes bg-canvas-in{from{opacity:0}to{opacity:1}}`}</style>
          <Canvas opacity={opacity} paused={!visible} particles={particles} />
        </div>
      )}
    </div>
  );
}

export default BackgroundShader;
