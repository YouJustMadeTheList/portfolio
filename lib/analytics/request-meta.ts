import "server-only";
import { createHash, randomBytes } from "node:crypto";

/**
 * Metadati "grossolani" ricavati dalla richiesta. Nessun IP viene salvato:
 * l'IP serve solo, in memoria e sotto forma di hash con sale casuale di
 * processo, al rate limiting.
 */

export type DeviceInfo = { device: string; browser: string; os: string };

const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link|whatsapp|telegram|discord|slack|linkedinshare|headless|phantom|puppeteer|playwright|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|curl|wget|python-requests|httpclient|java\/|go-http|node-fetch|axios|preview/i;

export function isBot(ua: string | null): boolean {
  if (!ua || ua.length < 20) return true;
  return BOT_RE.test(ua);
}

export function parseUserAgent(ua: string | null): DeviceInfo {
  const s = ua ?? "";
  const isTablet = /iPad|Tablet|(Android(?!.*Mobile))/i.test(s);
  const isMobile = !isTablet && /Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(s);
  const device = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  let browser = "Altro";
  if (/Edg\//.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/.test(s)) browser = "Opera";
  else if (/SamsungBrowser/.test(s)) browser = "Samsung Internet";
  else if (/Firefox\/|FxiOS/.test(s)) browser = "Firefox";
  else if (/Chrome\/|CriOS/.test(s)) browser = "Chrome";
  else if (/Safari\//.test(s)) browser = "Safari";

  let os = "Altro";
  if (/iPhone|iPad|iPod/.test(s)) os = "iOS";
  else if (/Android/.test(s)) os = "Android";
  else if (/Windows/.test(s)) os = "Windows";
  else if (/Mac OS X|Macintosh/.test(s)) os = "macOS";
  else if (/CrOS/.test(s)) os = "ChromeOS";
  else if (/Linux/.test(s)) os = "Linux";

  return { device, browser, os };
}

/** Paese ISO-3166 alpha-2 dall'header di Vercel (se presente). */
export function countryFrom(headers: Headers): string | null {
  const c = headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry");
  return c && /^[A-Z]{2}$/.test(c) && c !== "XX" ? c : null;
}

// Sale casuale per processo: l'hash dell'IP non e' confrontabile fra istanze
// o riavvii, e non viene mai scritto da nessuna parte.
const SALT = randomBytes(16);

export function ipKey(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  const ip = (fwd ? fwd.split(",")[0]!.trim() : headers.get("x-real-ip")) ?? "unknown";
  return createHash("sha256").update(SALT).update(ip).digest("base64url").slice(0, 22);
}

/**
 * Rate limiter in memoria a finestra scorrevole. Stesso limite noto della
 * route contatti: per-istanza, non globale — sufficiente come freno.
 */
export function createRateLimiter(max: number, windowMs: number) {
  const store = new Map<string, number[]>();
  return function limited(key: string): boolean {
    const now = Date.now();
    const recent = (store.get(key) ?? []).filter((t) => t > now - windowMs);
    if (store.size > 5000) store.clear(); // freno alla crescita in memoria
    if (recent.length >= max) {
      store.set(key, recent);
      return true;
    }
    recent.push(now);
    store.set(key, recent);
    return false;
  };
}
