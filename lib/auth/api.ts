import "server-only";
import type { NextRequest } from "next/server";
import { getSql, type Sql } from "@/lib/db";
import { verifyGate } from "./gate";
import { SESSION_COOKIE, userFromToken, type AdminUser } from "./session";

/** 404 identico a quello di una /api/... inesistente. */
export function apiNotFound() {
  return new Response("Not Found", { status: 404, headers: { "Content-Type": "text/plain" } });
}

/** Stessa origine per le richieste che modificano stato (oltre a SameSite=Strict). */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.method === "GET";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** URL assoluto sotto il path segreto (i redirect dei form usano 303). */
export function adminUrl(req: NextRequest, base: string, path: string): URL {
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  return new URL(`${base}${path}`, `${proto}://${host}`);
}

export type ApiGate =
  | { ok: false; response: Response }
  | { ok: true; base: string; sql: Sql | null };

export async function gateApi(req: NextRequest): Promise<ApiGate> {
  const base = await verifyGate(req.headers);
  if (!base) return { ok: false, response: apiNotFound() };
  return { ok: true, base, sql: getSql() };
}

export async function authedApi(
  req: NextRequest,
): Promise<{ ok: false; response: Response } | { ok: true; base: string; sql: Sql; user: AdminUser }> {
  const gate = await gateApi(req);
  if (!gate.ok) return gate;
  if (req.method !== "GET" && !sameOrigin(req)) {
    return { ok: false, response: new Response("Forbidden", { status: 403 }) };
  }
  if (!gate.sql) return { ok: false, response: new Response("Database non configurato", { status: 503 }) };
  const user = await userFromToken(gate.sql, req.cookies.get(SESSION_COOKIE)?.value).catch(() => null);
  if (!user) {
    return { ok: false, response: Response.redirect(adminUrl(req, gate.base, "/login"), 303) };
  }
  return { ok: true, base: gate.base, sql: gate.sql, user };
}
