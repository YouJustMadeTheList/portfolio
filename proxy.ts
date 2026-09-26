import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./lib/i18n/routing";
import { BASE_HEADER, GATE_HEADER, gateToken, getAdminPath } from "./lib/auth/gate";

// Next 16: `middleware.ts` e' deprecato e rinominato `proxy.ts` (stessa API).
// Tre responsabilita', in quest'ordine:
//   1. `/<ADMIN_PATH>/...`  -> rewrite verso /admin/... o /api/admin/...
//   2. /admin/..., /api/admin/... richiesti direttamente -> 404 identico al sito
//   3. tutto il resto -> routing dei locale di next-intl, invariato.

const intl = createMiddleware(routing);

function isDirectAdmin(pathname: string): "page" | "api" | null {
  if (pathname === "/api/admin" || pathname.startsWith("/api/admin/")) return "api";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "page";
  return null;
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminPath = getAdminPath();

  if (adminPath && (pathname === `/${adminPath}` || pathname.startsWith(`/${adminPath}/`))) {
    const rest = pathname.slice(adminPath.length + 1); // "" | "/..."
    const url = request.nextUrl.clone();
    url.pathname =
      rest === "/api" || rest.startsWith("/api/") ? `/api/admin${rest.slice(4)}` : `/admin${rest}`;

    const headers = new Headers(request.headers);
    headers.set(GATE_HEADER, await gateToken(adminPath));
    headers.set(BASE_HEADER, `/${adminPath}`);

    const res = NextResponse.rewrite(url, { request: { headers } });
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    // same-origin: nessun Referer verso siti esterni (il path segreto non esce), ma
    // Origin resta valorizzato sui POST dei form (con no-referrer Chrome invia "null").
    res.headers.set("Referrer-Policy", "same-origin");
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("X-Frame-Options", "DENY");
    return res;
  }

  const direct = isDirectAdmin(pathname);
  if (direct === "api") {
    // Rewrite verso un percorso inesistente: e' il 404 nativo di Next, byte per
    // byte uguale a quello di qualunque altra /api/... sconosciuta.
    return NextResponse.rewrite(new URL("/api/__not-found", request.url));
  }
  if (direct === "page") {
    // Stesso trattamento di un qualunque percorso sconosciuto senza locale:
    // next-intl reindirizza a /it/admin..., che non esiste -> 404 del sito.
    return intl(request);
  }

  return intl(request);
}

export const config = {
  // Il primo pattern e' quello storico di next-intl (esclude api, asset e file
  // con estensione): copre anche /admin e il path segreto. Il secondo aggiunge
  // /api/admin per poterlo chiudere con un 404.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/api/admin", "/api/admin/:path*"],
};
