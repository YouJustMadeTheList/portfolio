import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

/* Tutto il sito è aperto a motori di ricerca e assistenti AI (Googlebot,
   Bingbot, OAI-SearchBot/GPTBot, ClaudeBot, PerplexityBot, …): essere letti e
   citati correttamente è l'obiettivo. Chiuse solo le API. Il pannello admin
   NON va nominato qui: il suo percorso è segreto e risponde comunque 404. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
