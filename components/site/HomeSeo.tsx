import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { homeGraph } from "@/lib/seo/jsonld";
import { homeCopy, pageMetadata } from "@/lib/seo/metadata";
import type { PageLocale } from "@/lib/seo/pages";

type Props = { params: Promise<{ locale: string }> };

const pick = (l: string): PageLocale => (l === "en" ? "en" : "it");

/* Condiviso dalle home delle due varianti: stesso title, description e dati
   strutturati su desktop e mobile (requisito dell'indicizzazione mobile-first). */
export async function homeMetadata({ params }: Props): Promise<Metadata> {
  const locale = pick((await params).locale);
  return pageMetadata({
    locale,
    path: `/${locale}`,
    title: homeCopy[locale].title,
    absoluteTitle: true,
    description: homeCopy[locale].description,
    alternates: { it: "/it", en: "/en" },
    type: "profile",
  });
}

export function HomeJsonLd({ locale }: { locale: string }) {
  return <JsonLd data={homeGraph(pick(locale))} />;
}
