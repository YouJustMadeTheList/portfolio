import { NextRequest, NextResponse } from "next/server";
import { adminUrl, gateApi, sameOrigin } from "@/lib/auth/api";
import { destroySession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const gate = await gateApi(req);
  if (!gate.ok) return gate.response;
  if (!sameOrigin(req)) return new NextResponse("Forbidden", { status: 403 });

  if (gate.sql) {
    await destroySession(gate.sql, req.cookies.get(SESSION_COOKIE)?.value).catch(() => {});
  }
  const res = NextResponse.redirect(adminUrl(req, gate.base, "/login?e=out"), 303);
  res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(gate.base, 0));
  return res;
}
