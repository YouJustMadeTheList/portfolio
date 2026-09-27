/* ============================================================================
   Pagine di contenuto (servizi, città, casi studio, chi sono, bandi, guide)
   ----------------------------------------------------------------------------
   Modello unico: la stessa pagina esiste in una o due lingue, legate dalla
   `key`. Da qui escono rotte statiche, metadata, hreflang, sitemap, dati
   strutturati e i link interni. Il testo vive in content/pages/*.
   ========================================================================== */

export type PageLocale = "it" | "en";

export type PageKind = "service" | "city" | "case" | "about" | "guide" | "funding" | "hub";

/** Testo inline: **grassetto** e [link](/it/percorso o https://…). */
export type Block =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "callout"; text: string };

export type Section = { id: string; title: string; blocks: Block[] };

export type Faq = { q: string; a: string };

export type ContentPage = {
  /** Identità della pagina tra le lingue (stessa key = stessa pagina tradotta). */
  key: string;
  kind: PageKind;
  locale: PageLocale;
  /** Percorso pubblico completo, con prefisso di lingua. Es. "/it/servizi/sviluppatore-llm". */
  path: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  /** Titolo H1; `emphasis` (se c'è) è la parte in corsivo acqua, contenuta nel titolo. */
  title: string;
  emphasis?: string;
  /** Prima frase = la risposta. */
  intro: string;
  /** Titolo breve per card, breadcrumb e link interni. */
  shortTitle: string;
  /** Una riga per le card degli hub. */
  summary: string;
  publishedAt: string;
  updatedAt: string;
  sections: Section[];
  faq?: Faq[];
  /** Pagine collegate (key), mostrate in fondo. */
  related?: string[];
  /** Fonti esterne citate nella pagina. */
  sources?: { label: string; href: string }[];
  /** Per i dati strutturati Service. */
  serviceType?: string;
  /** Per le pagine città: il luogo servito. */
  city?: string;
  /** Solo per gli hub: il tipo di pagine che elencano. */
  lists?: PageKind;
};

export const segments = (p: ContentPage) => p.path.split("/").filter(Boolean).slice(1);
