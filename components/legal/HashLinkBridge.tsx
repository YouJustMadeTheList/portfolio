"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Sulle pagine legali la nav condivisa punta ad ancore della home (#progetti,
 * #contatti...) che qui non esistono. Questo ponte intercetta, in fase di
 * capture su window (prima dei gestori React della nav), i click su `#id`
 * senza destinazione nella pagina e porta a `/{locale}#id`.
 * I link a `#id` presenti nella pagina (indice) restano invariati.
 */
export function HashLinkBridge({ locale }: { locale: string }) {
  const router = useRouter();

  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      const a = ev.target instanceof Element ? ev.target.closest("a[href^='#']") : null;
      if (!a) return;
      const id = decodeURIComponent((a.getAttribute("href") ?? "").slice(1));
      if (!id || document.getElementById(id)) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      router.push(`/${locale}#${encodeURIComponent(id)}`);
    };
    window.addEventListener("click", onClick, { capture: true });
    return () => window.removeEventListener("click", onClick, { capture: true });
  }, [locale, router]);

  return null;
}
