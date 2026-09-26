"use client";

import { useLocale } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BlockReveal } from "@/components/fx/TextReveal";
import { smoothScrollTo } from "@/components/fx/SmoothScroll";
import { PricingCard } from "./PricingCard";
import {
  PACKAGE_TO_PROJECT_TYPE,
  SERVICES_HANDOFF_KEY,
  servicePackages,
  servicesIntro,
  type Locale,
  type ServicePackageId,
} from "@/content/services";

/**
 * 06 SERVIZI & PRICING — tre pacchetti-tipo, non un listino (specs/06 §1).
 *
 * Handoff verso Contatti (contratto documentato in dettaglio in
 * content/services.ts, accanto a SERVICES_HANDOFF_KEY — NON RINOMINARE la
 * chiave né il nome/shape dell'evento, un altro agente ne possiede il
 * consumer nel form Contatti): scrive in localStorage + spedisce un
 * CustomEvent, poi fa scroll fluido a #contatti via Lenis
 * (`smoothScrollTo`, ART-DIRECTION §4 — mai uno scroll nativo quando Lenis
 * guida lo scroll del sito).
 */
function handOffToContact(packageId: ServicePackageId) {
  const projectType = PACKAGE_TO_PROJECT_TYPE[packageId];

  try {
    window.localStorage.setItem(SERVICES_HANDOFF_KEY, projectType);
  } catch {
    // localStorage indisponibile (privacy mode, ecc.) — non bloccante,
    // il CustomEvent sotto resta il canale primario per un consumer già montato.
  }

  window.dispatchEvent(
    new CustomEvent("servizi:project-type-selected", {
      detail: { projectType, packageId },
    }),
  );

  smoothScrollTo("#contatti");
}

export function ServicesSection() {
  const locale = useLocale() as Locale;

  return (
    <section id="servizi" className="section-padding relative overflow-x-clip">
      {/* L2 — aurora di sezione, asimmetrica (ART-DIRECTION §3): la sezione
          precedente/successiva non deve mai leggersi come nero piatto. */}
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          top: "-8%",
          right: "-16%",
          width: "min(760px, 92vw)",
          height: "min(620px, 64vh)",
          background: "var(--aurora-abyss)",
          opacity: 0.36,
        }}
      />
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          bottom: "-14%",
          left: "-12%",
          width: "min(660px, 84vw)",
          height: "min(560px, 56vh)",
          background: "var(--aurora-aqua)",
          opacity: 0.3,
        }}
      />

      <Container className="relative">
        <SectionHeader
          eyebrow={servicesIntro.eyebrow[locale]}
          title={servicesIntro.title[locale]}
          subtitle={servicesIntro.subtitle[locale]}
          align="center"
          className="mx-auto max-w-2xl"
        />

        <div className="mx-auto mt-14 grid max-w-[1360px] grid-cols-1 gap-6 lg:mt-16 lg:grid-cols-3">
          {servicePackages.map((pkg, index) => (
            <BlockReveal key={pkg.id} delay={index * 0.12} className="h-full">
              <PricingCard pkg={pkg} locale={locale} onCtaClick={handOffToContact} />
            </BlockReveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

export default ServicesSection;
