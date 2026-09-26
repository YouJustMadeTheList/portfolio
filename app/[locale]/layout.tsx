import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
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
import "../globals.css";

/* Solo le lingue note: un primo segmento sconosciuto (es. /zz) non entra nel
   layout localizzato e cade sul 404 globale invece che sulla pagina bianca. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
export const dynamicParams = false;

export const metadata: Metadata = {
  title: "Davide De Sanctis — Software Architecture · AI · Data Systems",
  description:
    "Progetto il futuro e lo cucio su misura, per te e la tua azienda. Data engineering, IA, fintech e soluzioni custom.",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    /* fontVariables espone --font-space-grotesk / --font-instrument-serif /
       --font-inter / --font-jetbrains-mono, che app/globals.css rimappa su
       --font-display / --font-serif / --font-body / --font-mono.

       DEVE stare su <html>, non su <body>: globals.css dichiara
       `--font-display: var(--font-space-grotesk), …` dentro `:root`, cioè
       proprio su <html>. Con le variabili di next/font su <body>, quel
       `var()` non aveva nulla da risolvere su <html>: la custom property
       diventava "invalid at computed-value time" — e siccome le custom
       property si ereditano, <body> ereditava l'invalido invece di
       ricalcolarlo. Risultato: TUTTO il sito in font di sistema, compresa
       l'enfasi serif-italic dei titoli (resa come un finto corsivo sans). */
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <body>
        {/* L1 — fondo globale, fixed, z-index -2, pointer-events:none.
            Una sola istanza per tutta l'app, un solo contesto WebGL: porta sia
            il piano fluido sia il campo particellare aqua (ART-DIRECTION §3 L1).
            Configurabile con <BackgroundShader particles={{ count, opacity, … }} />;
            `particles={false}` lascerebbe il solo piano fluido. */}
        <BackgroundShader />

        <NextIntlClientProvider messages={messages}>
          {/* Lenis: lerp .085, agganciato al ticker GSAP. Disattivo sotto reduced-motion. */}
          <SmoothScroll>
            <Nav />
            <main>{children}</main>
            <Footer />
          </SmoothScroll>
          {/* Analytics first-party + banner del consenso (lib/analytics, content/legal.ts).
              Fuori da SmoothScroll: nessun re-render legato allo scroll. */}
          <Tracker />
          <ConsentBanner />
        </NextIntlClientProvider>

        {/* L3 — grana filmica, fixed, z-index 9998, pointer-events:none. */}
        <GrainOverlay />
        {/* Cursore custom: solo desktop con puntatore fine, mai su touch. */}
        <CustomCursor />
      </body>
    </html>
  );
}
