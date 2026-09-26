import { NextRequest } from "next/server";
import { authedApi } from "@/lib/auth/api";

// GET <ADMIN_PATH>/api/requests/export?status=new|replied|archived — CSV (UTF-8 con BOM, per Excel).

function csvCell(v: unknown): string {
  let s = v instanceof Date ? v.toISOString() : String(v ?? "");
  // Neutralizza la formula injection nei fogli di calcolo.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const auth = await authedApi(req);
  if (!auth.ok) return auth.response;

  const status = req.nextUrl.searchParams.get("status");
  const filter = status && ["new", "replied", "archived"].includes(status) ? status : null;

  const rows = await auth.sql<
    { id: string; created_at: Date; name: string; email: string; project_type: string; locale: string; status: string; keep: boolean; message: string }[]
  >`
    SELECT id::text, created_at, name, email, project_type, locale, status, keep, message
    FROM contact_requests
    WHERE ${filter ? auth.sql`status = ${filter}` : auth.sql`true`}
    ORDER BY created_at DESC`;

  const header = ["id", "data", "nome", "email", "tipo_progetto", "lingua", "stato", "conserva", "messaggio"];
  const lines = [header.map(csvCell).join(",")].concat(
    rows.map((r) =>
      [r.id, r.created_at, r.name, r.email, r.project_type, r.locale, r.status, r.keep ? "si" : "no", r.message]
        .map(csvCell)
        .join(","),
    ),
  );
  const date = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="richieste-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
