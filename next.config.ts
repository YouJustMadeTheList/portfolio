import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  reactStrictMode: true,
  // Stessa URL, HTML diverso per telefono e computer (proxy.ts): Google chiede
  // di dichiararlo con "Vary: User-Agent" (dynamic serving). Il Vary impostato
  // nel proxy viene sovrascritto da Next sulle pagine, quindi va anche qui.
  async headers() {
    const vary = [{ key: "Vary", value: "User-Agent, Sec-CH-UA-Mobile" }];
    return [
      { source: "/:locale(it|en)", headers: vary },
      { source: "/:locale(it|en)/:path*", headers: vary },
    ];
  },
  experimental: {
    // app/global-not-found.tsx: 404 per URL senza rotta. Serve perché il root
    // layout è app/[locale]/d|m/layout.tsx (segmento dinamico), vedi quel file.
    globalNotFound: true,
    // ~27 KB di CSS (Tailwind) nel <head>: niente richiesta bloccante prima
    // del primo paint. Il sito vive di prime visite.
    inlineCss: true,
  },
};

export default withNextIntl(nextConfig);
