import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";
import { setRequestLocale } from "next-intl/server";
import { privacyPolicy, type LegalLocale } from "@/content/legal";
import { LegalDocument } from "@/components/legal/LegalDocument";

type Props = { params: Promise<{ locale: string }> };

const pick = (l: string): LegalLocale => (l === "en" ? "en" : "it");

export async function routeMetadata({ params }: Props): Promise<Metadata> {
  const doc = privacyPolicy[pick((await params).locale)];
  const locale = pick((await params).locale);
  return pageMetadata({
    locale,
    path: `/${locale}/privacy`,
    title: doc.metaTitle,
    absoluteTitle: true,
    description: doc.metaDescription,
    alternates: { it: "/it/privacy", en: "/en/privacy" },
  });
}

export async function PrivacyPage({ params }: Props) {
  const locale = pick((await params).locale);
  setRequestLocale(locale);
  return <LegalDocument doc={privacyPolicy[locale]} locale={locale} />;
}
