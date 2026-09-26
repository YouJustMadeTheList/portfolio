"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Tactile } from "@/components/ui/Tactile";
import { colors, gsapEase } from "@/lib/animation/tokens";
import { ensureGsapRegistered, gsap } from "@/lib/animation/gsap";
import type { ManifestoToken } from "@/content/manifesto";

export type ManifestoLineProps = {
  tokens: ManifestoToken[];
  /** I tre pilastri, già divisi dal content layer (nessun parsing a runtime). */
  pillars: readonly string[];
  /** La coda della riga secondaria, dopo il trattino lungo. */
  coda: string;
  /** Stringa integrale della riga secondaria — testo accessibile unico. */
  secondary: string;
  reducedMotion: boolean;
  onRevealComplete?: () => void;
};

/* Timing dello scroll-reveal — specs/03-manifesto.md §5, con lo stagger portato
   al valore di sistema (45ms, ART-DIRECTION §4: sul conflitto di timing vince il
   documento di art direction). Costanti locali: sono specifiche di questa sezione. */
const RULE_DURATION = 0.42;
const WORD_START = 0.15;
const WORD_DURATION = 0.7;
const WORD_STAGGER = 0.045;
const KEYWORD_COLOR_DELAY = 0.08;
const KEYWORD_COLOR_DURATION = 0.45;
const SECONDARY_GAP = 0.3;
const SECONDARY_DURATION = 0.45;

/**
 * 03 MANIFESTO — il picco emotivo della pagina, e quasi solo tipografia.
 *
 * Tre movimenti, nessuno di più (la sezione vive di restrizione + un dettaglio
 * perfetto):
 *  1. il filamento aqua si disegna da sinistra — l'attacco;
 *  2. la frase si compone PAROLA PER PAROLA (y + opacità, niente maschere:
 *     lo spec §5 vuole il testo integro e selezionabile nel DOM anche senza JS,
 *     quindi nessun clip che lo nasconderebbe ai crawler);
 *  3. la keyword si ACCENDE dopo essere apparsa — colore da --text-hi ad aqua e,
 *     subito dopo, il glow. È l'"aha" della sezione, e l'unico punto di tutta la
 *     sezione in cui compare l'accento.
 *
 * La keyword è in Instrument Serif italic FIN DAL PRIMO FRAME: il font non
 * cambia mai a runtime, quindi l'accensione non provoca reflow (cambiano solo
 * `color` e `text-shadow`, entrambi non-layout).
 *
 * In più, un solo legame con lo scroll: l'intero blocco deriva di ±22px in
 * scrub sull'attraversamento del viewport. Serve a staccarlo dal fondo, non a
 * "fare parallasse": è appena percettibile e non sposta nulla di leggibile.
 */
export function ManifestoLine({
  tokens,
  pillars,
  coda,
  secondary,
  reducedMotion,
  onRevealComplete,
}: ManifestoLineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const driftRef = useRef<HTMLDivElement | null>(null);
  const ruleRef = useRef<HTMLDivElement | null>(null);
  const secondaryRef = useRef<HTMLParagraphElement | null>(null);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const keywordIndex = useMemo(() => tokens.findIndex((t) => t.isKeyword), [tokens]);

  useLayoutEffect(() => {
    wordRefs.current = wordRefs.current.slice(0, tokens.length);
    const words = wordRefs.current.filter((el): el is HTMLSpanElement => Boolean(el));
    const keywordEl = keywordIndex >= 0 ? wordRefs.current[keywordIndex] : null;
    const container = containerRef.current;
    if (!container || words.length === 0) return;

    if (reducedMotion) {
      // Fallback: nessuno split/stagger, nessun drift. Stato finale immediato e
      // completo — mai un frame a metà reveal (spec §6). La keyword è già accesa
      // (colore + glow via data-lit nel markup).
      const ctx = gsap.context(() => {
        gsap.set([ruleRef.current, ...words, secondaryRef.current, driftRef.current], {
          clearProps: "transform",
        });
        gsap.set([...words, secondaryRef.current], { opacity: 1 });
        if (ruleRef.current) gsap.set(ruleRef.current, { scaleX: 1 });
        onRevealComplete?.();
      }, container);
      return () => ctx.revert();
    }

    ensureGsapRegistered();

    const ctx = gsap.context(() => {
      const lastWordStart = WORD_START + (words.length - 1) * WORD_STAGGER;
      const phraseEnd = lastWordStart + WORD_DURATION;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: "top 70%",
          end: "top 20%",
          scrub: false,
          toggleActions: "play none none none",
          once: true,
        },
        onComplete: onRevealComplete,
      });

      if (ruleRef.current) {
        gsap.set(ruleRef.current, { scaleX: 0, transformOrigin: "left center" });
        tl.to(ruleRef.current, { scaleX: 1, duration: RULE_DURATION, ease: gsapEase.out }, 0);
      }

      // Reveal per parola. Solo transform + opacity (mai filtri costosi su 20+
      // nodi di testo): y di mezza riga e una micro-scala con origine sulla
      // baseline, così le parole "si alzano" invece di comparire.
      gsap.set(words, { opacity: 0, yPercent: 42, scale: 0.94, transformOrigin: "left bottom" });
      tl.to(
        words,
        {
          opacity: 1,
          yPercent: 0,
          scale: 1,
          duration: WORD_DURATION,
          ease: gsapEase.out,
          stagger: WORD_STAGGER,
          onComplete: () => gsap.set(words, { willChange: "auto" }),
        },
        WORD_START,
      );

      if (keywordEl) {
        const keywordWordStart = WORD_START + keywordIndex * WORD_STAGGER;
        const keywordColorStart = keywordWordStart + WORD_DURATION + KEYWORD_COLOR_DELAY;
        const target = keywordEl.querySelector<HTMLElement>("[data-keyword]") ?? keywordEl;
        gsap.set(target, { color: colors.textHi });
        tl.fromTo(
          target,
          { color: colors.textHi },
          {
            color: colors.aqua400,
            duration: KEYWORD_COLOR_DURATION,
            ease: gsapEase.inout,
            // Il glow entra con la stessa curva, ma via CSS transition sul
            // proprio `text-shadow` inline (impostata nel JSX): non è un
            // valore interpolabile in modo affidabile da GSAP senza plugin.
            onStart: () => {
              target.dataset.lit = "true";
              target.style.textShadow = "var(--glow-text)";
            },
          },
          keywordColorStart,
        );
      }

      if (secondaryRef.current) {
        gsap.set(secondaryRef.current, { opacity: 0 });
        tl.to(
          secondaryRef.current,
          { opacity: 1, duration: SECONDARY_DURATION, ease: gsapEase.out },
          phraseEnd + SECONDARY_GAP,
        );
      }

      // Drift scroll-linked sull'intero blocco: ±22px su tutta la traversata.
      if (driftRef.current) {
        gsap.fromTo(
          driftRef.current,
          { y: 22 },
          {
            y: -22,
            ease: "none",
            scrollTrigger: {
              trigger: container,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.6,
            },
          },
        );
      }
    }, container);

    return () => ctx.revert();
  }, [tokens, secondary, reducedMotion, keywordIndex, onRevealComplete]);

  return (
    <div ref={containerRef}>
      <div ref={driftRef} style={{ willChange: reducedMotion ? undefined : "transform" }}>
        {/* L'attacco: un filamento aqua che emette, non una riga grigia. */}
        <div
          ref={ruleRef}
          aria-hidden="true"
          style={{
            width: 64,
            height: 2,
            borderRadius: 999,
            background:
              "linear-gradient(90deg, var(--aqua-400), rgb(var(--aqua-rgb) / 0.15))",
            boxShadow: "var(--glow-sm)",
            marginBottom: "clamp(24px, 3.4vw, 40px)",
          }}
        />

        <p
          style={{
            fontFamily: "var(--font-display)",
            // Più grande dello spec (3.5rem) ma sotto l'hero (5.75rem): il
            // manifesto è il momento tipograficamente più ambizioso della
            // pagina dopo l'hero, senza mai competerne la scala (spec §3).
            fontSize: "clamp(2.25rem, 1.1rem + 4.6vw, 5.15rem)",
            fontWeight: 500,
            lineHeight: 1.09,
            letterSpacing: "-0.026em",
            color: "var(--text-hi)",
            maxWidth: "22ch",
            textWrap: "balance",
            margin: 0,
          }}
        >
          {tokens.map((token, i) => (
            <span key={`w-${i}`}>
              <span
                ref={(el) => {
                  wordRefs.current[i] = el;
                }}
                style={{ display: "inline-block", willChange: "transform, opacity" }}
              >
                {token.isKeyword ? (
                  <Tactile
                    as="span"
                    intensity="playful"
                    data-keyword=""
                    data-lit={reducedMotion ? "true" : undefined}
                    style={{
                      display: "inline-block",
                      // La mossa editoriale centrale (ART-DIRECTION §2): la
                      // keyword esce in Instrument Serif italic fin dal primo
                      // frame — solo colore e glow si animano (nessun cambio
                      // di font a runtime, quindi zero reflow, vedi commento
                      // di testa del file).
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      letterSpacing: "-0.01em",
                      color: reducedMotion ? "var(--aqua-400)" : undefined,
                      textShadow: reducedMotion ? "var(--glow-text)" : undefined,
                      transition: reducedMotion
                        ? undefined
                        : `text-shadow ${KEYWORD_COLOR_DURATION}s var(--ease-inout)`,
                    }}
                  >
                    {token.text}
                  </Tactile>
                ) : (
                  token.text
                )}
              </span>
              {i < tokens.length - 1 ? " " : ""}
            </span>
          ))}
        </p>

        {/* Nota a piè di frase: i tre pilastri in mono, la coda in corpo. Un solo
            fade per tutta la riga (spec §5: non deve leggersi come una seconda
            ondata del reveal principale), ma ogni pilastro reagisce al cursore. */}
        <p
          ref={secondaryRef}
          aria-label={secondary}
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            gap: "0.5rem 0.75rem",
            marginTop: "clamp(28px, 4vw, 48px)",
            maxWidth: "62ch",
            opacity: reducedMotion ? 1 : undefined,
          }}
        >
          {pillars.map((pillar, i) => (
            <span key={pillar} style={{ display: "inline-flex", alignItems: "baseline", gap: "0.75rem" }}>
              {i > 0 ? (
                <span
                  aria-hidden="true"
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: 999,
                    background: "var(--aqua-400)",
                    boxShadow: "var(--glow-xs)",
                    alignSelf: "center",
                  }}
                />
              ) : null}
              <Tactile
                as="span"
                intensity="subtle"
                style={{
                  display: "inline-block",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--fs-micro)",
                  textTransform: "uppercase",
                  letterSpacing: "var(--ls-micro)",
                  color: "var(--text-mid)",
                }}
              >
                {pillar}
              </Tactile>
            </span>
          ))}
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "clamp(0.875rem, 0.8rem + 0.3vw, 1rem)",
              color: "var(--text-low)",
              letterSpacing: "0.01em",
            }}
          >
            — {coda}
          </span>
        </p>
      </div>
    </div>
  );
}
