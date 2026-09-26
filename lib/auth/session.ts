import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getSql, type Sql } from "@/lib/db";
import { RETENTION } from "@/db/retention.mjs";
import { DUMMY_HASH, verifyPassword } from "./scrypt.mjs";
import { verifyGate } from "./gate";

export const SESSION_COOKIE = "dds_adm";
export const SESSION_MAX_AGE_S = RETENTION.adminSessionDays * 24 * 60 * 60;

export type AdminUser = { id: number; email: string };

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export function sessionCookieOptions(base: string, maxAge = SESSION_MAX_AGE_S) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: base, // il cookie viaggia solo sotto il path segreto
    maxAge,
  };
}

/** Verifica email+password. Tempo costante anche se l'utente non esiste. */
export async function authenticate(sql: Sql, email: string, password: string): Promise<AdminUser | null> {
  const normalized = email.trim().toLowerCase().slice(0, 254);
  const [user] = await sql<{ id: number; email: string; password_hash: string; disabled: boolean }[]>`
    SELECT id, email, password_hash, disabled FROM admin_users WHERE email = ${normalized}`;
  const ok = await verifyPassword(password.slice(0, 1024), user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok || user.disabled) return null;
  return { id: user.id, email: user.email };
}

export async function createSession(sql: Sql, userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await sql`
    INSERT INTO admin_sessions (token_hash, user_id, expires_at)
    VALUES (${sha256(token)}, ${userId}, now() + ${`${SESSION_MAX_AGE_S} seconds`}::interval)`;
  await sql`UPDATE admin_users SET last_login_at = now() WHERE id = ${userId}`;
  return token;
}

export async function destroySession(sql: Sql, token: string | undefined) {
  if (!token) return;
  await sql`DELETE FROM admin_sessions WHERE token_hash = ${sha256(token)}`;
}

export async function userFromToken(sql: Sql, token: string | undefined): Promise<AdminUser | null> {
  if (!token || token.length > 100) return null;
  const [row] = await sql<{ id: number; email: string }[]>`
    UPDATE admin_sessions s SET last_seen_at = now()
    FROM admin_users u
    WHERE s.token_hash = ${sha256(token)} AND s.expires_at > now()
      AND u.id = s.user_id AND u.disabled = false
    RETURNING u.id, u.email`;
  return row ?? null;
}

export type AdminContext =
  | { base: string; state: "no-db" }
  | { base: string; state: "anonymous"; sql: Sql }
  | { base: string; state: "authenticated"; sql: Sql; user: AdminUser };

/**
 * Da chiamare in OGNI pagina/layout admin (Server Components). 404 se la
 * richiesta non e' passata dal proxy; non fa redirect da solo.
 */
export async function getAdminContext(): Promise<AdminContext> {
  const base = await verifyGate(await headers());
  if (!base) notFound();
  const sql = getSql();
  if (!sql) return { base, state: "no-db" };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  try {
    const user = await userFromToken(sql, token);
    return user ? { base, state: "authenticated", sql, user } : { base, state: "anonymous", sql };
  } catch (err) {
    console.error("[admin] verifica sessione fallita:", (err as Error).message);
    return { base, state: "no-db" };
  }
}

/** Pagine protette: utente autenticato o redirect al login. */
export async function requireAdmin(): Promise<{ base: string; sql: Sql; user: AdminUser } | { base: string; state: "no-db" }> {
  const ctx = await getAdminContext();
  if (ctx.state === "no-db") return ctx;
  if (ctx.state === "anonymous") redirect(`${ctx.base}/login`);
  return ctx;
}
