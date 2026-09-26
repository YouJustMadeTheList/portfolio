import { NextRequest, NextResponse } from "next/server";
import { adminUrl, gateApi, sameOrigin } from "@/lib/auth/api";
import { authenticate, createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { createRateLimiter, ipKey } from "@/lib/analytics/request-meta";

// POST <ADMIN_PATH>/api/login — form nativo (email, password) -> 303.
// Errori sempre generici: nessuna distinzione fra utente inesistente e password errata.

const limitedByIp = createRateLimiter(8, 15 * 60 * 1000);
const limitedByEmail = createRateLimiter(5, 15 * 60 * 1000);

export async function POST(req: NextRequest) {
  const gate = await gateApi(req);
  if (!gate.ok) return gate.response;
  const back = (error: string) => NextResponse.redirect(adminUrl(req, gate.base, `/login?e=${error}`), 303);

  if (!sameOrigin(req)) return back("invalid");
  if (!gate.sql) return back("nodb");

  const form = await req.formData().catch(() => null);
  const email = String(form?.get("email") ?? "").trim().toLowerCase();
  const password = String(form?.get("password") ?? "");
  if (!email || !password) return back("invalid");

  if (limitedByIp(ipKey(req.headers)) || limitedByEmail(email)) return back("rate");

  try {
    const user = await authenticate(gate.sql, email, password);
    if (!user) return back("invalid");
    const token = await createSession(gate.sql, user.id);
    const res = NextResponse.redirect(adminUrl(req, gate.base, ""), 303);
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(gate.base));
    return res;
  } catch (err) {
    console.error("[admin] login fallito:", (err as Error).message);
    return back("server");
  }
}
