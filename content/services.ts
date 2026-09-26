// content/services.ts
// Copy tipizzato per la sezione "Servizi & Pricing" (§1 e §7 di
// specs/06-servizi-pricing.md). Separato dal componente per due ragioni:
// 1. i18n — tutte le stringhe it/en vivono qui, niente hardcoded in JSX;
// 2. gate di build — scripts/check-pricing.ts (non presente in questo
//    scaffold, ma il contratto è già rispettato) legge `priceStatus` da
//    qui per bloccare un deploy in produzione con un prezzo non confermato.

export type Locale = "it" | "en";

export type ServicePackageId =
  | "data-ai-systems"
  | "fintech-data-products"
  | "custom-solutions";

/**
 * 'confirmed'   → il framing prezzo è testo definitivo (anche quando dice
 *                 "Su preventivo" — è una scelta editoriale finale, non un
 *                 placeholder in attesa, vedi nota spec §1).
 * 'placeholder' → il valore numerico non è ancora stato fornito dal cliente.
 *                 Oggi nessun pacchetto ha questo stato. Non va MAI
 *                 sostituito con una cifra "plausibile" inventata in fase di
 *                 implementazione (vedi §5 e §8 dello spec).
 */
export type PriceStatus = "confirmed" | "placeholder";

export type ServicePackage = {
  id: ServicePackageId;
  name: Record<Locale, string>;
  audience: Record<Locale, string>;
  priceLabel: Record<Locale, string>;
  priceStatus: PriceStatus;
  features: Record<Locale, string[]>;
  ctaLabel: Record<Locale, string>;
};

export const servicePackages: ServicePackage[] = [
  {
    id: "data-ai-systems",
    name: { it: "Data & AI Systems", en: "Data & AI Systems" },
    audience: {
      it: "Per aziende che siedono su grandi volumi di dati — transazionali, comportamentali, documentali — ma non riescono ancora a interrogarli, incrociarli o farli decidere qualcosa in autonomia. Costruisco il livello che manca tra “i dati esistono” e “i dati lavorano”: cataloghi schema, pipeline, layer di interrogazione in linguaggio naturale.",
      en: "For companies sitting on large volumes of data — transactional, behavioral, documental — that can't yet query it, cross-reference it, or have it decide anything on its own. I build the layer missing between \"the data exists\" and \"the data works\": schema catalogs, pipelines, natural-language query layers.",
    },
    // Scelta del cliente: nessuna cifra "a partire da". Il perimetro di un
    // sistema dati cambia troppo da caso a caso — il prezzo si fissa dopo una
    // call di scoping. PricingCard rende la parte dopo " — " come qualifica.
    priceLabel: {
      it: "Su misura — prezzo definito dopo una call",
      en: "Custom — priced after a scoping call",
    },
    priceStatus: "confirmed",
    features: {
      it: [
        "Discovery tecnico sui dati esistenti",
        "Progettazione pipeline & catalogo schema",
        "Dashboard e layer di interrogazione NL",
        "Handoff documentato, nessun lock-in",
      ],
      en: [
        "Technical discovery on existing data",
        "Pipeline design & schema catalog",
        "Dashboard and NL query layer",
        "Documented handoff, no lock-in",
      ],
    },
    ctaLabel: { it: "Parliamone →", en: "Let's talk →" },
  },
  {
    id: "fintech-data-products",
    name: { it: "Fintech / Data Products", en: "Fintech / Data Products" },
    audience: {
      it: "Per wealth management, servizi finanziari e chiunque operi su sistemi regolamentati, dove un errore di architettura costa più di un ritardo. Ogni componente — scoring, segnali, motori decisionali — viene costruito con audit trail completo e separazione netta tra ciò che è deterministico e ciò che è probabilistico.",
      en: "For wealth management, financial services, and anyone operating regulated systems, where an architecture mistake costs more than a delay. Every component — scoring, signals, decision engines — is built with a full audit trail and a clean separation between deterministic and probabilistic logic.",
    },
    priceLabel: {
      it: "Su preventivo — sistemi regolamentati",
      en: "Custom quote — regulated systems",
    },
    // Scelta finale, non provvisoria: in un dominio regolamentato un numero
    // indicativo prima di conoscere il perimetro esatto sarebbe fuorviante.
    priceStatus: "confirmed",
    features: {
      it: [
        "Architettura a strati con audit trail",
        "Ingestion & normalizzazione multi-fonte",
        "Motori di scoring/segnale dedicati",
        "Validazione e reportistica per compliance interna",
      ],
      en: [
        "Layered architecture with full audit trail",
        "Multi-source ingestion & normalization",
        "Dedicated scoring/signal engines",
        "Validation & reporting for internal compliance",
      ],
    },
    ctaLabel: { it: "Parliamone →", en: "Let's talk →" },
  },
  {
    id: "custom-solutions",
    name: { it: "Soluzioni Custom", en: "Custom Solutions" },
    audience: {
      it: "Per PMI e clienti singoli che hanno bisogno di un sito, un tool o un sistema su misura — senza il peso di un'agenzia enterprise, ma con la stessa disciplina su performance, SEO e manutenibilità. Ogni progetto ha un perimetro diverso: la Locanda Camilla non è la Fintech Card, e il pricing lo riflette.",
      en: "For SMBs and individual clients who need a custom site, tool, or system — without the overhead of an enterprise agency, but with the same discipline on performance, SEO, and maintainability. Every project has a different scope: this isn't the Fintech card, and the pricing reflects that.",
    },
    priceLabel: { it: "Su preventivo", en: "Custom quote" },
    priceStatus: "confirmed",
    features: {
      it: [
        "Analisi del caso specifico",
        "Sviluppo su misura, focus performance/SEO",
        "Nessun template riadattato",
        "Supporto post-lancio concordato",
      ],
      en: [
        "Case-by-case analysis",
        "Custom development, performance/SEO focus",
        "No reskinned templates",
        "Agreed post-launch support",
      ],
    },
    ctaLabel: { it: "Parliamone →", en: "Let's talk →" },
  },
];

export const servicesIntro: {
  eyebrow: Record<Locale, string>;
  title: Record<Locale, string>;
  subtitle: Record<Locale, string>;
} = {
  eyebrow: { it: "Servizi & Pricing", en: "Services & Pricing" },
  // `⟨…⟩` marca la frase-chiave che <SectionHeader> renderizza in Instrument
  // Serif italic aqua (ART-DIRECTION §2, mossa editoriale obbligatoria su ogni
  // H2). Il copy resta quello autoritativo di specs/06-servizi-pricing.md §1,
  // parola per parola: qui si aggiunge solo la marcatura, non si riscrive nulla.
  title: {
    it: "Tre modi di ⟨lavorare insieme⟩.",
    en: "Three ways to ⟨work together⟩.",
  },
  subtitle: {
    it: "Non un listino. Un punto di partenza per capire se il progetto è nel raggio giusto — poi ne parliamo.",
    en: "Not a price list. A starting point to see if the project is in the right range — then we talk.",
  },
};

/**
 * "tipo di progetto" del form Contatti (08-contatti.md §8) usa un namespace
 * diverso da ServicePackageId — uno identifica un pacchetto commerciale,
 * l'altro una categoria di form. "edtech" in Contatti non ha un pacchetto
 * corrispondente qui: resta raggiungibile solo da selezione diretta
 * dell'utente nel form, mai da un CTA di questa sezione (struttura voluta
 * a 3 pacchetti, non un bug).
 */
export type ContactProjectType = "data-ai" | "fintech" | "edtech" | "custom";

export const PACKAGE_TO_PROJECT_TYPE: Record<
  ServicePackageId,
  ContactProjectType
> = {
  "data-ai-systems": "data-ai",
  "fintech-data-products": "fintech",
  "custom-solutions": "custom",
};

/**
 * Chiave di handoff verso Contatti. Il flusso (documentato anche in
 * ServicesSection.tsx accanto all'handler CTA):
 *   1. il click su una card scrive questo valore in localStorage e lo
 *      spedisce anche via CustomEvent("servizi:project-type-selected",
 *      { detail: { projectType } }) sul `window`, per un consumo
 *      immediate senza dover rileggere localStorage;
 *   2. fa scroll fluido a `#contatti` (stessa pagina, nessuna navigazione);
 *   3. il componente Contatti (di proprietà di un altro agente) può leggere
 *      `localStorage.getItem(SERVICES_HANDOFF_KEY)` al mount, o ascoltare
 *      l'evento se è già montato, per pre-selezionare il dropdown.
 * Scelta deliberata: niente query string, per non forzare una navigazione
 * full-page su una sezione che vive sulla stessa route (evita di perdere lo
 * scroll/stato di altre sezioni già animate).
 */
export const SERVICES_HANDOFF_KEY = "conio-portfolio:contact-project-type";
