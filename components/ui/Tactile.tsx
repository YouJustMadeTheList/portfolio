"use client";

import { useCallback, useMemo, useRef, type MouseEventHandler, type ReactNode } from "react";
import { useIsMobileVariant } from "@/components/variant/VariantProvider";
import {
  motion,
  useAnimationControls,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  calmHover,
  spring,
  squashKeyframes,
  tactileDuration,
  tactileLimits,
  wobbleKeyframes,
} from "@/lib/animation/tokens";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

/* ============================================================================
   Tactile v2.1 — "molleggio, ma non su ciò che si clicca"
   ----------------------------------------------------------------------------
   ART-DIRECTION §5. Il difetto numero uno della v1 era `scale(1.03)` in hover:
   impercettibile. La v2 compone CINQUE comportamenti indipendenti:

   A — wobble   oscillazione SMORZATA all'ingresso del cursore (~600ms).
                rotate [0,-2.2,1.6,-0.9,0.4,0] + scale [1,1.045,.99,1.012,1].
                DEFAULT ON **solo sugli elementi DECORATIVI**.
   A′ — calm    risposta degli elementi CLICCABILI, al posto di A: sollevamento
                costante di ~3px + luminosità +8%. Nessuna rotazione, nessuna
                oscillazione: il bersaglio non si muove sotto il cursore.
                DEFAULT ON su tutto ciò che è interattivo.
   B — magnetic l'elemento si sposta verso il cursore: (cx-centerX)*.18,
                clamp ±14px, molla `magnetic`. Obbligatorio su bottoni, link di
                nav, dot indicator, frecce del carousel.
   C — tilt3d   perspective 1000px, rotateY=(px-.5)*14°, rotateX=-(py-.5)*14°.
                Per le CARD. Il contenuto interno può usare translateZ: il
                wrapper espone già transform-style: preserve-3d.
   D — squash   al tap: scaleX/scaleY SFASATI (schiaccia in orizzontale mentre
                si comprime in verticale). DEFAULT ON su tutto: avviene DOPO
                che il click è atterrato, quindi non può far mancare il colpo.

   ---------------------------------------------------------------------------
   INTERATTIVO vs DECORATIVO — deciso QUI DENTRO, nessun call site lo dichiara
   ---------------------------------------------------------------------------
   Un'istanza è INTERATTIVA se almeno una di queste è vera:
     · `as` è "button" o "a"
     · riceve una `onClick`
     · riceve un `href`
     · dichiara `role="button"` o `role="link"`
     · è annidata DENTRO un <a>/<button>/[role=button]/[role=link]
       (rilevato con `closest()` al primo pointerenter: un badge dentro una card
       cliccabile fa parte del bersaglio, quindi non deve tremolare nemmeno lui)
   Altrimenti è DECORATIVA.

     INTERATTIVA → A′ + (B se richiesta) + D      ← niente rotazione, mai
     DECORATIVA  → A  + (C se richiesta) + D      ← il molleggio resta

   `wobble` resta un prop di override esplicito per il caso raro in cui una
   sezione voglia davvero il molleggio su un cliccabile (o toglierlo da un
   decorativo). Se non viene passato, vince la derivazione qui sopra.

   I comportamenti usano canali di trasformazione disgiunti, quindi si
   compongono senza conflitti:
     wobble → rotate, scale        squash → scaleX, scaleY
     magnetic / calm-lift → x, y   tilt3d → rotateX, rotateY
     calm-glow → filter

   `prefers-reduced-motion` → elemento statico e piatto, esattamente come la v1.
   ========================================================================== */

type TactileIntensity = "subtle" | "default" | "playful";

/** Moltiplicatore di ampiezza per tutti e quattro i comportamenti. */
const AMPLITUDE: Record<TactileIntensity, number> = {
  // 0.7, non 0.55: a 0.55 il picco valeva ~1.025 di scala, cioè meno del
  // `scale(1.03)` che ART-DIRECTION §5 cita testualmente come "impercettibile"
  // nella v1. Gli elementi `subtle` sono le voci di nav, i chip e le metriche —
  // proprio quelli su cui il cliente lamentava che "non succede niente".
  // A 0.7 il picco è ~1.031 di scala e ~1.54° di rotazione: si vede, senza
  // rendere nervosa una pagina che ne ha decine.
  // v3: la revisione del cliente chiede un moto "lentino, leggero e armonioso".
  // L'ampiezza non cresce più oltre 1: "playful" è solo un filo più vivo.
  subtle: 0.75,
  default: 0.9,
  playful: 1.1,
};

/**
 * Il tilt dei "quadri" (card, box dell'elica, pannelli) era percepito come
 * tremolio. Tutti i tilt passano da qui a metà escursione e su una molla lenta
 * senza overshoot (`spring.drift`): la superficie si volge verso il cursore,
 * non vibra.
 */
const TILT_CALM = 0.5;

/** Oltre questa larghezza un elemento è un "quadro": niente rotazione, solo respiro. */
const LARGE_SURFACE_PX = 220;

const MOTION_TAGS = {
  div: motion.div,
  span: motion.span,
  a: motion.a,
  button: motion.button,
  li: motion.li,
  article: motion.article,
  section: motion.section,
  p: motion.p,
  label: motion.label,
  figure: motion.figure,
  header: motion.header,
  h3: motion.h3,
} as const;

type TagName = keyof typeof MOTION_TAGS;

export interface TactileProps {
  children?: ReactNode;
  /** Tag renderizzato. Default "div". */
  as?: TagName;
  /** Ampiezza globale dei comportamenti. Default "default". */
  intensity?: TactileIntensity;
  className?: string;
  /** Rende l'elemento statico (nessun comportamento) e, sui <button>, imposta l'attributo. */
  disabled?: boolean;
  onClick?: MouseEventHandler;
  href?: string;
  type?: "button" | "submit";
  style?: React.CSSProperties;
  target?: string;
  rel?: string;
  id?: string;
  title?: string;
  role?: string;
  tabIndex?: number;
  "aria-label"?: string;
  "aria-expanded"?: boolean;
  "aria-current"?: boolean | "page" | "step" | "location" | "date" | "time" | "true" | "false";
  "aria-pressed"?: boolean;
  "aria-hidden"?: boolean;
  "aria-describedby"?: string;
  "aria-controls"?: string;
  "data-cursor"?: "drag" | "text" | "none";

  /* ---- comportamenti v2 ---- */
  /**
   * A — oscillazione smorzata all'ingresso del cursore.
   *
   * DEFAULT DERIVATO, non più `true` fisso: `false` sugli elementi interattivi
   * (button/a/onClick/href/role/annidati in un cliccabile), `true` su tutti gli
   * altri. Passarlo esplicitamente forza il comportamento e scavalca la
   * derivazione — serve solo nei casi rari in cui una sezione vuole davvero il
   * molleggio su un cliccabile.
   */
  wobble?: boolean;
  /** B — attrazione verso il cursore durante l'hover. Default false. */
  magnetic?: boolean;
  /** C — tilt prospettico dalla posizione del cursore. Default false. Per le card. */
  tilt3d?: boolean;
  /** D — deformazione non uniforme al tap/click. Default true. */
  squash?: boolean;
  /** Override dell'escursione magnetica in px. Default 14. */
  magneticMax?: number;
  /** Override dell'escursione del tilt in gradi. Default 14. */
  tiltMax?: number;
  /**
   * Lift verticale costante durante l'hover, in px (0 = niente).
   *
   * DEFAULT DERIVATO: sugli elementi interattivi vale `calmHover.lift * amp`
   * (≈3px), che è metà della risposta calma A′; su tutti gli altri vale 0.
   * Passarlo esplicitamente (anche a 0) scavalca la derivazione.
   */
  lift?: number;
}

const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));

/** Selettore degli antenati che rendono il nodo parte di un bersaglio cliccabile. */
const CLICKABLE_ANCESTOR = 'a,button,[role="button"],[role="link"]';

export function Tactile({
  children,
  as = "div",
  intensity = "default",
  className,
  disabled = false,
  onClick,
  href,
  role,
  wobble,
  magnetic = false,
  tilt3d = false,
  squash = true,
  magneticMax = tactileLimits.magneticMax,
  tiltMax = tactileLimits.tiltMax,
  lift,
  style,
  ...rest
}: TactileProps) {
  /* NON `useReducedMotion` di framer-motion: quello legge matchMedia già al
   PRIMO render del client, mentre l'HTML del server è sempre reso con
   reduced=false. Sotto prefers-reduced-motion ogni istanza divergeva
   dall'SSR e React buttava via e ri-renderizzava l'intero albero
   (hydration mismatch su tutta la pagina). `usePrefersReducedMotion`
   parte da false e si aggiorna in useEffect: l'idratazione combacia. */
  const isMobileVariant = useIsMobileVariant();
  // Variante mobile: niente molle, tilt o magnetismo — su touch non c'è hover
  // e ogni molla è lavoro sul main thread durante lo scroll. Elemento statico.
  const reduced = usePrefersReducedMotion() || isMobileVariant;
  const controls = useAnimationControls();
  const ref = useRef<HTMLElement>(null);

  const amp = AMPLITUDE[intensity];

  /* ------------------------------------------------------------------
     "No tremolio su aree di click" — la derivazione.

     `selfInteractive` si decide dalle sole props, quindi è stabile fra
     server e client e non tocca il DOM. L'annidamento dentro un cliccabile
     (`nestedInteractiveRef`) si può sapere solo dal DOM: lo si misura una
     volta sola, al primo pointerenter, con un `closest()` — una chiamata per
     istanza per sessione, costo trascurabile, e comunque fuori dal render.
     ------------------------------------------------------------------ */
  const selfInteractive =
    as === "button" ||
    as === "a" ||
    onClick != null ||
    href != null ||
    role === "button" ||
    role === "link";

  /** Cache della risposta di `closest()`: null = non ancora misurata. */
  const nestedInteractiveRef = useRef<boolean | null>(null);
  /** true quando l'hover corrente ha acceso il glow calmo e va spento all'uscita. */
  const glowingRef = useRef(false);

  /**
   * Sollevamento effettivo. Il call site vince sempre; in mancanza, i cliccabili
   * per props ricevono il lift calmo (non i decorativi, e non chi ha chiesto
   * esplicitamente il wobble).
   */
  const effectiveLift =
    lift ?? (selfInteractive && wobble !== true ? calmHover.lift * amp : 0);

  /* --- B: magnetic (+ lift) --- */
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, spring.magnetic);
  const y = useSpring(rawY, spring.magnetic);

  /* --- C: tilt3d --- */
  const nx = useMotionValue(0.5);
  const ny = useMotionValue(0.5);
  const rotateX = useSpring(
    useTransform(ny, [0, 1], [(tiltMax * TILT_CALM) / 2, (-tiltMax * TILT_CALM) / 2]),
    spring.drift,
  );
  const rotateY = useSpring(
    useTransform(nx, [0, 1], [(-tiltMax * TILT_CALM) / 2, (tiltMax * TILT_CALM) / 2]),
    spring.drift,
  );

  /* --- A / D: keyframe burst --- */
  const wobbleFrames = useMemo(
    () => ({
      rotate: wobbleKeyframes.rotate.map((v) => v * amp),
      scale: wobbleKeyframes.scale.map((v) => 1 + (v - 1) * amp),
    }),
    [amp],
  );
  const squashFrames = useMemo(
    () => ({
      scaleX: squashKeyframes.scaleX.map((v) => 1 + (v - 1) * amp),
      scaleY: squashKeyframes.scaleY.map((v) => 1 + (v - 1) * amp),
    }),
    [amp],
  );

  const onPointerEnter = useCallback(() => {
    if (effectiveLift) rawY.set(-effectiveLift);

    /* Interattività "ereditata": misurata una volta sola e poi memorizzata. */
    if (nestedInteractiveRef.current === null) {
      nestedInteractiveRef.current = selfInteractive
        ? true
        : Boolean(ref.current?.closest(CLICKABLE_ANCESTOR));
    }
    const interactive = selfInteractive || nestedInteractiveRef.current;

    /* La regola: il wobble esplicito vince, altrimenti molleggia solo il decorativo. */
    if (wobble ?? !interactive) {
      /* Superfici grandi (e tutto ciò che ha già il tilt): ruotare un quadro,
         anche di mezzo grado, si legge come una vibrazione. Lì il molleggio
         diventa un respiro di scala e basta. */
      const w = ref.current?.offsetWidth ?? 0;
      const large = tilt3d || w > LARGE_SURFACE_PX;
      void controls.start(
        large ? { scale: [1, 1 + 0.008 * amp, 1] } : wobbleFrames,
        { duration: tactileDuration.wobble, ease: "easeInOut" },
      );
      return;
    }

    /* A′ — risposta calma: solo luce, nessuna rotazione e nessuna oscillazione. */
    glowingRef.current = true;
    void controls.start(
      { filter: `brightness(${calmHover.brightness})` },
      { duration: calmHover.duration, ease: "easeOut" },
    );
  }, [controls, wobble, wobbleFrames, effectiveLift, rawY, selfInteractive, tilt3d, amp]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!magnetic && !tilt3d) return;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (magnetic) {
        const f = tactileLimits.magneticStrength * amp;
        const m = magneticMax * amp;
        rawX.set(clamp((e.clientX - (r.left + r.width / 2)) * f, m));
        rawY.set(clamp((e.clientY - (r.top + r.height / 2)) * f, m) - effectiveLift);
      }
      if (tilt3d) {
        nx.set((e.clientX - r.left) / Math.max(r.width, 1));
        ny.set((e.clientY - r.top) / Math.max(r.height, 1));
      }
    },
    [magnetic, tilt3d, amp, magneticMax, rawX, rawY, nx, ny, effectiveLift],
  );

  const onPointerLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
    nx.set(0.5);
    ny.set(0.5);
    if (glowingRef.current) {
      glowingRef.current = false;
      void controls.start(
        { filter: "brightness(1)" },
        { duration: calmHover.duration, ease: "easeOut" },
      );
    }
  }, [rawX, rawY, nx, ny, controls]);

  const onPointerDown = useCallback(() => {
    if (!squash) return;
    void controls.start(squashFrames, {
      duration: tactileDuration.squash,
      ease: "easeInOut",
    });
  }, [controls, squash, squashFrames]);

  /* --- reduced motion / disabled → elemento statico e piatto (come la v1) --- */
  if (reduced || disabled) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Plain = as as any;
    return (
      <Plain
        className={className}
        style={style}
        onClick={disabled ? undefined : onClick}
        href={href}
        role={role}
        {...(as === "button" && disabled ? { disabled: true } : null)}
        {...rest}
      >
        {children}
      </Plain>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MotionTag = (MOTION_TAGS[as] ?? motion.div) as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const motionStyle: any = {
    ...style,
    ...(magnetic || effectiveLift ? { x, y } : null),
    ...(tilt3d
      ? {
          transformPerspective: tactileLimits.tiltPerspective,
          transformStyle: "preserve-3d",
          rotateX,
          rotateY,
        }
      : null),
  };

  return (
    <MotionTag
      ref={ref}
      className={className}
      onClick={onClick}
      href={href}
      role={role}
      style={motionStyle}
      animate={controls}
      onPointerEnter={onPointerEnter}
      onPointerMove={magnetic || tilt3d ? onPointerMove : undefined}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onPointerCancel={onPointerLeave}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

export default Tactile;
