/**
 * Regole di validazione LEGGERE per il client (ContactForm), senza zod: zod
 * pesava oltre 100KB nel bundle del telefono solo per quattro controlli live.
 * Rispecchiano una per una lo schema autoritativo lib/validation/contact.ts, che
 * resta l'unica validazione che conta (lato server, in app/api/contact). Se
 * cambi una regola là, cambiala anche qui.
 */
const PROJECT_TYPES = ["data-ai", "fintech", "edtech", "custom"] as const;
// Equivalente pratico di z.string().email(): local@dominio.tld, senza spazi.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export const contactRules = {
  name: (v: unknown) => {
    const s = str(v);
    return s.length >= 2 && s.length <= 100;
  },
  email: (v: unknown) => {
    const s = str(v);
    return s.length <= 254 && EMAIL.test(s);
  },
  projectType: (v: unknown) => (PROJECT_TYPES as readonly string[]).includes(String(v)),
  message: (v: unknown) => {
    const s = str(v);
    return s.length >= 20 && s.length <= 2000;
  },
};
