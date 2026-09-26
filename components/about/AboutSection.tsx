"use client";

import { useLocale } from "next-intl";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BlockReveal } from "@/components/fx/TextReveal";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { DnaHelixTimeline } from "./DnaHelixTimeline";
import { WritingShelf } from "./WritingShelf";
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

const header = {
  it: {
    eyebrow: "Traiettoria",
    title: "Due binari, ⟨non due fasi⟩.",
    subtitle:
      "Sviluppo e IA nascono al liceo. Il lavoro con i clienti, l'azienda, il Politecnico — oggi procedono in parallelo.",
  },
  en: {
    eyebrow: "Trajectory",
    title: "Two tracks, ⟨not two phases⟩.",
    subtitle:
      "Development and AI started in high school. Client work, my own company, the Politecnico — today they run in parallel.",
  },
};

/** Avvolge una sottostringa esatta in serif-italic aqua, lasciando intatto il copy. */
function withEmphasis(text: string, phrase: string): ReactNode {
  const at = phrase ? text.indexOf(phrase) : -1;
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <span className="serif-accent">{phrase}</span>
      {text.slice(at + phrase.length)}
    </>
  );
}

export function AboutSection() {
  const locale = useLocale() as "it" | "en";
  const copy = header[locale];
  const reducedMotion = usePrefersReducedMotion();

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
