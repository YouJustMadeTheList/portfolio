type Locale = "it" | "en";

/* Testi dell'area "Scritti" (IT/EN), condivisi dallo scaffale desktop e dalla
   striscia mobile. Modulo separato: la versione mobile non deve importare
   WritingShelf (componente desktop pesante) solo per queste stringhe. */
export const writingCopy = {
  it: {
    heading: "Scritti",
    hint: "Scegli un libro per aprirne la scheda.",
    discover: "Scopri",
    close: "Chiudi",
    pending: "Non ancora online",
    pendingDetail:
      "L'articolo non è ancora pubblicato: il collegamento si attiva appena va online.",
    openBook: "Apri la scheda dell'articolo",
    newTab: "(si apre in una nuova scheda)",
  },
  en: {
    heading: "Writing",
    hint: "Pick a book to open its card.",
    discover: "Discover",
    close: "Close",
    pending: "Not online yet",
    pendingDetail: "This piece isn't published yet — the link goes live as soon as it is.",
    openBook: "Open the article card",
    newTab: "(opens in a new tab)",
  },
} satisfies Record<Locale, Record<string, string>>;
