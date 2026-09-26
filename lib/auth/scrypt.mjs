// Hash password con crypto.scrypt (built-in Node, nessuna dipendenza nativa).
// Condiviso fra l'app (lib/auth/*.ts) e la CLI (scripts/admin-user.mjs), cosi'
// il formato resta uno solo:  scrypt$<N>$<r>$<p>$<salt base64url>$<hash base64url>
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const N = 32768; // 2^15
const R = 8;
const P = 1;
const KEYLEN = 64;

/**
 * @param {string} password
 * @param {Buffer} salt
 * @param {number} n
 * @param {number} r
 * @param {number} p
 * @returns {Promise<Buffer>}
 */
function derive(password, salt, n, r, p) {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEYLEN, { N: n, r, p, maxmem: 256 * n * r } /* 2x il minimo (128*N*r) */, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

/**
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

/**
 * Confronto a tempo costante. Ritorna false (mai eccezioni) su hash malformati.
 * @param {string} password
 * @param {string} stored
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, stored) {
  const parts = String(stored).split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p) || n > 1 << 20) return false;
  const salt = Buffer.from(parts[4], "base64url");
  const expected = Buffer.from(parts[5], "base64url");
  if (expected.length !== KEYLEN) return false;
  const key = await derive(password, salt, n, r, p);
  return timingSafeEqual(key, expected);
}

/** Hash fittizio per equalizzare i tempi quando l'utente non esiste. */
export const DUMMY_HASH = `scrypt$${N}$${R}$${P}$${Buffer.alloc(16).toString("base64url")}$${Buffer.alloc(KEYLEN).toString("base64url")}`;
