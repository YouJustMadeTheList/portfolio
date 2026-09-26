import { Tilt3D } from "@/components/fx/Tilt3D";
import { Tactile } from "@/components/ui/Tactile";
import { cn } from "@/lib/utils/cn";

export type PersonCardProps = {
  name: string;
  /** Già risolto per locale a monte (contextIt/contextEn). */
  context: string;
  publicUrl?: string;
  /** Già risolto per locale a monte. */
  publicUrlLabel?: string;
  className?: string;
};

/**
 * Card singola persona — vetro + tilt 3D come tutte le altre card del sito
 * (WritingCards, PricingCard), coerente col linguaggio v2. Resta comunque
 * sobria nel contenuto (spec §2: "niente colori nuovi, palette minimale")
 * — la sofisticazione sta nella materia (L4/L5), non in decorazioni extra.
 *
 * Se `publicUrl` manca, niente riga link e niente spazio vuoto residuo (la
 * card si adatta in altezza da sola via flow normale).
 */
export function PersonCard({ name, context, publicUrl, publicUrlLabel, className }: PersonCardProps) {
  return (
    <Tilt3D max={10} scale={1.015} className={cn("h-full [border-radius:var(--radius-lg)]", className)}>
      <Tactile as="div" intensity="subtle" className="glass-surface flex h-full w-full flex-col gap-2 p-5">
        <p
          style={{ transform: "translateZ(22px)" }}
          className="person-name font-[family-name:var(--font-display)] text-[16px] font-medium text-[var(--text-hi)]"
        >
          {name}
        </p>
        <p style={{ transform: "translateZ(14px)" }} className="person-context text-[13px] text-[var(--text-mid)]">
          {context}
        </p>
        {publicUrl ? (
          <Tactile
            as="a"
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            intensity="subtle"
            magnetic
            magneticMax={5}
            style={{ transform: "translateZ(18px)" }}
            className="person-link mt-1 inline-flex w-fit items-center gap-1 text-[12px] text-[var(--aqua-300)] underline decoration-[var(--accent-dim)] underline-offset-[3px] transition-colors hover:text-[var(--aqua-200)] hover:decoration-[var(--aqua-300)]"
          >
            {publicUrlLabel ?? "→"}
          </Tactile>
        ) : null}
      </Tactile>
    </Tilt3D>
  );
}

export default PersonCard;
