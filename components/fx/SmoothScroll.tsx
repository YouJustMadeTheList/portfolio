"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { ensureGsapRegistered, gsap, ScrollTrigger } from "@/lib/animation/gsap";
import { setLenisInstance } from "./scrollTo";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

// Scroll programmatico e registro dell'istanza: in ./scrollTo (senza Lenis/GSAP).
export { smoothScrollTo, getLenis } from "./scrollTo";

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

    /* Lenis parte in un task suo, dopo l'idratazione: la sua prima misura
       della pagina (layout completo) non si somma più al task lungo del
       caricamento. Nessuno scrolla nei primi ~100ms. */
    let dispose: (() => void) | null = null;
    let cancelled = false;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const boot = () => {
      if (cancelled) return;
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
      setLenisInstance(lenis);

      const onScroll = () => ScrollTrigger.update();
      lenis.on("scroll", onScroll);

      // gsap.ticker lavora in secondi, lenis.raf in millisecondi
      const raf = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      // un solo refresh dopo il mount (ART-DIRECTION §7), in un task a parte
      const refreshId = window.setTimeout(() => ScrollTrigger.refresh(), 0);

      dispose = () => {
        window.clearTimeout(refreshId);
        lenis.off("scroll", onScroll);
        gsap.ticker.remove(raf);
        gsap.ticker.lagSmoothing(500, 33);
        lenis.destroy();
        setLenisInstance(null);
      };
    };
    const idleId = w.requestIdleCallback
      ? w.requestIdleCallback(boot, { timeout: 250 })
      : window.setTimeout(boot, 60);

    return () => {
      cancelled = true;
      if (w.cancelIdleCallback) w.cancelIdleCallback(idleId);
      window.clearTimeout(idleId);
      dispose?.();
    };
  }, [reduced]);

  return <>{children}</>;
}

export default SmoothScroll;
