"use client";

import { Tactile } from "@/components/ui/Tactile";
import { cn } from "@/lib/utils/cn";
import type { MethodUiCopy } from "@/content/method";

/**
 * Controlli del mazzo.
 *
 * Il cliente contesta le "due frecce chevron": qui i due comandi sono carte —
 * una sagoma di carta inclinata con la freccia che la sfila dal mazzo — e i dot
 * indicator sono pip a forma di carta, non pallini. Tutti magnetici, con wobble
 * e squash (ART-DIRECTION §5: A+B+D su ogni elemento interattivo).
 *
 * Stanno SOTTO il mazzo, dentro la stessa colonna: a nessun breakpoint possono
 * finire fuori dal container, che è il difetto segnalato sul contatore.
 */

function DealIcon({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={dir === "prev" ? { transform: "scaleX(-1)" } : undefined}
    >
      <rect
        x="4"
        y="5"
        width="10"
        height="14"
        rx="2.4"
        stroke="currentColor"
        strokeWidth="1.3"
        opacity="0.5"
        transform="rotate(-9 9 12)"
      />
      <path
        d="M14.2 12h6.1m0 0-2.5-2.6M20.3 12l-2.5 2.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DeckControls({
  total,
  activeIndex,
  disabled,
  ui,
  onPrev,
  onNext,
  onJump,
}: {
  total: number;
  activeIndex: number;
  disabled: boolean;
  ui: MethodUiCopy;
  onPrev: () => void;
  onNext: () => void;
  onJump: (index: number) => void;
}) {
  const btn = cn(
    "flex items-center gap-2.5 rounded-full border border-[var(--line)] px-3.5 py-2.5 sm:px-4",
    "font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-mid)]",
    "transition-[color,border-color,background-color,box-shadow] duration-200",
    "hover:border-[var(--line-hi)] hover:bg-[rgb(var(--aqua-rgb)/0.06)] hover:text-[var(--aqua-300)] hover:shadow-[var(--glow-xs)]",
    "disabled:pointer-events-none disabled:opacity-40",
  );

  return (
    <div className="mt-7 flex items-center justify-between gap-3 sm:mt-9 sm:gap-6">
      <Tactile
        as="button"
        type="button"
        intensity="default"
        magnetic
        magneticMax={10}
        disabled={disabled}
        onClick={onPrev}
        aria-label={ui.prev}
        className={btn}
      >
        <DealIcon dir="prev" />
        <span className="hidden sm:inline">{ui.prev}</span>
      </Tactile>

      <div className="flex items-center" role="group" aria-label={ui.deckAria}>
        {Array.from({ length: total }, (_, i) => {
          const isActive = i === activeIndex;
          return (
            <Tactile
              as="button"
              key={i}
              type="button"
              intensity="playful"
              magnetic
              magneticMax={8}
              disabled={disabled}
              onClick={() => onJump(i)}
              aria-label={ui.goTo.replace("{n}", String(i + 1))}
              aria-current={isActive ? "step" : undefined}
              // area di tocco 24×28 (WCAG 2.5.8); la tessera visibile resta 11×15
              className="group grid h-7 w-6 place-items-center"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "block rounded-[3px] border transition-[height,background-color,border-color,box-shadow] duration-300",
                  "h-[15px] w-[11px]",
                  isActive
                    ? "h-[19px] border-[var(--aqua-300)] bg-[rgb(var(--aqua-rgb)/0.55)] shadow-[var(--glow-sm)]"
                    : "border-[var(--line-hi)] bg-[rgb(var(--aqua-rgb)/0.05)] group-hover:border-[var(--aqua-300)] group-hover:bg-[rgb(var(--aqua-rgb)/0.2)]",
                )}
              />
            </Tactile>
          );
        })}
      </div>

      <Tactile
        as="button"
        type="button"
        intensity="default"
        magnetic
        magneticMax={10}
        disabled={disabled}
        onClick={onNext}
        aria-label={ui.next}
        className={btn}
      >
        <span className="hidden sm:inline">{ui.next}</span>
        <DealIcon dir="next" />
      </Tactile>
    </div>
  );
}

export default DeckControls;
