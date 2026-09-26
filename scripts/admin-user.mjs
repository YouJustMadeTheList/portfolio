#!/usr/bin/env node
// Gestione degli utenti del pannello admin. E' l'UNICO modo per dare o togliere accesso.
//
//   npm run admin:add -- persona@example.com            (chiede la password)
//   npm run admin:add -- persona@example.com --password 'una-password-lunga'
//   npm run admin:remove -- persona@example.com
//   npm run admin:list
//
// `add` su un'email esistente ne reimposta la password (e chiude le sue sessioni).
import postgres from "postgres";
import { hashPassword } from "../lib/auth/scrypt.mjs";

const MIN_PASSWORD = 12;
const [, , command, emailArg, ...rest] = process.argv;

function usage(code = 1) {
  console.log(`Uso:
  node scripts/admin-user.mjs add <email> [--password <pw>]
  node scripts/admin-user.mjs remove <email>
  node scripts/admin-user.mjs list`);
  process.exit(code);
}

function normalizeEmail(value) {
  const email = String(value ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(`Email non valida: ${value ?? "(vuota)"}`);
    process.exit(1);
  }
  return email;
}

function promptHidden(question) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) {
      // Input da pipe: legge una riga intera.
      let buf = "";
      stdin.setEncoding("utf8");
      stdin.on("data", (c) => (buf += c));
      stdin.on("end", () => resolve(buf.split(/\r?\n/)[0] ?? ""));
      stdin.on("error", reject);
      return;
    }
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (ch) => {
      if (ch === "\r" || ch === "\n" || ch === "\u0004") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off("data", onData);
        stdout.write("\n");
        resolve(value);
      } else if (ch === "\u0003") {
        stdout.write("\n");
        process.exit(130);
      } else if (ch === "\u007f" || ch === "\b") {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

if (!command || !["add", "remove", "list"].includes(command)) usage();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL non impostata. Aggiungila a .env.local o all'ambiente.");
  process.exit(1);
}
const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
const sql = postgres(url, {
  max: 1,
  onnotice: () => {},
  ssl: /sslmode=/.test(url) || isLocal ? undefined : "require",
});

try {
  if (command === "list") {
    const rows = await sql`
      SELECT u.email, u.created_at, u.last_login_at, u.disabled,
             (SELECT count(*)::int FROM admin_sessions s WHERE s.user_id = u.id AND s.expires_at > now()) AS active_sessions
      FROM admin_users u ORDER BY u.created_at`;
    if (rows.length === 0) console.log("Nessun utente admin.");
    for (const r of rows) {
      console.log(
        `${r.email}  creato ${r.created_at.toISOString().slice(0, 10)}  ultimo accesso ${
          r.last_login_at ? r.last_login_at.toISOString().slice(0, 16).replace("T", " ") : "mai"
        }  sessioni attive ${r.active_sessions}${r.disabled ? "  [DISABILITATO]" : ""}`,
      );
    }
  } else if (command === "add") {
    const email = normalizeEmail(emailArg);
    const pwIndex = rest.indexOf("--password");
    let password = pwIndex >= 0 ? rest[pwIndex + 1] : undefined;
    if (password === undefined) {
      password = await promptHidden(`Password per ${email} (min ${MIN_PASSWORD} caratteri): `);
      if (process.stdin.isTTY) {
        const confirm = await promptHidden("Ripeti la password: ");
        if (confirm !== password) {
          console.error("Le password non coincidono.");
          process.exitCode = 1;
          throw null;
        }
      }
    }
    if (!password || password.length < MIN_PASSWORD) {
      console.error(`Password troppo corta (minimo ${MIN_PASSWORD} caratteri).`);
      process.exitCode = 1;
      throw null;
    }
    const hash = await hashPassword(password);
    const [row] = await sql`
      INSERT INTO admin_users (email, password_hash) VALUES (${email}, ${hash})
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, disabled = false
      RETURNING id, (xmax = 0) AS inserted`;
    if (!row.inserted) {
      await sql`DELETE FROM admin_sessions WHERE user_id = ${row.id}`;
      console.log(`Password aggiornata per ${email} (sessioni esistenti chiuse).`);
    } else {
      console.log(`Utente admin creato: ${email}`);
    }
  } else if (command === "remove") {
    const email = normalizeEmail(emailArg);
    const res = await sql`DELETE FROM admin_users WHERE email = ${email}`;
    console.log(res.count ? `Utente rimosso: ${email} (e relative sessioni).` : `Nessun utente con email ${email}.`);
  }
} catch (err) {
  if (err) {
    console.error("Errore:", err.message);
    process.exitCode = 1;
  }
} finally {
  await sql.end({ timeout: 5 });
}
