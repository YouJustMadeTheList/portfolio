import { NextRequest } from "next/server";
import { getSql } from "@/lib/db";
import { trackPayloadSchema } from "@/lib/analytics/payload";
import { ingest } from "@/lib/analytics/ingest";
import { countryFrom, createRateLimiter, ipKey, isBot, parseUserAgent } from "@/lib/analytics/request-meta";

// POST /api/t — beacon di analytics first-party. Risponde SEMPRE 204 (anche su
// errore): il tracker non ha nulla da fare con una risposta e un bot non deve
// ricevere segnali su cosa e' stato scartato.

const MAX_BODY = 16 * 1024;
const limited = createRateLimiter(120, 10 * 60 * 1000); // 120 batch / 10 min per IP (hash)

const noContent = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

export async function POST(req: NextRequest) {
  const sql = getSql();
  if (!sql) return noContent();

  const ua = req.headers.get("user-agent");
  if (isBot(ua)) return noContent();

  // Stesso origin soltanto (sendBeacon lo invia sempre).
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return noContent();

  if (limited(ipKey(req.headers))) return noContent();

  const text = await req.text().catch(() => "");
  if (!text || text.length > MAX_BODY) return noContent();

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return noContent();
  }
  const parsed = trackPayloadSchema.safeParse(json);
  if (!parsed.success) return noContent();

  try {
    await ingest(sql, parsed.data, { ...parseUserAgent(ua), country: countryFrom(req.headers) });
  } catch (err) {
    console.error("[analytics] ingest fallito:", (err as Error).message);
  }
  return noContent();
}
