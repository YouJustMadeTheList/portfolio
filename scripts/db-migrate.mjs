#!/usr/bin/env node
// Applica db/schema.sql (idempotente). Uso: npm run db:migrate
// Legge DATABASE_URL dall'ambiente (npm script carica .env.local se esiste).
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL non impostata. Aggiungila a .env.local o all'ambiente.");
  process.exit(1);
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const schema = await readFile(path.join(root, "db", "schema.sql"), "utf8");

const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
const sql = postgres(url, {
  max: 1,
  onnotice: () => {},
  ssl: /sslmode=/.test(url) || isLocal ? undefined : "require",
});

try {
  await sql.begin(async (tx) => {
    await tx.unsafe(schema);
  });
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name`;
  console.log("Migrazione completata. Tabelle:", tables.map((t) => t.table_name).join(", "));
} catch (err) {
  console.error("Migrazione fallita:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
