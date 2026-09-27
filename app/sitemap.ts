import type { MetadataRoute } from "next";
import { alternatesOf, contentPages } from "@/content/pages";
import { SITE_URL, absUrl } from "@/lib/seo/site";
import { PAGES_DATE } from "@/content/pages/shared";

/* Sitemap con le alternative di lingua (hreflang) per ogni URL. */
export default function sitemap(): MetadataRoute.Sitemap {
  const langs = (m: Partial<Record<"it" | "en", string>>) =>
    Object.fromEntries(Object.entries(m).map(([k, v]) => [k, absUrl(v as string)]));

  const fixed: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/it`, lastModified: PAGES_DATE, changeFrequency: "monthly", priority: 1, alternates: { languages: langs({ it: "/it", en: "/en" }) } },
    { url: `${SITE_URL}/en`, lastModified: PAGES_DATE, changeFrequency: "monthly", priority: 0.8, alternates: { languages: langs({ it: "/it", en: "/en" }) } },
    ...(["privacy", "cookie"] as const).flatMap((s) =>
      (["it", "en"] as const).map((l) => ({
        url: `${SITE_URL}/${l}/${s}`,
        changeFrequency: "yearly" as const,
        priority: 0.1,
        alternates: { languages: langs({ it: `/it/${s}`, en: `/en/${s}` }) },
      })),
    ),
  ];

  const pages: MetadataRoute.Sitemap = contentPages.map((p) => ({
    url: absUrl(p.path),
    lastModified: p.updatedAt,
    changeFrequency: p.kind === "guide" || p.kind === "funding" ? "monthly" : "yearly",
    priority: p.kind === "service" || p.kind === "hub" ? 0.8 : p.kind === "city" ? 0.7 : 0.6,
    alternates: { languages: langs(alternatesOf(p)) },
  }));

  return [...fixed, ...pages];
}
