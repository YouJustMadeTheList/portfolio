"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * `true` (una volta per tutte) quando l'elemento arriva a `margin` dallo
 * schermo. Serve a rimandare il lavoro di preparazione delle sezioni lontane
 * (misure, geometrie, canvas) fuori dal caricamento della pagina: con 1.5
 * schermi di anticipo è pronto molto prima che lo si veda.
 */
export function useNearViewport(ref: RefObject<Element | null>, margin = "150% 0px"): boolean {
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (near || !el) return;
    if (typeof IntersectionObserver === "undefined") {
      const id = window.setTimeout(() => setNear(true), 0);
      return () => window.clearTimeout(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          setNear(true);
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, near]);

  return near;
}
