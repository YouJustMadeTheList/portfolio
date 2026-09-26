"use client";

import { useCallback, useState } from "react";
import { useLocale } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { PhaseDeck } from "./PhaseDeck";
import { Dealer } from "./Dealer";
import { methodCopy } from "@/content/method";

/**
 * 05 METODO — "un mazzo di carte che si sfoglia".
 *
 * La sezione è solo il guscio: header editoriale (grotesque + serif italic aqua
 * sulla frase-chiave, ART-DIRECTION §2) e mazzo. Tutto ciò che sta dentro il
 * mazzo — geometria, lancio, drag — vive in PhaseDeck/deckStack.
 *
 * Il contatore `01 / 04` sta DENTRO la colonna del mazzo, che a sua volta sta
 * dentro il Container: a nessun breakpoint può uscire dal viewport (era il
 * difetto verificato a schermo sulla v1).
 */
export function MethodSection() {
  const locale = useLocale() as "it" | "en";
  const copy = methodCopy[locale];
  const reducedMotion = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const handleNavigate = useCallback(
    (nextIndex: number) => {
      const n = copy.phases.length;
      setActiveIndex(((nextIndex % n) + n) % n);
    },
    [copy.phases.length],
  );

  return (
    <section id="metodo" className="section-padding relative overflow-hidden">
      {/* L2 — aurora asimmetrica: dà alla sezione la sua temperatura luminosa. */}
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          top: "4%",
          right: "-14%",
          width: "min(820px, 96vw)",
          height: "min(660px, 72vh)",
          background: "var(--aurora-abyss)",
          opacity: 0.4,
        }}
      />
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          bottom: "-10%",
          left: "-10%",
          width: "min(620px, 82vw)",
          height: "min(520px, 58vh)",
          background: "var(--aurora-deep)",
          opacity: 0.3,
        }}
      />

      {/* Il Dealer — figura di SCENA a sinistra, a tutta altezza della
          sezione, scollegata dal mazzo. Nascosto sotto lg: lì non c'è spazio
          per una figura intera senza coprire titolo e carte. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-[8%] left-[-1vw] right-[calc(50%+272px)] z-0 hidden lg:block min-[1440px]:right-[calc(50%+292px)]"
      >
        <Dealer reducedMotion={reducedMotion} />
      </div>

      <Container>
        {/* sopra il Dealer: il cilindro può salire fino all'altezza del titolo */}
        <div className="relative z-[2]">
          <SectionHeader eyebrow={copy.eyebrow} title={copy.title} align="center" />
        </div>

        {/* NIENTE reveal a blocco su questo wrapper: il mazzo deve essere già
            solido e spesso nel primo frame dipinto (spec §5.2). L'unica intro
            consentita è l'assestamento interno di PhaseDeck, che parte da una
            pila già visibile e non da opacità 0. */}
        <div className="relative mt-12 sm:mt-14 lg:mt-16">
          <div className="relative z-[1]">
            <PhaseDeck
              phases={copy.phases}
              ui={copy.ui}
              reducedMotion={reducedMotion}
              activeIndex={activeIndex}
              onNavigate={handleNavigate}
            />
          </div>
        </div>
      </Container>
    </section>
  );
}

export default MethodSection;
