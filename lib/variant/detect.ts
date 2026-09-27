import { userAgent, type NextRequest } from "next/server";
import { VARIANT_COOKIE, isVariant, type Variant } from "./index";

/**
 * Sceglie la variante per una richiesta.
 *   1. override esplicito (cookie `dds-view`)
 *   2. Client Hint `Sec-CH-UA-Mobile: ?1` (Chromium) → mobile
 *   3. User-Agent: device.type "mobile" → mobile; "tablet" e tutto il resto → desktop
 * I tablet ricevono la versione desktop per scelta del proprietario.
 */
export function detectVariant(request: NextRequest): Variant {
  const forced = request.cookies.get(VARIANT_COOKIE)?.value;
  if (isVariant(forced)) return forced;

  if (request.headers.get("sec-ch-ua-mobile") === "?1") return "m";

  const { device, ua } = userAgent(request);
  if (device.type === "mobile") return "m";
  if (device.type === "tablet") return "d";
  // iPadOS si presenta come Mac: resta desktop, coerente con "tablet = desktop".
  // Alcuni browser Android in modalità compatta omettono il device type:
  if (/Android.+Mobile|iPhone|iPod|Windows Phone|Opera Mini|IEMobile/i.test(ua)) return "m";
  return "d";
}
