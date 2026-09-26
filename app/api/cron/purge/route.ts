import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";
import { runPurge } from "@/lib/analytics/purge";

// GET /api/cron/purge — cancella i dati oltre i periodi di conservazione.
// Protetto da CRON_SECRET: Vercel Cron invia `Authorization: Bearer <CRON_SECRET>`.
// Esempio vercel.json: { "crons": [{ "path": "/api/cron/purge", "schedule": "17 3 * * *" }] }

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(header);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return new NextResponse("Not Found", { status: 404 });
  const sql = getSql();
  if (!sql) return NextResponse.json({ ok: false, error: "database-not-configured" }, { status: 503 });
  try {
    const deleted = await runPurge(sql);
    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    console.error("[purge] fallita:", (err as Error).message);
    return NextResponse.json({ ok: false, error: "purge-failed" }, { status: 500 });
  }
}
