import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/lib/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/footer/Footer";
import { BackgroundShader } from "@/components/fx/BackgroundShader";
import { GrainOverlay } from "@/components/fx/GrainOverlay";
import { CustomCursor } from "@/components/fx/CustomCursor";
import { SmoothScroll } from "@/components/fx/SmoothScroll";
import { Tracker } from "@/components/analytics/Tracker";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { VariantProvider } from "@/components/variant/VariantProvider";
import { localeParams, siteMetadata, siteViewport } from "@/components/site/siteConfig";
import "../../globals.css";

/* Root layout della variante DESKTOP (desktop e tablet).
   Il segmento "d" è interno: proxy.ts vi riscrive le richieste dei dispositivi
   non-telefono; l'URL visibile resta /it, /en/... La variante mobile vive in
   un albero separato (app/[locale]/m) così i due bundle JS non si mescolano. */
export const generateStaticParams = localeParams;
export const dynamicParams = false;
export const metadata = siteMetadata;
export const viewport = siteViewport;

export default async function DesktopLayout({
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
    /* fontVariables DEVE stare su <html>: globals.css dichiara --font-display
       ecc. in :root, e con le variabili su <body> il var() non risolverebbe. */
    <html lang={locale} className={fontVariables} data-variant="d" suppressHydrationWarning>
      <body>
        {/* L1 — un solo canvas WebGL: piano fluido + particelle (ART-DIRECTION §3). */}
        <BackgroundShader />
        <VariantProvider variant="d">
          <NextIntlClientProvider messages={messages}>
            {/* Lenis: lerp .085, agganciato al ticker GSAP. Disattivo sotto reduced-motion. */}
            <SmoothScroll>
              <Nav />
              <main>{children}</main>
              <Footer />
            </SmoothScroll>
            <Tracker />
            <ConsentBanner />
          </NextIntlClientProvider>
        </VariantProvider>
        {/* L3 — grana filmica; cursore custom (solo puntatore fine). */}
        <GrainOverlay />
        <CustomCursor />
      </body>
    </html>
  );
}
