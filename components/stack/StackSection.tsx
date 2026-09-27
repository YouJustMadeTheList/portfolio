"use client";

import { useLocale } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeader, parseEmphasis } from "@/components/ui/SectionHeader";
import { useIsMobileVariant } from "@/components/variant/VariantProvider";
import { BlockReveal } from "@/components/fx/TextReveal";
import { Tactile } from "@/components/ui/Tactile";
import { stackIntro, stackItems, type Locale, type StackItem } from "@/content/stack";

/**
 * "Sotto il cofano" — il colophon del sito, subito prima del footer.
 *
 * Prende il posto della riga "Costruito con…" che stava nel footer: invece di
 * un elenco di nomi, sei tessere che dicono cosa fa ciascun pezzo. Layout
 * editoriale a due colonne su desktop (header fermo a sinistra, tessere a
 * destra), una colonna su mobile.
 *
 * Nulla qui è cliccabile: le tessere sono card DECORATIVE (ART-DIRECTION §5.1)
 * → wobble + tilt + squash, derivati da Tactile. I nomi degli strumenti sono
 * chip decorativi con il loro piccolo molleggio.
 */
export function StackSection() {
  const locale = useLocale() as Locale;
  const mobile = useIsMobileVariant();

  if (mobile) return <MobileStackSection locale={locale} />;

  return (
    <section
      id="stack"
      aria-labelledby="stack-title"
      className="section-padding relative overflow-x-clip"
    >
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          top: "4%",
          right: "-18%",
          width: "min(720px, 92vw)",
          height: "min(560px, 60vh)",
          background: "var(--aurora-abyss)",
          opacity: 0.34,
        }}
      />
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          bottom: "-10%",
          left: "-14%",
          width: "min(560px, 80vw)",
          height: "min(460px, 50vh)",
          background: "var(--aurora-deep)",
          opacity: 0.3,
        }}
      />

      <Container className="relative">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 xl:gap-24">
          <div className="lg:sticky lg:top-[calc(var(--nav-h)+48px)] lg:self-start">
            <SectionHeader
              id="stack-title"
              eyebrow={stackIntro.eyebrow[locale]}
              title={stackIntro.title[locale]}
              subtitle={stackIntro.subtitle[locale]}
            />
            <BlockReveal delay={0.15}>
              <p className="mt-8 flex items-center gap-3 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[var(--ls-micro)] text-[var(--text-low)]">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--aqua-400)] shadow-[var(--glow-xs)]" />
                {locale === "it" ? "Fatto a mano · IT / EN" : "Hand-built · IT / EN"}
              </p>
            </BlockReveal>
          </div>

          <ol className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            {stackItems.map((item, i) => (
              <BlockReveal key={item.id} as="li" delay={0.06 * i} className="h-full">
                <StackTile item={item} index={i} locale={locale} />
              </BlockReveal>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}

function StackTile({ item, index, locale }: { item: StackItem; index: number; locale: Locale }) {
  return (
    <Tactile
      as="article"
      intensity="subtle"
      tilt3d
      tiltMax={8}
      className="glass-surface flex h-full flex-col p-6 sm:p-7"
    >
      <div className="flex items-center gap-3" style={{ transform: "translateZ(18px)" }}>
        <span className="font-[family-name:var(--font-mono)] text-[11px] font-medium tracking-[0.1em] text-[var(--aqua-400)] [text-shadow:var(--glow-text)] [font-variant-numeric:tabular-nums]">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-[var(--line-hi)] to-transparent" />
      </div>

      <h3
        className="mt-5 font-[family-name:var(--font-display)] text-[1.2rem] font-medium leading-[1.2] tracking-[-0.01em] text-[var(--text-hi)]"
        style={{ transform: "translateZ(26px)" }}
      >
        {item.title[locale]}
      </h3>

      <p
        className="mt-3 text-[length:var(--fs-body-sm)] leading-[1.6] text-[var(--text-mid)] [text-wrap:pretty]"
        style={{ transform: "translateZ(16px)" }}
      >
        {item.body[locale]}
      </p>

      <ul
        className="mt-auto flex list-none flex-wrap gap-1.5 pt-6"
        style={{ transform: "translateZ(22px)" }}
        aria-label={locale === "it" ? "Strumenti" : "Tools"}
      >
        {item.tools.map((tool) => (
          <Tactile
            as="li"
            key={tool}
            intensity="subtle"
            className="rounded-[var(--radius-full)] border border-[var(--line)] bg-[rgba(6,12,16,0.6)] px-2.5 py-1 font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.02em] text-[var(--text-hi)]"
          >
            {tool}
          </Tactile>
        ))}
      </ul>
    </Tactile>
  );
}

/**
 * Variante MOBILE — elenco a fisarmonica nativo (<details>/<summary>): zero
 * JavaScript, accessibile da tastiera e screen reader, e TUTTO il testo resta
 * nel DOM (Google indicizza la versione mobile). Chiuso sta in circa uno
 * schermo: numero · titolo · una riga con gli strumenti; aperto mostra la
 * descrizione e i chip. Nessun tilt, nessun wobble, nessun blur.
 */
function MobileStackSection({ locale }: { locale: Locale }) {
  return (
    <section id="stack" aria-labelledby="stack-title" className="relative overflow-x-clip py-16">
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          top: "0%",
          right: "-35%",
          width: "110vw",
          height: "55vh",
          background: "var(--aurora-abyss)",
          opacity: 0.3,
        }}
      />
      <div className="relative px-5">
        <p className="eyebrow">{stackIntro.eyebrow[locale]}</p>
        <h2
          id="stack-title"
          className="mt-4 font-[family-name:var(--font-display)] text-[length:var(--fs-h2)] font-medium leading-[var(--lh-h2)] tracking-[var(--ls-h2)] text-[var(--text-hi)] [text-wrap:balance]"
        >
          {parseEmphasis(stackIntro.title[locale])}
        </h2>
        <p className="mt-3 text-[15px] leading-[1.55] text-[var(--text-mid)] [text-wrap:pretty]">
          {stackIntro.subtitle[locale]}
        </p>

        <ol className="mt-6 list-none overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[rgba(11,20,26,0.72)]">
          {stackItems.map((item, i) => (
            <li key={item.id} className="border-b border-[var(--line)] last:border-b-0">
              <details className="group">
                <summary className="flex min-h-[58px] cursor-pointer list-none items-center gap-3 px-4 py-2.5 outline-none [-webkit-tap-highlight-color:transparent] active:bg-[rgb(var(--aqua-rgb)/0.06)] focus-visible:[outline:2px_solid_var(--focus-ring)] focus-visible:-outline-offset-2 [&::-webkit-details-marker]:hidden">
                  <span className="w-6 shrink-0 font-[family-name:var(--font-mono)] text-[11px] font-medium tracking-[0.08em] text-[var(--aqua-400)] [font-variant-numeric:tabular-nums]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-[family-name:var(--font-display)] text-[16px] font-medium leading-[1.25] text-[var(--text-hi)]">
                      {item.title[locale]}
                    </span>
                    <span className="truncate font-[family-name:var(--font-mono)] text-[11px] tracking-[0.02em] text-[var(--text-low)]">
                      {item.tools.join(" · ")}
                    </span>
                  </span>
                  <svg
                    aria-hidden="true"
                    width="12"
                    height="8"
                    viewBox="0 0 11 7"
                    fill="none"
                    className="shrink-0 text-[var(--text-mid)] transition-transform duration-200 group-open:rotate-180"
                  >
                    <path d="M1 1l4.5 4.5L10 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <div className="px-4 pb-4 pl-[52px]">
                  <p className="text-[14.5px] leading-[1.6] text-[var(--text-mid)] [text-wrap:pretty]">
                    {item.body[locale]}
                  </p>
                  <ul
                    className="mt-3 flex list-none flex-wrap gap-1.5"
                    aria-label={locale === "it" ? "Strumenti" : "Tools"}
                  >
                    {item.tools.map((tool) => (
                      <li
                        key={tool}
                        className="rounded-[var(--radius-full)] border border-[var(--line)] bg-[rgba(6,12,16,0.6)] px-2.5 py-1 font-[family-name:var(--font-mono)] text-[11px] text-[var(--text-hi)]"
                      >
                        {tool}
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </li>
          ))}
        </ol>

        <p className="mt-5 flex items-center gap-3 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[var(--ls-micro)] text-[var(--text-low)]">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--aqua-400)] shadow-[var(--glow-xs)]" />
          {locale === "it" ? "Fatto a mano · IT / EN" : "Hand-built · IT / EN"}
        </p>
      </div>
    </section>
  );
}

export default StackSection;
