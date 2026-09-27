import type { Metadata, Viewport } from "next";
import { routing } from "@/lib/i18n/routing";
import { OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/seo/site";
import { homeCopy } from "@/lib/seo/metadata";

/* Condiviso dai due root layout delle varianti (app/[locale]/d e app/[locale]/m). */

export function localeParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/* viewport-fit=cover: la barra d'azione mobile usa env(safe-area-inset-bottom). */
export const siteViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#03070A",
};

/* Default di tutte le pagine: ogni pagina imposta poi title, description,
   canonical e hreflang propri (lib/seo/metadata.ts). */
export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: homeCopy.it.title, template: `%s — ${SITE_NAME}` },
  description: homeCopy.it.description,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  icons: { icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png", sizes: "512x512" }], apple: "/icon.png" },
  openGraph: { siteName: SITE_NAME, images: [{ url: OG_IMAGE.url, width: OG_IMAGE.width, height: OG_IMAGE.height }] },
  twitter: { card: "summary_large_image" },
};
