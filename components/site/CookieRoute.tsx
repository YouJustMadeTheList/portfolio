import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";
import { setRequestLocale } from "next-intl/server";
import { cookiePolicy, type LegalLocale } from "@/content/legal";
import { LegalDocument } from "@/components/legal/LegalDocument";

type Props = { params: Promise<{ locale: string }> };

const pick = (l: string): LegalLocale => (l === "en" ? "en" : "it");

export async function routeMetadata({ params }: Props): Promise<Metadata> {
  const doc = cookiePolicy[pick((await params).locale)];
  const locale = pick((await params).locale);
  return pageMetadata({
    locale,
    path: `/${locale}/cookie`,
    title: doc.metaTitle,
    absoluteTitle: true,
    description: doc.metaDescription,
    alternates: { it: "/it/cookie", en: "/en/cookie" },
  });
}

export async function CookiePage({ params }: Props) {
  const locale = pick((await params).locale);
  setRequestLocale(locale);
  return <LegalDocument doc={cookiePolicy[locale]} locale={locale} />;
}
