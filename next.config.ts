import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  reactStrictMode: true,
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
