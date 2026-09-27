"use client";

import {
  useCallback,
  useMemo,
  useRef,
  type FocusEvent as ReactFocusEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useLocale } from "next-intl";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils/cn";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { trustItems, trustBarCopy, type Locale } from "@/content/trust-bar";
import { TrustItemView } from "./TrustItemView";
import { useLightTrail } from "./useLightTrail";
import styles from "./TrustBar.module.css";
import { TrustBarMobile } from "./TrustBarMobile";
import { useIsMobileVariant } from "@/components/variant/VariantProvider";

/* ============================================================================
   02 TRUST BAR — la traiettoria, percorsa da una scia luminosa
   ----------------------------------------------------------------------------
   Nota del proprietario sulla build live (supera lo spec dove è in conflitto):

     "Effetto visivo povero: vorrei far partire dalla scritta principale un glow
      che attraversa questa riga illuminando tappa per tappa e ingrandendo la
      scritta quando la scia luminosa la raggiunge (effetto di circa 1 secondo).
      La linea temporale deve essere: [...] In generale, importante fare
      enhancing dell'effetto visivo della barra (troppo minima e superficiale) e
      della scia (che ancora non c'è)."
     "C'è uno 07 a lato che va assolutamente eliminato."

   Cosa è cambiato rispetto alla v2:
   · Il contenuto è la TRAIETTORIA in ordine cronologico (content/trust-bar.ts),
     non più l'elenco di loghi/testate.
   · La scia esiste: `useLightTrail` la fa partire dal titolo, attraversare la
     guida e accendere tappa per tappa, ingrandendo il nome all'ignizione.
   · Il conteggio "07" in testa alla sezione — il numero staccato a lato di cui
     parla la nota — è stato ELIMINATO. Restano gli indici 01…NN attaccati a
     ciascuna tappa, e sono derivati dalla lunghezza dei dati: aggiungere o
     togliere una tappa non richiede di toccare un numero a mano.
   · Niente più marquee mobile: una cronologia non può scorrere in loop. Sotto
     1024px la stessa guida diventa verticale e la scia scende (vedi CSS).
   ========================================================================== */

export function TrustBarSection() {
  // Telefoni (variante "m", proxy.ts): striscia orizzontale da sfogliare,
  // vedi TrustBarMobile. Il ramo desktop qui sotto è invariato.
  const isMobile = useIsMobileVariant();
  return isMobile ? <TrustBarMobile /> : <TrustBarDesktop />;
}

function TrustBarDesktop() {
  const locale = useLocale() as Locale;
  const copy = trustBarCopy[locale] ?? trustBarCopy.it;
  const reducedMotion = usePrefersReducedMotion();

  const rootRef = useRef<HTMLElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  // Ordine cronologico esplicito dai dati (`order`), mai l'ordine dell'array.
  const stops = useMemo(
    () => [...trustItems].sort((a, b) => a.order - b.order),
    [],
  );

  useLightTrail({ rootRef, wrapRef, headingRef }, reducedMotion);

  /* --- Alone della guida che insegue la tappa attiva (puntatore o tastiera) ---
     Due custom property scritte direttamente sul nodo: nessun re-render e
     nessun layout thrash, l'animazione resta su transform/opacity. */
  const moveHover = useCallback((stop: HTMLElement | null) => {
    const wrap = wrapRef.current;
    if (!wrap || !stop) return;
    wrap.style.setProperty("--rail-x", `${stop.offsetLeft}px`);
    wrap.style.setProperty("--rail-w", `${stop.offsetWidth}px`);
    wrap.dataset.hover = "true";
  }, []);

  const clearHover = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    delete wrap.dataset.hover;
  }, []);

  const handlePointerEnter = useCallback(
    (event: ReactPointerEvent<HTMLLIElement>) => moveHover(event.currentTarget),
    [moveHover],
  );

  const handleFocus = useCallback(
    (event: ReactFocusEvent<HTMLLIElement>) => moveHover(event.currentTarget),
    [moveHover],
  );

  return (
    <section
      id="percorso-tappe"
      ref={rootRef}
      aria-label={copy.ariaLabelSection}
      /* Non `section-padding`: la trust bar è una striscia di raccordo, non un
         capitolo. Con la padding piena erano ~380px di vuoto attorno a ~120px
         di contenuto. */
      className={cn(
        "relative overflow-hidden py-16 lg:py-24",
        reducedMotion && styles.reduced,
      )}
    >
      {/* L2 — aurora asimmetrica: la striscia non è nero piatto. */}
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          top: "-40%",
          left: "18%",
          width: "min(700px, 92vw)",
          height: "min(420px, 46vh)",
          background: "var(--aurora-aqua)",
          opacity: 0.3,
        }}
      />

      <Container>
        <header className={styles.head}>
          <span aria-hidden="true" data-bloom className={styles.headingBloom} />
          <h2 ref={headingRef} className={styles.heading}>
            {copy.headingLead}{" "}
            <em className={cn("serif-accent", styles.headingAccent)}>
              {copy.headingAccent}
            </em>
          </h2>
        </header>

        <div
          ref={wrapRef}
          className={styles.railWrap}
          onPointerLeave={clearHover}
        >
          {/* La luce lascia il titolo e raggiunge l'inizio della guida. */}
          <span aria-hidden="true" data-spark className={styles.spark} />

          {/* Alone che accompagna il tratto acceso: lo "spessore" della barra. */}
          <span aria-hidden="true" className={styles.railBloom} />

          <div aria-hidden="true" className={styles.rail}>
            <span className={styles.railLit} />
            <span data-tail className={styles.tail} />
            <span className={styles.sheen} />
          </div>

          {/* Testa luminosa: il wrapper porta il percorso (CSS var), il core
              porta opacity/scale (GSAP) — così il tween non sovrascrive la
              transform del percorso. */}
          <span aria-hidden="true" className={styles.trailHead}>
            <span data-head className={styles.trailHeadCore} />
          </span>

          <span aria-hidden="true" className={styles.hoverGlow} />

          <ol className={styles.stops} aria-label={copy.timelineLabel}>
            {stops.map((item, index) => (
              <li
                key={item.id}
                data-stop
                className={styles.stop}
                onPointerEnter={handlePointerEnter}
                onFocus={handleFocus}
              >
                <span aria-hidden="true" data-node className={styles.node} />
                <TrustItemView
                  item={item}
                  locale={locale}
                  reducedMotion={reducedMotion}
                  groupLabel={copy.groupLabels[item.category]}
                  position={index + 1}
                />
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
