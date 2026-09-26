"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAnimationControls } from "framer-motion";
import { Tactile } from "@/components/ui/Tactile";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils/cn";
import type { Locale, ServicePackage, ServicePackageId } from "@/content/services";
import { FALL_MS, PricingBlock, playFall, resetFall } from "./PricingBlock";

type PricingCardProps = {
  pkg: ServicePackage;
  locale: Locale;
  onCtaClick: (packageId: ServicePackageId) => void;
};

/**
 * Meccanismo A del guard sul prezzo placeholder (specs/06-servizi-pricing.md
 * §5, §8) — NON RIMUOVERE / NON SEMPLIFICARE:
 *
 *   - il badge "⚠ DA DEFINIRE"/"⚠ TO DEFINE" compare SOLO fuori produzione,
 *     così non rischia di finire live per un errore di build flag;
 *   - in produzione, se `priceStatus` fosse ancora 'placeholder' a runtime,
 *     il testo `[DA COMPILARE]`/`[TO BE FILLED IN]` resta comunque visibile
 *     dentro `priceLabel` stesso — è un bug visibile per scelta, MAI un
 *     fallback silenzioso a un numero "plausibile" inventato in fase di
 *     implementazione.
 *
 * Il blocco vero (build-time gate) vive in scripts/check-pricing.ts, fuori
 * dal perimetro di questo componente.
 */
// NODE_ENV e non una variabile custom: su Vercel NEXT_PUBLIC_ENV non esiste e il
// badge "DA DEFINIRE" sarebbe finito in produzione.
const isNonProd = process.env.NODE_ENV !== "production";

/** Margine oltre la durata della caduta: se l'animazione non risolvesse (tab in
    background, controls scollegati), l'handoff parte comunque. Nessun visitatore
    resta fermo a guardare un'animazione senza navigazione. */
const FALL_FAILSAFE_MS = FALL_MS + 260;
/** Quando rimettere in piedi il blocco: a scroll verso Contatti già avviato. */
const FALL_RESET_MS = 1100;

/**
 * Nessuna delle tre card è "in evidenza" (specs/06 §2: decisione editoriale
 * esplicita — la sezione qualifica lead per platee diverse, non tier di uno
 * stesso prodotto; evidenziarne una introdurrebbe un bias che nuoce alla
 * funzione della sezione). Le tre restano visivamente alla pari: la stessa
 * superficie in vetro, lo stesso spessore, la stessa reazione.
 *
 * Dalla revisione del cliente, la card è un PARALLELEPIPEDO (vedi PricingBlock)
 * e il CTA la fa CADERE prima di passare la mano a Contatti:
 *
 *     click → caduta (~560ms) → onCtaClick(pkg.id) → localStorage +
 *     CustomEvent "servizi:project-type-selected" + scroll a #contatti
 *
 * L'handoff è invariato: questo componente non conosce né la chiave né
 * l'evento, si limita a ritardare di poco la chiamata che già faceva. Sotto
 * `prefers-reduced-motion` la caduta è saltata del tutto e l'handoff parte
 * nello stesso tick del click.
 */
export function PricingCard({ pkg, locale, onCtaClick }: PricingCardProps) {
  const isPlaceholder = pkg.priceStatus === "placeholder";
  const ctaText = pkg.ctaLabel[locale].replace(/\s*→\s*$/, "");
  // "Su misura — prezzo definito dopo una call" → termine + qualifica.
  const [priceMain, ...qualifierParts] = pkg.priceLabel[locale].split(/\s+—\s+/);
  const priceQualifier = qualifierParts.join(" — ");
  const placeholderNote =
    locale === "it"
      ? "Prezzo non ancora confermato dal cliente — non pubblicare senza aggiornare content/services.ts"
      : "Price not yet confirmed by the client — do not ship without updating content/services.ts";

  const reducedMotion = usePrefersReducedMotion();
  const controls = useAnimationControls();
  const [falling, setFalling] = useState(false);
  const fallingRef = useRef(false);
  const mountedRef = useRef(true);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (resetTimer.current !== undefined) window.clearTimeout(resetTimer.current);
    };
  }, []);

  const handleCta = useCallback(async () => {
    if (fallingRef.current) return;

    if (reducedMotion) {
      onCtaClick(pkg.id);
      return;
    }

    fallingRef.current = true;
    setFalling(true);

    try {
      await Promise.race([
        playFall(controls),
        new Promise((resolve) => window.setTimeout(resolve, FALL_FAILSAFE_MS)),
      ]);
    } catch {
      // l'handoff non può dipendere dall'esito dell'animazione
    }

    onCtaClick(pkg.id);

    resetTimer.current = window.setTimeout(() => {
      if (!mountedRef.current) return;
      fallingRef.current = false;
      setFalling(false);
      void resetFall(controls);
    }, FALL_RESET_MS);
  }, [controls, onCtaClick, pkg.id, reducedMotion]);

  return (
    <PricingBlock
      controls={controls}
      reducedMotion={reducedMotion}
      inert={falling}
      className="[border-radius:var(--radius-lg)]"
      faceClassName="glass-surface group p-7 sm:p-8"
    >
      <h3
        style={{ transform: "translateZ(28px)" }}
        className="font-[family-name:var(--font-display)] text-[length:var(--fs-h3)] font-medium leading-[var(--lh-h3)] tracking-[var(--ls-h3)] text-[var(--text-hi)]"
      >
        {pkg.name[locale]}
      </h3>

      <p
        style={{ transform: "translateZ(20px)" }}
        className="mt-4 flex-none text-[length:var(--fs-body)] leading-[var(--lh-body)] text-[var(--text-mid)] [text-wrap:pretty]"
      >
        {pkg.audience[locale]}
      </p>

      {/* Prezzo — Space Grotesk grande (ART-DIRECTION §6 "Servizi"). Nessun
          pacchetto espone una cifra: il framing ("Su misura", "Su preventivo")
          è una scelta editoriale, quindi va composto come tale — una label
          mono "Investimento", il termine in display e, dopo " — ", la
          qualifica in serif italic aqua. Si legge come una decisione, non come
          un numero mancante. Il guard del placeholder resta nel colore/stile:
          vedi commento di testa del file. */}
      <div
        style={{ transform: "translateZ(34px)" }}
        className="mt-7 border-t border-[var(--line)] pt-5"
      >
        <p className="font-[family-name:var(--font-mono)] text-[10.5px] font-medium uppercase tracking-[var(--ls-micro)] text-[var(--text-low)]">
          {locale === "it" ? "Investimento" : "Investment"}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <p
            className={cn(
              "font-[family-name:var(--font-display)] text-[clamp(1.35rem,1.05rem+1.1vw,1.85rem)] font-medium leading-[1.1] tracking-[-0.015em] [font-variant-numeric:tabular-nums]",
              isPlaceholder ? "italic text-[var(--text-mid)]" : "text-[var(--text-hi)]",
            )}
          >
            {priceMain}
            {priceQualifier ? (
              <span className="mt-1.5 block font-[family-name:var(--font-serif)] text-[clamp(1.02rem,0.95rem+0.3vw,1.15rem)] font-normal italic leading-[1.3] tracking-normal text-[var(--aqua-300)] [text-shadow:var(--glow-text)]">
                {priceQualifier}
              </span>
            ) : null}
          </p>
          {isPlaceholder && isNonProd ? (
            <Tactile
              as="span"
              intensity="subtle"
              role="note"
              aria-label={placeholderNote}
              className="inline-flex items-center rounded-[var(--radius-full)] border border-[var(--state-error)] px-2.5 py-1 font-[family-name:var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--state-error)]"
            >
              {locale === "it" ? "⚠ DA DEFINIRE" : "⚠ TO DEFINE"}
            </Tactile>
          ) : null}
        </div>
      </div>

      <ul style={{ transform: "translateZ(26px)" }} className="mt-7 flex flex-col gap-3">
        {pkg.features[locale].map((feature) => (
          <Tactile as="li" intensity="subtle" key={feature} className="list-none">
            <span className="flex gap-2.5 text-[length:var(--fs-body-sm)] leading-[1.55] text-[var(--text-mid)]">
              <span aria-hidden="true" className="text-[var(--aqua-400)] [text-shadow:var(--glow-xs)]">
                ✓
              </span>
              {feature}
            </span>
          </Tactile>
        ))}
      </ul>

      {/* Il translateZ sta sul wrapper, non sul bottone: Tactile compone il
          proprio transform da x/y (magnetic) e scarterebbe la stringa. */}
      <div style={{ transform: "translateZ(40px)" }} className="mt-auto pt-9">
        <Tactile
          as="button"
          type="button"
          intensity="default"
          magnetic
          magneticMax={8}
          onClick={handleCta}
          className={cn(
            "inline-flex w-fit items-center gap-1.5",
            "font-[family-name:var(--font-body)] text-sm font-medium text-[var(--aqua-300)]",
            "outline-none transition-[text-shadow] duration-[var(--dur-base)] ease-[var(--ease-out)]",
            "group-hover:[text-shadow:var(--glow-text)]",
            "focus-visible:underline focus-visible:decoration-[var(--aqua-400)] focus-visible:underline-offset-4",
          )}
        >
          {ctaText}
          <span
            aria-hidden="true"
            className="inline-block transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:translate-x-1.5"
          >
            →
          </span>
        </Tactile>
      </div>
    </PricingBlock>
  );
}

export default PricingCard;
