/**
 * Stato del consenso analytics — solo client, nessuna dipendenza.
 *
 * Chiavi nel browser (inventario completo nella cookie policy, content/legal.ts):
 *   localStorage   dds.consent   scelta dell'utente (tecnico, sempre)
 *   localStorage   dds.vid       id visitatore casuale   (SOLO con consenso)
 *   sessionStorage dds.sid       id sessione casuale     (SOLO con consenso)
 *   localStorage   dds.notrack   escluso dal tracking (impostato dal pannello admin)
 *
 * Eventi window:
 *   "consent:open"    riapre il banner (bottone "Preferenze cookie" nel footer)
 *   "consent:change"  emesso qui dopo ogni scelta, detail = ConsentValue
 */
import { RETENTION } from "@/db/retention.mjs";

export type ConsentValue = "granted" | "denied";
export type ConsentState = ConsentValue | "unset";

export const CONSENT_KEY = "dds.consent";
export const VISITOR_KEY = "dds.vid";
export const SESSION_KEY = "dds.sid";
export const NOTRACK_KEY = "dds.notrack";
export const CONSENT_VERSION = 1;
const MAX_AGE_MS = RETENTION.consentMonths * 30 * 24 * 60 * 60 * 1000;

function safeGet(storage: "localStorage" | "sessionStorage", key: string): string | null {
  try {
    return window[storage].getItem(key);
  } catch {
    return null;
  }
}
function safeSet(storage: "localStorage" | "sessionStorage", key: string, value: string) {
  try {
    window[storage].setItem(key, value);
  } catch {
    /* storage non disponibile (private mode, quota): si prosegue senza */
  }
}
function safeRemove(storage: "localStorage" | "sessionStorage", key: string) {
  try {
    window[storage].removeItem(key);
  } catch {
    /* idem */
  }
}

/** Do Not Track / Global Privacy Control attivi: default = rifiuto. */
export function privacySignal(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
  const w = window as Window & { doNotTrack?: string };
  return nav.globalPrivacyControl === true || nav.doNotTrack === "1" || w.doNotTrack === "1" || nav.msDoNotTrack === "1";
}

/** Scelta salvata, oppure "unset" se assente, scaduta (6 mesi) o di una versione precedente. */
export function readConsent(): ConsentState {
  const raw = safeGet("localStorage", CONSENT_KEY);
  if (!raw) return "unset";
  try {
    const parsed = JSON.parse(raw) as { v?: string; ts?: number; ver?: number };
    if (parsed.ver !== CONSENT_VERSION || typeof parsed.ts !== "number") return "unset";
    if (Date.now() - parsed.ts > MAX_AGE_MS) {
      // Scelta scaduta: anche l'id visitatore decade, si richiede di nuovo.
      safeRemove("localStorage", VISITOR_KEY);
      return "unset";
    }
    return parsed.v === "granted" ? "granted" : parsed.v === "denied" ? "denied" : "unset";
  } catch {
    return "unset";
  }
}

/** Consenso effettivo per il tracker: "unset" + DNT/GPC vale come rifiuto. */
export function effectiveConsent(): ConsentValue {
  const c = readConsent();
  if (c === "unset") return "denied";
  return c;
}

export function writeConsent(value: ConsentValue) {
  safeSet("localStorage", CONSENT_KEY, JSON.stringify({ v: value, ts: Date.now(), ver: CONSENT_VERSION }));
  if (value === "denied") {
    // Revoca: gli identificativi spariscono subito dal browser.
    safeRemove("localStorage", VISITOR_KEY);
    safeRemove("sessionStorage", SESSION_KEY);
  }
  window.dispatchEvent(new CustomEvent<ConsentValue>("consent:change", { detail: value }));
}

export function isExcluded(): boolean {
  return safeGet("localStorage", NOTRACK_KEY) === "1";
}

function uuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const SESSION_IDLE_MS = 30 * 60 * 1000;

/** Identificativi SOLO con consenso. Sessione = scheda, scade dopo 30 min di inattivita'. */
export function getIdentity(): { vid: string; sid: string; startedAt: number } | null {
  if (readConsent() !== "granted") return null;
  let vid = safeGet("localStorage", VISITOR_KEY);
  if (!vid || !/^[0-9a-f-]{36}$/i.test(vid)) {
    vid = uuid();
    safeSet("localStorage", VISITOR_KEY, vid);
  }
  const now = Date.now();
  let session: { id: string; start: number; last: number } | null = null;
  try {
    session = JSON.parse(safeGet("sessionStorage", SESSION_KEY) ?? "null");
  } catch {
    session = null;
  }
  if (!session || typeof session.last !== "number" || now - session.last > SESSION_IDLE_MS) {
    session = { id: uuid(), start: now, last: now };
  }
  session.last = now;
  safeSet("sessionStorage", SESSION_KEY, JSON.stringify(session));
  return { vid, sid: session.id, startedAt: session.start };
}
