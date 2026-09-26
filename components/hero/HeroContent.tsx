"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { gsap, ensureGsapRegistered } from "@/lib/animation/gsap";
import { gsapEase } from "@/lib/animation/tokens";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { Tactile } from "@/components/ui/Tactile";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroHeadline } from "./HeroHeadline";
import { heroCopy, type Locale } from "@/content/hero";

type HeroContentProps = {
  locale: Locale;
  onCtaPrimaryClick: () => void;
  onCtaSecondaryClick: () => void;
};

/* ============================================================================
   Coreografia (spec 01-hero §5, ritmata sui tempi v2 — reveal per parola).
   Il titolo è governato da HeroHeadline, che fa il reveal per parola al mount
   (è sopra la piega: parte subito, non allo scroll) e poi consegna le lettere
   al giocattolo. Tutto il resto da una sola timeline GSAP, così i due sistemi
   non scivolano l'uno rispetto all'altro.

   NOTA sui tempi: il titolo NON aspetta la scena. Le particelle cominciano a
   riordinarsi mentre il testo sta ancora entrando, e ci mettono ~3.5s: se il
   testo dovesse aspettarle, la prima cosa leggibile del sito arriverebbe a
   metà animazione. La coreografia è concorrente, non sequenziale.
   ========================================================================== */
// v2: la scena apre con una COMPRESSIONE (supernova, 0.1–0.9s) prima
// dell'esplosione. Il titolo si sposta di 0.3s: la prima riga sale mentre il
// nucleo si stringe, l'ultima arriva con lo scoppio — i due gesti si passano
// il testimone invece di contendersi lo sguardo. L'eyebrow resta a 0.15: la
// pagina non è mai vuota.
const T = {
  eyebrow: 0.15,
  line1: 0.6,
  line2: 0.82,
  line3: 1.04,
  stitchMs: 1480,
  positioning: 1.92,
  sub: 2.22,
  badge: 2.46,
  cta: 2.66,
} as const;

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function HeroContent({
  locale,
  onCtaPrimaryClick,
  onCtaSecondaryClick,
}: HeroContentProps) {
  const copy = heroCopy[locale];
  const reducedMotion = usePrefersReducedMotion();

  const rootRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const positioningRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    ensureGsapRegistered();

    const ctx = gsap.context(() => {
      const targets = [
        eyebrowRef.current,
        positioningRef.current,
        subRef.current,
        badgeRef.current,
        ctaRef.current,
      ].filter(Boolean) as HTMLElement[];
      if (targets.length === 0) return;

      gsap.set(targets, { opacity: 0 });

      if (reducedMotion) {
        // Spec §7: solo fade, nessun translateY, stagger minimo.
        gsap.to(targets, { opacity: 1, duration: 0.2, stagger: 0.05, ease: "none" });
        return;
      }

      const tl = gsap.timeline();
      tl.fromTo(
        eyebrowRef.current,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.55, ease: gsapEase.out },
        T.eyebrow,
      )
        .fromTo(
          positioningRef.current,
          { opacity: 0, y: 14, filter: "blur(6px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.62,
            ease: gsapEase.out,
            onComplete: () =>
              gsap.set(positioningRef.current, { clearProps: "filter,willChange" }),
          },
          T.positioning,
        )
        .fromTo(
          subRef.current,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.55, ease: gsapEase.out },
          T.sub,
        )
        .fromTo(
          badgeRef.current,
          { opacity: 0, scale: 0.92 },
          { opacity: 1, scale: 1, duration: 0.45, ease: gsapEase.spring },
          T.badge,
        )
        .fromTo(
          ctaRef.current,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.5, ease: gsapEase.out },
          T.cta,
        );
    }, rootRef);

    return () => ctx.revert();
  }, [reducedMotion, locale]);

  return (
    <div ref={rootRef} className="relative z-10 w-full">
      {/* --- eyebrow: mono + trattino aqua (utility .eyebrow) --- */}
      <div ref={eyebrowRef}>
        <Tactile
          as="span"
          intensity="playful"
          className="eyebrow"
          magnetic
          magneticMax={7}
        >
          {copy.eyebrow}
        </Tactile>
      </div>

      {/* --- H1: il titolo giocabile (lettere = oggetti 3D separati) --- */}
      <HeroHeadline copy={copy} reducedMotion={reducedMotion} timing={T} />


      {/* --- positioning line: l'aggancio fattuale della metafora --- */}
      <div ref={positioningRef} className="mt-7 sm:mt-8">
        <Tactile
          as="p"
          intensity="subtle"
          className="relative"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--fs-lead)",
            lineHeight: "var(--lh-lead)",
            fontWeight: 500,
            color: "var(--text-hi)",
            maxWidth: "44ch",
            paddingLeft: "18px",
          }}
        >
          {/* Filetto verticale a gradiente invece di border-left + box-shadow:
              quest'ultima disegnava un alone RETTANGOLARE attorno all'intero
              blocco (una box-shadow traccia sempre il box, non il solo bordo),
              e a schermo si leggeva come un riquadro indesiderato. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 block h-full w-px"
            style={{
              background:
                "linear-gradient(to bottom, var(--aqua-400), rgba(63,233,204,0.15))",
              filter: "drop-shadow(0 0 6px rgba(63, 233, 204, 0.55))",
            }}
          />
          {copy.positioningLine}
        </Tactile>
      </div>

      {/* --- sub-headline: gli stessi tre dati dello spec, resi a chip mono --- */}
      <div
        ref={subRef}
        data-hero-block
        className="mt-6 flex max-w-[54ch] flex-wrap items-center gap-x-3 gap-y-2"
      >
        {copy.subHeadlineParts.map((part, i) => (
          <span key={part} className="inline-flex items-center gap-3">
            {i > 0 && (
              <span
                aria-hidden="true"
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "var(--radius-full)",
                  background: "var(--aqua-600)",
                  boxShadow: "var(--glow-xs)",
                  flex: "none",
                }}
              />
            )}
            <Tactile
              as="span"
              intensity="subtle"
              magnetic
              magneticMax={5}
              className="inline-block"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--fs-micro)",
                letterSpacing: "var(--ls-micro)",
                textTransform: "uppercase",
                color: "var(--text-mid)",
              }}
            >
              {part}
            </Tactile>
          </span>
        ))}
      </div>

      {/* --- badge età --- */}
      <div ref={badgeRef} data-hero-block className="mt-7 inline-block">
        <Badge>
          <span
            className="tabular-nums"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "0.95rem",
              fontWeight: 500,
              color: "var(--aqua-300)",
              textShadow: "var(--glow-text)",
            }}
          >
            {copy.ageBadgeNumber}
          </span>
          <span>{copy.ageBadgeText}</span>
        </Badge>
      </div>

      {/* --- CTA: entrambe magnetiche (Button è già A+B+D) --- */}
      <div
        ref={ctaRef}
        className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4"
      >
        <Button
          variant="primary"
          size="lg"
          onClick={onCtaPrimaryClick}
          className="w-full sm:w-auto"
        >
          {copy.ctaPrimary}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={onCtaSecondaryClick}
          className="w-full sm:w-auto"
        >
          {copy.ctaSecondary}
        </Button>
      </div>
    </div>
  );
}

export default HeroContent;
