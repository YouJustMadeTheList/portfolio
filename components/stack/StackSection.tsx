"use client";

import { useLocale } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
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

export default StackSection;
