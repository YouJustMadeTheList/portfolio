/**
 * "Cancello" del pannello admin, condiviso fra proxy.ts e il codice server.
 *
 * Il pannello vive in app/admin/** e app/api/admin/**, ma quei percorsi NON
 * sono raggiungibili direttamente: proxy.ts risponde 404 a ogni richiesta
 * diretta e riscrive solo `/<ADMIN_PATH>/...` verso di loro, aggiungendo
 * l'header GATE_HEADER. Le pagine e le route admin verificano a loro volta
 * l'header (difesa in profondita': se un giorno il matcher del proxy
 * cambiasse, il pannello resterebbe comunque chiuso).
 */
export const GATE_HEADER = "x-dds-admin-gate";
export const BASE_HEADER = "x-dds-admin-base";

const RESERVED = /^(api|_next|_vercel|admin|it|en)(?:$|[-_])/i;

/** ADMIN_PATH normalizzato (senza slash) oppure null se assente/non valido. */
export function getAdminPath(): string | null {
  const raw = (process.env.ADMIN_PATH ?? "").trim().replace(/^\/+|\/+$/g, "");
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/.test(raw)) return null;
  if (RESERVED.test(raw)) return null;
  return raw;
}

/** Token derivato dal segreto: mai dal client, solo dal proxy verso l'app. */
export async function gateToken(adminPath: string): Promise<string> {
  const data = new TextEncoder().encode(`dds-admin-gate:v1:${adminPath}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Verifica gli header impostati dal proxy. Ritorna il base path ("/segreto") o null. */
export async function verifyGate(headers: Headers): Promise<string | null> {
  const adminPath = getAdminPath();
  if (!adminPath) return null;
  const got = headers.get(GATE_HEADER);
  if (!got) return null;
  const expected = await gateToken(adminPath);
  if (got.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? `/${adminPath}` : null;
}
