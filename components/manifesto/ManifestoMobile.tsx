"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils/cn";
import { manifestoCopy, type ManifestoLocale } from "@/content/manifesto";
import { ManifestoButterfliesMobile, MOBILE_BUTTERFLY_BLEED } from "./ManifestoButterfliesMobile";
import styles from "./manifestoMobile.module.css";

/** Geometria della faglia CSS (manifestoMobile.module.css `.rift`), nel
    sistema del canvas delle farfalle — che sborda di BLEED sopra la sezione. */
const RIFT = { cxFrac: 0.5, cy: 86 + MOBILE_BUTTERFLY_BLEED, angleDeg: -6, halfLenFrac: 0.45 } as const;

/** Ritardo dell'accensione della keyword dopo la comparsa della frase (ms). */
const KEYWORD_DELAY = 620;

/**
 * 03 MANIFESTO — variante MOBILE (telefoni; il tablet riceve la desktop).
 *
 * Stesso testo, stessa keyword accesa, stessa faglia, da cui su telefono affiorano farfalle di luce —
 * ricomposti per 360–430px e per il budget di un telefono:
 *  · nessun WebGL (la faglia è CSS, le farfalle un canvas 2D a dpr 1, ≤40 glifi);
 *  · nessun GSAP/ScrollTrigger: un IntersectionObserver arma un reveal CSS
 *    per blocco (opacity + transform) e poi accende la keyword;
 *  · animazioni CSS della faglia in pausa fuori viewport;
 *  · reduced-motion: tutto già nello stato finale, keyword accesa, un solo
 *    fotogramma di farfalla posata.
 * `id="manifesto"` resta identico alla desktop (ancore e link interni).
 */
export function ManifestoMobile() {
  const locale = useLocale() as ManifestoLocale;
  const copy = manifestoCopy[locale] ?? manifestoCopy.it;
  const reducedMotion = usePrefersReducedMotion();

  const sectionRef = useRef<HTMLElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);
  const [lit, setLit] = useState(false);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    // reduced-motion: niente da osservare, lo stato finale è derivato nel render
    if (!section || reducedMotion) return;

    // Primo callback dell'observer = stato iniziale. Se la sezione è già a
    // schermo (arrivo con un'ancora #manifesto) resta composta, senza reveal;
    // altrimenti il reveal viene armato e parte all'ingresso.
    let litTimer = 0;
    let first = true;
    const revealIo = new IntersectionObserver(
      ([entry]) => {
        const wasFirst = first;
        first = false;
        if (!entry.isIntersecting) {
          if (wasFirst) setArmed(true);
          return;
        }
        setShown(true);
        litTimer = window.setTimeout(() => setLit(true), wasFirst ? 0 : KEYWORD_DELAY);
        revealIo.disconnect();
      },
      { rootMargin: "0px 0px -22% 0px" },
    );
    revealIo.observe(textRef.current ?? section);

    // le animazioni CSS della faglia girano solo a schermo
    const liveIo = new IntersectionObserver(([entry]) => setLive(entry.isIntersecting));
    liveIo.observe(section);

    return () => {
      window.clearTimeout(litTimer);
      revealIo.disconnect();
      liveIo.disconnect();
    };
  }, [reducedMotion]);

  return (
    <section
      id="manifesto"
      ref={sectionRef}
      data-live={live && !reducedMotion ? "true" : undefined}
      className={cn("manifesto-section", styles.section)}
    >
      <div aria-hidden="true" className={styles.rift}>
        <span className={styles.veil} />
        <span className={styles.curtainMask}>
          <span className={styles.curtain} />
        </span>
        <span className={styles.filament} />
      </div>

      <ManifestoButterfliesMobile reducedMotion={reducedMotion} avoidRef={textRef} rift={RIFT} />

      <div
        ref={textRef}
        className={cn(styles.inner, armed && !reducedMotion && styles.armed)}
        data-shown={shown || reducedMotion ? "true" : undefined}
      >
        <div aria-hidden="true" className={styles.rule} />
        <p className={styles.line}>
          {copy.line.map((token, i) => (
            <span key={`w-${i}`}>
              {token.isKeyword ? (
                <span className={styles.keyword} data-lit={lit || reducedMotion ? "true" : undefined}>
                  {token.text}
                </span>
              ) : (
                token.text
              )}
              {i < copy.line.length - 1 ? " " : ""}
            </span>
          ))}
        </p>

        <p className={styles.secondary} aria-label={copy.secondary}>
          {copy.pillars.map((pillar) => (
            <span key={pillar} className={styles.pillar}>
              {/* su 360–430px i tre pilastri non stanno in riga: uno per riga,
                  ciascuno col suo punto (mai un punto orfano a inizio riga) */}
              <span aria-hidden="true" className={styles.dot} />
              {pillar}
            </span>
          ))}
          <span className={styles.coda}>— {copy.coda}</span>
        </p>
      </div>
    </section>
  );
}
