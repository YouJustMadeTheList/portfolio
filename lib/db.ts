import "server-only";
import postgres from "postgres";

/**
 * Client PostgreSQL (postgres.js) condiviso, provider-agnostico: basta
 * DATABASE_URL (Neon, Vercel Postgres, Supabase, Postgres locale...).
 *
 * - Singleton su globalThis: sopravvive all'HMR in dev e viene riusato fra le
 *   invocazioni "calde" di una funzione serverless.
 * - Pool piccolo (serverless = molte istanze, ognuna con poche connessioni).
 *   Con Neon usare l'URL "pooled" (-pooler); `prepare: false` lo rende
 *   compatibile con PgBouncer in transaction mode.
 * - SSL: rispetta `?sslmode=` nell'URL; senza, e' `require` per host remoti.
 * - Senza DATABASE_URL `getSql()` ritorna null: ogni chiamante DEVE degradare
 *   (il sito pubblico non deve mai rompersi per colpa del database).
 */
export type Sql = postgres.Sql<Record<string, never>>;

const globalForDb = globalThis as unknown as { __ddsSql?: Sql; __ddsSqlUrl?: string };

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getSql(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (globalForDb.__ddsSql && globalForDb.__ddsSqlUrl === url) return globalForDb.__ddsSql;

  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
  const sql = postgres(url, {
    max: process.env.NODE_ENV === "production" ? 3 : 5,
    idle_timeout: 20,
    connect_timeout: 5,
    prepare: false,
    onnotice: () => {},
    ssl: /sslmode=/.test(url) || isLocal ? undefined : "require",
  }) as unknown as Sql;

  globalForDb.__ddsSql = sql;
  globalForDb.__ddsSqlUrl = url;
  return sql;
}
