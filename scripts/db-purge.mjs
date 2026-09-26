#!/usr/bin/env node
// Cancella i dati oltre i periodi di conservazione (db/retention.mjs).
// Uso: npm run db:purge  (in produzione e' preferibile il cron /api/cron/purge)
import postgres from "postgres";
import { PURGE_STATEMENTS } from "../db/retention.mjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL non impostata.");
  process.exit(1);
}
const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
const sql = postgres(url, {
  max: 1,
  onnotice: () => {},
  ssl: /sslmode=/.test(url) || isLocal ? undefined : "require",
});

try {
  for (const { label, sql: stmt } of PURGE_STATEMENTS) {
    const res = await sql.unsafe(stmt);
    console.log(`${label}: ${res.count} righe eliminate`);
  }
} catch (err) {
  console.error("Purge fallita:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
