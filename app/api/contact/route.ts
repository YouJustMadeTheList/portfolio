import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { contactSchema, type ContactFieldErrors } from "@/lib/validation/contact";
import { contactEmail } from "@/content/contact";
import { getSql } from "@/lib/db";

// POST /api/contact — vedi specs/08-contatti.md §8 per il contratto completo.
// Gestisce sia richieste fetch (JSON, risposta JSON) sia submit form nativi
// (application/x-www-form-urlencoded, fallback no-JS, risposta 303 redirect).

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minuti
const RATE_LIMIT_MAX = 5; // 5 richieste ogni 10 minuti per IP

/**
 * Rate limiter in-memory a finestra scorrevole, per IP. Nota onesta: questo store
 * vive nel processo del singolo lambda/edge worker — su un deploy serverless con
 * più istanze concorrenti non è un limite globale rigoroso (ogni istanza ha la
 * propria mappa). È comunque "codice reale" e sufficiente per questa fase del
 * progetto (spec §8 nota: KV/Upstash sarebbe la versione production-grade,
 * rimandata — non c'è credenziale KV in questo ambiente di build).
 */
const rateLimitStore = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (rateLimitStore.get(ip) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= RATE_LIMIT_MAX) {
    rateLimitStore.set(ip, timestamps);
    return true;
  }

  timestamps.push(now);
  rateLimitStore.set(ip, timestamps);
  return false;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

async function parseBody(req: NextRequest): Promise<{ data: Record<string, unknown>; isFormPost: boolean }> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const data = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return { data, isFormPost: false };
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await req.formData();
    const data: Record<string, unknown> = {};
    form.forEach((value, key) => {
      data[key] = typeof value === "string" ? value : "";
    });
    return { data, isFormPost: true };
  }

  return { data: {}, isFormPost: false };
}

async function sendNotificationEmail(payload: {
  name: string;
  email: string;
  projectType: string;
  message: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Ambiente senza API key reale (es. questo build environment): non 500, degrada
    // graziosamente così il form "riesce" comunque dal punto di vista della UI.
    console.warn(
      "[contact] RESEND_API_KEY non impostata — invio email saltato (no-op). Payload ricevuto:",
      { name: payload.name, email: payload.email, projectType: payload.projectType },
    );
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: "Contatti sito <onboarding@resend.dev>",
    to: contactEmail,
    replyTo: payload.email,
    subject: `Nuovo contatto dal sito — ${payload.name}`,
    text: `Nome: ${payload.name}\nEmail: ${payload.email}\nTipo progetto: ${payload.projectType}\n\nMessaggio:\n${payload.message}`,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

/**
 * Salva la richiesta in contact_requests (inbox del pannello admin).
 * Best-effort: senza DATABASE_URL o con il DB giu' ritorna null e il flusso
 * email prosegue identico a prima — il form non deve mai rompersi per il DB.
 */
async function persistRequest(payload: {
  name: string;
  email: string;
  projectType: string;
  message: string;
  locale: string;
}): Promise<string | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO contact_requests (name, email, project_type, message, locale)
      VALUES (${payload.name}, ${payload.email}, ${payload.projectType}, ${payload.message}, ${payload.locale})
      RETURNING id::text AS id`;
    return row?.id ?? null;
  } catch (err) {
    console.error("[contact] salvataggio su DB fallito:", (err as Error).message);
    return null;
  }
}

async function markEmailSent(id: string | null, sent: boolean) {
  const sql = getSql();
  if (!sql || !id) return;
  await sql`UPDATE contact_requests SET email_sent = ${sent} WHERE id = ${id}`.catch(() => {});
}

function redirectResponse(req: NextRequest, locale: string, status: "success" | "error") {
  const url = new URL(`/${locale}`, req.url);
  url.searchParams.set("contact", status);
  url.hash = "contatti";
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { data, isFormPost } = await parseBody(req);

  // Locale usato per i redirect no-JS anche prima che la validazione confermi
  // che è un valore ammesso (fallback ragionevole se manca/è invalido).
  const fallbackLocale = data.locale === "en" ? "en" : "it";

  // Honeypot (§8 step 2, PRIMA del rate limiting e della validazione): se il campo
  // nascosto arriva non vuoto, rispondiamo comunque con un finto successo, senza
  // inviare email e senza dare a un bot alcun segnale su cosa è "sbagliato" —
  // per questo il check avviene sul dato grezzo, prima ancora dello schema Zod,
  // che altrimenti rifiuterebbe il payload con un 400 "rumoroso".
  const rawHoneypot = data.honeypot;
  if (typeof rawHoneypot === "string" && rawHoneypot.length > 0) {
    if (isFormPost) return redirectResponse(req, fallbackLocale, "success");
    return NextResponse.json({ ok: true });
  }

  if (isRateLimited(ip)) {
    if (isFormPost) return redirectResponse(req, fallbackLocale, "error");
    return NextResponse.json({ ok: false, error: "rate-limit" }, { status: 429 });
  }

  const parsed = contactSchema.safeParse(data);

  if (!parsed.success) {
    if (isFormPost) return redirectResponse(req, fallbackLocale, "error");

    const fields: ContactFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && key in fields === false) {
        (fields as Record<string, string>)[key] = issue.message;
      }
    }
    return NextResponse.json({ ok: false, error: "validation", fields }, { status: 400 });
  }

  const payload = parsed.data;
  const requestId = await persistRequest(payload);

  try {
    await sendNotificationEmail({
      name: payload.name,
      email: payload.email,
      projectType: payload.projectType,
      message: payload.message,
    });
    await markEmailSent(requestId, Boolean(process.env.RESEND_API_KEY));
  } catch (err) {
    console.error("[contact] invio email fallito:", err);
    await markEmailSent(requestId, false);
    if (isFormPost) return redirectResponse(req, payload.locale, "error");
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }

  if (isFormPost) return redirectResponse(req, payload.locale, "success");
  return NextResponse.json({ ok: true });
}
