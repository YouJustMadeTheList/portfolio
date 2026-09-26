import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getRequest } from "@/lib/analytics/queries";
import { RETENTION } from "@/db/retention.mjs";
import { NoDatabase, Shell } from "../../_components/Shell";
import { StatusChip } from "../../_components/StatusChip";
import { fmtDateTime, PROJECT_TYPES, STATUS_LABELS } from "../../_lib/format";

export const metadata: Metadata = { title: "Richiesta" };

export default async function RequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireAdmin();
  if (!("sql" in ctx)) return <NoDatabase base={ctx.base} />;
  const { base, sql, user } = ctx;
  const { id } = await params;
  const req = await getRequest(sql, id);
  if (!req) notFound();
  const saved = (await searchParams).ok === "1";

  const subject = req.locale === "en" ? `Re: your enquiry (${PROJECT_TYPES[req.project_type] ?? req.project_type})` : `Re: la tua richiesta (${PROJECT_TYPES[req.project_type] ?? req.project_type})`;
  const greeting = req.locale === "en" ? `Hi ${req.name.split(" ")[0]},\n\n` : `Ciao ${req.name.split(" ")[0]},\n\n`;
  const quoted = `\n\n---\n${req.message.split("\n").map((l) => `> ${l}`).join("\n")}`;
  const mailto = `mailto:${encodeURIComponent(req.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(greeting + quoted)}`;
  const purgeDate = new Date(req.created_at);
  purgeDate.setMonth(purgeDate.getMonth() + RETENTION.contactMonths);

  return (
    <Shell base={base} email={user.email} active="richieste">
      <Link href={`${base}/richieste`} prefetch={false} className="inline-flex items-center gap-2 text-[13px] text-[var(--text-mid)] hover:text-[var(--aqua-300)]">
        <span aria-hidden="true">←</span> Tutte le richieste
      </Link>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_320px]">
        <article className="admin-card p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip status={req.status} />
            <span className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.1em] text-[var(--aqua-300)]">
              {PROJECT_TYPES[req.project_type] ?? req.project_type}
            </span>
          </div>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-[1.8rem] font-medium leading-tight tracking-[-0.02em] text-[var(--text-hi)]">
            {req.name}
          </h1>
          <p className="mt-1 font-[family-name:var(--font-mono)] text-[13px] text-[var(--text-mid)]">{req.email}</p>
          <div className="mt-6 whitespace-pre-wrap border-t border-[var(--line)] pt-6 text-[15px] leading-[1.7] text-[var(--text-hi)] [overflow-wrap:anywhere]">
            {req.message}
          </div>
          <a href={mailto} className="admin-btn admin-btn--primary mt-8">
            Rispondi via email
          </a>
        </article>

        <aside className="space-y-3">
          {saved ? (
            <p role="status" className="admin-card px-4 py-3 text-[13px] text-[var(--aqua-300)]">
              Salvato.
            </p>
          ) : null}
          <div className="admin-card p-5">
            <p className="admin-eyebrow">Stato</p>
            <form action={`${base}/api/requests/${req.id}`} method="post" className="mt-3 flex flex-wrap gap-1.5">
              {(["new", "replied", "archived"] as const).map((s) => (
                <button key={s} type="submit" name="status" value={s} className="admin-btn" aria-current={req.status === s ? "true" : undefined}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </form>
          </div>
          <div className="admin-card p-5">
            <p className="admin-eyebrow">Conservazione</p>
            <p className="mt-2 text-[12.5px] leading-snug text-[var(--text-mid)]">
              {req.keep
                ? "Contrassegnata da conservare: esclusa dalla cancellazione automatica (es. diventata un incarico)."
                : `Cancellazione automatica dopo ${RETENTION.contactMonths} mesi (${fmtDateTime(purgeDate).split(",")[0]}).`}
            </p>
            <form action={`${base}/api/requests/${req.id}`} method="post" className="mt-3">
              <button type="submit" name="keep" value={req.keep ? "0" : "1"} className="admin-btn admin-btn--ghost">
                {req.keep ? "Rimuovi conservazione" : `Conserva oltre i ${RETENTION.contactMonths} mesi`}
              </button>
            </form>
          </div>
          <dl className="admin-card space-y-3 p-5 text-[13px]">
            <div>
              <dt className="admin-eyebrow">Ricevuta</dt>
              <dd className="mt-1 text-[var(--text-hi)]">{fmtDateTime(req.created_at)}</dd>
            </div>
            <div>
              <dt className="admin-eyebrow">Lingua</dt>
              <dd className="mt-1 text-[var(--text-hi)]">{req.locale === "en" ? "English" : "Italiano"}</dd>
            </div>
            <div>
              <dt className="admin-eyebrow">Notifica email</dt>
              <dd className="mt-1 text-[var(--text-hi)]">{req.email_sent ? "Inviata" : req.email_sent === false ? "Non inviata" : "—"}</dd>
            </div>
            <div>
              <dt className="admin-eyebrow">ID</dt>
              <dd className="mt-1 font-[family-name:var(--font-mono)] text-[var(--text-mid)]">#{req.id}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </Shell>
  );
}
