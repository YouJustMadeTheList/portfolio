"use client";

import { useId, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useSnapIndex } from "@/components/case-studies/useSnapIndex";
import { cn } from "@/lib/utils/cn";
import {
  servicePackages,
  servicesIntro,
  type Locale,
  type ServicePackageId,
} from "@/content/services";
import { handOffToContact } from "./handoff";
import styles from "./services-mobile.module.css";

const isNonProd = process.env.NODE_ENV !== "production";

/**
 * 06 SERVIZI & PRICING — variante MOBILE.
 *
 * I tre pacchetti in una fila a scroll-snap nativo, con un controllo
 * segmentato sopra (i tre nomi) sincronizzato da IntersectionObserver: si
 * confrontano in uno schermo invece di tre. Niente parallelepipedo 3D né
 * caduta: il CTA ha solo uno stato di pressione (scale), e l'handoff parte
 * nello stesso tick del click.
 *
 * HANDOFF → Contatti: stessa identica funzione della desktop (./handoff.ts):
 * localStorage[SERVICES_HANDOFF_KEY] + CustomEvent
 * "servizi:project-type-selected" { projectType, packageId } + scroll a #contatti.
 *
 * Nessun testo manca: la descrizione del pubblico ("audience") è compressa a
 * tre righe con "Leggi tutto", ma resta integralmente nel DOM.
 */
export function ServicesMobile() {
  const locale = useLocale() as Locale;
  const uid = useId();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { index, goTo } = useSnapIndex(scrollerRef, servicePackages.length);
  const [expanded, setExpanded] = useState<Partial<Record<ServicePackageId, boolean>>>({});

  const t = {
    investment: locale === "it" ? "Investimento" : "Investment",
    more: locale === "it" ? "Leggi tutto" : "Read more",
    less: locale === "it" ? "Riduci" : "Show less",
    packages: locale === "it" ? "Pacchetti" : "Packages",
  };

  return (
    <section id="servizi" className={cn("section-padding", styles.section)}>
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          top: "10%",
          right: "-40%",
          width: "120vw",
          height: "60vh",
          background: "var(--aurora-abyss)",
          opacity: 0.3,
        }}
      />

      <Container>
        <SectionHeader
          eyebrow={servicesIntro.eyebrow[locale]}
          title={servicesIntro.title[locale]}
          subtitle={servicesIntro.subtitle[locale]}
        />

        {/* controllo segmentato: salta al pacchetto, riflette quello in vista */}
        <div className={styles.segments} role="group" aria-label={t.packages}>
          <span
            className={styles.segmentThumb}
            aria-hidden="true"
            style={{ transform: `translate3d(${index * 100}%, 0, 0)` }}
          />
          {servicePackages.map((pkg, i) => (
            <button
              key={pkg.id}
              type="button"
              className={styles.segment}
              aria-controls={`${uid}-${pkg.id}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => goTo(i)}
            >
              {pkg.name[locale]}
            </button>
          ))}
        </div>
      </Container>

      <div ref={scrollerRef} className={styles.track}>
        {servicePackages.map((pkg) => {
          const isPlaceholder = pkg.priceStatus === "placeholder";
          const [priceMain, ...rest] = pkg.priceLabel[locale].split(/\s+—\s+/);
          const priceQualifier = rest.join(" — ");
          const ctaText = pkg.ctaLabel[locale].replace(/\s*→\s*$/, "");
          const open = Boolean(expanded[pkg.id]);
          const audienceId = `${uid}-${pkg.id}-aud`;
          return (
            <article
              key={pkg.id}
              id={`${uid}-${pkg.id}`}
              data-snap-item
              className={styles.card}
              aria-label={pkg.name[locale]}
            >
              <h3 className={styles.name}>{pkg.name[locale]}</h3>

              <div className={styles.price}>
                <p className={styles.label}>{t.investment}</p>
                <p className={cn(styles.priceMain, isPlaceholder && styles.pricePlaceholder)}>
                  {priceMain}
                  {isPlaceholder && isNonProd ? (
                    <span className={styles.placeholderBadge}>
                      {locale === "it" ? "⚠ DA DEFINIRE" : "⚠ TO DEFINE"}
                    </span>
                  ) : null}
                </p>
                {priceQualifier ? <p className={styles.priceSub}>{priceQualifier}</p> : null}
              </div>

              <ul className={styles.features}>
                {pkg.features[locale].map((f) => (
                  <li key={f} className={styles.feature}>
                    <span aria-hidden="true" className={styles.check}>
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className={styles.audienceWrap}>
                <p
                  id={audienceId}
                  className={cn(styles.audience, !open && styles.audienceClamped)}
                >
                  {pkg.audience[locale]}
                </p>
                <button
                  type="button"
                  className={styles.more}
                  aria-expanded={open}
                  aria-controls={audienceId}
                  onClick={() => setExpanded((s) => ({ ...s, [pkg.id]: !s[pkg.id] }))}
                >
                  {open ? t.less : t.more}
                  <span aria-hidden="true">{open ? "−" : "+"}</span>
                </button>
              </div>

              <button
                type="button"
                className={styles.cta}
                onClick={() => handOffToContact(pkg.id)}
              >
                {ctaText}
                <span aria-hidden="true">→</span>
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default ServicesMobile;
