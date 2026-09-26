// Data model per 07 ABOUT / TRAIETTORIA — vedi specs/07-about-traiettoria.md §8.
// Copiato verbatim dallo spec: non alterare i testi (in particolare il dato GPA,
// vedi §1 nota di correzione) senza aggiornare prima lo spec.

export type LocalizedText = { it: string; en: string };

export type TimelineLane = "academic" | "professional";

export type TimelinePhase = {
  id: string; // "liceo" | "costruzione" | "oggi"
  label: LocalizedText;
};

export type TimelineEvent = {
  id: string;
  lane: TimelineLane;
  phaseId: TimelinePhase["id"];
  order?: number;
  title: LocalizedText;
  subtitle?: LocalizedText;
  yearHint?: string;
  isOngoing?: boolean;
};

// v1.1 — badge di riconoscimento leggeri (§1bis), distinti dagli TimelineEvent:
// non hanno un box, solo un marker + etichetta minima agganciati al filamento.
export type AchievementBadge = {
  id: string;
  lane: TimelineLane;
  phaseId: TimelinePhase["id"];
  order?: number;
  label: LocalizedText;
  detail: LocalizedText;
  year?: string;
};

export const timelinePhases: TimelinePhase[] = [
  { id: "liceo", label: { it: "Liceo", en: "High school" } },
  { id: "costruzione", label: { it: "Costruzione", en: "Building" } },
  { id: "oggi", label: { it: "Oggi", en: "Today" } },
];

export const timelineEvents: TimelineEvent[] = [
  {
    id: "liceo-acc",
    lane: "academic",
    phaseId: "liceo",
    title: { it: "Liceo Scientifico", en: "Scientific High School" },
    subtitle: { it: "qui nascono sviluppo e IA", en: "where dev and AI started" },
  },
  {
    id: "liceo-prof",
    lane: "professional",
    phaseId: "liceo",
    title: { it: "Primi progetti dev/IA", en: "First dev/AI projects" },
    subtitle: { it: "dal liceo", en: "since high school" },
  },

  {
    id: "indip-prof",
    lane: "professional",
    phaseId: "costruzione",
    order: 1,
    title: { it: "Anni da indipendente", en: "Years as an independent" },
    subtitle: {
      it: "primi clienti, primi sistemi in produzione",
      en: "first clients, first systems in production",
    },
  },
  {
    id: "azienda-prof",
    lane: "professional",
    phaseId: "costruzione",
    order: 2,
    title: { it: "Fondazione della propria azienda", en: "Founded my own company" },
  },

  {
    id: "polimi-acc",
    lane: "academic",
    phaseId: "oggi",
    title: {
      it: "Politecnico di Milano — Ingegneria Informatica",
      en: "Politecnico di Milano — Computer Engineering",
    },
    subtitle: {
      it: "primo anno completato · media 28,57/30 · 60 CFU",
      en: "first year completed · 28.57/30 average · 60 credits",
    },
    isOngoing: true,
  },
  {
    id: "conio-prof",
    lane: "professional",
    phaseId: "oggi",
    title: { it: "AI Automation Specialist @ Conio", en: "AI Automation Specialist @ Conio" },
    subtitle: { it: "oggi, in parallelo", en: "today, in parallel" },
    isOngoing: true,
  },
];

// v1.1 — badge di riconoscimento (§1bis), dal CV
export const achievementBadges: AchievementBadge[] = [
  {
    id: "ops-2022",
    lane: "academic",
    phaseId: "liceo",
    year: "2022",
    label: { it: "Menzione d'onore OPS 2022", en: "OPS 2022 — national honorable mention" },
    detail: {
      it: "Menzione d'onore nazionale alle Olimpiadi di Problem Solving, 2022.",
      en: "National honorable mention at the Problem Solving Olympiad, 2022.",
    },
  },
  {
    id: "figc-referee",
    lane: "professional",
    phaseId: "liceo",
    order: 99,
    year: "dal 2022",
    label: { it: "Arbitro FIGC dal 2022", en: "FIGC referee since 2022" },
    detail: {
      it: "Arbitro di calcio tesserato AIA/FIGC dal 2022 — attività parallela, non citata altrove sul sito.",
      en: "Registered AIA/FIGC football referee since 2022 — a parallel activity, not mentioned elsewhere on the site.",
    },
  },
  {
    id: "olimpiadi-inf-2023",
    lane: "academic",
    phaseId: "costruzione",
    order: 1,
    year: "2023",
    label: {
      it: "Olimpiadi dell'Informatica — 1° posto a squadre, 2023",
      en: "Informatics Olympics — 1st place (team), 2023",
    },
    detail: {
      it: "Squadra vincitrice (Univ. dell'Aquila) alle Olimpiadi dell'Informatica, edizione 2023.",
      en: "Winning team (University of L'Aquila) at the Italian Informatics Olympics, 2023 edition.",
    },
  },
  {
    id: "romanae-disputationes-2023",
    lane: "academic",
    phaseId: "costruzione",
    order: 2,
    year: "2023",
    label: {
      it: "Menzione d'onore Romanae Disputationes 2023",
      en: "Romanae Disputationes 2023 — honorable mention",
    },
    detail: {
      it: "Tesi tra le migliori di oltre 150 squadre partecipanti al concorso filosofico Romanae Disputationes, edizione 2023.",
      en: "Thesis ranked among the best of 150+ competing teams at the Romanae Disputationes philosophy competition, 2023 edition.",
    },
  },
  {
    id: "olimpiadi-inf-2024",
    lane: "academic",
    phaseId: "costruzione",
    order: 3,
    year: "2024",
    label: {
      it: "Olimpiadi dell'Informatica — 1° posto a squadre, 2024",
      en: "Informatics Olympics — 1st place (team), 2024",
    },
    detail: {
      it: "Squadra vincitrice (Univ. dell'Aquila) alle Olimpiadi dell'Informatica, edizione 2024 — secondo anno consecutivo.",
      en: "Winning team (University of L'Aquila) at the Italian Informatics Olympics, 2024 edition — second consecutive year.",
    },
  },
  {
    id: "en-certifications",
    lane: "academic",
    phaseId: "costruzione",
    order: 4,
    label: { it: "Certificazioni di inglese C1", en: "C1 English certifications" },
    detail: {
      it: "Cambridge English (livello B2/C1) e Goldsmiths, University of London (C1).",
      en: "Cambridge English (B2/C1 level) and Goldsmiths, University of London (C1).",
    },
  },
  {
    id: "concordia-business",
    lane: "academic",
    phaseId: "costruzione",
    order: 5,
    label: {
      it: "Business Program, Concordia University",
      en: "Business Program, Concordia University",
    },
    detail: {
      it: "Programma executive breve in business, Concordia University (Los Angeles).",
      en: "Short executive business program, Concordia University (Los Angeles).",
    },
  },
];

export const aboutClosingStatement: LocalizedText = {
  it: "Ho 20 anni. Ho iniziato a scrivere codice e a lavorare con l'IA al liceo; oggi studio Ingegneria Informatica al Politecnico, lavoro come AI Automation Specialist in un'azienda fintech e ho una mia azienda. Non è un percorso lineare — sono più cose insieme, da anni. Quello che mi rende diverso non è una riga di questa timeline: è tenere insieme, ogni giorno, architettura del software, intelligenza artificiale e gestione dei dati — nel codice di un cliente, in aula, e nella mia azienda.",
  en: "I'm 20. I started writing code and working with AI in high school; today I study Computer Engineering at the Politecnico, work as an AI Automation Specialist at a fintech, and run my own company. It's not a linear path — I've been several things at once, for years. What makes me different isn't one line on this timeline: it's holding software architecture, AI, and data management together, every day — in a client's codebase, in a lecture hall, and in my own company.",
};

/**
 * Frase-chiave del testo di chiusura, resa in Instrument Serif italic aqua
 * (ART-DIRECTION §2, "la mossa editoriale centrale"). È una SOTTOSTRINGA esatta
 * di `aboutClosingStatement`: il componente la cerca e la avvolge, così il copy
 * approvato resta uno solo e non va duplicato a mano in due posti.
 */
export const aboutClosingEmphasis: LocalizedText = {
  it: "sono più cose insieme, da anni",
  en: "I've been several things at once, for years",
};

export type WritingCard = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  /**
   * Destinazione dell'articolo. È la UNICA fonte di verità del link: la
   * libreria 3D non costruisce URL per conto suo, legge questo campo così com'è.
   *
   * Può essere un URL ASSOLUTO esterno (`https://…`) oppure un percorso interno
   * (`/…`). Gli URL esterni si aprono in una nuova scheda con
   * `rel="noopener noreferrer"` e l'affordance ↗, e NON ricevono mai il prefisso
   * di lingua; i percorsi interni restano link same-tab.
   */
  href: string;
  /**
   * `true` ⟺ `href` punta a una pagina che ESISTE davvero ed è online.
   *
   * Con `true` il libro apre la scheda e "Scopri" è un link vero. Con `false`
   * (o assente) la scheda mostra titolo e descrizione ma il controllo è
   * disattivato e dichiara che l'articolo non è ancora online — così un link
   * morto non passa inosservato al posto di dare un 404.
   *
   * PER IL PROPRIETARIO: per aggiungere un articolo, metti l'URL pubblico in
   * `href` e `published: true`. Non serve toccare nessun componente.
   */
  published?: boolean;
  /** Lingua in cui è scritto l'articolo originale: se diversa dalla lingua del
   *  sito, il pulsante "Scopri" mostra il tag (IT)/(EN) e il link porta `hreflang`. */
  lang?: "it" | "en";
  languageNote?: LocalizedText; // per card disponibili solo in una lingua (vedi §1)
};

export const writingCards: WritingCard[] = [
  {
    id: "adaptive-testing",
    title: {
      it: "A different test for every student — and a reason to trust it",
      en: "A different test for every student — and a reason to trust it",
    },
    description: {
      it: "Come funziona davvero l'adaptive testing dietro il case study EdTech — e perché uno studente può fidarsene.",
      en: "How the adaptive testing behind the EdTech case study actually works — and why a student can trust it.",
    },
    href: "https://youjustmadethelist.github.io/adaptive_test_article/",
    published: true,
    lang: "en",
    languageNote: { it: "Articolo originale in inglese", en: "" },
  },
  {
    id: "qs-ranking-87",
    title: {
      it: "87° con le mani legate",
      en: "87° con le mani legate",
    },
    description: {
      it: "Il Politecnico di Milano nel QS Ranking 2027: cosa dice il numero, cosa nasconde, e perché +100 posizioni in 10 anni contano più della posizione assoluta.",
      en: "Politecnico di Milano's place in the QS Ranking 2027: what the number says, what it hides, and why +100 spots in 10 years matters more than the absolute rank.",
    },
    href: "https://youjustmadethelist.github.io/polimi_qs/polimi-qs-2027",
    published: true,
    lang: "it",
    languageNote: { it: "", en: "Original piece in Italian" },
  },
];
