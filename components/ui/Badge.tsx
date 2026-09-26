"use client";

import type { ReactNode } from "react";
import { Tactile } from "./Tactile";
import { cn } from "@/lib/utils/cn";

/**
 * Chip/badge del sistema v2.
 *
 * È un elemento statico non banale → per la checklist di ART-DIRECTION §5 deve
 * comunque molleggiare al passaggio del cursore. Qui: A (wobble) + D (squash),
 * intensità `subtle`, più un bordo a gradiente che si illumina.
 *
 * Il `wobble` non è passato esplicitamente: `Tactile` lo deriva. Un badge reso
 * da solo è decorativo e molleggia; lo stesso badge dentro un <a>/<button>
 * (parte di un bersaglio cliccabile) passa da sé alla risposta calma, perché
 * far tremolare un pezzo dell'area di click la rende più difficile da colpire.
 *
 * `tone`:
 *  - "default" : vetro + bordo aqua tenue
 *  - "accent"  : bordo e testo aqua, alone di glow (elemento "acceso")
 *  - "ember"   : RAZIONATO — max 2 occorrenze in tutto il sito
 *                (marker "oggi" sull'elica, badge "in produzione").
 *
 * `highlighted` resta per retrocompatibilità con la v1 ed equivale a tone="accent".
 */
export type BadgeTone = "default" | "accent" | "ember";

export interface BadgeProps {
  children: ReactNode;
  className?: string;
  /** @deprecated usare tone="accent" */
  highlighted?: boolean;
  tone?: BadgeTone;
  /** Usa il font mono + uppercase + tracking largo (per dati, label, metriche). */
  mono?: boolean;
}

const TONES: Record<BadgeTone, string> = {
  default: [
    "text-[var(--text-mid)]",
    "bg-[var(--glass)] backdrop-blur-[10px]",
    "shadow-[inset_0_1px_0_rgba(223,255,248,0.05)]",
    "before:bg-[var(--border-gradient)]",
    "hover:text-[var(--text-hi)]",
    "hover:before:bg-[var(--border-gradient-hi)]",
  ].join(" "),
  accent: [
    "text-[var(--aqua-300)]",
    "bg-[rgba(63,233,204,0.06)]",
    "shadow-[var(--glow-xs)]",
    "before:bg-[var(--border-gradient-hi)]",
    "hover:text-[var(--aqua-200)]",
    "hover:shadow-[var(--glow-sm)]",
  ].join(" "),
  ember: [
    "text-[var(--ember)]",
    "bg-[rgba(255,122,77,0.07)]",
    "shadow-[var(--glow-ember)]",
    "before:bg-[linear-gradient(145deg,rgba(255,122,77,0.5),rgba(255,122,77,0.04))]",
  ].join(" "),
};

export function Badge({
  children,
  className,
  highlighted = false,
  tone,
  mono = false,
}: BadgeProps) {
  const resolved: BadgeTone = tone ?? (highlighted ? "accent" : "default");

  return (
    <Tactile
      as="span"
      intensity="subtle"
      squash
      className={cn(
        "relative isolate inline-flex select-none items-center gap-2",
        "rounded-[var(--radius-full)] px-3 py-1.5 text-[0.78rem] leading-none tabular-nums",
        "transition-[color,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-out)]",
        // bordo a gradiente mascherato
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:p-px",
        "before:[mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)]",
        "before:[mask-composite:exclude] before:[-webkit-mask-composite:xor]",
        "before:transition-[background] before:duration-300",
        mono &&
          "font-[family-name:var(--font-mono)] uppercase tracking-[var(--ls-micro)] text-[length:var(--fs-micro)]",
        TONES[resolved],
        className,
      )}
    >
      {children}
    </Tactile>
  );
}

export default Badge;
