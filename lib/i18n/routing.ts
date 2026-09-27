import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["it", "en"],
  defaultLocale: "it",
  localePrefix: "always",
  // Gli hreflang li dichiara ogni pagina (lib/seo/metadata.ts): quelli
  // automatici di next-intl darebbero per esistenti traduzioni che non ci
  // sono (le pagine città sono solo in italiano).
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];
