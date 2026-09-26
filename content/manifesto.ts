// content/manifesto.ts — copy e tokenizzazione della frase manifesto, separati dal
// componente per l'i18n. Tokenizzazione fatta a mano (non split runtime) per evitare
// ambiguità con la punteggiatura e con la keyword da evidenziare — vedi
// specs/03-manifesto.md §7.
//
// Il testo è quello definitivo dello spec §1: non è stato riscritto. L'unica
// aggiunta è strutturale — la riga secondaria è ora esposta anche già divisa nei
// tre pilastri (`pillars`) e nella coda (`coda`), così il componente può dare a
// ciascun pilastro il proprio trattamento mono + reazione tattile senza fare
// parsing di stringhe a runtime. `secondary` resta invariata come stringa unica
// (usata per il testo accessibile e come fallback).

export type ManifestoToken = {
  /** La parola, con eventuale punteggiatura attaccata (es. "produzione,"). */
  text: string;
  /** true solo per la parola chiave "reggono" / "hold". */
  isKeyword: boolean;
};

function tokenize(sentence: string, keyword: string): ManifestoToken[] {
  return sentence.split(" ").map((text) => ({
    text,
    isKeyword: text.replace(/[.,:;—-]/g, "").toLowerCase() === keyword.toLowerCase(),
  }));
}

const lineIt =
  "Progetto architetture, non slide: sistemi che reggono in produzione, imparano dai dati e si misurano in uptime — non in promesse.";
const lineEn =
  "I design architectures, not slide decks: systems that hold in production, learn from data, and get measured in uptime — not in promises.";

const manifestoTokensIt = tokenize(lineIt, "reggono");
const manifestoTokensEn = tokenize(lineEn, "hold");

export const manifestoCopy = {
  it: {
    line: manifestoTokensIt,
    pillars: [
      "Architettura del software",
      "Intelligenza artificiale",
      "Dati",
    ],
    coda: "non in astratto: in produzione.",
    secondary:
      "Architettura del software · Intelligenza artificiale · Dati — non in astratto: in produzione.",
  },
  en: {
    line: manifestoTokensEn,
    pillars: ["Software architecture", "Artificial intelligence", "Data"],
    coda: "not in theory: in production.",
    secondary:
      "Software architecture · Artificial intelligence · Data — not in theory: in production.",
  },
} as const;

export type ManifestoLocale = keyof typeof manifestoCopy;
