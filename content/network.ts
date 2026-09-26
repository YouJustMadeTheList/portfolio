// content/network.ts
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ATTENZIONE — LEGGERE PRIMA DI MODIFICARE QUESTO FILE              ║
// ║                                                                      ║
// ║  Ogni persona in questo array rappresenta una richiesta esplicita   ║
// ║  già fatta e già accettata da quella persona, sul TESTO ESATTO che  ║
// ║  compare qui sotto (nome, contesto, link).                          ║
// ║                                                                      ║
// ║  REGOLE — valide anche per team/agenti multipli che toccano questo   ║
// ║  file in futuro, umani o AI:                                        ║
// ║                                                                      ║
// ║  1. NON aggiungere una persona qui senza consentObtained: true       ║
// ║     verificato da Davide personalmente (non da terzi, non "si       ║
// ║     presume di sì perché ha già pubblicato qualcosa in pubblico").   ║
// ║     Un post LinkedIn pubblico, o qualunque altro contenuto pubblico  ║
// ║     su Davide scritto da quella persona, NON equivale a consenso     ║
// ║     per QUESTA sezione — sono due contesti diversi con due           ║
// ║     permessi diversi (vedi spec §0 e "Nota aperta").                 ║
// ║  2. NON esiste e non deve mai esistere un flag globale che mostri    ║
// ║     tutte le persone insieme. Ogni persona ha il proprio flag        ║
// ║     individuale (`consentObtained`). Attivare una persona non deve   ║
// ║     mai attivarne un'altra come effetto collaterale.                 ║
// ║  3. Il campo `contextIt`/`contextEn` e l'eventuale `publicUrl`       ║
// ║     devono essere ESATTAMENTE ciò che la persona ha approvato.       ║
// ║     Qualunque modifica successiva al testo richiede una nuova        ║
// ║     approvazione — non è "già ok perché la persona in generale ok".  ║
// ║  4. `publicUrl`, se presente, deve puntare a un contenuto PUBBLICATO ║
// ║     DALLA PERSONA STESSA (es. un suo post), mai a una citazione      ║
// ║     scritta da Davide e solo attribuita a lei.                       ║
// ║  5. In caso di dubbio: `consentObtained` resta false. Un falso       ║
// ║     negativo (persona pronta ma non ancora mostrata) è recuperabile  ║
// ║     in 30 secondi. Un falso positivo (persona nominata senza         ║
// ║     permesso) è un problema reale, non un bug di UI.                 ║
// ║  6. Un commit/PR aggiunge UNA sola persona alla volta, mai più       ║
// ║     persone insieme senza distinzione (vedi spec §6.3) — così una    ║
// ║     revoca futura di consenso resta rimovibile senza toccare le      ║
// ║     altre voci.                                                      ║
// ╚══════════════════════════════════════════════════════════════════╝

export type NetworkPerson = {
  /** Slug stabile, es. "nome-cognome". Usato come React key. */
  id: string;
  name: string;
  /** 3-4 parole, es. "Fondatore, Premio Di Nicola". Testo esatto approvato. */
  contextIt: string;
  contextEn: string;
  /** Link a contenuto PUBBLICATO DALLA PERSONA STESSA, opzionale. */
  publicUrl?: string;
  publicUrlLabel?: { it: string; en: string };
  /** MAI true senza conferma diretta e verificata da Davide. */
  consentObtained: boolean;
  /** ISO date, valorizzata solo insieme a consentObtained: true. */
  consentDate?: string;
};

// Array di partenza — stato di default, da shippare così com'è.
//
// NON popolare con nomi "placeholder" o "di esempio": un nome qui, anche
// con consentObtained: false, è comunque un dato personale nel repo/bundle
// pubblico. Tenere l'array vuoto finché non c'è un consenso reale,
// verificato da Davide, per almeno una persona.
export const networkPeople: NetworkPerson[] = [];
