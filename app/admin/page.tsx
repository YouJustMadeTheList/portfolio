import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import {
  getBreakdowns,
  getDataSpan,
  getKpis,
  getSectionRetention,
  getTimeseries,
  getTopClicks,
  type CountRow,
} from "@/lib/analytics/queries";
import { NoDatabase, Shell } from "./_components/Shell";
import { BarList, Card, Delta, Kpi, Meter, SectionFunnel } from "./_components/Widgets";
import { TimeSeriesChart } from "./_components/TimeSeriesChart";
import { resolveRange } from "./_lib/range";
import { RETENTION } from "@/db/retention.mjs";
import { countryName, DEVICE_LABELS, fmtDay, fmtDuration, fmtNum, fmtPct, sectionLabel } from "./_lib/format";

export const metadata: Metadata = { title: "Dashboard" };

const PAGE_LABELS: Record<string, string> = { "/": "Home", "/privacy": "Privacy policy", "/cookie": "Cookie policy" };
const LOCALE_LABELS: Record<string, string> = { it: "Italiano", en: "English" };

function rowsOf(list: CountRow[], label: (k: string) => string) {
  return list.map((r) => ({ key: r.key || "(vuoto)", label: label(r.key), value: r.count }));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireAdmin();
  if (!("sql" in ctx)) return <NoDatabase base={ctx.base} />;
  const { base, sql, user } = ctx;
  const range = resolveRange(await searchParams);
  const cur = { from: range.from, to: range.to };
  const prev = { from: range.prevFrom, to: range.prevTo };

  const [k, kp, series, retention, breakdowns, clicks, span, newReq] = await Promise.all([
    getKpis(sql, cur),
    getKpis(sql, prev),
    getTimeseries(sql, cur),
    getSectionRetention(sql, cur),
    getBreakdowns(sql, cur),
    getTopClicks(sql, cur),
    getDataSpan(sql),
    sql`SELECT count(*)::int AS n FROM contact_requests WHERE status = 'new'`,
  ]);

  const engagedRate = k.sessions ? k.engagedSessions / k.sessions : 0;
  const engagedPrev = kp.sessions ? kp.engagedSessions / kp.sessions : 0;
  const conv = k.visits ? k.requests / k.visits : 0;
  const convPrev = kp.visits ? kp.requests / kp.visits : 0;
  const consentShare = k.pageviews ? k.consentedPageviews / k.pageviews : 0;
  const returningShare = k.visitors ? k.returningVisitors / k.visitors : 0;

  const presets: { key: "7" | "30" | "90"; label: string }[] = [
    { key: "7", label: "7 giorni" },
    { key: "30", label: "30 giorni" },
    { key: "90", label: "90 giorni" },
  ];

  return (
    <Shell base={base} email={user.email} active="dashboard" newRequests={Number(newReq[0]?.n ?? 0)}>
      {/* Filtri: una riga sopra tutto, il periodo governa ogni numero sotto. */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="admin-eyebrow">Traffico</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.9rem] font-medium leading-none tracking-[-0.025em] text-[var(--text-hi)]">
            {fmtDay(range.fromDay, true)} <span className="text-[var(--text-low)]">—</span> {fmtDay(range.toDay, true)}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Periodo" className="flex gap-1.5">
            {presets.map((p) => (
              <Link
                key={p.key}
                href={`${base}?range=${p.key}`}
                prefetch={false}
                className="admin-btn"
                aria-current={range.preset === p.key ? "true" : undefined}
              >
                {p.label}
              </Link>
            ))}
          </nav>
          <form method="get" action={base} className="flex flex-wrap items-center gap-1.5">
            <label className="sr-only" htmlFor="from">
              Dal
            </label>
            <input id="from" name="from" type="date" defaultValue={range.fromDay} className="admin-input !min-h-[38px] !w-[138px] !px-3 text-[13px]" />
            <label className="sr-only" htmlFor="to">
              Al
            </label>
            <input id="to" name="to" type="date" defaultValue={range.toDay} className="admin-input !min-h-[38px] !w-[138px] !px-3 text-[13px]" />
            <button type="submit" className="admin-btn" aria-current={range.preset === "custom" ? "true" : undefined}>
              Applica
            </button>
          </form>
        </div>
      </div>

      {span.total === 0 ? (
        <p className="admin-card mt-6 p-4 text-[13px] text-[var(--text-mid)]">
          Ancora nessun evento registrato. I dati compaiono appena qualcuno visita il sito (i browser degli admin sono esclusi).
        </p>
      ) : null}

      {/* Hero figure + KPI */}
      <div className="mt-6 grid gap-3 lg:grid-cols-[1.25fr_3fr]">
        <div className="admin-card flex flex-col justify-between gap-6 p-6">
          <div>
            <p className="text-[13px] text-[var(--text-mid)]">Visite</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-[3.5rem] font-medium leading-none tracking-[-0.03em] text-[var(--text-hi)] [text-shadow:0_0_40px_rgba(63,233,204,0.18)]">
              {fmtNum(k.visits)}
            </p>
            <p className="mt-2 font-[family-name:var(--font-mono)] text-[11px]">
              <Delta now={k.visits} prev={kp.visits} />
            </p>
          </div>
          <p className="text-[11.5px] leading-snug text-[var(--text-low)]">
            Sessioni con consenso ({fmtNum(k.sessions)}) + pagine viste anonime ({fmtNum(k.anonPageviews)}). Senza consenso non esiste un id per
            raggruppare le pagine di una stessa visita.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          <Kpi label="Pagine viste" value={fmtNum(k.pageviews)} delta={<Delta now={k.pageviews} prev={kp.pageviews} />} />
          <Kpi label="Visitatori unici*" value={fmtNum(k.visitors)} delta={<Delta now={k.visitors} prev={kp.visitors} />} hint="Solo visitatori con consenso" />
          <Kpi label="Sessioni*" value={fmtNum(k.sessions)} delta={<Delta now={k.sessions} prev={kp.sessions} />} />
          <Kpi label="Durata media*" value={fmtDuration(k.avgDurationMs)} delta={<Delta now={k.avgDurationMs} prev={kp.avgDurationMs} />} />
          <Kpi
            label="Sessioni coinvolte*"
            value={fmtPct(engagedRate)}
            delta={<Delta now={engagedRate} prev={engagedPrev} pct={false} />}
            hint="Sessioni con durata >= 10s, oppure almeno un click, oppure 2+ sezioni viste. Il resto è rimbalzo."
          />
          <Kpi label="Visitatori di ritorno*" value={fmtNum(k.returningVisitors)} delta={<span className="text-[var(--text-low)]">{fmtPct(returningShare)} dei visitatori</span>} />
          <Kpi label="Richieste di contatto" value={fmtNum(k.requests)} delta={<Delta now={k.requests} prev={kp.requests} />} />
          <Kpi label="Conversione" value={fmtPct(conv, 1)} delta={<Delta now={conv} prev={convPrev} pct={false} />} hint="Richieste / visite" />
        </div>
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-low)]">* solo visitatori che hanno accettato le statistiche. Rimbalzo = {fmtPct(1 - engagedRate)} delle sessioni.</p>

      <div className="mt-6 grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card title="Visite e visitatori per giorno" subtitle="Visite = sessioni con consenso + pagine viste anonime; visitatori unici solo con consenso.">
          <TimeSeriesChart
            title="Visite e visitatori unici per giorno"
            points={series}
            series={[
              { key: "visits", label: "Visite", color: "var(--chart-1)", area: true },
              { key: "visitors", label: "Visitatori unici", color: "var(--chart-2)" },
            ]}
          />
        </Card>
        <Card title="Consenso" subtitle="Quota di pagine viste con statistiche accettate.">
          <div className="space-y-5">
            <Meter ratio={consentShare} label="Con consenso" />
            <dl className="grid grid-cols-2 gap-3 text-[12px]">
              <div className="rounded-[var(--radius-sm)] border border-[var(--line)] p-3">
                <dt className="text-[var(--text-low)]">Con consenso</dt>
                <dd className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--text-hi)] tabular-nums">{fmtNum(k.consentedPageviews)}</dd>
              </div>
              <div className="rounded-[var(--radius-sm)] border border-[var(--line)] p-3">
                <dt className="text-[var(--text-low)]">Anonime</dt>
                <dd className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--text-hi)] tabular-nums">{fmtNum(k.anonPageviews)}</dd>
              </div>
            </dl>
            <div>
              <p className="mb-2 text-[12px] text-[var(--text-mid)]">Lingua</p>
              <BarList rows={rowsOf(breakdowns.locales, (key) => LOCALE_LABELS[key] ?? (key || "—"))} total={k.pageviews} />
            </div>
            <p className="text-[12px] text-[var(--text-mid)]">
              Scroll medio*: <span className="tabular-nums text-[var(--text-hi)]">{k.avgScroll ? `${Math.round(k.avgScroll)}%` : "—"}</span>
            </p>
          </div>
        </Card>
      </div>

      <Card
        className="mt-3"
        title="Retention per sezione"
        subtitle={`La home è una pagina unica: ogni sezione è una "pagina". Una sezione conta come vista dopo 1s di visibilità. Base: ${fmtNum(retention.homePageviews)} pagine viste della home.`}
      >
        <SectionFunnel rows={retention.sections} homePageviews={retention.homePageviews} />
      </Card>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card title="Elementi più cliccati*" subtitle="Link, bottoni ed elementi [data-track]; con la sezione in cui si trovano.">
          <BarList
            emptyText="Nessun click registrato (servono visitatori con consenso)."
            rows={clicks.map((c) => ({
              key: `${c.label}|${c.href}|${c.section}`,
              label: c.label,
              value: c.clicks,
              sub: [sectionLabel(c.section), c.href].filter((v) => v && v !== "—").join(" · "),
            }))}
          />
        </Card>
        <Card title="Pagine" subtitle="Pagine viste per percorso (lingua esclusa).">
          <BarList rows={rowsOf(breakdowns.pages, (key) => PAGE_LABELS[key] ?? key)} total={k.pageviews} />
        </Card>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Provenienza" subtitle="Dominio del sito di provenienza.">
          <BarList rows={rowsOf(breakdowns.referrers, (key) => key || "Diretto / nessuno")} total={k.pageviews} />
        </Card>
        <Card title="Paesi" subtitle="Da header di hosting; nessun IP salvato.">
          <BarList rows={rowsOf(breakdowns.countries, (key) => countryName(key))} total={k.pageviews} />
        </Card>
        <Card title="Dispositivi">
          <BarList rows={rowsOf(breakdowns.devices, (key) => DEVICE_LABELS[key] ?? (key || "—"))} total={k.pageviews} />
          <p className="mb-2 mt-5 text-[12px] text-[var(--text-mid)]">Sistemi operativi</p>
          <BarList rows={rowsOf(breakdowns.os, (key) => key || "—")} total={k.pageviews} />
        </Card>
        <Card title="Browser">
          <BarList rows={rowsOf(breakdowns.browsers, (key) => key || "—")} total={k.pageviews} />
        </Card>
      </div>

      <p className="mt-8 text-center font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.12em] text-[var(--text-low)]">
        Dati da {span.first ? fmtDay(span.first.toISOString().slice(0, 10), true) : "—"} · conservazione {RETENTION.analyticsMonths} mesi · fuso Europe/Rome
      </p>
    </Shell>
  );
}
