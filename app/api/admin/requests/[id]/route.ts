import { NextRequest, NextResponse } from "next/server";
import { adminUrl, authedApi } from "@/lib/auth/api";

// POST <ADMIN_PATH>/api/requests/:id — form nativo: status e/o keep -> 303 al dettaglio.
const STATUSES = new Set(["new", "replied", "archived"]);

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authedApi(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!/^\d{1,18}$/.test(id)) return new NextResponse("Not Found", { status: 404 });

  const form = await req.formData().catch(() => null);
  const status = String(form?.get("status") ?? "");
  const keep = form?.get("keep");

  if (STATUSES.has(status)) {
    await auth.sql`UPDATE contact_requests SET status = ${status}, updated_at = now() WHERE id = ${id}`;
  }
  if (keep === "1" || keep === "0") {
    await auth.sql`UPDATE contact_requests SET keep = ${keep === "1"}, updated_at = now() WHERE id = ${id}`;
  }
  return NextResponse.redirect(adminUrl(req, auth.base, `/richieste/${id}?ok=1`), 303);
}
