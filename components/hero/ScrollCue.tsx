"use client";

import { useEffect, useRef } from "react";
import { gsap, ensureGsapRegistered } from "@/lib/animation/gsap";
import { Tactile } from "@/components/ui/Tactile";

type ScrollCueProps = {
  label: string;
  ariaLabel: string;
  reducedMotion: boolean;
  onActivate: () => void;
  /** Ritardo di comparsa, in secondi, allineato alla timeline dell'hero. */
  delay?: number;
};

/**
 * L'invito a scorrere: un filo verticale con un punto che lo percorre — la
 * stessa metafora della cucitura, portata a fondo pagina. È magnetico, molleggia
 * e si schiaccia al click (ART-DIRECTION §5), e ferma il proprio loop appena
 * l'utente inizia davvero a scorrere (spec 01-hero §5).
 */
export function ScrollCue({
  label,
  ariaLabel,
  reducedMotion,
  onActivate,
  delay = 2.6,
}: ScrollCueProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    ensureGsapRegistered();
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      gsap.set(root, { opacity: 0 });

      if (reducedMotion) {
        gsap.set(root, { opacity: 1 });
        gsap.set(dotRef.current, { y: 0, opacity: 1 });
        return;
      }

      gsap.to(root, { opacity: 1, duration: 0.5, delay, ease: "power3.out" });

      // il punto scende lungo il filo come un punto di cucito che avanza:
      // entra in alto, scivola, si spegne in basso.
      const loop = gsap
        .timeline({ repeat: -1, repeatDelay: 0.5, delay: delay + 0.3 })
        .fromTo(
          dotRef.current,
          { y: -4, opacity: 0 },
          { y: 7, opacity: 1, duration: 0.45, ease: "power2.out" },
        )
        .to(dotRef.current, {
          y: 30,
          opacity: 0,
          duration: 0.85,
          ease: "power2.in",
        });

      const stop = () => {
        gsap.to(root, { opacity: 0.45, duration: 0.4, ease: "power2.out" });
        loop.kill();
      };
      window.addEventListener("scroll", stop, { passive: true, once: true });

      return () => {
        loop.kill();
        window.removeEventListener("scroll", stop);
      };
    }, rootRef);

    return () => ctx.revert();
  }, [reducedMotion, delay]);

  return (
    <div ref={rootRef}>
      <Tactile
        as="button"
        type="button"
        onClick={onActivate}
        aria-label={ariaLabel}
        intensity="playful"
        magnetic
        magneticMax={10}
        className="group inline-flex cursor-pointer flex-col items-center gap-3 border-0 bg-transparent p-0"
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--fs-micro)",
            letterSpacing: "var(--ls-micro)",
            textTransform: "uppercase",
            color: "var(--text-low)",
          }}
        >
          {label}
        </span>
        <span
          aria-hidden="true"
          style={{
            position: "relative",
            display: "block",
            width: 1,
            height: 34,
            background:
              "linear-gradient(to bottom, rgba(63,233,204,0.45), rgba(63,233,204,0))",
          }}
        >
          <span
            ref={dotRef}
            style={{
              position: "absolute",
              left: -2,
              top: 0,
              width: 5,
              height: 5,
              borderRadius: "var(--radius-full)",
              background: "var(--aqua-300)",
              boxShadow: "var(--glow-sm)",
            }}
          />
        </span>
      </Tactile>
    </div>
  );
}

export default ScrollCue;
