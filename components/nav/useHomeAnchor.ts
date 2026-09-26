"use client";

import { useCallback } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { smoothScrollTo } from "@/components/fx/SmoothScroll";

/**
 * Link alle sezioni della home che funzionano da QUALSIASI pagina.
 *
 * L'href è sempre assoluto (`/it#servizi`), così da /it/privacy o da una 404
 * il link porta alla home e il browser atterra sull'ancora. Sulla home stessa
 * il click viene intercettato e passa da Lenis (`smoothScrollTo`), come prima:
 * nessun salto nativo, nessun cambio di URL.
 */
export function useHomeAnchor() {
  const locale = useLocale();
  const pathname = usePathname();
  const home = `/${locale}`;
  const isHome = pathname === home || pathname === `${home}/`;

  const hrefFor = useCallback(
    (id?: string) => (id ? `${home}#${id}` : home),
    [home],
  );

  /** Da usare come onClick: sulla home scrolla fluido, altrove lascia navigare. */
  const scrollIfHome = useCallback(
    (e: React.MouseEvent, target: string | number): boolean => {
      if (!isHome) return false;
      e.preventDefault();
      smoothScrollTo(target);
      return true;
    },
    [isHome],
  );

  return { isHome, hrefFor, scrollIfHome };
}
