import { getLocale, getTranslations } from "next-intl/server";
import { NotFoundView } from "@/components/not-found/NotFoundView";

/**
 * 404 del sito, resa dentro il layout della variante (app/[locale]/d|m/layout.tsx) (nav + footer inclusi).
 * La raggiungono: il catch-all app/[locale]/[...rest] per i percorsi
 * inesistenti, e ogni notFound() lanciato sotto /{locale}.
 */
export async function LocaleNotFound() {
  const locale = await getLocale();
  const t = await getTranslations("notFound");

  return (
    <NotFoundView
      copy={{
        eyebrow: t("eyebrow"),
        title: t("title"),
        body: t("body"),
        cta: t("cta"),
        secondary: t("secondary"),
      }}
      homeHref={`/${locale}`}
      contactHref={`/${locale}#contatti`}
    />
  );
}
