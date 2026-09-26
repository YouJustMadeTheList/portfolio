import "server-only";
import type { Sql } from "@/lib/db";

/**
 * Query del dashboard. Tutte parametrizzate (tagged template di postgres.js):
 * nessuna stringa utente viene mai concatenata nell'SQL.
 * I giorni sono calcolati sul fuso Europe/Rome.
 */
export const TZ = "Europe/Rome";

export type Range = { from: Date; to: Date; days: number; label: string };

export type Kpis = {
  pageviews: number;
  anonPageviews: number;
  consentedPageviews: number;
  sessions: number;
  visitors: number;
  returningVisitors: number;
  avgDurationMs: number;
  engagedSessions: number;
  avgScroll: number;
  requests: number;
  visits: number;
};

const num = (v: unknown) => Number(v ?? 0) || 0;

export async function getKpis(sql: Sql, r: { from: Date; to: Date }): Promise<Kpis> {
  const [ev] = await sql`
    SELECT
      count(*) FILTER (WHERE type = 'pageview')                       AS pageviews,
      count(*) FILTER (WHERE type = 'pageview' AND NOT consented)     AS anon_pageviews,
      count(*) FILTER (WHERE type = 'pageview' AND consented)         AS consented_pageviews
    FROM events WHERE ts >= ${r.from} AND ts < ${r.to}`;
  const [se] = await sql`
    SELECT
      count(*)                                   AS sessions,
      count(DISTINCT visitor_id)                 AS visitors,
      count(DISTINCT visitor_id) FILTER (WHERE is_returning) AS returning_visitors,
      coalesce(avg(duration_ms) FILTER (WHERE duration_ms > 0), 0) AS avg_duration,
      count(*) FILTER (WHERE duration_ms >= 10000 OR clicks > 0 OR sections_viewed >= 2) AS engaged,
      coalesce(avg(max_scroll) FILTER (WHERE max_scroll > 0), 0) AS avg_scroll
    FROM sessions WHERE started_at >= ${r.from} AND started_at < ${r.to}`;
  const [cr] = await sql`
    SELECT count(*) AS requests FROM contact_requests WHERE created_at >= ${r.from} AND created_at < ${r.to}`;

  const sessions = num(se?.sessions);
  const anon = num(ev?.anon_pageviews);
  return {
    pageviews: num(ev?.pageviews),
    anonPageviews: anon,
    consentedPageviews: num(ev?.consented_pageviews),
    sessions,
    visitors: num(se?.visitors),
    returningVisitors: num(se?.returning_visitors),
    avgDurationMs: num(se?.avg_duration),
    engagedSessions: num(se?.engaged),
    avgScroll: num(se?.avg_scroll),
    requests: num(cr?.requests),
    // Una "visita" = sessione con consenso oppure pagina vista anonima
    // (senza consenso non esiste un identificativo per raggruppare le pagine).
    visits: sessions + anon,
  };
}

export type DayPoint = { day: string; visits: number; visitors: number; pageviews: number };

export async function getTimeseries(sql: Sql, r: { from: Date; to: Date }): Promise<DayPoint[]> {
  const rows = await sql`
    WITH days AS (
      SELECT generate_series(
        (${r.from}::timestamptz AT TIME ZONE ${TZ})::date,
        ((${r.to}::timestamptz - interval '1 second') AT TIME ZONE ${TZ})::date,
        interval '1 day')::date AS day
    ),
    pv AS (
      SELECT (ts AT TIME ZONE ${TZ})::date AS day,
             count(*) AS pageviews,
             count(*) FILTER (WHERE NOT consented) AS anon
      FROM events WHERE type = 'pageview' AND ts >= ${r.from} AND ts < ${r.to}
      GROUP BY 1
    ),
    se AS (
      SELECT (started_at AT TIME ZONE ${TZ})::date AS day,
             count(*) AS sessions, count(DISTINCT visitor_id) AS visitors
      FROM sessions WHERE started_at >= ${r.from} AND started_at < ${r.to}
      GROUP BY 1
    )
    SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
           coalesce(se.sessions, 0) + coalesce(pv.anon, 0) AS visits,
           coalesce(se.visitors, 0) AS visitors,
           coalesce(pv.pageviews, 0) AS pageviews
    FROM days d LEFT JOIN pv USING (day) LEFT JOIN se USING (day)
    ORDER BY d.day`;
  return rows.map((x) => ({
    day: String(x.day),
    visits: num(x.visits),
    visitors: num(x.visitors),
    pageviews: num(x.pageviews),
  }));
}

export type SectionRow = {
  section: string;
  index: number;
  views: number;
  reach: number; // 0..1 rispetto alle pagine viste della home
  avgDwellMs: number;
  sessionReach: number | null; // 0..1 fra le sessioni con consenso che hanno visto la home
};

export async function getSectionRetention(sql: Sql, r: { from: Date; to: Date }) {
  const [home] = await sql`
    SELECT count(*) AS pv,
           count(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL) AS sessions
    FROM events WHERE type = 'pageview' AND path = '/' AND ts >= ${r.from} AND ts < ${r.to}`;
  const homePv = num(home?.pv);
  const homeSessions = num(home?.sessions);
  const rows = await sql`
    SELECT section,
           round(avg(section_index))::int                          AS idx,
           count(*) FILTER (WHERE type = 'section_view')           AS views,
           coalesce(sum(dwell_ms), 0)                              AS dwell,
           count(DISTINCT session_id) FILTER (WHERE type = 'section_view' AND session_id IS NOT NULL) AS sessions
    FROM events
    WHERE type IN ('section_view', 'section_dwell') AND path = '/' AND ts >= ${r.from} AND ts < ${r.to}
    GROUP BY section
    HAVING count(*) FILTER (WHERE type = 'section_view') > 0
    ORDER BY idx, section`;
  const sections: SectionRow[] = rows.map((x) => {
    const views = num(x.views);
    return {
      section: String(x.section),
      index: num(x.idx),
      views,
      reach: homePv ? Math.min(1, views / homePv) : 0,
      avgDwellMs: views ? num(x.dwell) / views : 0,
      sessionReach: homeSessions ? Math.min(1, num(x.sessions) / homeSessions) : null,
    };
  });
  return { homePageviews: homePv, homeSessions, sections };
}

export type CountRow = { key: string; count: number };

async function countBy(
  sql: Sql,
  r: { from: Date; to: Date },
  column: "path" | "referrer_domain" | "country" | "device" | "browser" | "os" | "locale" | "viewport",
  limit = 10,
): Promise<CountRow[]> {
  const rows = await sql`
    SELECT ${sql(column)} AS key, count(*) AS count
    FROM events WHERE type = 'pageview' AND ts >= ${r.from} AND ts < ${r.to}
    GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT ${limit}`;
  return rows.map((x) => ({ key: x.key == null ? "" : String(x.key).trim(), count: num(x.count) }));
}

export async function getBreakdowns(sql: Sql, r: { from: Date; to: Date }) {
  const [pages, referrers, countries, devices, browsers, os, locales] = await Promise.all([
    countBy(sql, r, "path", 12),
    countBy(sql, r, "referrer_domain", 10),
    countBy(sql, r, "country", 10),
    countBy(sql, r, "device", 5),
    countBy(sql, r, "browser", 6),
    countBy(sql, r, "os", 6),
    countBy(sql, r, "locale", 4),
  ]);
  return { pages, referrers, countries, devices, browsers, os, locales };
}

export type ClickRow = { label: string; href: string | null; section: string | null; clicks: number; sessions: number };

export async function getTopClicks(sql: Sql, r: { from: Date; to: Date }, limit = 15): Promise<ClickRow[]> {
  const rows = await sql`
    SELECT label, href, section, count(*) AS clicks, count(DISTINCT session_id) AS sessions
    FROM events WHERE type = 'click' AND ts >= ${r.from} AND ts < ${r.to}
    GROUP BY label, href, section ORDER BY clicks DESC, label LIMIT ${limit}`;
  return rows.map((x) => ({
    label: String(x.label ?? ""),
    href: x.href ? String(x.href) : null,
    section: x.section ? String(x.section) : null,
    clicks: num(x.clicks),
    sessions: num(x.sessions),
  }));
}

export async function getDataSpan(sql: Sql) {
  const [row] = await sql`SELECT min(ts) AS first, count(*) AS total FROM events`;
  return { first: row?.first ? new Date(row.first as string) : null, total: num(row?.total) };
}

// ---------------------------------------------------------------- richieste

export type ContactRequest = {
  id: string;
  created_at: Date;
  updated_at: Date;
  name: string;
  email: string;
  project_type: string;
  message: string;
  locale: string;
  status: "new" | "replied" | "archived";
  keep: boolean;
  email_sent: boolean | null;
};

export async function listRequests(sql: Sql, status: string | null, limit = 200) {
  const where = status ? sql`WHERE status = ${status}` : sql``;
  const rows = await sql<ContactRequest[]>`
    SELECT id::text, created_at, updated_at, name, email, project_type, message, locale, status, keep, email_sent
    FROM contact_requests ${where} ORDER BY created_at DESC LIMIT ${limit}`;
  const counts = await sql`SELECT status, count(*) AS n FROM contact_requests GROUP BY status`;
  const byStatus: Record<string, number> = { new: 0, replied: 0, archived: 0 };
  for (const c of counts) byStatus[String(c.status)] = num(c.n);
  return { rows: [...rows], byStatus };
}

export async function getRequest(sql: Sql, id: string): Promise<ContactRequest | null> {
  if (!/^\d{1,18}$/.test(id)) return null;
  const [row] = await sql<ContactRequest[]>`
    SELECT id::text, created_at, updated_at, name, email, project_type, message, locale, status, keep, email_sent
    FROM contact_requests WHERE id = ${id}`;
  return row ?? null;
}
