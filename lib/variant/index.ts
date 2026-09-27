/**
 * Variante di rendering del sito: "d" (desktop, anche tablet) o "m" (mobile).
 *
 * È un segmento INTERNO della rotta (`app/[locale]/d/…` e `app/[locale]/m/…` (due alberi separati, bundle separati)): l'utente vede
 * sempre `/it`, `/en/privacy`, ecc. È `proxy.ts` a riscrivere la richiesta verso
 * la variante giusta in base al dispositivo. Entrambe le varianti sono generate
 * al build e servite dalla CDN come pagine separate.
 */
export const VARIANTS = ["d", "m"] as const;
export type Variant = (typeof VARIANTS)[number];

export const isVariant = (v: unknown): v is Variant => v === "d" || v === "m";

/** Cookie di override manuale (QA e link "versione desktop/mobile"). */
export const VARIANT_COOKIE = "dds-view";
/** Query di override: `?view=m` / `?view=d` imposta il cookie; `?view=auto` lo toglie. */
export const VARIANT_QUERY = "view";
