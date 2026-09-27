import type { Metadata } from "next";
import type { PageLocale } from "@/lib/seo/pages";
import { OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/seo/site";

/**
 * Metadata di una pagina: canonical, hreflang (it/en + x-default), Open Graph
 * e Twitter. Il title passa dal template del layout ("%s — Davide De Sanctis")
 * salvo `absoluteTitle`.
 */
export function pageMetadata(opts: {
  locale: PageLocale;
  path: string;
  title: string;
  description: string;
  alternates?: Partial<Record<PageLocale, string>>;
  type?: "website" | "article" | "profile";
  absoluteTitle?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
}): Metadata {
  const languages: Record<string, string> = {};
  const alts = opts.alternates ?? { [opts.locale]: opts.path };
  if (alts.it) languages.it = alts.it;
  if (alts.en) languages.en = alts.en;
  languages["x-default"] = alts.it ?? alts.en ?? opts.path;

  const ogTitle = opts.absoluteTitle ? opts.title : `${opts.title} — ${SITE_NAME}`;
  return {
    metadataBase: new URL(SITE_URL),
    title: opts.absoluteTitle ? { absolute: opts.title } : opts.title,
    description: opts.description,
    alternates: { canonical: opts.path, languages },
    openGraph: {
      type: opts.type ?? "website",
      url: opts.path,
      siteName: SITE_NAME,
      title: ogTitle,
      description: opts.description,
      locale: opts.locale === "en" ? "en_US" : "it_IT",
      alternateLocale: opts.locale === "en" ? ["it_IT"] : ["en_US"],
      images: [{ url: OG_IMAGE.url, width: OG_IMAGE.width, height: OG_IMAGE.height, alt: SITE_NAME }],
      ...(opts.type === "article" ? { publishedTime: opts.publishedTime, modifiedTime: opts.modifiedTime, authors: [SITE_URL] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: opts.description,
      images: [OG_IMAGE.url],
    },
  };
}

export const homeCopy: Record<PageLocale, { title: string; description: string }> = {
  it: {
    title: "Davide De Sanctis — Soluzioni di intelligenza artificiale su misura per aziende",
    description:
      "Sviluppo soluzioni AI su misura per aziende: chatbot e RAG sui documenti aziendali, agenti AI e automazione dei processi, LLM privati, fintech ed edtech. Roma, Milano, Pescara, Teramo, Bologna.",
  },
  en: {
    title: "Davide De Sanctis — Custom artificial intelligence solutions for businesses",
    description:
      "I build custom AI solutions for businesses: RAG chatbots on company documents, AI agents and process automation, private LLMs, fintech and edtech. Based in Italy.",
  },
};
