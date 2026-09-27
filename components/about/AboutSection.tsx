"use client";

import { useLocale } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BlockReveal } from "@/components/fx/TextReveal";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { DnaHelixTimeline } from "./DnaHelixTimeline";
import { WritingShelf } from "./WritingShelf";
import { AboutMobile } from "./AboutMobile";
import { aboutHeader, withEmphasis } from "./aboutCopy";
import { useIsMobileVariant } from "@/components/variant/VariantProvider";
import {
  timelinePhases,
  timelineEvents,
  achievementBadges,
  aboutClosingStatement,
  aboutClosingEmphasis,
} from "@/content/about";

/**
 * 07 ABOUT / TRAIETTORIA.
 *
 * Il compito comunicativo della sezione (spec §0) governa tutto: la timeline non
 * deve raccontare "prima ho studiato, poi ho lavorato". Il titolo lo dice, la
 * doppia elica lo mostra, e la nota sotto la legenda lo chiude — tre livelli
 * ridondanti contro l'unico rischio di lettura in scansione veloce.
 *
 * `⟨…⟩` nel titolo è la marcatura letta da SectionHeader: la frase-chiave esce
 * in Instrument Serif italic aqua (ART-DIRECTION §2).
 */

export function AboutSection() {
  const locale = useLocale() as "it" | "en";
  const copy = aboutHeader[locale];
  const reducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobileVariant();

  // Variante mobile (telefoni): implementazione dedicata, stessi contenuti.
  if (isMobile) return <AboutMobile />;

  return (
    <section id="about" className="section-padding relative overflow-x-clip">
      {/* L2 — aurora di sezione: asimmetrica, mai centrata (ART-DIRECTION §3). */}
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          top: "4%",
          right: "-14%",
          width: "min(820px, 92vw)",
          height: "min(680px, 62vh)",
          background: "var(--aurora-aqua)",
          opacity: 0.4,
        }}
      />
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          bottom: "2%",
          left: "-16%",
          width: "min(720px, 86vw)",
          height: "min(600px, 56vh)",
          background: "var(--aurora-abyss)",
          opacity: 0.34,
        }}
      />

      <Container className="relative">
        <SectionHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          subtitle={copy.subtitle}
          align="center"
        />

        {/* L'elica vive DENTRO il contenitore: la v1 la lasciava a tutta pagina e
            le etichette di corsia finivano tagliate ai bordi del viewport. */}
        <div className="mt-12 lg:mt-16">
          <DnaHelixTimeline
            phases={timelinePhases}
            events={timelineEvents}
            badges={achievementBadges}
            locale={locale}
            reducedMotion={reducedMotion}
          />
        </div>
      </Container>

      <Container className="relative mt-14 lg:mt-16">
        <div className="mx-auto max-w-[68ch]">
          <span
            aria-hidden="true"
            className="block h-px w-full"
            style={{
              background:
                "linear-gradient(90deg, rgba(63,233,204,0) 0%, rgba(63,233,204,.32) 22%, rgba(63,233,204,.32) 78%, rgba(63,233,204,0) 100%)",
            }}
          />
          <BlockReveal
            as="p"
            className="mt-9 text-[length:var(--fs-lead)] leading-[var(--lh-lead)] text-[var(--text-mid)] [text-wrap:pretty]"
          >
            {withEmphasis(aboutClosingStatement[locale], aboutClosingEmphasis[locale])}
          </BlockReveal>
        </div>

        {/* "Scritti" non è più una coppia di card piatte ma una libreria 3D:
            un libro per articolo, il titolo sul dorso, la scheda in un popup
            con il controllo "Scopri" (richiesta esplicita del cliente). */}
        <WritingShelf />
      </Container>
    </section>
  );
}

export default AboutSection;
