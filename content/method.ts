// content/method.ts — copy della sezione Metodo, separato dai componenti per l'i18n.
// Vedi specs/05-metodo.md §1 e §7. Non toccare messages/it.json e messages/en.json:
// questa sezione tiene tutto il proprio testo qui per evitare conflitti con gli
// altri agenti che lavorano in parallelo sulle altre sezioni.
//
// Aggiunte rispetto alla v1.0 dello spec:
//  · `focus` — 3 parole-chiave per fase, estratte alla lettera dalle descrizioni
//    dello spec §1 (nessun contenuto nuovo inventato). Servono a dare una
//    composizione alla faccia della carta invece di un paragrafo sospeso nel
//    vuoto (ART-DIRECTION §6 "Metodo": "riempire il vuoto interno della carta").
//  · `ui` — etichette dei controlli del mazzo, che prima erano hardcoded in
//    italiano dentro PhaseDeck.tsx anche in versione EN.

export type PhaseCopy = {
  title: string;
  /** 3 parole-chiave, derivate dalla descrizione. Chip in mono sulla carta. */
  focus: readonly string[];
  description: string;
};

export type MethodUiCopy = {
  /** Etichetta mono sopra il mazzo, a sinistra del contatore. */
  deckLabel: string;
  /** Suggerimento di interazione, accanto all'etichetta. */
  deckHint: string;
  /** Parola per "Fase" usata nell'indice della carta. */
  phaseWord: string;
  prev: string;
  next: string;
  /** aria-label del gruppo mazzo. */
  deckAria: string;
  /** aria-label dei pip, {n} sostituito con il numero della fase. */
  goTo: string;
};

export type MethodCopy = {
  eyebrow: string;
  /** Il testo tra ⟨…⟩ va in Instrument Serif italic aqua (ART-DIRECTION §2). */
  title: string;
  phases: readonly PhaseCopy[];
  ui: MethodUiCopy;
};

export const methodCopy = {
  it: {
    eyebrow: "Metodo",
    title: "Un processo, ⟨non un'improvvisazione⟩.",
    phases: [
      {
        title: "Discovery",
        focus: ["Interviste", "Analisi dati", "Vincoli"],
        description:
          "Prima di scrivere una riga di codice, capiamo il problema vero — non solo il brief che arriva via email. Interviste, analisi dei dati esistenti, vincoli tecnici e di business messi sul tavolo insieme.",
      },
      {
        title: "Architettura",
        focus: ["Schema dati", "Confini", "Failure points"],
        description:
          "Il sistema si disegna prima di costruirlo. Schema dei dati, confini dei componenti, punti di failure e scalabilità decisi su carta, quando cambiarli costa un'ora e non un mese.",
      },
      {
        title: "Build",
        focus: ["Demo iterative", "Testing", "Revisione"],
        description:
          "Sviluppo iterativo, con demo funzionanti a cadenza breve invece di un'unica consegna a fine progetto. L'IA è un acceleratore dove ha senso — non un sostituto della revisione, del testing o del giudizio tecnico.",
      },
      {
        title: "Handoff & Scaling",
        focus: ["Documentazione", "Runbook", "Scalabilità"],
        description:
          "Consegna con documentazione vera: architettura, decisioni prese e perché, runbook operativo. Il sistema resta comprensibile e capace di crescere anche senza di me in mezzo.",
      },
    ],
    ui: {
      deckLabel: "Il mazzo",
      deckHint: "trascina per lanciare la carta",
      phaseWord: "Fase",
      prev: "Indietro",
      next: "Avanti",
      deckAria: "Mazzo delle fasi del metodo",
      goTo: "Vai alla fase {n}",
    },
  },
  en: {
    eyebrow: "Method",
    title: "A process, ⟨not an improvisation⟩.",
    phases: [
      {
        title: "Discovery",
        focus: ["Interviews", "Data audit", "Constraints"],
        description:
          "Before a single line of code, we understand the real problem — not just the brief that landed in an inbox. Interviews, analysis of existing data, technical and business constraints laid out together.",
      },
      {
        title: "Architecture",
        focus: ["Data model", "Boundaries", "Failure points"],
        description:
          "The system gets designed before it gets built. Data model, component boundaries, failure points and scalability decided on paper, when changing them costs an hour, not a month.",
      },
      {
        title: "Build",
        focus: ["Iterative demos", "Testing", "Review"],
        description:
          "Iterative development, with working demos on a short cadence instead of one delivery at the end. AI is an accelerator where it earns its place — not a substitute for review, testing, or engineering judgment.",
      },
      {
        title: "Handoff & Scaling",
        focus: ["Documentation", "Runbook", "Scaling"],
        description:
          "Delivery with real documentation: architecture, decisions and the reasoning behind them, an operational runbook. The system stays understandable and able to grow without me in the middle.",
      },
    ],
    ui: {
      deckLabel: "The deck",
      deckHint: "drag to throw the card",
      phaseWord: "Phase",
      prev: "Back",
      next: "Next",
      deckAria: "Deck of method phases",
      goTo: "Go to phase {n}",
    },
  },
} as const satisfies Record<"it" | "en", MethodCopy>;
