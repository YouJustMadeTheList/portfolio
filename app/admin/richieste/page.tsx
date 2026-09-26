import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listRequests } from "@/lib/analytics/queries";
import { NoDatabase, Shell } from "../_components/Shell";
import { Empty } from "../_components/Widgets";
import { StatusChip } from "../_components/StatusChip";
import { fmtDateTime, PROJECT_TYPES } from "../_lib/format";

export const metadata: Metadata = { title: "Richieste" };

const FILTERS = [
  { key: "", label: "Tutte" },
  { key: "new", label: "Nuove" },
  { key: "replied", label: "Risposte" },
  { key: "archived", label: "Archiviate" },
] as const;

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireAdmin();
  if (!("sql" in ctx)) return <NoDatabase base={ctx.base} />;
  const { base, sql, user } = ctx;
  const sp = await searchParams;
  const status = typeof sp.status === "string" && ["new", "replied", "archived"].includes(sp.status) ? sp.status : null;
  const { rows, byStatus } = await listRequests(sql, status);
  const total = byStatus.new! + byStatus.replied! + byStatus.archived!;

  return (
    <Shell base={base} email={user.email} active="richieste" newRequests={byStatus.new}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="admin-eyebrow">Inbox</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.9rem] font-medium leading-none tracking-[-0.025em] text-[var(--text-hi)]">
            Richieste di contatto
          </h1>
        </div>
        <a href={`${base}/api/requests/export${status ? `?status=${status}` : ""}`} className="admin-btn self-start sm:self-auto">
          <svg aria-hidden="true" width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 1.5v8M3.5 6.5 7 10l3.5-3.5M2 12.5h10" />
          </svg>
          Esporta CSV
        </a>
      </div>

      <nav aria-label="Filtra per stato" className="mt-6 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const count = f.key ? byStatus[f.key] : total;
          return (
            <Link
              key={f.key || "all"}
              href={f.key ? `${base}/richieste?status=${f.key}` : `${base}/richieste`}
              prefetch={false}
              className="admin-btn"
              aria-current={(status ?? "") === f.key ? "true" : undefined}
            >
              {f.label}
              <span className="font-[family-name:var(--font-mono)] text-[11px] opacity-70 tabular-nums">{count}</span>
            </Link>
          );
        })}
      </nav>

      <div className="admin-card mt-4 overflow-hidden">
        {rows.length === 0 ? (
          <Empty>Nessuna richiesta{status ? " con questo stato" : ""}.</Empty>
        ) : (
          <ul>
            {rows.map((r) => (
              <li key={r.id} className="border-b border-[rgb(var(--aqua-rgb)/0.06)] last:border-b-0">
                <Link
                  href={`${base}/richieste/${r.id}`}
                  prefetch={false}
                  className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-[rgb(var(--aqua-rgb)/0.04)] sm:grid-cols-[220px_1fr_auto]"
                >
                  <div className="min-w-0">
                    <p className={`truncate text-[14px] ${r.status === "new" ? "font-medium text-[var(--text-hi)]" : "text-[var(--text-mid)]"}`}>
                      {r.status === "new" ? <span aria-hidden="true" className="mr-2 inline-block size-1.5 -translate-y-px rounded-full bg-[var(--aqua-400)] shadow-[var(--glow-xs)]" /> : null}
                      {r.name}
                    </p>
                    <p className="truncate font-[family-name:var(--font-mono)] text-[11.5px] text-[var(--text-low)]">{r.email}</p>
                  </div>
                  <p className="col-span-2 line-clamp-2 text-[13px] text-[var(--text-mid)] sm:col-span-1 sm:row-start-1 sm:col-start-2">
                    <span className="mr-2 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.1em] text-[var(--aqua-300)]">
                      {PROJECT_TYPES[r.project_type] ?? r.project_type}
                    </span>
                    {r.message}
                  </p>
                  <div className="row-start-1 flex flex-col items-end gap-1.5 sm:col-start-3">
                    <StatusChip status={r.status} />
                    <time className="whitespace-nowrap font-[family-name:var(--font-mono)] text-[11px] text-[var(--text-low)]">{fmtDateTime(r.created_at)}</time>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}
