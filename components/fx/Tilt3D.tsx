"use client";

import { useCallback, useRef, type ReactNode } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { spring } from "@/lib/animation/tokens";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

/**
 * Comportamento C — `tilt3d` (ART-DIRECTION §5). Va su TUTTE le card.
 *
 * `perspective: 1000px` sul contenitore;
 * `rotateY = (px - .5) * max`, `rotateX = -(py - .5) * max`
 * dalla posizione normalizzata del cursore dentro l'elemento.
 *
 * Il contenuto interno può essere spinto in avanti con `translateZ` per il
 * parallasse: basta mettere `style={{ transform: "translateZ(40px)" }}` su un
 * figlio — il wrapper espone già `transform-style: preserve-3d`.
 *
 * `glare` aggiunge un riflesso specular che segue il cursore (off di default:
 * accenderlo sulle card in vetro, non sui bottoni).
 *
 *   <Tilt3D className="glass-surface p-8" max={14} glare>
 *     <h3 style={{ transform: "translateZ(30px)" }}>Fintech</h3>
 *   </Tilt3D>
 */
export interface Tilt3DProps {
  children: ReactNode;
  /** Escursione massima in gradi su ciascun asse. Default 14 (ART-DIRECTION §5C). */
  max?: number;
  /** Prospettiva in px. Default 1000. */
  perspective?: number;
  /** Scala applicata durante l'hover. Default 1.02. */
  scale?: number;
  /** Riflesso specular che segue il cursore. Default false. */
  glare?: boolean;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export function Tilt3D({
  children,
  max = 14,
  perspective = 1000,
  scale = 1.02,
  glare = false,
  className,
  style,
  disabled = false,
}: Tilt3DProps) {
  /* NON `useReducedMotion` di framer-motion: quello legge matchMedia già al
   PRIMO render del client, mentre l'HTML del server è sempre reso con
   reduced=false. Sotto prefers-reduced-motion ogni istanza divergeva
   dall'SSR e React buttava via e ri-renderizzava l'intero albero
   (hydration mismatch su tutta la pagina). `usePrefersReducedMotion`
   parte da false e si aggiorna in useEffect: l'idratazione combacia. */
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // px / py normalizzati 0..1 dentro l'elemento
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const hover = useMotionValue(0);

  // v3 — "lentino, leggero e armonioso": metà escursione, molla lenta senza
  // overshoot. La card si volge verso il cursore, non vibra.
  const calmMax = max * 0.45;
  const calmScale = 1 + (scale - 1) * 0.5;
  const rx = useSpring(
    useTransform(py, [0, 1], [calmMax / 2, -calmMax / 2]),
    spring.drift,
  );
  const ry = useSpring(
    useTransform(px, [0, 1], [-calmMax / 2, calmMax / 2]),
    spring.drift,
  );
  const sc = useSpring(useTransform(hover, [0, 1], [1, calmScale]), spring.drift);

  const glareX = useTransform(px, (v) => `${(v * 100).toFixed(1)}%`);
  const glareY = useTransform(py, (v) => `${(v * 100).toFixed(1)}%`);
  const glareOpacity = useSpring(hover, spring.smooth);
  const glareBg = useMotionTemplate`radial-gradient(38% 46% at ${glareX} ${glareY}, rgba(223,255,248,0.22), rgba(223,255,248,0) 70%)`;

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

  if (reduced || disabled) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      onPointerMove={onMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
      style={{
        ...style,
        position: style?.position ?? "relative",
        transformPerspective: perspective,
        transformStyle: "preserve-3d",
        rotateX: rx,
        rotateY: ry,
        scale: sc,
      }}
    >
      {children}
      {glare ? (
        <motion.span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            pointerEvents: "none",
            opacity: glareOpacity,
            background: glareBg,
            mixBlendMode: "soft-light",
          }}
        />
      ) : null}
    </motion.div>
  );
}

export default Tilt3D;
