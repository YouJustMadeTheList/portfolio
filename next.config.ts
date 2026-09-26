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
    // layout è app/[locale]/layout.tsx (segmento dinamico), vedi quel file.
    globalNotFound: true,
  },
};

export default withNextIntl(nextConfig);
