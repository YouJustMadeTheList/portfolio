import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { alternatesOf, contentPages, getPageByPath } from "@/content/pages";
import { ContentPageView } from "@/components/pages/ContentPageView";
import { pageMetadata } from "@/lib/seo/metadata";
import { segments } from "@/lib/seo/pages";

/* Catch-all delle due varianti (app/[locale]/d|m/[...rest]): le pagine di
   contenuto registrate in content/pages sono generate staticamente; qualunque
   altro percorso finisce nella 404 del sito, come prima. */

type Props = { params: Promise<{ locale: string; rest: string[] }> };

/** Chiamata una volta per lingua (il layout genera `locale`). */
export async function contentStaticParams({ params }: { params: { locale: string } }) {
  const { locale } = await Promise.resolve(params);
  return contentPages.filter((p) => p.locale === locale).map((p) => ({ rest: segments(p) }));
}

async function resolve(params: Props["params"]) {
  const { locale, rest } = await params;
  return { locale, page: getPageByPath(`/${locale}/${(rest ?? []).join("/")}`) };
}

export async function contentMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await resolve(params);
  if (!page) return {};
  return pageMetadata({
    locale: page.locale,
    path: page.path,
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: alternatesOf(page),
    type: page.kind === "guide" || page.kind === "case" || page.kind === "funding" ? "article" : page.kind === "about" ? "profile" : "website",
    publishedTime: page.publishedAt,
    modifiedTime: page.updatedAt,
  });
}

export async function ContentRoutePage({ params }: Props) {
  const { locale, page } = await resolve(params);
  setRequestLocale(locale);
  if (!page) notFound();
  return <ContentPageView page={page} />;
}
