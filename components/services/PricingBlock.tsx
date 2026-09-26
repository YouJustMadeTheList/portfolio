"use client";

import { useCallback, useRef, type ReactNode } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
  type useAnimationControls,
} from "framer-motion";
import { spring } from "@/lib/animation/tokens";
import { cn } from "@/lib/utils/cn";

/** framer-motion non esporta il tipo dei controls: lo si deriva dall'hook. */
export type FallControls = ReturnType<typeof useAnimationControls>;

/* ============================================================================
   06 SERVIZI — le card di pricing come parallelepipedi 3D
   ----------------------------------------------------------------------------
   Nota del cliente:

     «Anche qui, carino ma sarebbe bello trasformarli in parallelepipedi 3d con
      animazione di caduta quando clicci su lets talk prima della transizione.»

   Il blocco è una scatola CSS vera, non un'illusione a box-shadow:

     · UNA prospettiva sul contenitore (non trasformato), così il ribaltamento
       della caduta e il tilt del cursore vivono nello STESSO spazio 3D e le
       facce restano coerenti in entrambi;
     · faccia frontale = la superficie in vetro con il contenuto della card;
     · quattro facce laterali (sinistra, destra, sopra, sotto), profonde DEPTH,
       incernierate sui bordi della frontale e rivolte all'indietro (-z). Sono
       rientrate di CORNER px sui lati corti: senza il rientro spunterebbero
       fuori dagli angoli arrotondati della lastra;
     · una posa di riposo di pochi gradi (REST_X/REST_Y) + un'ombra di appoggio:
       il volume si vede DA FERMO e su touch, non solo quando c'è un cursore.
       Un solido perfettamente frontale è indistinguibile da un rettangolo.

   Luce che risponde al cursore: la posizione normalizzata del puntatore pilota
   sia le due rotazioni sia la `brightness` di ciascuna faccia (la faccia verso
   cui va il cursore si accende, quella opposta scende in ombra) più un riflesso
   specular sulla frontale. Tutto su molle `smooth`: due motion value per card,
   nessun lavoro per frame quando il cursore è altrove.

   §5.1 ART-DIRECTION — il tilt NON è vietato ("il divieto riguarda
   l'oscillazione... il tilt è agganciato alla posizione del cursore, continuo e
   reversibile"). Qui non c'è comunque NESSUNA keyframe di rotazione all'ingresso
   del cursore: il wobble che la card aveva da `Tactile` è stato tolto di
   proposito — faceva sobbalzare un solido (e con lui il bersaglio "Parliamone"
   che contiene) proprio mentre la risposta al cursore diventava volumetrica.
   La reazione non manca, è cambiata di natura: tilt + luce per faccia + riflesso.

   `prefers-reduced-motion`: scatola ferma. Resta la geometria (spessore, facce,
   luce fissa), spariscono tilt, riflesso e caduta.
   ========================================================================== */

/** Profondità del parallelepipedo, in px. Non è un dettaglio libero: la porzione
    di faccia laterale che si vede a un'inclinazione θ vale DEPTH·sin(θ), quindi
    con una lastra sottile non si vedrebbe NULLA a nessuna inclinazione ragionevole.
    38px è ciò che rende il blocco un blocco. */
const DEPTH = 38;
/** Rientro delle facce sui lati corti, per non spuntare dagli angoli tondi. */
const CORNER = 20;
/** Escursione del tilt attorno alla posa di riposo, in gradi (metà per lato). */
const TILT = 14;
/* Posa di RIPOSO: il blocco non è mai perfettamente frontale, perché un solido
   visto perfettamente di fronte è indistinguibile da un rettangolo. Inclinato di
   pochi gradi mostra due facce (sinistra e sopra) senza che il testo frontale
   perda leggibilità — è la posa di una fotografia di prodotto. Vale anche sotto
   reduced-motion: è geometria, non movimento. */
const REST_X = 4;
const REST_Y = -6;

/** Durata della caduta. Sta sul percorso critico verso una conversione: corta. */
export const FALL_MS = 560;

/**
 * La caduta: un ribaltamento vero attorno allo spigolo inferiore.
 *
 *  1. ~70ms di contro-movimento (il blocco si inclina appena in avanti): è
 *     l'anticipazione che rende leggibile il colpo;
 *  2. il ribaltamento all'indietro, con `easeIn` — accelera come sotto gravità,
 *     non a velocità costante. All'indietro e non verso chi guarda: ribaltando
 *     in avanti attorno allo spigolo basso, lo spigolo alto arriverebbe a metà
 *     strada dalla camera e la card raddoppierebbe di scala coprendo le vicine.
 *     Andando indietro rientra su sé stessa, e per tutta la caduta si vede la
 *     faccia SUPERIORE: è lì che il parallelepipedo dimostra di essere un solido;
 *  3. l'impatto: un rimbalzo corto e l'assestamento a terra.
 *
 * SOLO transform (ART-DIRECTION §7). In particolare NIENTE opacity sul blocco:
 * `opacity < 1` forza `transform-style` a `flat`, e a metà caduta le facce del
 * parallelepipedo collasserebbero di colpo sul piano della lastra.
 */
export function playFall(controls: FallControls) {
  return controls.start(
    {
      rotateX: [0, -5, 70, 79, 74],
      rotateZ: [0, 1, -2.4, -3.2, -2.8],
      y: [0, -4, 24, 36, 33],
    },
    {
      duration: FALL_MS / 1000,
      times: [0, 0.13, 0.76, 0.9, 1],
      ease: ["easeOut", "easeIn", "easeOut", "easeOut"],
    },
  );
}

/** Rimessa in piedi, a handoff avvenuto e sezione ormai fuori campo. */
export function resetFall(controls: FallControls) {
  return controls.start(
    { rotateX: 0, rotateZ: 0, y: 0 },
    { duration: 0.4, ease: "easeOut" },
  );
}

export type PricingBlockProps = {
  children: ReactNode;
  /** Controls del ribaltamento: la card madre orchestra caduta → handoff. */
  controls: FallControls;
  reducedMotion: boolean;
  /** Durante la caduta il blocco non è più un bersaglio. */
  inert?: boolean;
  /** Classi della faccia FRONTALE (la superficie in vetro). */
  faceClassName?: string;
  className?: string;
};

export function PricingBlock({
  children,
  controls,
  reducedMotion,
  inert = false,
  faceClassName,
  className,
}: PricingBlockProps) {
  const ref = useRef<HTMLDivElement>(null);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const hover = useMotionValue(0);

  const rotateX = useSpring(
    useTransform(py, [0, 1], [REST_X + TILT / 2, REST_X - TILT / 2]),
    spring.smooth,
  );
  const rotateY = useSpring(
    useTransform(px, [0, 1], [REST_Y - TILT / 2, REST_Y + TILT / 2]),
    spring.smooth,
  );

  /* Luce per faccia: la faccia dalla parte del cursore si accende. */
  const litRight = useSpring(useTransform(px, [0, 1], [0.6, 1.3]), spring.smooth);
  const litLeft = useSpring(useTransform(px, [0, 1], [1.3, 0.6]), spring.smooth);
  const litTop = useSpring(useTransform(py, [0, 1], [1.35, 0.7]), spring.smooth);
  const litBottom = useSpring(useTransform(py, [0, 1], [0.7, 1.25]), spring.smooth);

  const filterRight = useMotionTemplate`brightness(${litRight})`;
  const filterLeft = useMotionTemplate`brightness(${litLeft})`;
  const filterTop = useMotionTemplate`brightness(${litTop})`;
  const filterBottom = useMotionTemplate`brightness(${litBottom})`;

  const sheenX = useTransform(px, (v) => `${(v * 100).toFixed(1)}%`);
  const sheenY = useTransform(py, (v) => `${(v * 100).toFixed(1)}%`);
  const sheen = useMotionTemplate`radial-gradient(44% 54% at ${sheenX} ${sheenY}, rgba(223,255,248,0.18), rgba(223,255,248,0) 72%)`;
  const sheenOpacity = useSpring(hover, spring.smooth);

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      px.set((e.clientX - r.left) / Math.max(r.width, 1));
      py.set((e.clientY - r.top) / Math.max(r.height, 1));
      hover.set(1);
    },
    [px, py, hover],
  );

  const reset = useCallback(() => {
    px.set(0.5);
    py.set(0.5);
    hover.set(0);
  }, [px, py, hover]);

  /* Facce laterali. Geometria (origine sullo spigolo, rotazione di 90°) scelta
     perché ciascuna si estenda ALL'INDIETRO: il volume sta dietro alla lastra,
     mai davanti al contenuto. */
  const faceBase: React.CSSProperties = {
    position: "absolute",
    pointerEvents: "none",
    borderRadius: 2,
  };

  const faces = (
    <>
      <motion.span
        aria-hidden="true"
        style={{
          ...faceBase,
          top: CORNER,
          bottom: CORNER,
          left: "100%",
          width: DEPTH,
          transformOrigin: "0% 50%",
          transform: "rotateY(90deg)",
          background: "linear-gradient(90deg, #0C161C, #04090C)",
          boxShadow: "inset 1px 0 0 rgb(var(--aqua-rgb) / 0.22)",
          filter: reducedMotion ? "brightness(0.95)" : filterRight,
        }}
      />
      <motion.span
        aria-hidden="true"
        style={{
          ...faceBase,
          top: CORNER,
          bottom: CORNER,
          right: "100%",
          width: DEPTH,
          transformOrigin: "100% 50%",
          transform: "rotateY(-90deg)",
          background: "linear-gradient(270deg, #0C161C, #04090C)",
          boxShadow: "inset -1px 0 0 rgb(var(--aqua-rgb) / 0.22)",
          filter: reducedMotion ? "brightness(0.95)" : filterLeft,
        }}
      />
      <motion.span
        aria-hidden="true"
        style={{
          ...faceBase,
          left: CORNER,
          right: CORNER,
          top: 0,
          height: DEPTH,
          transformOrigin: "50% 0%",
          transform: "rotateX(-90deg)",
          background:
            "linear-gradient(180deg, rgb(var(--aqua-rgb) / 0.2), rgba(11,20,26,0.92))",
          boxShadow: "inset 0 1px 0 rgb(var(--aqua-rgb) / 0.3)",
          filter: reducedMotion ? "brightness(1)" : filterTop,
        }}
      />
      <motion.span
        aria-hidden="true"
        style={{
          ...faceBase,
          left: CORNER,
          right: CORNER,
          bottom: 0,
          height: DEPTH,
          transformOrigin: "50% 100%",
          transform: "rotateX(90deg)",
          background: "linear-gradient(180deg, #04090C, #0A1218)",
          boxShadow: "inset 0 -1px 0 rgb(var(--aqua-rgb) / 0.14)",
          filter: reducedMotion ? "brightness(0.85)" : filterBottom,
        }}
      />
    </>
  );

  const face = (
    <div
      className={cn("relative flex h-full flex-col", faceClassName)}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
      {reducedMotion ? null : (
        <motion.span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            pointerEvents: "none",
            background: sheen,
            opacity: sheenOpacity,
            mixBlendMode: "soft-light",
          }}
        />
      )}
    </div>
  );

  return (
    <div
      className={cn("h-full", className)}
      style={{
        position: "relative",
        perspective: 1200,
        pointerEvents: inert ? "none" : undefined,
      }}
    >
      {/* Ombra di appoggio: dice che il blocco STA IN PIEDI su un piano — è ciò
          che rende leggibile la caduta un istante dopo. Dietro a tutto. */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "10%",
          right: "10%",
          bottom: -12,
          height: 24,
          borderRadius: "50%",
          pointerEvents: "none",
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,0.8), rgba(0,0,0,0) 72%)",
          filter: "blur(7px)",
        }}
      />
      <motion.div
        animate={controls}
        style={{
          height: "100%",
          transformStyle: "preserve-3d",
          transformOrigin: "50% 100%",
        }}
      >
        <motion.div
          ref={ref}
          onPointerMove={reducedMotion ? undefined : onMove}
          onPointerLeave={reducedMotion ? undefined : reset}
          onPointerCancel={reducedMotion ? undefined : reset}
          style={{
            position: "relative",
            height: "100%",
            transformStyle: "preserve-3d",
            ...(reducedMotion
              ? { transform: `rotateX(${REST_X}deg) rotateY(${REST_Y}deg)` }
              : { rotateX, rotateY }),
          }}
        >
          {faces}
          {face}
        </motion.div>
      </motion.div>
    </div>
  );
}

export default PricingBlock;
