"use client";

import { useCallback, useState } from "react";
import { useLocale } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { PhaseDeckMobile } from "./PhaseDeckMobile";
import { methodCopy } from "@/content/method";

/**
 * 05 METODO — variante MOBILE (telefoni).
 *
 * Stesso header e stesse quattro fasi della desktop, ma:
 *  · il Dealer NON viene montato (niente immagini/canvas da scaricare: sul
 *    telefono era comunque nascosto sotto lg);
 *  · il mazzo è PhaseDeckMobile — 2D, transizioni CSS, swipe nativo, tutte le
 *    facce nel DOM.
 */
export function MethodMobile() {
  const locale = useLocale() as "it" | "en";
  const copy = methodCopy[locale];
  const reducedMotion = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const n = copy.phases.length;
  const handleNavigate = useCallback((i: number) => setActiveIndex(((i % n) + n) % n), [n]);

  return (
    <section id="metodo" className="section-padding relative overflow-hidden">
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          top: "6%",
          right: "-34%",
          width: "110vw",
          height: "60vh",
          background: "var(--aurora-abyss)",
          opacity: 0.4,
        }}
      />
      <Container className="relative">
        <SectionHeader eyebrow={copy.eyebrow} title={copy.title} />
        <div className="mt-10">
          <PhaseDeckMobile
            phases={copy.phases}
            ui={copy.ui}
            reducedMotion={reducedMotion}
            activeIndex={activeIndex}
            onNavigate={handleNavigate}
          />
        </div>
      </Container>
    </section>
  );
}

export default MethodMobile;
