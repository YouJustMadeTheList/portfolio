"use client";

import { useCallback, useState } from "react";
import { useLocale } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BlockReveal } from "@/components/fx/TextReveal";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { CaseCarousel } from "./CaseCarousel";
import { caseStudiesCopy, type CaseCardId } from "@/content/case-studies";

/** Ordine non negoziabile (ARCHITECTURE.md / spec §0): Data → Fintech → EdTech → Custom. */
const CARD_ORDER: CaseCardId[] = ["data", "fintech", "edtech", "custom"];

/**
 * 04 CASE STUDIES — "qui finisce lo stupore e comincia la prova".
 *
 * La sezione è solo il guscio: header editoriale (grotesque + serif italic aqua
 * sulla frase-chiave) e carosello. Scena 3D, drag e strumenti vivono dentro
 * CaseCarousel / carouselStage.
 */
export function CaseStudiesSection() {
  const locale = useLocale() as "it" | "en";
  const copy = caseStudiesCopy[locale];
  const reducedMotion = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  const handleNavigate = useCallback((nextIndex: number) => {
    setActiveIndex(((nextIndex % CARD_ORDER.length) + CARD_ORDER.length) % CARD_ORDER.length);
  }, []);

  return (
    <section id="progetti" className="section-padding relative overflow-hidden">
      {/* L2 — aurore asimmetriche: la sezione ha la sua temperatura luminosa. */}
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          top: "-6%",
          left: "-12%",
          width: "min(780px, 94vw)",
          height: "min(620px, 70vh)",
          background: "var(--aurora-abyss)",
          opacity: 0.4,
        }}
      />
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          bottom: "-14%",
          right: "-10%",
          width: "min(660px, 86vw)",
          height: "min(540px, 62vh)",
          background: "var(--aurora-deep)",
          opacity: 0.32,
        }}
      />

      <Container>
        <SectionHeader
          eyebrow={copy.sectionEyebrow}
          title={copy.sectionTitle}
          subtitle={copy.sectionSubtitle}
          align="center"
        />
      </Container>

      <Container width="wide">
        {/* Reveal d'ingresso del carosello: 150ms dopo il titolo (spec §5.1). */}
        <BlockReveal className="mt-12 sm:mt-14 lg:mt-16" delay={0.15}>
          <CaseCarousel
            cardIds={CARD_ORDER}
            activeIndex={activeIndex}
            onNavigate={handleNavigate}
            reducedMotion={reducedMotion}
          />
        </BlockReveal>
      </Container>
    </section>
  );
}

export default CaseStudiesSection;
