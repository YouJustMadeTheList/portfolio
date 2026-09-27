/* Dati strutturati schema.org (JSON-LD). Descrivono SOLO ciò che è visibile
   nella pagina e vero: niente recensioni, valutazioni o titoli inventati. */

import type { ContentPage, PageLocale } from "@/lib/seo/pages";
import { AREAS_SERVED, COMPANY, OG_IMAGE, PERSON, PERSON_SAME_AS, SITE_NAME, SITE_URL, absUrl, known } from "@/lib/seo/site";

export const PERSON_ID = `${SITE_URL}/#person`;
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

type Json = Record<string, unknown>;

export function personNode(locale: PageLocale): Json {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: PERSON.name,
    url: SITE_URL,
    jobTitle: PERSON.jobTitle[locale],
    description: PERSON.description[locale],
    email: `mailto:${PERSON.email}`,
    worksFor: [
      { "@type": "Organization", name: PERSON.worksFor.name, url: PERSON.worksFor.url },
      { "@id": ORG_ID },
    ],
    alumniOf: { "@type": "CollegeOrUniversity", name: PERSON.alumniOf.name, url: PERSON.alumniOf.url },
    knowsAbout: PERSON.knowsAbout,
    knowsLanguage: ["it", "en"],
    nationality: { "@type": "Country", name: "Italia" },
    sameAs: PERSON_SAME_AS,
  };
}

export function organizationNode(locale: PageLocale): Json {
  const address = known(COMPANY.streetAddress)
    ? {
        "@type": "PostalAddress",
        streetAddress: COMPANY.streetAddress,
        postalCode: known(COMPANY.postalCode) ? COMPANY.postalCode : undefined,
        addressLocality: known(COMPANY.addressLocality) ? COMPANY.addressLocality : undefined,
        addressRegion: known(COMPANY.addressRegion) ? COMPANY.addressRegion : undefined,
        addressCountry: "IT",
      }
    : undefined;
  return {
    "@type": "ProfessionalService",
    "@id": ORG_ID,
    name: COMPANY.brandName,
    legalName: known(COMPANY.legalName) ? COMPANY.legalName : undefined,
    vatID: known(COMPANY.vatID) ? COMPANY.vatID : undefined,
    url: SITE_URL,
    image: absUrl(OG_IMAGE.url),
    logo: absUrl("/icon.png"),
    description: PERSON.description[locale],
    founder: { "@id": PERSON_ID },
    email: PERSON.email,
    telephone: PERSON.telephone,
    address,
    areaServed: AREAS_SERVED.map((name) => (name === "Italia" ? { "@type": "Country", name } : { "@type": "City", name })),
    knowsAbout: PERSON.knowsAbout,
    sameAs: PERSON_SAME_AS,
  };
}

export function websiteNode(): Json {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: ["it-IT", "en"],
    publisher: { "@id": PERSON_ID },
  };
}

export function homeGraph(locale: PageLocale): Json {
  return {
    "@context": "https://schema.org",
    "@graph": [websiteNode(), personNode(locale), organizationNode(locale)],
  };
}

const homeLabel = (l: PageLocale) => (l === "en" ? "Home" : "Home");

export function pageGraph(page: ContentPage, crumbs: { name: string; path: string }[]): Json {
  const url = absUrl(page.path);
  const lang = page.locale === "en" ? "en" : "it-IT";
  const graph: Json[] = [];

  graph.push({
    "@type": "BreadcrumbList",
    itemListElement: [{ name: homeLabel(page.locale), path: `/${page.locale}` }, ...crumbs].map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absUrl(c.path),
    })),
  });

  const webPage: Json = {
    "@type": page.kind === "about" ? "ProfilePage" : "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: page.metaTitle,
    description: page.metaDescription,
    inLanguage: lang,
    isPartOf: { "@id": WEBSITE_ID },
    datePublished: page.publishedAt,
    dateModified: page.updatedAt,
  };
  if (page.kind === "about") webPage.mainEntity = { "@id": PERSON_ID };
  graph.push(webPage);

  if (page.kind === "about") graph.push(personNode(page.locale));

  if ((page.kind === "service" || page.kind === "city") && page.serviceType) {
    graph.push({
      "@type": "Service",
      "@id": `${url}#service`,
      name: page.shortTitle,
      serviceType: page.serviceType,
      description: page.metaDescription,
      url,
      provider: { "@id": ORG_ID },
      areaServed: page.city
        ? { "@type": "City", name: page.city }
        : { "@type": "Country", name: page.locale === "en" ? "Italy" : "Italia" },
      availableLanguage: ["it", "en"],
    });
    graph.push({ ...organizationNode(page.locale) });
  }

  if (page.kind === "guide" || page.kind === "case" || page.kind === "funding") {
    graph.push({
      "@type": page.kind === "guide" || page.kind === "funding" ? "Article" : "CreativeWork",
      "@id": `${url}#article`,
      headline: page.title,
      description: page.metaDescription,
      inLanguage: lang,
      datePublished: page.publishedAt,
      dateModified: page.updatedAt,
      author: { "@id": PERSON_ID },
      publisher: { "@id": PERSON_ID },
      mainEntityOfPage: { "@id": `${url}#webpage` },
      image: absUrl(OG_IMAGE.url),
    });
    graph.push(personNode(page.locale));
  }

  if (page.faq?.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: page.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: stripMarkup(f.a) },
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

/** Testo semplice da markdown inline (**x**, [t](u)). */
export function stripMarkup(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

/** JSON sicuro dentro <script>: niente "</script>" né caratteri che rompono l'HTML. */
export function serializeJsonLd(data: Json): string {
  return JSON.stringify(data, (_k, v) => (v === undefined ? undefined : v))
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
