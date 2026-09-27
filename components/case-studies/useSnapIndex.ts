"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/**
 * Indice della card "in primo piano" di una fila a scroll-snap orizzontale.
 *
 * Nessun listener di scroll e nessun lavoro per frame: un IntersectionObserver
 * con `root` = il contenitore scorrevole ci dice quale figlio è più visibile.
 * I figli osservati sono quelli marcati `data-snap-item`.
 *
 * `goTo(i)` porta la card i al centro con lo scroll nativo del contenitore
 * (smooth, rispettando prefers-reduced-motion via CSS) — mai scrollIntoView,
 * che su iOS trascina anche la pagina in verticale.
 */
export function useSnapIndex(scrollerRef: RefObject<HTMLElement | null>, count: number) {
  const [index, setIndex] = useState(0);
  const ratios = useRef<number[]>([]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-snap-item]"));
    ratios.current = items.map(() => 0);

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const i = items.indexOf(entry.target as HTMLElement);
          if (i >= 0) ratios.current[i] = entry.intersectionRatio;
        }
        let best = 0;
        for (let i = 1; i < ratios.current.length; i++) {
          if (ratios.current[i] > ratios.current[best]) best = i;
        }
        setIndex((prev) => (ratios.current[best] > 0 ? best : prev));
      },
      { root, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    items.forEach((el) => io.observe(el));

    // Correzione a fine gesto (un solo evento per scroll, passivo): se un
    // callback dell'observer arriva in ritardo durante uno scroll veloce, il
    // puntino giusto è comunque quello della card agganciata dallo snap.
    const onScrollEnd = () => {
      const mid = root.scrollLeft + root.clientWidth / 2;
      let best = 0;
      let bestD = Infinity;
      items.forEach((el, i) => {
        const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      setIndex(best);
    };
    root.addEventListener("scrollend", onScrollEnd, { passive: true });

    return () => {
      io.disconnect();
      root.removeEventListener("scrollend", onScrollEnd);
    };
  }, [scrollerRef, count]);

  const goTo = useCallback(
    (i: number) => {
      const root = scrollerRef.current;
      if (!root) return;
      const items = root.querySelectorAll<HTMLElement>("[data-snap-item]");
      const el = items[Math.max(0, Math.min(items.length - 1, i))];
      if (!el) return;
      const left = el.offsetLeft - (root.clientWidth - el.offsetWidth) / 2;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      root.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
    },
    [scrollerRef],
  );

  return { index, goTo };
}
