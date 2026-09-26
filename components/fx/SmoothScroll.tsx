"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { ensureGsapRegistered, gsap, ScrollTrigger } from "@/lib/animation/gsap";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

let instance: Lenis | null = null;

/**
 * Accesso all'istanza Lenis viva (null sotto prefers-reduced-motion o prima del mount).
 * Usarla per `getLenis()?.scrollTo("#contatti")` invece di window.scrollTo, così lo
 * scroll programmatico ha la stessa inerzia di quello a rotella.
 */
export function getLenis(): Lenis | null {
  return instance;
}

/** Scroll programmatico che funziona sia con Lenis attivo sia senza (reduced-motion). */
export function smoothScrollTo(
  target: string | number | HTMLElement,
  offset = 0,
) {
  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(target, { offset });
    return;
  }
  if (typeof window === "undefined") return;
  if (typeof target === "number") {
    window.scrollTo({ top: target + offset });
    return;
  }
  const el =
    typeof target === "string" ? document.querySelector(target) : target;
  el?.scrollIntoView({ block: "start" });
}

/**
 * ART-DIRECTION §4 — "lo scroll inerziale è il 40% della percezione di qualità".
 *
 * Provider Lenis (lerp 0.085) agganciato al ticker di GSAP: un solo rAF per tutta
 * la pagina, e `ScrollTrigger.update()` chiamato a ogni frame di scroll così le
 * timeline scroll-driven non vanno mai fuori sincrono con la posizione renderizzata.
 *
 * Sotto `prefers-reduced-motion` Lenis non viene neanche istanziato: lo scroll
 * resta quello nativo del browser.
 */
export function SmoothScroll({ children }: { children?: ReactNode }) {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    if (typeof window === "undefined") return;
    // doppia guardia: usePrefersReducedMotion parte da `false` al primo render
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    ensureGsapRegistered();

    const lenis = new Lenis({
      lerp: 0.085,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      // lo scroll touch resta nativo: su mobile l'inerzia del sistema è migliore
      syncTouch: false,
      anchors: true,
      autoRaf: false, // il rAF lo guida gsap.ticker, vedi sotto
    });
    instance = lenis;

    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);

    // gsap.ticker lavora in secondi, lenis.raf in millisecondi
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // un solo refresh dopo il mount (ART-DIRECTION §7)
    const refreshId = window.requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      window.cancelAnimationFrame(refreshId);
      lenis.off("scroll", onScroll);
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      instance = null;
    };
  }, [reduced]);

  return <>{children}</>;
}

export default SmoothScroll;
