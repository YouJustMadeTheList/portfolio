import "server-only";
import type { Sql } from "@/lib/db";
import { PURGE_STATEMENTS } from "@/db/retention.mjs";

export async function runPurge(sql: Sql): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const { label, sql: stmt } of PURGE_STATEMENTS) {
    const res = await sql.unsafe(stmt);
    result[label] = res.count;
  }
  return result;
}
