"use client";

import { Button } from "@/components/ui/Button";
import { Tactile } from "@/components/ui/Tactile";
import { parseEmphasis } from "@/components/ui/SectionHeader";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

export type NotFoundCopy = {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  secondary: string;
};

/**
 * 404 — "il filo si interrompe qui".
 *
 * Riprende la metafora della cucitura dell'hero: un "404" in cui lo zero è
 * l'enfasi serif-italic aqua, e sotto un'impuntura che si disegna e si spezza.
 * Usata sia dentro il layout di locale (app/[locale]/not-found.tsx, con nav e
 * footer) sia dal fallback globale (app/global-not-found.tsx), per questo
 * riceve le stringhe come prop e non dipende dal provider di next-intl.
 */
export function NotFoundView({
  copy,
  homeHref,
  contactHref,
  extra,
}: {
  copy: NotFoundCopy;
  homeHref: string;
  contactHref?: string;
  /** Riga aggiuntiva (es. la traduzione, nel fallback globale bilingue). */
  extra?: string;
}) {
  const reduced = usePrefersReducedMotion();

  return (
    <section className="relative isolate flex min-h-[100svh] items-center overflow-clip px-5 pb-24 pt-[calc(var(--nav-h)+10vh)] sm:px-8">
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          top: "-10%",
          left: "-16%",
          width: "min(820px, 100vw)",
          height: "min(640px, 70vh)",
          background: "var(--aurora-abyss)",
          opacity: 0.4,
        }}
      />
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          bottom: "-12%",
          right: "-12%",
          width: "min(620px, 90vw)",
          height: "min(520px, 60vh)",
          background: "var(--aurora-aqua)",
          opacity: 0.26,
        }}
      />

      <div className="relative mx-auto w-full max-w-[880px]">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
        </div>

        {/* Il numero: decorativo (il senso è nel titolo), quindi aria-hidden
            e con il suo molleggio (§5.1: decorativo → wobble). */}
        <Tactile
          as="p"
          intensity="subtle"
          aria-hidden
          className="mt-6 flex w-fit select-none items-baseline font-[family-name:var(--font-display)] font-medium leading-[0.8] tracking-[-0.05em] text-[var(--text-hi)]"
          style={{ fontSize: "clamp(7rem, 4rem + 16vw, 15rem)" }}
        >
          <span>4</span>
          <span className="serif-accent px-[0.04em] font-normal tracking-normal">0</span>
          <span>4</span>
        </Tactile>

        <Stitch reduced={reduced} />

        <h1 className="mt-10 max-w-[20ch] font-[family-name:var(--font-display)] text-[length:var(--fs-h2)] font-medium leading-[var(--lh-h2)] tracking-[var(--ls-h2)] text-[var(--text-hi)] [text-wrap:balance]">
          {parseEmphasis(copy.title)}
        </h1>
        <p className="mt-5 max-w-[52ch] text-[length:var(--fs-lead)] leading-[var(--lh-lead)] text-[var(--text-mid)] [text-wrap:pretty]">
          {copy.body}
        </p>
        {extra ? (
          <p className="mt-3 max-w-[52ch] font-[family-name:var(--font-serif)] text-[1.1rem] italic text-[var(--text-low)]">
            {extra}
          </p>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Button href={homeHref} size="lg">
            <span aria-hidden="true">←</span>
            {copy.cta}
          </Button>
          {contactHref ? (
            <Button href={contactHref} variant="ghost" size="sm" className="text-[11px]">
              {copy.secondary}
              <span aria-hidden="true">→</span>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** Impuntura tratteggiata che si disegna e si interrompe con un capo sfilato. */
function Stitch({ reduced }: { reduced: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 520 28"
      className="mt-4 h-7 w-[min(520px,100%)] overflow-visible [filter:drop-shadow(var(--glow-xs))]"
      fill="none"
    >
      <path
        d="M2 16 C 80 10, 160 22, 240 15 S 360 9, 392 14"
        stroke="var(--aqua-400)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="10 8"
        className={reduced ? undefined : "nf-stitch"}
      />
      {/* Il capo sfilato: il filo che pende dopo lo strappo. */}
      <path
        d="M402 13 c 10 -2, 16 4, 20 10 s 10 6, 16 2"
        stroke="var(--aqua-300)"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.7"
        className={reduced ? undefined : "nf-thread"}
      />
      <style>{`
        .nf-stitch { stroke-dashoffset: 0; animation: nf-draw 1.6s var(--ease-out) both; }
        .nf-thread { transform-origin: 402px 13px; animation: nf-sway 4.8s ease-in-out 1.6s infinite; }
        @keyframes nf-draw { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
        @keyframes nf-sway { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(7deg); } }
      `}</style>
    </svg>
  );
}

export default NotFoundView;
