"use client";

import { useEffect, useState } from "react";

/**
 * Fonte unica di verità per prefers-reduced-motion in tutto il sito.
 * Ogni componente animato (GSAP, Framer Motion, R3F) lo consulta invece
 * di leggere direttamente matchMedia — vedi checklist di ogni spec.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);

  return reduced;
}
