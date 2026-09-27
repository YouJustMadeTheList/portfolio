"use client";

import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Tactile } from "@/components/ui/Tactile";
import { cn } from "@/lib/utils/cn";

export function LocaleToggle({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const next = locale === "it" ? "en" : "it";

  return (
    <Tactile
      as="button"
      intensity="playful"
      magnetic
      magneticMax={9}
      aria-label={t("localeToggleLabel")}
      onClick={() => {
        // La pagina dichiara la sua traduzione nel <head> (hreflang): se c'è,
        // si va lì (le pagine di contenuto hanno slug diversi per lingua);
        // se la pagina non ha traduzione, home dell'altra lingua.
        const alt = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${next}"]`);
        if (alt) {
          const target = new URL(alt.href).pathname.replace(new RegExp(`^/${next}(?=/|$)`), "") || "/";
          router.replace(target, { locale: next });
        } else if (document.querySelector('link[rel="alternate"][hreflang]')) {
          // pagina senza traduzione (es. le pagine città, solo in italiano)
          router.replace("/", { locale: next });
        } else {
          router.replace(pathname, { locale: next });
        }
      }}
      className={cn(
        "relative isolate inline-flex items-center justify-center overflow-hidden",
        "rounded-[var(--radius-full)] px-3.5 py-1.5",
        "font-[family-name:var(--font-mono)] text-[12px] font-medium uppercase tracking-[var(--ls-micro)]",
        "text-[var(--text-mid)] transition-colors duration-[var(--dur-base)] ease-[var(--ease-out)]",
        "bg-[var(--glass)] backdrop-blur-[10px]",
        "hover:text-[var(--aqua-300)]",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:p-px",
        "before:bg-[var(--border-gradient)] before:[mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)]",
        "before:[mask-composite:exclude] before:[-webkit-mask-composite:xor]",
        "hover:before:bg-[var(--border-gradient-hi)]",
        className,
      )}
    >
      {next.toUpperCase()}
    </Tactile>
  );
}

export default LocaleToggle;
