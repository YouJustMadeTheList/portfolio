/**
 * content/case-studies.ts — copy e dati definitivi della sezione Case Studies,
 * separati dai componenti per l'i18n e per il gate CTO sulla Card A.
 * Vedi specs/04-case-studies.md §1 e §7 per il contratto e la fonte del copy.
 *
 * REGOLE NON NEGOZIABILI (vedi §7/§8 checklist):
 * - Nessun numero in questo file è stato arrotondato/inventato oltre a quanto
 *   letteralmente scritto nella tabella §1 dello spec — copiare, non calcolare.
 * - Il nome della piattaforma/prodotto interno di Card A non compare MAI qui,
 *   in nessun livello di dettaglio, in nessuna lingua.
 * - Card B: nessun link a repository, nessun nome di partner/controparte, e
 *   nessun dettaglio che permetta di replicare il motore (fonti puntuali,
 *   nomi dei moduli, parametri): progetto privato in attesa di tutela.
 * - Card C: descrive SOLO generazione e personalizzazione dei percorsi di
 *   apprendimento. Nessun nome di piattaforma/progetto interno, nessun nome di
 *   modello o di libreria, nessun link a repository.
 *
 * ---------------------------------------------------------------------------
 * NOTA SULLA CONDENSAZIONE (v2 — restyle "Liquid Aqua / Deep Void")
 *
 * ART-DIRECTION §6 chiede di ridurre drasticamente il testo VISIBILE sulla card,
 * tenendo il dettaglio lungo dietro una disclosure. Per farlo senza toccare un
 * solo fatto, ogni card ha ora un `brief`: le frasi di Sfida/Approccio sono
 * SPEZZATE nelle loro clausole originali (stessi sostantivi, stessi numeri,
 * stessi nomi propri; cambiano solo punteggiatura e maiuscola di inizio riga).
 * Il testo integrale resta in `challenge`/`approach`/`result` ed è quello che
 * la card mostra nel pannello "Dettagli": nulla è stato rimosso dal sito, è
 * stato solo spostato dietro un'azione dell'utente.
 * ---------------------------------------------------------------------------
 */

export type DetailLevel = "exact" | "rounded" | "no-numbers";

export type CaseCardId = "data" | "fintech" | "edtech" | "custom";

export type Locale = "it" | "en";

/**
 * Versione condensata, mostrata a riposo sulla faccia della card.
 * Ogni voce è una clausola della frase integrale corrispondente.
 */
export type CaseBrief = {
  challengePoints: string[];
  /**
   * Approccio come chip: ogni chip è un termine che compare TESTUALMENTE nella
   * frase integrale dell'Approccio (motori, fonti, passaggi). Separare i termini
   * non aggiunge né toglie nulla: la frase completa resta in `approach`.
   */
  approachChips: string[];
  /** Chip tecnologici — solo dove lo spec elenca uno stack esplicito. */
  stack?: string[];
  /** Etichetta breve sopra il numero-eroe (clausola dello spec, mai un claim nuovo). */
  resultLead: string;
};

/** Il numero-eroe della card. `value` è una stringa già formattata, mai calcolata. */
export type CaseHeadline = {
  value: string;
  label: string;
  sub?: string;
};

export type CaseCardCopy = {
  tag: string;
  title: string;
  tagline: string; // pattern "Trasformo X in Y" — v1.1, vedi §1
  challenge: string;
  approach: string;
  result: string; // per la card A questo è derivato a runtime da dataResultByLevel[detailLevel]
  ctaLabel: string;
  brief: CaseBrief;
  /** Assente per la Card A: il suo eroe dipende da CASE_A_DETAIL_LEVEL (vedi resolveDataHeadline). */
  headline?: CaseHeadline;
};

/**
 * Una metrica numerica pre-risolta per il livello di dettaglio corrente — Card A.
 *
 * `formatted` è la forma LETTERALE che compare nello spec ed è ciò che viene
 * renderizzato in SSR, senza JS e sotto prefers-reduced-motion.
 * `value`/`decimals`/`prefix`/`suffix` servono solo al contatore animato e sono
 * costruiti in modo che `prefix + format(value) + suffix === formatted`.
 */
export type CaseDataMetric = {
  label: string;
  value: number;
  formatted: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
};

/** Etichette di interfaccia della sezione (non sono contenuto di case study). */
export type CaseStudiesUi = {
  labelChallenge: string;
  labelApproach: string;
  labelResult: string;
  labelStack: string;
  detailsOpen: string;
  detailsClose: string;
  detailsTitle: string;
  prev: string;
  next: string;
  goTo: string;
  carouselLabel: string;
  dragHint: string;
  illustrative: string;
  realScreenshot: string;
  industryAvg: string;
  siteLabel: string;
  scoreCaption: string;
  winRate: string;
  riskReward: string;
  pressLabel: string;
  labelArticle: string;
  labelNote: string;
  /** Intestazioni dei pannelli-strumento (non sono contenuto di case study). */
  readoutData: string;
  readoutSignals: string;
  readoutPagespeed: string;
};

type CaseStudiesLocaleCopy = {
  sectionEyebrow: string;
  sectionTitle: string;
  sectionSubtitle: string;
  ui: CaseStudiesUi;
  cards: Record<CaseCardId, CaseCardCopy>;
  dataResultByLevel: Record<DetailLevel, string>;
  dataMetricsByLevel: Record<DetailLevel, CaseDataMetric[]>;
  dataResultIntro: string;
  fintechDisclaimer: string;
  fintechResult: string;
  edtechSocialProof: {
    pressQuote: string;
    linkedinQuote: string;
    articleLabel: string;
  };
  /** Le tre voci di prova sociale in forma di riga breve (§1, item 1-3). */
  /** `links`: le testate, ciascuna cliccabile verso l'articolo che la cita. */
  edtechProofRows: { source: string; note: string; links?: { label: string; href: string }[] }[];
  edtechHighlightBadge: string;
  customTable: { metric: string; site: number; industryAvg: number; unit: "/100" }[];
  customResultIntro: string;
  customResultClaim: string;
};

export type CaseStudiesCopy = {
  it: CaseStudiesLocaleCopy;
  en: CaseStudiesLocaleCopy;
};

// Tabella comparativa Card D — fissa, identica IT/EN (§1: le etichette restano in
// inglese perché nomenclatura standard PageSpeed).
const customTable = [
  { metric: "SEO", site: 100, industryAvg: 65, unit: "/100" as const },
  { metric: "Best Practices", site: 100, industryAvg: 80, unit: "/100" as const },
  { metric: "Accessibility", site: 90, industryAvg: 75, unit: "/100" as const },
  { metric: "Performance (desktop)", site: 96, industryAvg: 65, unit: "/100" as const },
  { metric: "Performance (mobile)", site: 81, industryAvg: 40, unit: "/100" as const },
];

/**
 * Destinazioni reali delle CTA e delle righe di prova sociale (verificate a mano).
 * Nessun link inventato: dove manca l'URL la riga resta testo.
 */
export const CASE_LINKS = {
  locandaCamilla: "https://www.locandacamilla.com",
  press: {
    certaStampa:
      "https://certastampa.it/cronaca/81270-premio-di-nicola-brillano-gli-studenti-teramani-due-secondi-posti-all-einstein-nel-contest-regionale",
    notizieDAbruzzo:
      "https://www.notiziedabruzzo.it/economia-abruzzo/premio-di-nicola-al-via-la-18a-edizione-del-contest-per-studenti-abruzzesi.html",
    abruzzoPopolare:
      "https://www.abruzzopopolare.com/2026/06/05/compie-18-anni-il-premio-di-nicola-si-svolgera-al-marino-di-teramo-e-al-liceo-galilei-di-pescara/",
  },
  article: "https://youjustmadethelist.github.io/adaptive_test_article/",
  /** Post LinkedIn di Vincenzo Di Nicola: URL ancora da ricevere. */
  diNicolaLinkedIn: "" as string,
} as const;

const pressLinks = [
  { label: "CertaStampa", href: CASE_LINKS.press.certaStampa },
  { label: "NotizieDAbruzzo", href: CASE_LINKS.press.notizieDAbruzzo },
  { label: "Abruzzo Popolare", href: CASE_LINKS.press.abruzzoPopolare },
];

export const caseStudiesCopy: CaseStudiesCopy = {
  it: {
    sectionEyebrow: "Case Studies",
    // ⟨…⟩ → Instrument Serif italic aqua (ART-DIRECTION §2). Il testo è invariato.
    sectionTitle: "Quattro sistemi, ⟨quattro settori⟩.",
    sectionSubtitle: "Sfida → Approccio → Risultato. Numeri veri, non aggettivi.",
    ui: {
      labelChallenge: "Sfida",
      labelApproach: "Approccio",
      labelResult: "Risultato",
      labelStack: "Stack",
      detailsOpen: "Dettagli",
      detailsClose: "Chiudi",
      detailsTitle: "Testo integrale",
      prev: "Case study precedente",
      next: "Case study successivo",
      goTo: "Vai a",
      carouselLabel: "Case study, uno alla volta",
      dragHint: "Trascina o usa le frecce",
      illustrative: "Illustrativo: cluster e coorti, non dati puntuali reali.",
      realScreenshot: "Screenshot reale",
      industryAvg: "Media settore",
      siteLabel: "Locanda Camilla",
      scoreCaption: "score illustrativo del motore",
      winRate: "Win rate",
      riskReward: "rischio/rendimento",
      pressLabel: "Stampa e riconoscimenti",
      labelArticle: "Articolo",
      labelNote: "Nota",
      readoutData: "Cluster · coorti",
      readoutSignals: "Motore di segnali",
      readoutPagespeed: "PageSpeed Insights",
    },
    cards: {
      data: {
        tag: "Data Engineering & AI",
        title: "Analytics aumentata da IA su scala documentale",
        tagline: "Trasformo dati in decisioni.",
        challenge:
          "Milioni di documenti sparsi su decine di indici, nessun catalogo schema unificato, nessun modo per chiedere una metrica in linguaggio naturale e ottenere una risposta affidabile.",
        approach:
          "Pipeline di raccolta e filtraggio, clusterizzazione, analisi di coorte, uso di IA per la rielaborazione. Stack: Elasticsearch/Kibana, Qdrant per il layer vettoriale/RAG, Redis.",
        result: "", // derivato a runtime da dataResultByLevel[CASE_A_DETAIL_LEVEL]
        ctaLabel: "Come funziona",
        brief: {
          challengePoints: [
            "Milioni di documenti sparsi su decine di indici",
            "Nessun catalogo schema unificato",
            "Nessuna metrica chiedibile in linguaggio naturale con risposta affidabile",
          ],
          approachChips: [
            "Pipeline di raccolta e filtraggio",
            "Clusterizzazione",
            "Analisi di coorte",
            "IA per la rielaborazione",
          ],
          stack: ["Elasticsearch/Kibana", "Qdrant — layer vettoriale/RAG", "Redis"],
          resultLead: "Dati reali dall'entity store",
        },
        // headline assente: dipende da CASE_A_DETAIL_LEVEL → resolveDataHeadline()
      },
      fintech: {
        tag: "Fintech · Quant Systems",
        title: "Motore di volatilità e liquidità su XAU/USD",
        tagline: "Trasformo il rumore di mercato in segnali affidabili.",
        challenge:
          "I segnali di mercato generici non dicono quanta volatilità e liquidità reale c'è adesso, né da che parte pende. Serve un numero, non un aggettivo, e deve reggere alla verifica su dati che il sistema non ha mai visto.",
        approach:
          "Un motore proprietario che fonde più famiglie di dati di mercato e macroeconomici in punteggi continui, per ogni timeframe dal settimanale al minuto. Ogni punteggio è scomponibile nei fattori che lo compongono: niente scatole nere, niente segnali binari. La parte deterministica e quella probabilistica restano separate, e ogni nuova ipotesi viene validata su campioni indipendenti prima di entrare nel sistema. Sui segnali è stato costruito un bot di trading di validazione.",
        result:
          "Bot di trading basato solo su questi segnali: win rate 54% a un rapporto rischio/rendimento di 1.4:1.",
        ctaLabel: "Come funziona",
        brief: {
          challengePoints: [
            "Quanta volatilità e liquidità reale c'è adesso, e da che parte pende",
            "Un numero, non un aggettivo",
            "Deve reggere su dati mai visti dal sistema",
          ],
          approachChips: [
            "Dati di mercato e macro multi-fonte",
            "Punteggi continui 0–100",
            "Ogni timeframe, da W1 a M1",
            "Ogni score scomponibile nei suoi fattori",
            "Deterministico e probabilistico separati",
            "Validazione su campioni indipendenti",
          ],
          resultLead: "Bot di trading basato solo su questi segnali",
        },
        headline: {
          value: "54%",
          label: "Win rate",
          sub: "rapporto rischio/rendimento di 1.4:1",
        },
      },
      edtech: {
        tag: "EdTech · Applied AI",
        title: "Percorsi di apprendimento generati e cuciti su ogni studente",
        tagline: "Trasformo i risultati di uno studente nel suo prossimo passo.",
        challenge:
          "Ogni studente sbaglia in modo diverso, ma esercizi e piani di studio sono uguali per tutti. Costruirli a mano su misura per ogni ragazzo è impossibile, e un esercizio generato dall'IA vale qualcosa solo se è corretto.",
        approach:
          "Un sistema che legge le prestazioni di ogni studente, individua le sue lacune e genera un piano di apprendimento personalizzato: esercizi nuovi, calibrati sul suo livello, che si aggiornano a ogni risposta. Ogni esercizio generato supera una verifica indipendente prima di arrivare allo studente, e i dati personali restano separati dal profilo di apprendimento, per progetto. Nasce dal motore che genera le prove del Premio Di Nicola 2026: concorso di matematica e logica per studenti abruzzesi, 18ª edizione, fondato nel 2008 da Vincenzo Di Nicola e sostenuto da Confindustria Abruzzo Medio Adriatico.",
        result: "Copertura stampa e riconoscimento diretto:",
        ctaLabel: "Leggi la copertura stampa",
        brief: {
          challengePoints: [
            "Ogni studente sbaglia in modo diverso",
            "Esercizi e piani di studio uguali per tutti",
            "Un esercizio generato dall'IA vale solo se è corretto",
          ],
          approachChips: [
            "Analisi delle prestazioni di ogni studente",
            "Individuazione delle lacune",
            "Piano di apprendimento personalizzato",
            "Esercizi generati e calibrati sul livello",
            "Verifica indipendente di ogni esercizio",
            "Privacy per progetto",
          ],
          resultLead: "Copertura stampa e riconoscimento diretto",
        },
        headline: {
          value: "2026",
          label: "In produzione",
          sub: "Premio Di Nicola, 18ª edizione",
        },
      },
      custom: {
        tag: "Custom Development",
        title: "Locanda Camilla: una dimora del 1860, un sito da primo 5% mondiale",
        tagline: "Trasformo un sito in un vantaggio competitivo.",
        challenge:
          "Una dimora storica del 1860 nel Parco Nazionale della Majella, con 11 camere una diversa dall'altra: il sito doveva raccontarle con gallerie ricche e portare prenotazioni dirette, in un settore dove foto pesanti, SEO trascurata e mobile lento sono la norma anche nelle strutture di fascia alta.",
        approach:
          "Sviluppo custom con performance e SEO come requisiti di partenza, non aggiunti dopo: una galleria per ognuna delle 11 camere, calendario di prenotazione integrato, immagini ottimizzate per il mobile e metadati pronti per la condivisione sui social.",
        result: "Primo 5% mondiale su Best Practices + SEO. TBT 0ms su mobile, CLS 0.008–0.012.",
        ctaLabel: "Visita il sito",
        brief: {
          challengePoints: [
            "Dimora del 1860 nel Parco Nazionale della Majella, 11 camere",
            "Gallerie ricche e prenotazioni dirette",
            "Nel settore: foto pesanti, SEO trascurata, mobile lento",
          ],
          approachChips: [
            "Sviluppo custom",
            "Performance e SEO fin dal principio",
            "Una galleria per ogni camera",
            "Calendario di prenotazione integrato",
            "Ottimizzato per il mobile",
          ],
          resultLead: "Google PageSpeed Insights, 9 luglio 2026",
        },
        headline: {
          value: "100/100",
          label: "SEO · Best Practices",
          sub: "Primo 5% mondiale su Best Practices + SEO",
        },
      },
    },
    dataResultIntro: "Dati reali dall'entity store:",
    dataResultByLevel: {
      exact:
        "2.261.139 documenti totali su 3 indici core (1.560.717 attività/transazioni, 350.211 utenti registrati) · 62 indici real_time_* nel cluster ES · 2.282 campi mappati nel catalogo schema Qdrant/RAG · finestra dati ~9 anni (2017→oggi) · 11 dimensioni di analisi · 4 metriche calcolabili via linguaggio naturale.",
      rounded:
        "Oltre 2 milioni di documenti totali, di cui oltre 1,5M di attività e 350mila utenti · 60+ indici real-time · oltre 2.000 campi mappati nel catalogo schema · quasi un decennio di dati storici · 11 dimensioni di analisi.",
      "no-numbers":
        "Sistema costruito su un cluster Elasticsearch multi-indice, con un layer RAG su schema esteso (Qdrant) e uno storico di analisi che copre quasi un decennio di dati. Supporta clusterizzazioni, analisi di coorte e metriche calcolabili in linguaggio naturale.",
    },
    dataMetricsByLevel: {
      exact: [
        { label: "Documenti totali", value: 2261139, formatted: "2.261.139" },
        { label: "Attività / transazioni", value: 1560717, formatted: "1.560.717" },
        { label: "Utenti registrati", value: 350211, formatted: "350.211" },
        { label: "Indici real_time_*", value: 62, formatted: "62" },
        { label: "Campi mappati (Qdrant/RAG)", value: 2282, formatted: "2.282" },
        { label: "Dimensioni di analisi", value: 11, formatted: "11" },
        { label: "Metriche in linguaggio naturale", value: 4, formatted: "4" },
      ],
      rounded: [
        {
          label: "Documenti totali",
          value: 2,
          formatted: "oltre 2 milioni",
          prefix: "oltre ",
          suffix: " milioni",
        },
        {
          label: "Attività",
          value: 1.5,
          decimals: 1,
          formatted: "oltre 1,5M",
          prefix: "oltre ",
          suffix: "M",
        },
        { label: "Utenti registrati", value: 350, formatted: "350mila", suffix: "mila" },
        { label: "Indici real-time", value: 60, formatted: "60+", suffix: "+" },
        { label: "Campi mappati", value: 2000, formatted: "oltre 2.000", prefix: "oltre " },
        { label: "Dimensioni di analisi", value: 11, formatted: "11" },
      ],
      "no-numbers": [],
    },
    fintechDisclaimer: "Risultato del motore di segnali, non consulenza finanziaria.",
    fintechResult:
      "Bot di trading basato solo su questi segnali: win rate 54% a un rapporto rischio/rendimento di 1.4:1.",
    edtechSocialProof: {
      pressQuote:
        'Citato da CertaStampa, NotizieDAbruzzo, Abruzzo Popolare come "ex partecipante, oggi studente al Politecnico di Milano" che ha introdotto l\'IA nelle prove.',
      linkedinQuote: "Post LinkedIn di Vincenzo Di Nicola che lo ringrazia personalmente.",
      articleLabel: '"A different test for every student — and a reason to trust it"',
    },
    edtechProofRows: [
      {
        source: "CertaStampa · NotizieDAbruzzo · Abruzzo Popolare",
        note: '"ex partecipante, oggi studente al Politecnico di Milano"',
        links: pressLinks,
      },
      {
        source: "LinkedIn — Vincenzo Di Nicola",
        note: "lo ringrazia personalmente",
      },
      {
        source: "Articolo tecnico",
        note: '"A different test for every student — and a reason to trust it"',
        links: [{ label: "Articolo tecnico", href: CASE_LINKS.article }],
      },
    ],
    edtechHighlightBadge: "Sta evolvendo in qualcosa di più grande. Big news coming soon.",
    customTable,
    customResultIntro: "Dati reali, misurati da Google PageSpeed Insights (9 luglio 2026):",
    customResultClaim:
      "Primo 5% mondiale su Best Practices + SEO. TBT 0ms su mobile, CLS 0.008–0.012.",
  },

  en: {
    sectionEyebrow: "Case Studies",
    sectionTitle: "Four systems, ⟨four industries⟩.",
    sectionSubtitle: "Challenge → Approach → Result. Real numbers, not adjectives.",
    ui: {
      labelChallenge: "Challenge",
      labelApproach: "Approach",
      labelResult: "Result",
      labelStack: "Stack",
      detailsOpen: "Details",
      detailsClose: "Close",
      detailsTitle: "Full text",
      prev: "Previous case study",
      next: "Next case study",
      goTo: "Go to",
      carouselLabel: "Case studies, one at a time",
      dragHint: "Drag or use the arrows",
      illustrative: "Illustrative: clusters and cohorts, not real point-level data.",
      realScreenshot: "Real screenshot",
      industryAvg: "Industry average",
      siteLabel: "Locanda Camilla",
      scoreCaption: "illustrative engine score",
      winRate: "Win rate",
      riskReward: "risk/reward",
      pressLabel: "Press and recognition",
      labelArticle: "Article",
      labelNote: "Note",
      readoutData: "Clusters · cohorts",
      readoutSignals: "Signal engine",
      readoutPagespeed: "PageSpeed Insights",
    },
    cards: {
      data: {
        tag: "Data Engineering & AI",
        title: "AI-augmented analytics at document scale",
        tagline: "I turn data into decisions.",
        challenge:
          "Millions of documents scattered across dozens of indices, no unified schema catalog, no way to ask for a metric in natural language and get a reliable answer.",
        approach:
          "Collection and filtering pipeline, clustering, cohort analysis, AI-driven reprocessing. Stack: Elasticsearch/Kibana, Qdrant for the vector/RAG layer, Redis.",
        result: "",
        ctaLabel: "How it works",
        brief: {
          challengePoints: [
            "Millions of documents scattered across dozens of indices",
            "No unified schema catalog",
            "No way to ask for a metric in natural language and get a reliable answer",
          ],
          approachChips: [
            "Collection and filtering pipeline",
            "Clustering",
            "Cohort analysis",
            "AI-driven reprocessing",
          ],
          stack: ["Elasticsearch/Kibana", "Qdrant — vector/RAG layer", "Redis"],
          resultLead: "Real data from the entity store",
        },
      },
      fintech: {
        tag: "Fintech · Quant Systems",
        title: "Volatility & liquidity engine on XAU/USD",
        tagline: "I turn market noise into reliable signals.",
        challenge:
          "Generic market signals don't tell you how much real volatility and liquidity there is right now, or which way it leans. You need a number, not an adjective, and it has to hold up on data the system has never seen.",
        approach:
          "A proprietary engine that fuses several families of market and macroeconomic data into continuous scores, for every timeframe from weekly down to one minute. Every score breaks down into the factors behind it: no black boxes, no binary flags. The deterministic and probabilistic layers stay separate, and every new hypothesis is validated on independent samples before it enters the system. A validation trading bot was built on top of these signals.",
        result:
          "Trading bot based solely on these signals: 54% win rate at a 1.4:1 risk/reward ratio.",
        ctaLabel: "How it works",
        brief: {
          challengePoints: [
            "How much real volatility and liquidity there is now, and which way it leans",
            "A number, not an adjective",
            "It has to hold up on unseen data",
          ],
          approachChips: [
            "Multi-source market and macro data",
            "Continuous 0–100 scores",
            "Every timeframe, W1 to M1",
            "Every score traceable to its factors",
            "Deterministic and probabilistic kept separate",
            "Validation on independent samples",
          ],
          resultLead: "Trading bot based solely on these signals",
        },
        headline: {
          value: "54%",
          label: "Win rate",
          sub: "1.4:1 risk/reward ratio",
        },
      },
      edtech: {
        tag: "EdTech · Applied AI",
        title: "Learning paths generated and tailored to every student",
        tagline: "I turn a student's results into their next step.",
        challenge:
          "Every student gets things wrong in their own way, yet exercises and study plans are the same for everyone. Tailoring them by hand for every student is impossible, and an AI-generated exercise is only worth something if it's correct.",
        approach:
          "A system that reads each student's performance, finds their gaps and generates a personalized learning plan: new exercises, calibrated to their level, updated with every answer. Every generated exercise passes an independent check before it reaches the student, and personal data is kept apart from the learning profile by design. It grew out of the engine that generates the exams for Premio Di Nicola 2026: a math and logic competition for students in Abruzzo, 18th edition, founded in 2008 by Vincenzo Di Nicola and backed by Confindustria Abruzzo Medio Adriatico.",
        result: "Press coverage and direct recognition:",
        ctaLabel: "Read the press coverage",
        brief: {
          challengePoints: [
            "Every student gets things wrong in their own way",
            "Exercises and study plans are the same for everyone",
            "An AI-generated exercise is only worth it if it's correct",
          ],
          approachChips: [
            "Per-student performance analysis",
            "Gap detection",
            "Personalized learning plan",
            "Exercises generated and calibrated to level",
            "Independent check on every exercise",
            "Privacy by design",
          ],
          resultLead: "Press coverage and direct recognition",
        },
        headline: {
          value: "2026",
          label: "In production",
          sub: "Premio Di Nicola, 18th edition",
        },
      },
      custom: {
        tag: "Custom Development",
        title: "Locanda Camilla: an 1860 residence, a top-5% website",
        tagline: "I turn a website into a competitive edge.",
        challenge:
          "A historic 1860 residence in the Majella National Park, with 11 rooms each unlike the others: the site had to show them through rich galleries and drive direct bookings, in a sector where heavy photos, neglected SEO and slow mobile pages are the norm even at high-end properties.",
        approach:
          "Custom development with performance and SEO as starting requirements, not bolted on afterward: a gallery for each of the 11 rooms, an integrated booking calendar, mobile-optimized images and metadata ready for social sharing.",
        result: "Top 5% worldwide on Best Practices + SEO. 0ms TBT on mobile, 0.008–0.012 CLS.",
        ctaLabel: "Visit the site",
        brief: {
          challengePoints: [
            "An 1860 residence in the Majella National Park, 11 rooms",
            "Rich galleries and direct bookings",
            "The norm in the sector: heavy photos, neglected SEO, slow mobile",
          ],
          approachChips: [
            "Custom development",
            "Performance-and-SEO-first",
            "A gallery for every room",
            "Integrated booking calendar",
            "Mobile-optimized",
          ],
          resultLead: "Google PageSpeed Insights, July 9, 2026",
        },
        headline: {
          value: "100/100",
          label: "SEO · Best Practices",
          sub: "Top 5% worldwide on Best Practices + SEO",
        },
      },
    },
    dataResultIntro: "Real data from the entity store:",
    dataResultByLevel: {
      exact:
        "2,261,139 total documents across 3 core indices (1,560,717 activities/transactions, 350,211 registered users) · 62 real_time_* indices in the ES cluster · 2,282 fields mapped in the Qdrant/RAG schema catalog · ~9-year data window (2017→today) · 11 analysis dimensions · 4 metrics computable in natural language.",
      rounded:
        "Over 2 million total documents, including 1.5M+ activities and 350K users · 60+ real-time indices · 2,000+ fields mapped in the schema catalog · nearly a decade of historical data · 11 analysis dimensions.",
      "no-numbers":
        "Built on a multi-index Elasticsearch cluster, with a RAG layer over an extended schema (Qdrant) and an analysis history spanning nearly a decade of data. Supports clustering, cohort analysis, and metrics computable in natural language.",
    },
    dataMetricsByLevel: {
      exact: [
        { label: "Total documents", value: 2261139, formatted: "2,261,139" },
        { label: "Activities / transactions", value: 1560717, formatted: "1,560,717" },
        { label: "Registered users", value: 350211, formatted: "350,211" },
        { label: "real_time_* indices", value: 62, formatted: "62" },
        { label: "Fields mapped (Qdrant/RAG)", value: 2282, formatted: "2,282" },
        { label: "Analysis dimensions", value: 11, formatted: "11" },
        { label: "Natural-language metrics", value: 4, formatted: "4" },
      ],
      rounded: [
        {
          label: "Total documents",
          value: 2,
          formatted: "over 2 million",
          prefix: "over ",
          suffix: " million",
        },
        { label: "Activities", value: 1.5, decimals: 1, formatted: "1.5M+", suffix: "M+" },
        { label: "Registered users", value: 350, formatted: "350K", suffix: "K" },
        { label: "Real-time indices", value: 60, formatted: "60+", suffix: "+" },
        { label: "Fields mapped", value: 2000, formatted: "2,000+", suffix: "+" },
        { label: "Analysis dimensions", value: 11, formatted: "11" },
      ],
      "no-numbers": [],
    },
    fintechDisclaimer: "Signal engine result, not financial advice.",
    fintechResult:
      "Trading bot based solely on these signals: 54% win rate at a 1.4:1 risk/reward ratio.",
    edtechSocialProof: {
      pressQuote:
        'Cited by CertaStampa, NotizieDAbruzzo, and Abruzzo Popolare as a "former contestant, now a student at Politecnico di Milano" who introduced AI into the exams.',
      linkedinQuote: "A LinkedIn post from Vincenzo Di Nicola thanking him personally.",
      articleLabel: '"A different test for every student — and a reason to trust it"',
    },
    edtechProofRows: [
      {
        source: "CertaStampa · NotizieDAbruzzo · Abruzzo Popolare",
        note: '"former contestant, now a student at Politecnico di Milano"',
        links: pressLinks,
      },
      {
        source: "LinkedIn — Vincenzo Di Nicola",
        note: "thanking him personally",
      },
      {
        source: "Technical article",
        note: '"A different test for every student — and a reason to trust it"',
        links: [{ label: "Technical article", href: CASE_LINKS.article }],
      },
    ],
    edtechHighlightBadge: "It's evolving into something bigger. Big news coming soon.",
    customTable,
    customResultIntro: "Real data, measured by Google PageSpeed Insights (July 9, 2026):",
    customResultClaim: "Top 5% worldwide on Best Practices + SEO. 0ms TBT on mobile, 0.008–0.012 CLS.",
  },
};

// Card B — Volatility dial illustrative values (§5.3): score 0-100 mappato dal
// win rate, dichiarato "illustrativo" in caption, non un numero nuovo non
// menzionato nel documento madre.
export const fintechDialData = {
  score: 54,
  winRate: 54,
  riskReward: "1.4:1",
};

// Card D — righe del bar chart comparativo (§5.4), stessa forma IT/EN.
export const customComparisonRows = customTable.map((row) => ({
  metric: row.metric,
  siteValue: row.site,
  industryAvg: row.industryAvg,
}));

/* ============================================================================
   Risolutori del gate CTO (Card A)

   Unico punto in cui `CASE_A_DETAIL_LEVEL` viene applicato al copy: i componenti
   chiamano queste funzioni e non conoscono i tre livelli. Cambiare il livello nel
   file di config non richiede toccare un componente (checklist §8, prima voce).
   ========================================================================== */

/** Testo integrale del Risultato della Card A per il livello corrente. */
export function resolveDataResult(locale: Locale, level: DetailLevel): string {
  return caseStudiesCopy[locale].dataResultByLevel[level];
}

/** Metriche numeriche della Card A per il livello corrente (vuoto in "no-numbers"). */
export function resolveDataMetrics(locale: Locale, level: DetailLevel): CaseDataMetric[] {
  return caseStudiesCopy[locale].dataMetricsByLevel[level];
}

/**
 * Numero-eroe della Card A. In "no-numbers" non esiste nessun numero da mostrare:
 * la funzione restituisce null e la card cade sul testo del livello, senza cifre.
 */
export function resolveDataHeadline(locale: Locale, level: DetailLevel): CaseHeadline | null {
  const metrics = resolveDataMetrics(locale, level);
  if (metrics.length === 0) return null;
  const first = metrics[0];
  // niente `sub`: l'intro "Dati reali dall'entity store" è già l'etichetta del
  // blocco Risultato sulla faccia della card (brief.resultLead), non si ripete.
  return { value: first.formatted, label: first.label };
}

/** Copy della card con il Risultato della Card A già risolto dal livello. */
export function resolveCardCopy(
  locale: Locale,
  id: CaseCardId,
  level: DetailLevel,
): CaseCardCopy {
  const card = caseStudiesCopy[locale].cards[id];
  if (id !== "data") return card;
  return { ...card, result: resolveDataResult(locale, level) };
}
