"use client";

import type { ReactNode } from "react";
import { useInViewport } from "@/lib/hooks/useInViewport";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils/cn";

/**
 * Reveal generico per paragrafi, card e blocchi che non hanno una timeline
 * dedicata (ART-DIRECTION §4): `y: 28px, opacity: 0, filter: blur(6px)` →
 * stato pieno, 0.7s, ease power3.out, `once`.
 *
 * Per i TITOLI non usare questo: usare <TextReveal> (reveal per parola).
 *
 * `stagger` è una scorciatoia a `delayMs`: <RevealOnScroll stagger={i} /> dà a
 * ogni elemento di una griglia 90ms di ritardo in più del precedente.
 */
export function RevealOnScroll({
  children,
  className,
  delayMs = 0,
  stagger,
  as = "div",
  /** Distanza di partenza in px. Default 28 (ART-DIRECTION §4). */
  distance = 28,
  /** Sfocatura di partenza in px. Default 6. */
  blur = 6,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  stagger?: number;
  as?: "div" | "li" | "section" | "article";
  distance?: number;
  blur?: number;
}) {
  const { ref, isInView } = useInViewport<HTMLElement>();
  const reduced = usePrefersReducedMotion();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Tag = as as any;

  const delay = reduced ? 0 : delayMs + (stagger ?? 0) * 90;
  const shown = reduced || isInView;

  return (
    <Tag
      ref={ref as React.Ref<HTMLElement>}
      className={cn(
        "transition-[opacity,transform,filter] ease-[var(--ease-out)]",
        className,
      )}
      style={{
        transitionDuration: "var(--dur-reveal)",
        transitionDelay: `${delay}ms`,
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translate3d(0, ${distance}px, 0)`,
        filter: shown ? "none" : `blur(${blur}px)`,
        willChange: shown ? "auto" : "transform, opacity, filter",
      }}
    >
      {children}
    </Tag>
  );
}

export default RevealOnScroll;
