"use client";

import type { ReactNode } from "react";
import { TextReveal } from "@/components/fx/TextReveal";
import { cn } from "@/lib/utils/cn";

/**
 * Header di sezione del sistema v2 (ART-DIRECTION §2).
 *
 * Tre elementi, in quest'ordine:
 *  1. eyebrow  — mono, uppercase, ls .14em, --text-low, preceduta da un trattino
 *                aqua di 24px (classe .eyebrow in globals.css);
 *  2. titolo   — Space Grotesk, scala --fs-h2, max-width 22ch + text-wrap:balance,
 *                reveal PER PAROLA allo scroll;
 *  3. subtitle — Inter, --fs-lead, max-width in ch, text-wrap:pretty.
 *
 * LA MOSSA EDITORIALE CENTRALE (obbligatoria): dentro il titolo, la frase-chiave
 * va in Instrument Serif italic aqua. Due modi, entrambi supportati:
 *
 *   // a) marcatura inline nel JSX
 *   <SectionHeader title={<>Il metodo che <Em>cuce su misura</Em></>} />
 *
 *   // b) marcatura testuale, per le stringhe che arrivano da messages/*.json
 *   //    o da content/*: tutto ciò che sta tra ⟨…⟩ (o tra *…*) diventa serif aqua
 *   <SectionHeader title="Il metodo che ⟨cuce su misura⟩" />
 *
 * `align="center"` centra header e paragrafi (le sezioni che oggi passano
 * `className="mx-auto text-center"` continuano a funzionare identiche).
 */

/** Enfasi serif-italic aqua. Usare dentro un titolo, su UNA sola frase. */
export function Em({ children }: { children: ReactNode }) {
  return <span className="serif-accent">{children}</span>;
}

/** Converte "testo ⟨enfasi⟩ testo" (o *enfasi*) in nodi con <Em>. */
export function parseEmphasis(text: string): ReactNode {
  const parts = text.split(/(⟨[^⟩]+⟩|\*[^*]+\*)/g).filter(Boolean);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    const isEm =
      (part.startsWith("⟨") && part.endsWith("⟩")) ||
      (part.startsWith("*") && part.endsWith("*") && part.length > 2);
    return isEm ? (
      <Em key={i}>{part.slice(1, -1)}</Em>
    ) : (
      <span key={i}>{part}</span>
    );
  });
}

export interface SectionHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  align?: "left" | "center";
  /** Tag del titolo. Default "h2". */
  as?: "h1" | "h2" | "h3";
  /** false = il titolo appare senza reveal per parola (già animato dal chiamante). */
  reveal?: boolean;
  id?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  className,
  align = "left",
  as = "h2",
  reveal = true,
  id,
}: SectionHeaderProps) {
  const centered = align === "center";
  const heading = typeof title === "string" ? parseEmphasis(title) : title;

  return (
    <div
      id={id}
      className={cn(
        "relative",
        centered && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p
          className={cn(
            "eyebrow",
            centered && "justify-center",
          )}
        >
          {eyebrow}
        </p>
      ) : null}

      {reveal ? (
        <TextReveal
          as={as}
          className={cn(
            "mt-5 font-[family-name:var(--font-display)] font-medium text-[var(--text-hi)]",
            "text-[length:var(--fs-h2)] leading-[var(--lh-h2)] tracking-[var(--ls-h2)]",
            "[text-wrap:balance] [max-width:var(--measure-h2)]",
            centered && "mx-auto",
          )}
        >
          {heading}
        </TextReveal>
      ) : (
        <Heading
          as={as}
          className={cn(
            "mt-5 font-[family-name:var(--font-display)] font-medium text-[var(--text-hi)]",
            "text-[length:var(--fs-h2)] leading-[var(--lh-h2)] tracking-[var(--ls-h2)]",
            "[text-wrap:balance] [max-width:var(--measure-h2)]",
            centered && "mx-auto",
          )}
        >
          {heading}
        </Heading>
      )}

      {subtitle ? (
        <p
          className={cn(
            "mt-5 text-[length:var(--fs-lead)] leading-[var(--lh-lead)] text-[var(--text-mid)]",
            "[text-wrap:pretty] [max-width:var(--measure-prose)]",
            centered && "mx-auto",
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function Heading({
  as: Tag,
  className,
  children,
}: {
  as: "h1" | "h2" | "h3";
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={className}>{children}</Tag>;
}

export default SectionHeader;
