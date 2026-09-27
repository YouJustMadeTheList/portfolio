/**
 * Scroll programmatico, SENZA importare Lenis né GSAP: così i moduli della
 * variante mobile (che non monta Lenis) possono usarlo senza trascinarsi
 * dietro quelle librerie. SmoothScroll.tsx registra qui la sua istanza Lenis
 * quando esiste (desktop), e questo modulo la usa se c'è.
 */
type LenisLike = {
  scrollTo: (target: string | number | HTMLElement, opts?: { offset?: number }) => void;
};

let instance: LenisLike | null = null;

/** Usato da SmoothScroll.tsx per registrare/rimuovere l'istanza viva. */
export function setLenisInstance(l: LenisLike | null) {
  instance = l;
}

/**
 * Accesso all'istanza Lenis viva (null sotto prefers-reduced-motion o prima del mount).
 * Usarla per `getLenis()?.scrollTo("#contatti")` invece di window.scrollTo, così lo
 * scroll programmatico ha la stessa inerzia di quello a rotella.
 */
export function getLenis(): LenisLike | null {
  return instance;
}

/** Scroll programmatico che funziona sia con Lenis attivo sia senza (reduced-motion).
 *
 *  Variante mobile (`data-variant="m"`, niente Lenis): scroll NATIVO fluido
 *  (`behavior: "smooth"`) con compensazione della nav fissa. Se `offset` non è
 *  passato, per un elemento si sottrae solo la parte di `--nav-h` che il suo
 *  padding-top non assorbe già: il contenuto atterra subito sotto la nav, senza
 *  un vuoto doppio sopra le sezioni che hanno già il loro respiro. */
export function smoothScrollTo(
  target: string | number | HTMLElement,
  offset?: number,
) {
  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(target, { offset: offset ?? 0 });
    return;
  }
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  if (root.dataset.variant === "m") {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let top: number;
    if (typeof target === "number") {
      top = target + (offset ?? 0);
    } else {
      const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
      if (!el) return;
      let delta = offset;
      if (delta === undefined) {
        const navH = parseFloat(getComputedStyle(root).getPropertyValue("--nav-h")) || 72;
        const padTop = parseFloat(getComputedStyle(el).paddingTop) || 0;
        delta = -Math.max(0, navH + 12 - padTop);
      }
      top = el.getBoundingClientRect().top + window.scrollY + delta;
    }
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
    return;
  }

  if (typeof target === "number") {
    window.scrollTo({ top: target + (offset ?? 0) });
    return;
  }
  const el =
    typeof target === "string" ? document.querySelector(target) : target;
  el?.scrollIntoView({ block: "start" });
}

