import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/lib/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/footer/Footer";
import { BackgroundStatic } from "@/components/fx/BackgroundStatic";
import { Tracker } from "@/components/analytics/Tracker";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { VariantProvider } from "@/components/variant/VariantProvider";
import { localeParams, siteMetadata, siteViewport } from "@/components/site/siteConfig";
import "../../globals.css";

/* Root layout della variante MOBILE (telefoni; i tablet ricevono la desktop).
   Albero separato da app/[locale]/d: il bundle mobile non contiene il codice
   desktop. Budget: nessun WebGL globale (fondo CSS statico), scroll nativo
   (niente Lenis), niente grana né cursore custom; data-variant="m" attiva le
   regole di prestazione in globals.css (no backdrop-filter, aurore senza blur). */
export const generateStaticParams = localeParams;
export const dynamicParams = false;
export const metadata = siteMetadata;
export const viewport = siteViewport;

export default async function MobileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={fontVariables} data-variant="m" suppressHydrationWarning>
      <body>
        <BackgroundStatic />
        <VariantProvider variant="m">
          <NextIntlClientProvider messages={messages}>
            <Nav />
            <main>{children}</main>
            <Footer />
            <Tracker />
            <ConsentBanner />
          </NextIntlClientProvider>
        </VariantProvider>
      </body>
    </html>
  );
}
