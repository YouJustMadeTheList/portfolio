import NextLink from "next/link";
import { footerDirectory } from "@/content/footer-links";
import { cn } from "@/lib/utils/cn";

/** Colonne di link alle pagine di servizio, risorse e città. */
export function FooterDirectory({ locale, compact = false }: { locale: "it" | "en"; compact?: boolean }) {
  const groups = footerDirectory[locale];
  return (
    <nav
      aria-label={locale === "it" ? "Pagine del sito" : "Site pages"}
      className={cn("grid gap-x-6 gap-y-8", compact ? "grid-cols-2" : "sm:grid-cols-3")}
    >
      {groups.map((g) => (
        <div key={g.title}>
          <p className="font-[family-name:var(--font-mono)] text-[length:var(--fs-micro)] font-medium uppercase tracking-[var(--ls-micro)] text-[var(--text-low-aa)]">
            {g.title}
          </p>
          <ul className={cn("flex list-none flex-col", compact ? "mt-2" : "mt-4 gap-2.5")}>
            {g.links.map((l) => (
              <li key={l.href}>
                <NextLink
                  href={l.href}
                  className={cn(
                    "inline-flex items-center text-[var(--text-mid)] transition-colors hover:text-[var(--aqua-300)] focus-visible:[outline:2px_solid_var(--focus-ring)] focus-visible:outline-offset-2 rounded-[var(--radius-xs)]",
                    compact ? "min-h-10 text-[15px]" : "text-[14.5px]",
                  )}
                >
                  {l.label}
                </NextLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
