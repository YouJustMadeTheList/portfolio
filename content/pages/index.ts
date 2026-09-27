import type { ContentPage, PageKind, PageLocale } from "@/lib/seo/pages";
import { servicesIt } from "./services.it";
import { servicesEn } from "./services.en";
import { citiesPages } from "./cities";
import { casesPages } from "./cases";
import { aboutPages } from "./about";
import { fundingPages } from "./funding";
import { guidesPages } from "./guides";
import { PAGES_DATE } from "./shared";

/* Hub: elencano le pagine di un tipo. Il contenuto della lista è generato. */
const hub = (p: Omit<ContentPage, "kind" | "sections" | "publishedAt" | "updatedAt"> & { lists: PageKind }): ContentPage => ({
  ...p,
  kind: "hub",
  sections: [],
  publishedAt: PAGES_DATE,
  updatedAt: PAGES_DATE,
});

const hubs: ContentPage[] = [
  hub({
    key: "hub-services",
    locale: "it",
    lists: "service",
    path: "/it/servizi",
    metaTitle: "Servizi: soluzioni di intelligenza artificiale su misura",
    metaDescription:
      "Chatbot e RAG sui documenti aziendali, LLM privati, agenti AI e automazione, sviluppo LLM, AI per fintech ed edtech. Soluzioni su misura per aziende.",
    eyebrow: "Servizi",
    title: "Soluzioni di intelligenza artificiale su misura.",
    emphasis: "su misura",
    shortTitle: "Servizi",
    summary: "Tutti i servizi.",
    intro:
      "Sviluppo sistemi di intelligenza artificiale su misura per aziende: assistenti che rispondono sui tuoi documenti, agenti che automatizzano il lavoro ripetitivo, modelli privati, sistemi dati per fintech ed edtech. Ogni progetto parte da un processo reale e da un risultato misurabile.",
  }),
  hub({
    key: "hub-services",
    locale: "en",
    lists: "service",
    path: "/en/services",
    metaTitle: "Services: custom artificial intelligence solutions",
    metaDescription:
      "RAG chatbots on company documents, private LLMs, AI agents and automation, LLM development, AI for fintech and edtech. Custom solutions for businesses.",
    eyebrow: "Services",
    title: "Custom artificial intelligence solutions.",
    emphasis: "Custom",
    shortTitle: "Services",
    summary: "All services.",
    intro:
      "I build custom AI systems for businesses: assistants that answer from your documents, agents that automate repetitive work, private models, data systems for fintech and edtech. Every project starts from a real process and a measurable result.",
  }),
  hub({
    key: "hub-cases",
    locale: "it",
    lists: "case",
    path: "/it/casi-studio",
    metaTitle: "Casi studio: progetti di AI e sviluppo su misura",
    metaDescription:
      "Quattro progetti reali: analytics con AI su 2 milioni di documenti, motore di segnali fintech, percorsi di apprendimento generati, Locanda Camilla.",
    eyebrow: "Casi studio",
    title: "Quattro sistemi, quattro settori.",
    emphasis: "quattro settori",
    shortTitle: "Casi studio",
    summary: "Tutti i casi studio.",
    intro: "Sfida, approccio e risultato di quattro progetti in produzione. Numeri veri, arrotondati dove c'è un accordo di riservatezza.",
  }),
  hub({
    key: "hub-cases",
    locale: "en",
    lists: "case",
    path: "/en/case-studies",
    metaTitle: "Case studies: AI and custom development projects",
    metaDescription:
      "Four real projects: AI analytics over 2 million documents, a fintech signal engine, generated learning paths, Locanda Camilla.",
    eyebrow: "Case studies",
    title: "Four systems, four sectors.",
    emphasis: "four sectors",
    shortTitle: "Case studies",
    summary: "All case studies.",
    intro: "Challenge, approach and result of four projects in production. Real numbers, rounded where an NDA applies.",
  }),
  hub({
    key: "hub-guides",
    locale: "it",
    lists: "guide",
    path: "/it/guide",
    metaTitle: "Guide sull'intelligenza artificiale per aziende",
    metaDescription:
      "Guide pratiche su costi, privacy, AI Act e scelte tecniche per portare l'intelligenza artificiale in azienda. Aggiornate e con le fonti.",
    eyebrow: "Guide",
    title: "Guide pratiche sull'AI in azienda.",
    emphasis: "pratiche",
    shortTitle: "Guide",
    summary: "Tutte le guide.",
    intro: "Risposte dirette alle domande che mi fanno più spesso le aziende: quanto costa, dove vanno i dati, cosa chiede la legge, quale strada scegliere.",
  }),
];

export const contentPages: ContentPage[] = [
  ...hubs,
  ...servicesIt,
  ...servicesEn,
  ...citiesPages,
  ...casesPages,
  ...aboutPages,
  ...fundingPages,
  ...guidesPages,
];

const byPath = new Map(contentPages.map((p) => [p.path, p]));

export function getPageByPath(path: string): ContentPage | undefined {
  return byPath.get(path.replace(/\/$/, ""));
}

export function getPageByKey(key: string, locale: PageLocale): ContentPage | undefined {
  return contentPages.find((p) => p.key === key && p.locale === locale);
}

export function pagesOfKind(kind: PageKind, locale: PageLocale): ContentPage[] {
  return contentPages.filter((p) => p.kind === kind && p.locale === locale);
}

/** Percorsi della stessa pagina nelle due lingue (per hreflang e cambio lingua). */
export function alternatesOf(page: ContentPage): Partial<Record<PageLocale, string>> {
  const out: Partial<Record<PageLocale, string>> = {};
  for (const p of contentPages) if (p.key === page.key) out[p.locale] = p.path;
  return out;
}
