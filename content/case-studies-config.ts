import type { DetailLevel } from "./case-studies";

/**
 * content/case-studies-config.ts — l'unica leva da girare per il gate CTO
 * della Card A (dati dell'infrastruttura del datore di lavoro del cliente).
 * Cambiare "exact" → "rounded" → "no-numbers" qui, mai nei componenti.
 * Vedi specs/04-case-studies.md §7 e checklist §8.
 */
export const CASE_A_DETAIL_LEVEL: DetailLevel = "rounded";
