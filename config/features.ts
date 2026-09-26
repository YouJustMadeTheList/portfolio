// config/features.ts
//
// Feature flags globali del sito. Vedi anche i commenti in content/network.ts
// per la sezione 07bis "Rete", che è il consumer principale di questo flag.

/**
 * Master switch SOLO per sviluppo/staging della sezione 07bis "Rete".
 *
 * Default: assente/false in produzione (`NEXT_PUBLIC_SHOW_NETWORK_SECTION`
 * non impostata → false).
 *
 * IMPORTANTE — cosa questo flag NON fa:
 * anche con `SHOW_NETWORK_SECTION = true`, la sezione resta invisibile
 * finché `networkPeople` (content/network.ts) non contiene almeno una
 * persona con `consentObtained: true`. Questo flag esiste solo per poter
 * sviluppare/testare il componente in isolamento (con dati fake in un
 * branch/ambiente locale, mai in produzione) — NON è un modo per "accendere"
 * la sezione con dati reali. Quello lo fa solo il consenso per persona.
 *
 * Non esiste e non deve mai esistere un flag tipo `SHOW_ALL_PEOPLE` che
 * mostri tutte le persone insieme — vedi content/network.ts.
 */
export const SHOW_NETWORK_SECTION: boolean =
  process.env.NEXT_PUBLIC_SHOW_NETWORK_SECTION === "true";
