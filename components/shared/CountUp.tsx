"use client";

import { useEffect, useRef, useState } from "react";

export type CountUpProps = {
  from?: number;
  to: number;
  durationMs: number;
  locale: "it" | "en";
  reducedMotion: boolean;
  className?: string;
  /** Cifre decimali (es. 1 → "1,5" in IT, "1.5" in EN). Default 0. */
  decimals?: number;
  /** Testo immutabile prima del numero (es. "oltre "). */
  prefix?: string;
  /** Testo immutabile dopo il numero (es. " milioni", "+", "K"). */
  suffix?: string;
  /**
   * Forma LETTERALE del valore finale, così come compare nello spec.
   * È ciò che viene renderizzato in SSR, senza JS e sotto prefers-reduced-motion:
   * il conteggio è solo un modo di arrivarci, mai una ri-formattazione del dato.
   */
  formatted?: string;
  /** Il conteggio parte solo quando diventa true (card in foreground e in viewport). */
  active?: boolean;
  delayMs?: number;
};

/** Approssimazione JS di --ease-out (cubic-bezier(0.16,1,0.3,1)) per rAF puro. */
function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Counter numerico condiviso — Card A (DataScatter), Card B (VolatilityDial),
 * Card D (ComparisonBarChart).
 *
 * Il separatore delle migliaia è locale-aware e applicato ad OGNI frame, non
 * solo al valore finale (04-case-studies.md §5.2), e i numerali sono tabulari
 * così la scatola non balla cifra per cifra.
 *
 * Il valore a riposo è `formatted` quando fornito: nessun numero viene mai
 * ri-derivato o riformattato dal componente, che si limita ad attraversare
 * l'intervallo per arrivare alla stringa letterale dello spec.
 */
export function CountUp({
  from = 0,
  to,
  durationMs,
  locale,
  reducedMotion,
  className,
  decimals = 0,
  prefix = "",
  suffix = "",
  formatted,
  active = true,
  delayMs = 0,
}: CountUpProps) {
  const [value, setValue] = useState<number | null>(null); // null = mostra il valore finale letterale
  const rafRef = useRef<number | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const stop = () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
    };

    if (reducedMotion) {
      stop();
      // il valore finale letterale, senza attraversare l'intervallo
      rafRef.current = requestAnimationFrame(() => setValue(null));
      return stop;
    }

    if (!active) {
      // in attesa del proprio turno: il contatore si arma sul valore iniziale.
      // Il primo render (SSR, no-JS) mostra comunque la stringa letterale.
      stop();
      rafRef.current = requestAnimationFrame(() => setValue(from));
      return stop;
    }

    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / Math.max(1, durationMs));
        if (t >= 1) {
          setValue(null); // atterra sulla stringa letterale
          return;
        }
        setValue(from + (to - from) * easeOut(t));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    if (delayMs > 0) {
      timerRef.current = setTimeout(run, delayMs);
    } else {
      run();
    }

    return stop;
  }, [from, to, durationMs, reducedMotion, active, delayMs]);

  const formatter = new Intl.NumberFormat(locale === "it" ? "it-IT" : "en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    // it-IT di default NON raggruppa i numeri a quattro cifre ("2000"): senza
    // questo, un contatore che deve atterrare su "2.000" cambierebbe formato
    // all'ultimo frame.
    useGrouping: true,
  });

  const body =
    value === null
      ? (formatted ?? `${prefix}${formatter.format(to)}${suffix}`)
      : `${prefix}${formatter.format(value)}${suffix}`;

  return (
    <span
      className={className}
      style={{ fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum" 1' }}
    >
      {body}
    </span>
  );
}

export default CountUp;
