import { getLocale, getTranslations } from "next-intl/server";
import { NotFoundView } from "@/components/not-found/NotFoundView";

/**
 * 404 del sito, resa dentro app/[locale]/layout.tsx (nav + footer inclusi).
 * La raggiungono: il catch-all app/[locale]/[...rest] per i percorsi
 * inesistenti, e ogni notFound() lanciato sotto /{locale}.
 */
export default async function LocaleNotFound() {
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
