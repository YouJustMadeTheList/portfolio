import { ContentRoutePage, contentMetadata, contentStaticParams } from "@/components/site/ContentRoute";

// Pagine di contenuto (servizi, città, casi studio, guide…) generate in
// statico; qualunque altro percorso sotto /{locale} → 404 del sito, dentro il
// layout della variante (nav, footer, font, traduzioni).
export const generateStaticParams = contentStaticParams;
export const generateMetadata = contentMetadata;
export default ContentRoutePage;
