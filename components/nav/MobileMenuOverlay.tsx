"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { navSections } from "@/content/nav";
import { NavLink } from "./NavLink";
import { LocaleToggle } from "./LocaleToggle";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

/**
 * Overlay full-screen del menu mobile (spec 00 §B.3). Stesso registro
 * tipografico della Hero (ogni link è grande, in Space Grotesk) e stesso
 * linguaggio di superficie del resto del sito v2: vuoto + aurora + grana,
 * non un semplice scrim scuro.
 *
 * Focus trap while open (Tab non esce dal menu), `Esc` chiude, il focus
 * torna al trigger (hamburger) alla chiusura — spec 00 §B.3/§F "Nav".
 */
export function MobileMenuOverlay({
  open,
  onClose,
  active,
}: {
  open: boolean;
  onClose: () => void;
  active: string | null;
}) {
  const t = useTranslations("nav");
  const reducedMotion = usePrefersReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    const focusables = () =>
      panel
        ? Array.from(
            panel.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          )
        : [];

    // Un frame di margine: l'overlay deve montare/animare prima che il focus
    // si sposti, altrimenti alcuni screen reader perdono l'annuncio.
    const focusFirst = requestAnimationFrame(() => focusables()[0]?.focus());

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(focusFirst);
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  const overlayTransition = reducedMotion
    ? { duration: 0.15 }
    : { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          /* Non `menuOpen` ("Apri il menu"): quella è l'etichetta del trigger.
             Un dialog aperto va nominato per quello che è, non per l'azione
             che lo apre. */
          aria-label={t("menuLabel")}
          initial={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
          transition={overlayTransition}
          className="fixed inset-0 z-[var(--z-nav-mobile-overlay)] flex flex-col items-center justify-center overflow-hidden bg-[var(--void)]"
        >
          {/* L2 — aurore, per non lasciare l'overlay come un nero piatto. */}
          <span
            aria-hidden="true"
            className="aurora"
            style={{
              top: "-10%",
              right: "-20%",
              width: "min(680px, 90vw)",
              height: "min(560px, 60vh)",
              background: "var(--aurora-aqua)",
              opacity: 0.4,
            }}
          />
          <span
            aria-hidden="true"
            className="aurora"
            style={{
              bottom: "-14%",
              left: "-22%",
              width: "min(600px, 84vw)",
              height: "min(520px, 54vh)",
              background: "var(--aurora-deep)",
              opacity: 0.35,
            }}
          />

          <nav className="relative flex flex-col items-center gap-7">
            {navSections.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: reducedMotion ? 0 : 0.1 + 0.04 * i,
                  duration: reducedMotion ? 0.15 : 0.4,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <NavLink
                  id={s.id}
                  label={t(s.messageKey)}
                  active={active === s.id}
                  onNavigate={onClose}
                  large
                />
              </motion.div>
            ))}
          </nav>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reducedMotion ? 0 : 0.4, duration: reducedMotion ? 0.15 : 0.3 }}
            className="relative mt-12 flex w-full max-w-[220px] flex-col items-center gap-6 border-t border-[var(--line)] pt-8"
          >
            <LocaleToggle />
          </motion.div>

          {/* L'overlay copre la nav (z superiore), quindi il trigger non è più
              raggiungibile — una X nello STESSO punto dell'hamburger, per
              telefoni e tablet. Ultima nel DOM: il focus iniziale resta sulla
              prima voce, il focus trap la include. */}
          {(
            <button
              type="button"
              onClick={onClose}
              aria-label={t("menuClose")}
              className="absolute right-[var(--container-padding-x-mobile)] top-[calc((var(--nav-h)-44px)/2)] grid size-11 place-items-center rounded-[var(--radius-sm)] text-[var(--text-hi)] outline-none [-webkit-tap-highlight-color:transparent] active:bg-[rgb(var(--aqua-rgb)/0.1)] focus-visible:[outline:2px_solid_var(--focus-ring)]"
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M3 3l12 12M15 3L3 15" />
              </svg>
            </button>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default MobileMenuOverlay;
