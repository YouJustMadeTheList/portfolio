import type { ContentPage } from "@/lib/seo/pages";
import { CASE_LINKS } from "@/content/case-studies";
import { PAGES_DATE } from "./shared";

/* I casi studio riprendono ALLA LETTERA fatti e numeri di content/case-studies.ts
   (livello di dettaglio "rounded" per il caso dati). Nessun dettaglio in più:
   i progetti B e C sono privati e non devono essere replicabili. */

const it = { kind: "case" as const, locale: "it" as const, publishedAt: PAGES_DATE, updatedAt: PAGES_DATE };
const en = { kind: "case" as const, locale: "en" as const, publishedAt: PAGES_DATE, updatedAt: PAGES_DATE };

export const casesPages: ContentPage[] = [
  {
    ...it,
    key: "case-data",
    path: "/it/casi-studio/analytics-ai-documenti",
    metaTitle: "Caso studio: analytics con AI su 2 milioni di documenti",
    metaDescription:
      "Come ho costruito un livello di interrogazione in linguaggio naturale su oltre 2 milioni di documenti: pipeline, clustering, coorti, RAG su Qdrant ed Elasticsearch.",
    eyebrow: "Caso studio · Data Engineering & AI",
    title: "Analytics aumentata da IA su scala documentale.",
    emphasis: "su scala documentale",
    shortTitle: "Analytics AI su 2 milioni di documenti",
    summary: "Interrogare in linguaggio naturale oltre 2 milioni di documenti su decine di indici.",
    intro:
      "Oltre 2 milioni di documenti sparsi su decine di indici, nessun catalogo unificato e nessun modo di chiedere una metrica in linguaggio naturale: ho costruito il livello che mancava tra \"i dati esistono\" e \"i dati rispondono\".",
    sections: [
      {
        id: "sfida",
        title: "La sfida",
        blocks: [
          {
            type: "p",
            text: "Milioni di documenti sparsi su decine di indici, nessun catalogo schema unificato, nessun modo per chiedere una metrica in linguaggio naturale e ottenere una risposta affidabile.",
          },
        ],
      },
      {
        id: "approccio",
        title: "L'approccio",
        blocks: [
          { type: "p", text: "Pipeline di raccolta e filtraggio, clusterizzazione, analisi di coorte, uso di IA per la rielaborazione." },
          { type: "p", text: "**Stack:** Elasticsearch/Kibana, Qdrant per il layer vettoriale/RAG, Redis." },
        ],
      },
      {
        id: "risultato",
        title: "Il risultato",
        blocks: [
          {
            type: "table",
            head: ["Metrica", "Valore"],
            rows: [
              ["Documenti totali", "oltre 2 milioni"],
              ["Attività", "oltre 1,5 milioni"],
              ["Utenti registrati", "350mila"],
              ["Indici real-time", "60+"],
              ["Campi mappati nel catalogo schema", "oltre 2.000"],
              ["Storico dei dati", "quasi un decennio"],
              ["Dimensioni di analisi", "11"],
            ],
          },
          { type: "callout", text: "Numeri arrotondati: il progetto è coperto da accordo di riservatezza." },
        ],
      },
    ],
    related: ["svc-rag", "svc-llm-dev", "svc-private-llm"],
  },
  {
    ...it,
    key: "case-fintech",
    path: "/it/casi-studio/motore-segnali-xauusd",
    metaTitle: "Caso studio: motore di volatilità e liquidità su XAU/USD",
    metaDescription:
      "Un motore proprietario che trasforma dati di mercato e macro in punteggi continui per ogni timeframe. Bot di validazione: win rate 54% a rischio/rendimento 1,4:1.",
    eyebrow: "Caso studio · Fintech",
    title: "Motore di volatilità e liquidità su XAU/USD.",
    emphasis: "volatilità e liquidità",
    shortTitle: "Motore di segnali su XAU/USD",
    summary: "Dati di mercato e macro fusi in punteggi continui, validati su campioni indipendenti.",
    intro:
      "I segnali di mercato generici non dicono quanta volatilità e liquidità reale c'è adesso, né da che parte pende. Serviva un numero, non un aggettivo, capace di reggere su dati mai visti dal sistema.",
    sections: [
      {
        id: "approccio",
        title: "L'approccio",
        blocks: [
          {
            type: "p",
            text: "Un motore proprietario che fonde più famiglie di dati di mercato e macroeconomici in punteggi continui, per ogni timeframe dal settimanale al minuto. Ogni punteggio è scomponibile nei fattori che lo compongono: niente scatole nere, niente segnali binari.",
          },
          {
            type: "p",
            text: "La parte deterministica e quella probabilistica restano separate, e ogni nuova ipotesi viene validata su campioni indipendenti prima di entrare nel sistema. Sui segnali è stato costruito un bot di trading di validazione.",
          },
        ],
      },
      {
        id: "risultato",
        title: "Il risultato",
        blocks: [
          { type: "p", text: "Bot di trading basato solo su questi segnali: **win rate 54%** a un rapporto rischio/rendimento di **1,4:1**." },
          { type: "callout", text: "Risultato del motore di segnali, non consulenza finanziaria. Il progetto è privato: nessun dettaglio che ne permetta la replica." },
        ],
      },
    ],
    related: ["svc-fintech", "svc-agents", "case-data"],
  },
  {
    ...it,
    key: "case-edtech",
    path: "/it/casi-studio/percorsi-apprendimento-adattivi",
    metaTitle: "Caso studio: percorsi di apprendimento generati con AI",
    metaDescription:
      "Un sistema che legge le prestazioni di ogni studente e genera esercizi calibrati e verificati. In produzione nel Premio Di Nicola 2026, 18ª edizione.",
    eyebrow: "Caso studio · EdTech",
    title: "Percorsi di apprendimento generati e cuciti su ogni studente.",
    emphasis: "cuciti su ogni studente",
    shortTitle: "Percorsi di apprendimento adattivi",
    summary: "Esercizi generati e verificati sul livello di ogni studente, in produzione nel Premio Di Nicola 2026.",
    intro:
      "Ogni studente sbaglia in modo diverso, ma esercizi e piani di studio sono uguali per tutti. Ho costruito un sistema che genera un piano personalizzato per ciascuno, con esercizi verificati prima di arrivare allo studente.",
    sections: [
      {
        id: "sfida",
        title: "La sfida",
        blocks: [
          {
            type: "p",
            text: "Costruire esercizi e piani su misura a mano per ogni ragazzo è impossibile, e un esercizio generato dall'IA vale qualcosa solo se è corretto.",
          },
        ],
      },
      {
        id: "approccio",
        title: "L'approccio",
        blocks: [
          {
            type: "p",
            text: "Un sistema che legge le prestazioni di ogni studente, individua le sue lacune e genera un piano di apprendimento personalizzato: esercizi nuovi, calibrati sul suo livello, che si aggiornano a ogni risposta. Ogni esercizio generato supera una verifica indipendente prima di arrivare allo studente, e i dati personali restano separati dal profilo di apprendimento, per progetto.",
          },
          {
            type: "p",
            text: "Nasce dal motore che genera le prove del Premio Di Nicola 2026: concorso di matematica e logica per studenti abruzzesi, 18ª edizione, fondato nel 2008 da Vincenzo Di Nicola e sostenuto da Confindustria Abruzzo Medio Adriatico.",
          },
        ],
      },
      {
        id: "risultato",
        title: "Il risultato",
        blocks: [
          {
            type: "list",
            items: [
              `Citato da [CertaStampa](${CASE_LINKS.press.certaStampa}), [NotizieDAbruzzo](${CASE_LINKS.press.notizieDAbruzzo}) e [Abruzzo Popolare](${CASE_LINKS.press.abruzzoPopolare}) come "ex partecipante, oggi studente al Politecnico di Milano" che ha introdotto l'IA nelle prove.`,
              "Ringraziamento pubblico di Vincenzo Di Nicola su LinkedIn.",
              `Articolo tecnico: [A different test for every student, and a reason to trust it](${CASE_LINKS.article}).`,
            ],
          },
        ],
      },
    ],
    related: ["svc-edtech", "svc-rag"],
  },
  {
    ...it,
    key: "case-custom",
    path: "/it/casi-studio/locanda-camilla",
    metaTitle: "Caso studio: Locanda Camilla, sito da 100/100 SEO",
    metaDescription:
      "Il sito di una dimora storica del 1860 nel Parco Nazionale della Majella: 11 camere, prenotazioni dirette, 100/100 su SEO e Best Practices in PageSpeed Insights.",
    eyebrow: "Caso studio · Sviluppo su misura",
    title: "Locanda Camilla: una dimora del 1860, un sito da primo 5% mondiale.",
    emphasis: "primo 5% mondiale",
    shortTitle: "Locanda Camilla",
    summary: "Dimora storica nella Majella: gallerie per 11 camere, prenotazioni dirette, 100/100 SEO.",
    intro:
      "Una dimora storica del 1860 nel Parco Nazionale della Majella, con 11 camere una diversa dall'altra: il sito doveva raccontarle con gallerie ricche e portare prenotazioni dirette, senza la lentezza tipica dei siti del settore.",
    sections: [
      {
        id: "approccio",
        title: "L'approccio",
        blocks: [
          {
            type: "p",
            text: "Sviluppo custom con performance e SEO come requisiti di partenza, non aggiunti dopo: una galleria per ognuna delle 11 camere, calendario di prenotazione integrato, immagini ottimizzate per il mobile e metadati pronti per la condivisione sui social.",
          },
        ],
      },
      {
        id: "risultato",
        title: "Il risultato",
        blocks: [
          {
            type: "table",
            head: ["Metrica (PageSpeed Insights, 9 luglio 2026)", "Locanda Camilla", "Media settore"],
            rows: [
              ["SEO", "100/100", "65/100"],
              ["Best Practices", "100/100", "80/100"],
              ["Accessibilità", "90/100", "75/100"],
              ["Prestazioni desktop", "96/100", "65/100"],
              ["Prestazioni mobile", "81/100", "40/100"],
            ],
          },
          { type: "p", text: `Primo 5% mondiale su Best Practices + SEO; TBT 0 ms su mobile, CLS 0,008–0,012. Il sito: [locandacamilla.com](${CASE_LINKS.locandaCamilla}).` },
        ],
      },
    ],
    related: ["city-pescara", "city-teramo"],
  },

  /* ---------------------------------------------------------------- EN */
  {
    ...en,
    key: "case-data",
    path: "/en/case-studies/ai-analytics-documents",
    metaTitle: "Case study: AI analytics over 2 million documents",
    metaDescription:
      "A natural-language query layer over 2M+ documents: pipelines, clustering, cohorts, RAG on Qdrant and Elasticsearch.",
    eyebrow: "Case study · Data Engineering & AI",
    title: "AI-augmented analytics at document scale.",
    emphasis: "at document scale",
    shortTitle: "AI analytics over 2M documents",
    summary: "Natural-language questions over 2M+ documents across dozens of indices.",
    intro:
      "Millions of documents scattered across dozens of indices, no unified schema catalog, no way to ask for a metric in natural language and get a reliable answer. I built the missing layer.",
    sections: [
      {
        id: "approach",
        title: "Approach",
        blocks: [
          { type: "p", text: "Collection and filtering pipeline, clustering, cohort analysis, AI-driven reprocessing." },
          { type: "p", text: "**Stack:** Elasticsearch/Kibana, Qdrant for the vector/RAG layer, Redis." },
        ],
      },
      {
        id: "result",
        title: "Result",
        blocks: [
          {
            type: "p",
            text: "Over 2 million total documents, including 1.5M+ activities and 350K users · 60+ real-time indices · 2,000+ fields mapped in the schema catalog · nearly a decade of historical data · 11 analysis dimensions.",
          },
          { type: "callout", text: "Rounded figures: the project is under NDA." },
        ],
      },
    ],
    related: ["svc-rag", "svc-llm-dev"],
  },
  {
    ...en,
    key: "case-fintech",
    path: "/en/case-studies/xauusd-signal-engine",
    metaTitle: "Case study: volatility and liquidity engine on XAU/USD",
    metaDescription:
      "A proprietary engine turning market and macro data into continuous scores on every timeframe. Validation bot: 54% win rate at a 1.4:1 risk/reward.",
    eyebrow: "Case study · Fintech",
    title: "Volatility and liquidity engine on XAU/USD.",
    emphasis: "Volatility and liquidity",
    shortTitle: "XAU/USD signal engine",
    summary: "Market and macro data fused into continuous scores, validated on independent samples.",
    intro:
      "Generic market signals don't tell you how much real volatility and liquidity there is right now, or which way it leans. It needed a number, not an adjective, that holds up on unseen data.",
    sections: [
      {
        id: "approach",
        title: "Approach",
        blocks: [
          {
            type: "p",
            text: "A proprietary engine that fuses several families of market and macroeconomic data into continuous scores, for every timeframe from weekly down to one minute. Every score breaks down into the factors behind it. Deterministic and probabilistic layers stay separate, and every new hypothesis is validated on independent samples.",
          },
        ],
      },
      {
        id: "result",
        title: "Result",
        blocks: [
          { type: "p", text: "Trading bot based solely on these signals: **54% win rate** at a **1.4:1** risk/reward ratio." },
          { type: "callout", text: "Signal-engine result, not financial advice. Private project: no replicable details." },
        ],
      },
    ],
    related: ["svc-fintech", "svc-agents"],
  },
  {
    ...en,
    key: "case-edtech",
    path: "/en/case-studies/adaptive-learning-paths",
    metaTitle: "Case study: AI-generated learning paths for every student",
    metaDescription:
      "A system that reads each student's performance and generates calibrated, verified exercises. In production at the Premio Di Nicola 2026 competition.",
    eyebrow: "Case study · EdTech",
    title: "Learning paths generated and tailored to every student.",
    emphasis: "tailored to every student",
    shortTitle: "Adaptive learning paths",
    summary: "Generated, verified exercises for each student, in production at Premio Di Nicola 2026.",
    intro:
      "Every student gets things wrong in their own way, yet exercises are the same for everyone. I built a system that generates a personalized plan for each student, with every exercise verified before it reaches them.",
    sections: [
      {
        id: "approach",
        title: "Approach",
        blocks: [
          {
            type: "p",
            text: "The system reads each student's performance, finds their gaps and generates new exercises calibrated to their level, updated with every answer. Every generated exercise passes an independent check, and personal data is kept apart from the learning profile by design. It grew out of the engine that generates the exams for Premio Di Nicola 2026, a maths and logic competition for students in Abruzzo (18th edition, founded in 2008 by Vincenzo Di Nicola, backed by Confindustria Abruzzo Medio Adriatico).",
          },
          { type: "p", text: `Technical article: [A different test for every student, and a reason to trust it](${CASE_LINKS.article}).` },
        ],
      },
    ],
    related: ["svc-edtech"],
  },
  {
    ...en,
    key: "case-custom",
    path: "/en/case-studies/locanda-camilla",
    metaTitle: "Case study: Locanda Camilla, a 100/100 SEO website",
    metaDescription:
      "Website for an 1860 historic residence in the Majella National Park: 11 rooms, direct bookings, 100/100 SEO and Best Practices on PageSpeed Insights.",
    eyebrow: "Case study · Custom development",
    title: "Locanda Camilla: an 1860 residence, a top-5% website.",
    emphasis: "a top-5% website",
    shortTitle: "Locanda Camilla",
    summary: "Historic residence in the Majella: 11 room galleries, direct bookings, 100/100 SEO.",
    intro:
      "An 1860 historic residence in the Majella National Park with 11 rooms, each unlike the others. The site had to show them through rich galleries and drive direct bookings, without the slowness typical of the sector.",
    sections: [
      {
        id: "result",
        title: "Result",
        blocks: [
          {
            type: "p",
            text: `Top 5% worldwide on Best Practices + SEO (PageSpeed Insights, 9 July 2026): SEO 100, Best Practices 100, Accessibility 90, Performance 96 desktop and 81 mobile; 0 ms TBT on mobile, 0.008–0.012 CLS. The site: [locandacamilla.com](${CASE_LINKS.locandaCamilla}).`,
          },
        ],
      },
    ],
    related: ["svc-llm-dev"],
  },
];
