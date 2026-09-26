import { z } from "zod";

/**
 * Schema di validazione condiviso client/server — FONTE UNICA per entrambi.
 * Il client (ContactForm) importa questo stesso schema per la validazione live,
 * il server (app/api/contact/route.ts) lo riusa per la validazione autoritativa.
 * Vedi specs/08-contatti.md §6/§8 — non duplicare questa forma altrove.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  projectType: z.enum(["data-ai", "fintech", "edtech", "custom"]),
  message: z.string().trim().min(20).max(2000),
  // Honeypot anti-spam: deve arrivare vuoto. Un valore non vuoto non genera un
  // errore di validazione "rumoroso" per il client — viene gestito a parte nella
  // route (finto successo silenzioso), non tramite questo schema.
  honeypot: z.string().max(0).optional().default(""),
  locale: z.enum(["it", "en"]),
});

export type ContactPayload = z.infer<typeof contactSchema>;

export type ContactFieldErrors = Partial<
  Record<keyof Omit<ContactPayload, "honeypot" | "locale">, string>
>;

/**
 * Valida un singolo campo (per la validazione live on-blur/on-change, §6.2) senza
 * dover ricostruire l'intero payload — usa comunque `contactSchema.shape` così la
 * regola resta identica a quella server-side.
 */
export function validateContactField<K extends keyof typeof contactSchema.shape>(
  field: K,
  value: unknown,
) {
  return contactSchema.shape[field].safeParse(value);
}
