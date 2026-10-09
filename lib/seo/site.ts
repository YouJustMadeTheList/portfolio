/* ============================================================================
   SEO — dati di identità del sito (unica fonte di verità)
   ----------------------------------------------------------------------------
   URL canonico, persona, azienda e profili collegati. Li leggono metadata,
   dati strutturati (JSON-LD), sitemap, robots e llms.txt: un fatto sbagliato
   qui finisce ripetuto da Google e dagli assistenti AI, quindi SOLO fatti
   confermati. I valori "TODO_" vengono omessi dall'output finché non ci sono.
   ========================================================================== */

import {
  contactEmail,
  instagramUrl,
  isPlaceholderValue,
  linkedinUrl,
  phoneDisplay,
} from "@/content/contact";

/** Dominio principale (il .it reindirizza qui con un 301). Senza slash finale. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://davidedesanctis.com").replace(/\/$/, "");

export const SITE_NAME = "Davide De Sanctis";

export const GITHUB_URL = "https://github.com/YouJustMadeTheList";

/** Profili ufficiali: sameAs della persona. Solo profili gestiti da Davide. */
export const PERSON_SAME_AS = [linkedinUrl, GITHUB_URL, instagramUrl];

/** Foto ufficiale (quadrata 800×800): Person.image e og:image di chi-sono/about. */
export const PERSON_IMAGE = { url: "/davide-de-sanctis.jpg", width: 800, height: 800 };

/** Pagina entità della persona, per lingua: unico riferimento per Person.url e mainEntityOfPage. */
export const PERSON_PAGE: Record<"it" | "en", string> = { it: "/it/chi-sono", en: "/en/about" };

/** Varianti del nome con cui lo cercano le persone (confermate da Davide). */
export const PERSON_ALTERNATE_NAMES = ["Davide De Sanctis AI", "Davide De Sanctis IA"];

/** Riconoscimenti già pubblicati in content/pages/about.ts (solo fatti confermati). */
export const PERSON_AWARDS = {
  it: [
    "Olimpiadi dell'Informatica: 1° posto a squadre (Università dell'Aquila), 2023 e 2024",
    "Romanae Disputationes 2023: menzione d'onore",
    "Olimpiadi di Problem Solving 2022: menzione d'onore nazionale",
  ],
  en: [
    "Informatics Olympics: 1st place, team (University of L'Aquila), 2023 and 2024",
    "Romanae Disputationes 2023: honorable mention",
    "Problem Solving Olympiad 2022: national honorable mention",
  ],
};

export const PERSON = {
  name: "Davide De Sanctis",
  givenName: "Davide",
  familyName: "De Sanctis",
  jobTitle: {
    it: "Sviluppatore di soluzioni AI su misura · AI Automation Specialist",
    en: "Custom AI solutions developer · AI Automation Specialist",
  },
  description: {
    it: "Sviluppa soluzioni di intelligenza artificiale su misura per aziende: LLM e RAG sui documenti aziendali, agenti AI e automazione dei processi, data engineering, fintech ed edtech. AI Automation Specialist in Conio, studente di Ingegneria Informatica al Politecnico di Milano, fondatore di una propria società.",
    en: "Builds custom artificial intelligence solutions for businesses: LLMs and RAG on company documents, AI agents and process automation, data engineering, fintech and edtech. AI Automation Specialist at Conio, Computer Engineering student at Politecnico di Milano, founder of his own company.",
  },
  worksFor: { name: "Conio", url: "https://www.conio.com" },
  alumniOf: { name: "Politecnico di Milano", url: "https://www.polimi.it" },
  knowsAbout: [
    "Intelligenza artificiale",
    "Large Language Model",
    "Retrieval-Augmented Generation",
    "Agenti AI",
    "Automazione dei processi aziendali",
    "Data engineering",
    "Elasticsearch",
    "Qdrant",
    "Fintech",
    "EdTech",
    "Apprendimento adattivo",
    "Sviluppo software su misura",
  ],
  email: contactEmail,
  telephone: phoneDisplay.replace(/\s/g, ""),
};

/**
 * La società di Davide. Ragione sociale, P.IVA e sede legale vanno compilati:
 * finché sono "TODO_" l'Organization esce solo con il nome commerciale.
 */
export const COMPANY = {
  /** Nome commerciale distinto da quello della persona (evita due entità con lo stesso nome). */
  brandName: "Davide De Sanctis — Soluzioni AI su misura",
  legalName: "TODO_RAGIONE_SOCIALE_SRL",
  vatID: "TODO_PARTITA_IVA",
  streetAddress: "TODO_INDIRIZZO_SEDE_LEGALE",
  postalCode: "TODO_CAP",
  addressLocality: "TODO_CITTA",
  addressRegion: "TODO_PROVINCIA",
};

/** Zone servite dichiarate (dove Davide incontra clienti di persona). */
export const AREAS_SERVED = ["Roma", "Milano", "Pescara", "Teramo", "Bologna", "Italia"];

export const known = (v: string) => !isPlaceholderValue(v);

export const absUrl = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export const OG_IMAGE = { url: "/og.png", width: 1200, height: 630 };
