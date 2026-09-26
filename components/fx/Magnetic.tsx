"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { spring } from "@/lib/animation/tokens";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

/**
 * Comportamento B — `magnetic` (ART-DIRECTION §5).
 *
 * L'elemento si sposta VERSO il cursore mentre ci passi sopra:
 * `(cursorX - centerX) * strength`, clampato a ±`max` px, applicato via molla
 * `spring.magnetic`. Al pointerleave torna a 0 con la stessa molla.
 *
 * Obbligatorio su bottoni, link di nav, dot indicator e frecce del carousel.
 *
 * Nota: `Magnetic` sposta SOLO il wrapper. Se serve anche il molleggio o lo
 * squash, usare <Tactile magnetic> che li compone tutti insieme.
 *
 *   <Magnetic strength={0.25} max={18}>
 *     <button className="...">Parliamone</button>
 *   </Magnetic>
 */
export interface MagneticProps {
  children: ReactNode;
  /** Frazione della distanza cursore-centro applicata come traslazione. Default .18 */
  strength?: number;
  /** Clamp in px sull'escursione massima. Default 14 */
  max?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Se true non fa nulla (utile per disattivarlo condizionalmente). */
  disabled?: boolean;
}

const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));

export function Magnetic({
  children,
  strength = 0.18,
  max = 14,
  className,
  style,
  disabled = false,
}: MagneticProps) {
  /* NON `useReducedMotion` di framer-motion: quello legge matchMedia già al
   PRIMO render del client, mentre l'HTML del server è sempre reso con
   reduced=false. Sotto prefers-reduced-motion ogni istanza divergeva
   dall'SSR e React buttava via e ri-renderizzava l'intero albero
   (hydration mismatch su tutta la pagina). `usePrefersReducedMotion`
   parte da false e si aggiorna in useEffect: l'idratazione combacia. */
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, spring.magnetic);
  const y = useSpring(rawY, spring.magnetic);

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      rawX.set(clamp((e.clientX - (r.left + r.width / 2)) * strength, max));
      rawY.set(clamp((e.clientY - (r.top + r.height / 2)) * strength, max));
    },
    [rawX, rawY, strength, max],
  );

  const reset = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
  }, [rawX, rawY]);

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
      style={{ ...style, x, y, display: style?.display ?? "inline-flex" }}
      onPointerMove={onMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      {children}
    </motion.div>
  );
}

export default Magnetic;
