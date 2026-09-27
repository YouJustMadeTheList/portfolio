"use client";

import { motion } from "framer-motion";
import { Tactile } from "@/components/ui/Tactile";
import { useHomeAnchor } from "./useHomeAnchor";
import { spring } from "@/lib/animation/tokens";
import { cn } from "@/lib/utils/cn";
import type { SectionId } from "@/content/nav";
import { useIsMobileVariant } from "@/components/variant/VariantProvider";

/**
 * Voce di nav — desktop (pillola con indicatore che SCORRE) e mobile
 * (`large`, tipografia hero-like nell'overlay full-screen).
 *
 * L'indicatore attivo è un `motion.span` con `layoutId` condiviso fra tutte
 * le istanze di NavLink: Framer Motion anima il FLIP fra la posizione del
 * link precedentemente attivo e quella del nuovo, invece di "tagliare" da
 * un link all'altro (ART-DIRECTION §6 "Nav" + spec 00 §B.5).
 *
 * Magnetica sempre (ART-DIRECTION §5B: obbligatorio sui link di nav) e con
 * wobble in ingresso — è un elemento interattivo, quindi A+B+D per intero.
 * Sulla home lo scroll passa sempre da `smoothScrollTo` (Lenis), mai da
 * `scrollIntoView`/`window.scrollTo` nativi; da un'altra pagina (legali, 404)
 * l'href assoluto `/{locale}#id` riporta alla sezione giusta della home.
 */
export function NavLink({
  id,
  label,
  active,
  onNavigate,
  large = false,
}: {
  id: SectionId;
  label: string;
  active?: boolean;
  onNavigate?: () => void;
  large?: boolean;
}) {
  const { hrefFor, scrollIfHome } = useHomeAnchor();
  const mobile = useIsMobileVariant();
  const handleClick: React.MouseEventHandler = (e) => {
    if (mobile && onNavigate) {
      // Variante mobile, dall'overlay: prima si chiude il menu (e si sblocca lo
      // scroll della pagina), POI parte lo scroll nativo fluido — uno scroll
      // avviato mentre <html> è ancora overflow:hidden verrebbe interrotto.
      onNavigate();
      scrollIfHome(e, `#${id}`, true);
      return;
    }
    // Sulla home: scroll fluido via Lenis. Altrove: navigazione a /{locale}#id.
    scrollIfHome(e, `#${id}`);
    onNavigate?.();
  };

  return (
    <Tactile
      as="a"
      href={hrefFor(id)}
      onClick={handleClick}
      intensity={large ? "playful" : "subtle"}
      magnetic
      magneticMax={large ? 10 : 7}
      aria-current={active ? "true" : undefined}
      className={cn(
        "relative inline-flex flex-col items-center whitespace-nowrap no-underline outline-none",
        large
          ? "gap-2 font-[family-name:var(--font-display)] text-[clamp(2rem,1.5rem+2.5vw,3.5rem)] font-medium tracking-[-0.01em]"
          : "gap-1.5 font-[family-name:var(--font-body)] text-[13px] font-medium tracking-[0.02em]",
        "focus-visible:[outline:2px_solid_var(--focus-ring)] focus-visible:outline-offset-4 rounded-[var(--radius-xs)]",
        active
          ? "text-[var(--aqua-300)] [text-shadow:var(--glow-text)]"
          : "text-[var(--text-hi)] hover:text-[var(--aqua-300)]",
      )}
    >
      <span>{label}</span>
      {active ? (
        <motion.span
          layoutId={large ? "nav-active-indicator-mobile" : "nav-active-indicator"}
          className={cn(
            "rounded-full bg-[var(--aqua-400)] shadow-[var(--glow-xs)]",
            large ? "h-[3px] w-8" : "h-[2px] w-full",
          )}
          transition={spring.smooth}
        />
      ) : (
        <span className={cn("rounded-full bg-transparent", large ? "h-[3px] w-8" : "h-[2px] w-full")} />
      )}
    </Tactile>
  );
}

export default NavLink;
