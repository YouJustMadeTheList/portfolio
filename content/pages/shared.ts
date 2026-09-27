import type { Block, PageLocale, Section } from "@/lib/seo/pages";

/** Data di pubblicazione/aggiornamento delle pagine di questa release. */
export const PAGES_DATE = "2026-09-27";

/** Il metodo in quattro fasi, identico a quello della home (content/method.ts). */
export function methodSection(locale: PageLocale, id = "metodo"): Section {
  if (locale === "en") {
    return {
      id,
      title: "How the work runs",
      blocks: [
        {
          type: "list",
          ordered: true,
          items: [
            "**Discovery.** Before any code: interviews, a look at the data you already have, technical and business constraints on the table.",
            "**Architecture.** Data schema, component boundaries and failure points decided on paper, when changing them costs an hour and not a month.",
            "**Build.** Short iterations with working demos instead of one delivery at the end. AI speeds things up where it makes sense; it never replaces review and testing.",
            "**Handoff & scaling.** Documentation, runbooks and a system your team can run without depending on me. No lock-in.",
          ],
        },
      ],
    };
  }
  return {
    id,
    title: "Come lavoro",
    blocks: [
      {
        type: "list",
        ordered: true,
        items: [
          "**Discovery.** Prima di scrivere codice: interviste, analisi dei dati che hai già, vincoli tecnici e di business messi sul tavolo.",
          "**Architettura.** Schema dei dati, confini dei componenti e punti di rottura decisi su carta, quando cambiarli costa un'ora e non un mese.",
          "**Sviluppo.** Iterazioni brevi con demo funzionanti invece di un'unica consegna finale. L'AI accelera dove ha senso, ma non sostituisce revisione e test.",
          "**Consegna e crescita.** Documentazione, procedure operative e un sistema che il tuo team può gestire senza dipendere da me. Nessun vincolo di fornitore.",
        ],
      },
    ],
  };
}

/** Sezione prezzi: niente listino pubblico, ma i fattori che lo determinano. */
export function pricingSection(locale: PageLocale, drivers: string[]): Section {
  const blocks: Block[] =
    locale === "en"
      ? [
          {
            type: "p",
            text: "Every project is priced after a scoping call: the same word, \"chatbot\" or \"agent\", can mean a two-week prototype or a system in production for thousands of users. What moves the price:",
          },
          { type: "list", items: drivers },
          {
            type: "p",
            text: "The first call is free and ends with a clear answer: whether the project makes sense, roughly how big it is, and what to do first.",
          },
        ]
      : [
          {
            type: "p",
            text: "Ogni progetto ha un prezzo definito dopo una call di analisi: la stessa parola, \"chatbot\" o \"agente\", può voler dire un prototipo di due settimane o un sistema in produzione per migliaia di utenti. Cosa sposta il prezzo:",
          },
          { type: "list", items: drivers },
          {
            type: "p",
            text: "La prima call è gratuita e finisce con una risposta chiara: se il progetto ha senso, quanto è grande, da cosa partire. Per un ordine di grandezza del mercato c'è la guida [Quanto costa un chatbot AI aziendale](/it/guide/quanto-costa-chatbot-ai-aziendale).",
          },
        ];
  return { id: locale === "en" ? "pricing" : "costi", title: locale === "en" ? "Pricing" : "Quanto costa", blocks };
}
