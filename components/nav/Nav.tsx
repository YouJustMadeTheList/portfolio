"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { navSections } from "@/content/nav";
import { NavLink } from "./NavLink";
import { LocaleToggle } from "./LocaleToggle";
import { MobileMenuOverlay } from "./MobileMenuOverlay";
import { Tactile } from "@/components/ui/Tactile";
import { Container } from "@/components/ui/Container";
import { useHomeAnchor } from "./useHomeAnchor";
import { useScrollSpy } from "@/lib/hooks/useScrollSpy";
import { useNavVisibility } from "@/lib/hooks/useNavVisibility";
import { useIsMobileVariant } from "@/components/variant/VariantProvider";

/**
 * Nav globale v2 (ART-DIRECTION §6 "Nav", spec 00 §B).
 *
 * Vetro con blur + hairline a gradiente (mai un bordo pieno), indicatore
 * attivo che scorre (NavLink, layoutId), voci magnetiche. La logica di
 * scrollspy/hide-on-scroll-down resta quella condivisa in lib/hooks/ — non
 * ci è consentito toccarla — questo componente aggiunge solo lo stato locale
 * "isScrolled" (soglia 80px) per il passaggio trasparente → vetro, che la
 * v1 non distingueva.
 */
export function Nav() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { hrefFor, scrollIfHome } = useHomeAnchor();
  const active = useScrollSpy(navSections.map((s) => s.id));
  const visible = useNavVisibility();
  const mobile = useIsMobileVariant();

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled((prev) => {
          const y = window.scrollY;
          if (prev) return y > 60; // isteresi minima anti-flicker (spec §B.5)
          return y > 80;
        });
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-lock mentre il menu mobile è aperto — evita lo scroll "doppio"
  // (pagina sotto + overlay), spec 00 §B.3.
  // Variante mobile (scroll nativo, niente Lenis): il blocco va anche su
  // <html>, altrimenti Safari iOS lascia scorrere la pagina sotto l'overlay.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = document.body.style.overflow;
    const prevHtml = html.style.overflow;
    document.body.style.overflow = "hidden";
    if (mobile) html.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      if (mobile) html.style.overflow = prevHtml;
    };
  }, [open, mobile]);

  return (
    <>
      <motion.header
        animate={{ y: visible || open ? 0 : "-100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="fixed inset-x-0 top-0 z-[var(--z-nav)]"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 transition-[background,backdrop-filter] duration-[var(--dur-base)] ease-[var(--ease-out)]"
          style={{
            // Mobile: niente backdrop-filter (budget GPU), quindi un fondo quasi
            // opaco al posto del vetro — il testo sotto non deve trasparire.
            background: scrolled || open ? (mobile ? "rgba(5, 10, 13, 0.94)" : "var(--glass)") : "transparent",
            backdropFilter: scrolled || open ? "var(--backdrop-blur-nav)" : "none",
            WebkitBackdropFilter: scrolled || open ? "var(--backdrop-blur-nav)" : "none",
          }}
        />
        {/* Hairline a gradiente — mai un bordo pieno (ART-DIRECTION §1). */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px transition-opacity duration-[var(--dur-base)]"
          style={{
            background:
              "linear-gradient(90deg, rgba(63,233,204,0) 0%, rgba(63,233,204,.4) 50%, rgba(63,233,204,0) 100%)",
            opacity: scrolled || open ? 1 : 0,
          }}
        />

        <Container className="flex h-[var(--nav-h)] items-center justify-between">
          <Tactile
            as="a"
            href={hrefFor()}
            intensity="subtle"
            magnetic
            magneticMax={8}
            aria-label="Davide De Sanctis — torna all'inizio"
            onClick={(e) => {
              scrollIfHome(e, 0);
            }}
            className="font-[family-name:var(--font-display)] text-lg font-medium tracking-tight text-[var(--text-hi)] hover:text-[var(--aqua-300)]"
          >
            DDS
          </Tactile>

          <nav className="hidden items-center gap-8 lg:flex">
            {navSections.map((s) => (
              <NavLink key={s.id} id={s.id} label={t(s.messageKey)} active={active === s.id} />
            ))}
          </nav>

          <div className="hidden lg:block">
            <LocaleToggle />
          </div>

          <Tactile
            as="button"
            intensity="default"
            magnetic
            magneticMax={8}
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] lg:hidden"
            aria-label={open ? t("menuClose") : t("menuOpen")}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="relative block h-4 w-5">
              <motion.span
                animate={{ rotate: open ? 45 : 0, y: open ? 7 : 0 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-0 block h-[1.5px] w-5 bg-[var(--text-hi)]"
              />
              <motion.span
                animate={{ opacity: open ? 0 : 1 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-[7px] block h-[1.5px] w-5 bg-[var(--text-hi)]"
              />
              <motion.span
                animate={{ rotate: open ? -45 : 0, y: open ? -7 : 0 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-[14px] block h-[1.5px] w-5 bg-[var(--text-hi)]"
              />
            </span>
          </Tactile>
        </Container>
      </motion.header>

      <MobileMenuOverlay open={open} onClose={() => setOpen(false)} active={active} />
    </>
  );
}

export default Nav;
