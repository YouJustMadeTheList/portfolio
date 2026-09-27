"use client";

import { useLocale } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BlockReveal } from "@/components/fx/TextReveal";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { networkPeople } from "@/content/network";
import { SHOW_NETWORK_SECTION } from "@/config/features";
import { PersonCard } from "./PersonCard";
import { NetworkScrollRow } from "./NetworkScrollRow";
import { cn } from "@/lib/utils/cn";
import { NetworkMobile } from "./NetworkMobile";
import { useIsMobileVariant } from "@/components/variant/VariantProvider";

import { networkCopy } from "./networkCopy";

/**
 * Sezione 07bis "Rete" — spec: site-architecture/specs/07bis-rete.md.
 *
 * Nessuna prop dall'esterno (montata incondizionatamente come <NetworkSection />
 * da app/[locale]/d|m/page.tsx, vedi spec §8): locale e reduced-motion sono letti
 * internamente, così la responsabilità di apparire/sparire resta SEMPRE interna
 * al componente, basata sui dati (consentObtained per persona), non su un
 * interruttore esterno che qualcuno potrebbe dimenticare di controllare.
 *
 * SHOW_NETWORK_SECTION è un master switch solo dev/staging (config/features.ts):
 * anche a true, senza almeno una persona con consentObtained === true la
 * sezione resta non montata. In produzione l'interruttore reale è sempre e
 * solo il consenso per persona — GATING LOGIC INVARIATA in questo restyle.
 *
 * Visivamente allineata al resto del sistema v2: stesso SectionHeader (con
 * l'enfasi serif-italic aqua nel titolo, ART-DIRECTION §2) e stesso idioma
 * di reveal GSAP/BlockReveal delle altre sezioni, al posto delle timeline
 * Framer Motion ad-hoc della v1 — resta comunque la sezione più sobria del
 * sito (nessun reveal "particellare"), per rispetto dello spirito §5 dello
 * spec 07bis.
 */
export function NetworkSection() {
  const locale = useLocale() as "it" | "en";
  const reducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobileVariant();

  // Variante mobile (telefoni): striscia swipe dedicata, stesso gating.
  if (isMobile) return <NetworkMobile />;

  if (!SHOW_NETWORK_SECTION) return null;

  const visiblePeople = networkPeople.filter((p) => p.consentObtained === true);

  if (visiblePeople.length === 0) {
    // Nessuna persona con consenso: la sezione non monta. Niente heading,
    // niente wrapper, niente stato "vuoto"/"presto qui" — vedi spec §4.
    return null;
  }

  const t = networkCopy[locale];
  const n = visiblePeople.length;

  const cards = visiblePeople.map((p, i) => (
    <BlockReveal key={p.id} delay={i * 0.08} className="h-full">
      <PersonCard
        name={p.name}
        context={locale === "it" ? p.contextIt : p.contextEn}
        publicUrl={p.publicUrl}
        publicUrlLabel={p.publicUrl ? (p.publicUrlLabel?.[locale] ?? undefined) : undefined}
      />
    </BlockReveal>
  ));

  return (
    <section id="rete" className="section-padding relative overflow-x-clip">
      {/* L2 — aurora di sezione, sobria e asimmetrica (ART-DIRECTION §3). */}
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          top: "6%",
          left: "-12%",
          width: "min(680px, 84vw)",
          height: "min(520px, 54vh)",
          background: "var(--aurora-deep)",
          opacity: 0.3,
        }}
      />

      <Container className="relative max-w-[1200px]">
        <SectionHeader eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} align="center" />

        <div className="mt-12">
          {n >= 4 ? (
            <NetworkScrollRow reducedMotion={reducedMotion}>{cards}</NetworkScrollRow>
          ) : n === 1 ? (
            <div className="mx-auto max-w-[360px]">{cards[0]}</div>
          ) : (
            <div
              className={cn(
                "grid justify-center gap-4",
                n === 2 && "grid-cols-1 sm:grid-cols-2",
                n === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
              )}
            >
              {visiblePeople.map((p, i) => (
                <div key={p.id} className="mx-auto w-full max-w-[360px]">
                  {cards[i]}
                </div>
              ))}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}

export default NetworkSection;
