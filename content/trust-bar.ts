/**
 * Data model + copy della Trust Bar — separati dal componente per zero-touch
 * su TrustBarSection.tsx quando cambia una tappa o arriva un'autorizzazione logo.
 * Base: specs/02-trust-bar.md §7-9.
 *
 * REVISIONE DEL PROPRIETARIO (build live, nota verbatim): la striscia non è più
 * un elenco di "con chi ho lavorato", è la sua TRAIETTORIA in ordine cronologico
 * — liceo → Politecnico → studio indipendente di informatica → retail trading e
 * macroeconomia → Premio Di Nicola → Conio → Locanda Camilla. Dove questo
 * contraddice lo spec (che elencava anche tre testate), vince la nota.
 *
 * Non toccare messages/it.json o messages/en.json: questo modulo è la fonte di
 * verità autonoma (stesso pattern di content/hero.ts).
 */

export type Locale = "it" | "en";

export type TrustItemCategory = "work" | "education" | "award" | "press";

export type TrustItemStatus =
  | "verified" // menzione + eventuale logo, tutto autorizzato, pubblicabile senza riserve
  | "pending"; // menzione testuale ok, logo grafico NON ancora autorizzato

export type LocalizedText = Record<Locale, string>;

export type TrustItem = {
  id: string;

  /**
   * Nome proprio della tappa — identico in IT e EN, non si traduce
   * (Conio, Politecnico di Milano, Premio Di Nicola...).
   * Vale anche da fallback se `nameByLocale` manca.
   */
  name: string;

  /**
   * Solo per le tappe che NON sono nomi propri ma descrizioni di un periodo
   * (studio indipendente, retail trading): lì il testo va tradotto davvero.
   * Se presente vince su `name`.
   */
  nameByLocale?: LocalizedText;

  category: TrustItemCategory;
  status: TrustItemStatus;

  // Se assente o status === "pending" -> wordmark testuale.
  // Se presente E status === "verified" -> <img>, stesso trattamento hover.
  logoUrl?: string;
  logoAlt?: string;

  // Se assente -> tappa non cliccabile (cursor default, niente underline hover).
  externalUrl?: string;

  /** Ordine cronologico esplicito, non affidato all'ordine dell'array. */
  order: number;
};

/** Testo visibile di una tappa nella lingua corrente. */
export function trustItemName(item: TrustItem, locale: Locale): string {
  return item.nameByLocale?.[locale] ?? item.name;
}

/* ----------------------------------------------------------------------------
   NOTE APERTE (da sciogliere prima del lancio)

   - POLITECNICO DUPLICATO: la nota del proprietario elenca "Politecnico di
     Milano" DUE volte (3ª e 5ª posizione della sua lista). Non è stata inventata
     una seconda voce distinta per giustificarlo: il Politecnico compare UNA sola
     volta, nella posizione cronologicamente più antica (order 2). Se la seconda
     occorrenza era un'altra cosa (una laurea magistrale successiva? un ruolo
     dentro l'ateneo? un ritorno dopo il periodo di trading?), va detto e
     aggiunta come record a sé — costa una riga qui, zero nel componente.
   - "conio": citazione testuale ok da subito, logo grafico in attesa di ok
     aziendale esplicito -> resta "pending" (wordmark testuale).
   - "polimi": lo stemma NON è presente in /public/logos e non va fabbricato;
     resta "pending" finché qualcuno non aggiunge l'SVG conforme alla brand
     guideline dell'ateneo e promuove il record a "verified" con `logoUrl`.
   - "liceo-einstein": esistono più licei "Albert Einstein" in Italia; nessun URL
     inventato, la tappa è una menzione testuale non cliccabile.
   - TESTATE RIMOSSE: CertaStampa, NotizieDAbruzzo e Abruzzo Popolare non fanno
     parte della traiettoria richiesta e sono state tolte dall'array (spec §6:
     un record che non va mostrato si rimuove, non si nasconde dietro un flag).
     Se la rassegna stampa serve ancora, il suo posto è una sezione dedicata,
     non questa linea temporale.
---------------------------------------------------------------------------- */
export const trustItems: TrustItem[] = [
  {
    id: "liceo-einstein",
    name: "Liceo Scientifico Albert Einstein",
    category: "education",
    status: "verified",
    order: 1,
  },
  {
    id: "polimi",
    name: "Politecnico di Milano",
    category: "education",
    status: "pending",
    externalUrl: "https://www.polimi.it",
    order: 2,
  },
  {
    id: "studio-informatico",
    // "studio privato informatico" riformulato su richiesta esplicita
    // ("rifrasare meglio"): dice la stessa cosa in modo professionale e senza
    // millantare un titolo di studio che non c'è.
    name: "Studio indipendente di informatica",
    nameByLocale: {
      it: "Studio indipendente di informatica",
      en: "Independent study in computer science",
    },
    category: "education",
    status: "verified",
    order: 3,
  },
  {
    id: "trading-macro",
    name: "Retail trading e studi di macroeconomia",
    nameByLocale: {
      it: "Retail trading e studi di macroeconomia",
      en: "Retail trading and macroeconomic studies",
    },
    category: "education",
    status: "verified",
    order: 4,
  },
  {
    id: "premio-di-nicola",
    name: "Premio Di Nicola",
    category: "award",
    status: "verified",
    order: 5,
  },
  {
    id: "conio",
    name: "Conio",
    category: "work",
    status: "pending",
    externalUrl: "https://conio.com",
    order: 6,
  },
  {
    id: "locanda-camilla",
    name: "Locanda Camilla",
    category: "work",
    status: "verified",
    order: 7,
  },
];

export type TrustBarCopy = {
  /** Prima parte del titolo, in grotesque. */
  headingLead: string;
  /** Frase-chiave in Instrument Serif italic aqua (ART-DIRECTION §2). */
  headingAccent: string;
  groupLabels: Record<TrustItemCategory, string>;
  ariaLabelSection: string;
  /** Nome accessibile della lista ordinata delle tappe. */
  timelineLabel: string;
};

export const trustBarCopy: Record<Locale, TrustBarCopy> = {
  it: {
    headingLead: "La mia traiettoria,",
    headingAccent: "tappa per tappa.",
    groupLabels: {
      work: "Esperienza professionale",
      education: "Formazione",
      award: "Riconoscimenti",
      press: "Rassegna stampa",
    },
    ariaLabelSection:
      "Traiettoria: formazione, riconoscimenti e organizzazioni con cui ho lavorato",
    timelineLabel: "Tappe in ordine cronologico",
  },
  en: {
    headingLead: "My trajectory,",
    headingAccent: "one stop at a time.",
    groupLabels: {
      work: "Professional experience",
      education: "Education",
      award: "Recognition",
      press: "Press coverage",
    },
    ariaLabelSection:
      "Trajectory: education, recognition and organisations I've worked with",
    timelineLabel: "Milestones in chronological order",
  },
};
