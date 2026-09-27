import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { privacyPolicy, type LegalLocale } from "@/content/legal";
import { LegalDocument } from "@/components/legal/LegalDocument";

type Props = { params: Promise<{ locale: string }> };

const pick = (l: string): LegalLocale => (l === "en" ? "en" : "it");

export async function routeMetadata({ params }: Props): Promise<Metadata> {
  const doc = privacyPolicy[pick((await params).locale)];
  return {
    title: doc.metaTitle,
    description: doc.metaDescription,
    alternates: { languages: { it: "/it/privacy", en: "/en/privacy" } },
  };
}

export async function PrivacyPage({ params }: Props) {
  const locale = pick((await params).locale);
  setRequestLocale(locale);
  return <LegalDocument doc={privacyPolicy[locale]} locale={locale} />;
}
