import { serializeJsonLd } from "@/lib/seo/jsonld";

/** Dati strutturati schema.org, resi lato server (identici in desktop e mobile). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
