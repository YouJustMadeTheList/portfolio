"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { loadGsap } from "@/lib/animation/loadGsap";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

/**
 * Reveal "a blocco" per paragrafi e card (ART-DIRECTION §4):
 * `y: 28px, opacity: 0, filter: blur(6px)` → stato pieno, 0.7s, power3.out.
 * Per i TITOLI usare TextReveal (per parola), non questo.
 *
 * Stessa animazione e stessa garanzia di prima (lo stato di partenza lo scrive
 * GSAP, il watchdog a 6s la fa partire comunque), ma GSAP non è più nel JS di
 * avvio: l'elemento nasce nascosto subito dopo l'idratazione con gli stessi
 * valori di `gsap.set`, e la libreria viene caricata quando il blocco si
 * avvicina al viewport. Se il caricamento fallisce il blocco resta visibile.
 */

/** "top 80%" → rootMargin bottom di -20%: l'elemento "entra" all'80% del viewport. */
function startToRootMargin(start: string): string {
  const m = /(-?\d+(?:\.\d+)?)\s*%/.exec(start.split(/\s+/)[1] ?? "");
  const pct = m ? Number(m[1]) : 80;
  const bottom = Math.min(Math.max(100 - pct, -50), 95);
  return `0px 0px -${bottom}% 0px`;
}

/** Quanto prima dell'ingresso in viewport si inizia a scaricare GSAP. */
const PRELOAD_MARGIN = "0px 0px 900px 0px";

export function BlockReveal({
  children,
  as,
  className,
  delay = 0,
  start = "top 80%",
  style,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
  start?: string;
  style?: React.CSSProperties;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Tag = (as ?? "div") as any;
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    let teardown: (() => void) | null = null;
    let preObserver: IntersectionObserver | null = null;

    // Stato nascosto provvisorio = quello che scrive `gsap.set` più sotto;
    // viene tolto un istante prima, nello stesso task, quando GSAP è pronto.
    const holdHidden = !reduced;
    const clearHold = () => {
      el.style.removeProperty("opacity");
      el.style.removeProperty("transform");
      el.style.removeProperty("filter");
    };
    if (holdHidden) {
      el.style.opacity = "0";
      el.style.transform = "translate(0px, 28px)";
      el.style.filter = "blur(6px)";
    }

    const run = ({ ensureGsapRegistered, gsap }: typeof import("@/lib/animation/gsap")) => {
      if (cancelled) return;
      if (reduced) {
        gsap.set(el, { opacity: 1, y: 0, filter: "none" });
        return;
      }
      clearHold();
      ensureGsapRegistered();

      const ctx = gsap.context(() => {
        gsap.set(el, { y: 28, opacity: 0, filter: "blur(6px)" });
        const tween = gsap.to(el, {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.7,
          delay,
          ease: "power3.out",
          paused: true,
          onComplete: () => gsap.set(el, { clearProps: "filter,willChange" }),
        });

        const watchdog = window.setTimeout(() => {
          if (!tween.isActive() && tween.progress() === 0) tween.play();
        }, 6000);

        let observer: IntersectionObserver | null = null;
        if (typeof IntersectionObserver === "function") {
          observer = new IntersectionObserver(
            (entries) => {
              if (entries.some((e) => e.isIntersecting)) {
                tween.play();
                observer?.disconnect();
              }
            },
            { rootMargin: startToRootMargin(start), threshold: 0 },
          );
          observer.observe(el);
        } else {
          tween.play();
        }

        return () => {
          window.clearTimeout(watchdog);
          observer?.disconnect();
          tween.kill();
        };
      }, el);

      teardown = () => ctx.revert();
    };

    const load = () => {
      preObserver?.disconnect();
      preObserver = null;
      loadGsap().then(run, () => {
        // GSAP non scaricabile: il contenuto non deve restare nascosto.
        if (!cancelled && holdHidden) clearHold();
      });
    };

    if (reduced || typeof IntersectionObserver !== "function") {
      load();
    } else {
      preObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) load();
        },
        { rootMargin: PRELOAD_MARGIN, threshold: 0 },
      );
      preObserver.observe(el);
    }

    return () => {
      cancelled = true;
      preObserver?.disconnect();
      if (teardown) teardown();
      else if (holdHidden) clearHold();
    };
  }, [reduced, delay, start]);

  return (
    <Tag
      ref={ref as React.Ref<HTMLElement>}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  );
}

export default BlockReveal;
