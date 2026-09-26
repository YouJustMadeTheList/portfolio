/**
 * Copy dell'Hero — separato dal componente per l'i18n (vedi 01-hero.md §8).
 * Non toccare messages/it.json o messages/en.json da qui: questo modulo è
 * la fonte di verità autonoma per la sezione Hero.
 *
 * v2 (ART-DIRECTION §2 "la mossa editoriale centrale"): la headline non è più
 * una stringa unica che va a capo a caso, ma TRE righe controllate, con la
 * frase-chiave isolata in un campo suo (`headlineEmphasis`) perché il
 * componente la renderizzi in Instrument Serif italic aqua:
 *
 *   Progetto il futuro
 *   e lo ⟨cucio su misura⟩,
 *   per te e la tua azienda.
 *
 * Il testo concatenato (`headlineFull`) resta identico al copy definitivo dello
 * spec §1 — le righe sono una scelta tipografica, non una riscrittura.
 */

export type Locale = "it" | "en";

export type HeroCopy = {
  eyebrow: string;
  /** Riga 1 della headline. */
  headlineLine1: string;
  /** Riga 2, parte prima della frase-chiave (spazio finale incluso). */
  headlineLine2Pre: string;
  /** La frase-chiave: Instrument Serif italic aqua + filo di cucitura. */
  headlineEmphasis: string;
  /** Riga 2, coda dopo la frase-chiave (punteggiatura). */
  headlineLine2Post: string;
  /** Riga 3 della headline. */
  headlineLine3: string;
  /** Headline completa, per SEO/aria e per verifica del copy contract. */
  headlineFull: string;
  positioningLine: string;
  /** Sub-headline completa (fonte di verità del copy). */
  subHeadline: string;
  /** Le stesse parole, già divise nei tre dati che contiene — reso a chip mono. */
  subHeadlineParts: readonly string[];
  /** Badge età: cifra isolata (tabular, aqua) + resto della frase. */
  ageBadgeNumber: string;
  ageBadgeText: string;
  /** Badge completo, per verifica del copy contract. */
  ageBadge: string;
  ctaPrimary: string;
  ctaSecondary: string;
  scrollHint: string;
  /** Didascalia sotto al grafo: cosa rappresenta la forma. */
  pillarsCaption: string;
  pillarsCredit: string;
  /** Label accessibile del pulsante "scorri" (non visibile). */
  scrollHintAria: string;

  /* --- il titolo giocabile (HeroHeadline): le lettere sono oggetti 3D ---
     Il cliente: «trasformare tutte le lettere in oggetti 3d separati e
     permettere all'utente di giocare con la scritta: sfasciare lettere,
     ricomporre la frase, etc…». Lo sfascio parte SEMPRE da un comando
     esplicito: la leggibilità del titolo viene prima del giocattolo. */
  playSmash: string;
  playSmashAgain: string;
  playSmashAria: string;
  playReset: string;
  playResetAria: string;
  playHint: string;
};

export const heroCopy: Record<Locale, HeroCopy> = {
  it: {
    eyebrow: "Software Architecture · AI · Data Systems",
    headlineLine1: "Progetto il futuro",
    headlineLine2Pre: "e lo ",
    headlineEmphasis: "cucio su misura",
    headlineLine2Post: ",",
    headlineLine3: "per te e la tua azienda.",
    headlineFull: "Progetto il futuro e lo cucio su misura, per te e la tua azienda.",
    positioningLine:
      "Uno dei pochi in Italia a creare soluzioni IA su misura in modo intensivo.",
    subHeadline:
      "AI Automation Specialist @ Conio — Politecnico di Milano — Data, EdTech, Fintech",
    subHeadlineParts: [
      "AI Automation Specialist @ Conio",
      "Politecnico di Milano",
      "Data, EdTech, Fintech",
    ],
    ageBadgeNumber: "20",
    ageBadgeText: "anni · percorso iniziato al liceo, oggi in produzione",
    ageBadge: "20 anni · percorso iniziato al liceo, oggi in produzione",
    ctaPrimary: "Guarda i progetti",
    ctaSecondary: "Parliamo di un progetto",
    scrollHint: "Scorri",
    pillarsCaption: "I Pilastri della Creazione — ridisegnati come rete di dati",
    pillarsCredit: "M16, JWST — NASA/ESA/CSA",
    scrollHintAria: "Scorri alla sezione successiva",
    playSmash: "Sfascia la frase",
    playSmashAgain: "Sfascia ancora",
    playSmashAria: "Sfascia la frase del titolo in lettere separate",
    playReset: "Ricomponi",
    playResetAria: "Ricomponi la frase del titolo",
    playHint: "Trascina le lettere · Esc per ricomporre",
  },
  en: {
    eyebrow: "Software Architecture · AI · Data Systems",
    headlineLine1: "I design the future",
    headlineLine2Pre: "and ",
    headlineEmphasis: "tailor it to you",
    headlineLine2Post: "",
    headlineLine3: "and your business.",
    headlineFull: "I design the future and tailor it to you and your business.",
    positioningLine:
      "One of the few in Italy building tailor-made AI solutions this intensively.",
    subHeadline:
      "AI Automation Specialist @ Conio — Politecnico di Milano — Data, EdTech, Fintech",
    subHeadlineParts: [
      "AI Automation Specialist @ Conio",
      "Politecnico di Milano",
      "Data, EdTech, Fintech",
    ],
    ageBadgeNumber: "20",
    ageBadgeText: "years old · started in high school, in production today",
    ageBadge: "20 years old · started in high school, in production today",
    ctaPrimary: "See the projects",
    ctaSecondary: "Let's talk about a project",
    scrollHint: "Scroll",
    pillarsCaption: "The Pillars of Creation — redrawn as a network of data",
    pillarsCredit: "M16, JWST — NASA/ESA/CSA",
    scrollHintAria: "Scroll to the next section",
    playSmash: "Smash the sentence",
    playSmashAgain: "Smash it again",
    playSmashAria: "Break the headline apart into separate letters",
    playReset: "Put it back",
    playResetAria: "Put the headline back together",
    playHint: "Drag the letters · Esc to put it back",
  },
};

/* ============================================================================
   LE STRUTTURE DI DATI dell'apertura (components/hero/dataStructures.ts).
   All'apertura i numeri esplodono su tutta la pagina e si riordinano in
   strutture di dati — tabella, cluster, frase, codice — prima di condensarsi
   nella rete. Sono testo "di scena": decorativo (aria-hidden), ma localizzato,
   perché una frase in una lingua che non è quella della pagina stonerebbe.
   Tutto in ASCII + i pochi simboli presenti nell'atlante dei glifi.
   ========================================================================== */

export type HeroSceneCopy = {
  tableCaption: string;
  tableHeader: string;
  tableRows: readonly string[];
  clusterCaption: string;
  codeCaption: string;
  code: readonly string[];
  /** La frase composta di glifi — breve, una sola idea. */
  phrase: string;
  barsCaption: string;
  /** Etichette dei satelliti di un nodo espanso: `{v}` = valore. */
  nodeMetrics: readonly string[];
};

export const heroSceneCopy: Record<Locale, HeroSceneCopy> = {
  it: {
    tableCaption: "TAB.01 · FLUSSI",
    tableHeader: "ora    EUR/BTC   Δ%    vol",
    tableRows: [
      "09:00  58214.6  +2.41  1204",
      "09:15  58377.0  +0.28   987",
      "09:30  58190.3  -0.31  1562",
      "09:45  58402.8  +0.37  2031",
      "10:00  58655.1  +0.43  1318",
    ],
    clusterCaption: "FIG.02 · CLUSTER k=3",
    codeCaption: "§03 · cuci.ts",
    code: [
      "const dati = await raccogli(fonti);",
      "const rete = allena(dati, { epoche: 42 });",
      "for (const idea of rete.idee) {",
      "  cuci(idea, suMisura);",
      "}",
    ],
    phrase: "dati → decisioni",
    barsCaption: "FIG.04 · VOLUMI",
    nodeMetrics: ["w {v}", "λ {v}", "Δ {v}%", "p99 {v}ms", "σ {v}"],
  },
  en: {
    tableCaption: "TAB.01 · FLOWS",
    tableHeader: "time   EUR/BTC   Δ%    vol",
    tableRows: [
      "09:00  58214.6  +2.41  1204",
      "09:15  58377.0  +0.28   987",
      "09:30  58190.3  -0.31  1562",
      "09:45  58402.8  +0.37  2031",
      "10:00  58655.1  +0.43  1318",
    ],
    clusterCaption: "FIG.02 · CLUSTER k=3",
    codeCaption: "§03 · tailor.ts",
    code: [
      "const data = await collect(sources);",
      "const net = train(data, { epochs: 42 });",
      "for (const idea of net.ideas) {",
      "  tailor(idea, toYou);",
      "}",
    ],
    phrase: "data → decisions",
    barsCaption: "FIG.04 · VOLUMES",
    nodeMetrics: ["w {v}", "λ {v}", "Δ {v}%", "p99 {v}ms", "σ {v}"],
  },
};
