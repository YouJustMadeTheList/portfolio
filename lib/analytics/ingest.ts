import "server-only";
import type { Sql } from "@/lib/db";
import { ANONYMOUS_EVENT_TYPES, type TrackPayload } from "./payload";
import type { DeviceInfo } from "./request-meta";

type Meta = DeviceInfo & { country: string | null };

type EventRow = {
  type: string;
  consented: boolean;
  session_id: string | null;
  path: string;
  locale: string | null;
  section: string | null;
  section_index: number | null;
  label: string | null;
  href: string | null;
  dwell_ms: number | null;
  value: number | null;
  referrer_domain: string | null;
  country: string | null;
  device: string;
  browser: string;
  os: string;
  viewport: string | null;
};

/** Normalizza l'href di un click: niente query string, niente indirizzi email. */
function cleanHref(h: string | undefined): string | null {
  if (!h) return null;
  if (/^mailto:/i.test(h)) return "mailto:";
  if (/^tel:/i.test(h)) return "tel:";
  return h.replace(/[?].*$/, "").slice(0, 200) || null;
}

/** "/it/privacy" -> "/privacy", "/en" -> "/": la lingua ha la sua colonna. */
export function normalizePath(raw: string): string {
  const clean = raw.split(/[?#]/)[0]!.slice(0, 200).replace(/\/+$/, "");
  const stripped = clean.replace(/^\/(it|en)(?=\/|$)/, "");
  return stripped || "/";
}

export async function ingest(sql: Sql, p: TrackPayload, meta: Meta): Promise<void> {
  const consented = p.c && Boolean(p.vid && p.sid);
  const events = consented ? p.e : p.e.filter((e) => ANONYMOUS_EVENT_TYPES.has(e.t));
  if (events.length === 0) return;

  const sessionId = consented ? p.sid! : null;
  const base = {
    consented,
    session_id: sessionId,
    path: normalizePath(p.path),
    locale: p.locale ?? null,
    referrer_domain: p.ref?.toLowerCase() ?? null,
    country: meta.country,
    device: meta.device,
    browser: meta.browser,
    os: meta.os,
    viewport: p.vp ?? null,
  };

  const rows: EventRow[] = events.map((e) => {
    const row: EventRow = {
      ...base,
      type: e.t,
      section: null,
      section_index: null,
      label: null,
      href: null,
      dwell_ms: null,
      value: null,
    };
    switch (e.t) {
      case "section_view":
      case "section_dwell":
        row.section = e.s.toLowerCase();
        row.section_index = e.i;
        row.dwell_ms = e.d;
        break;
      case "click":
        row.label = e.l.slice(0, 80) || "(senza testo)";
        row.href = cleanHref(e.h);
        row.section = e.s ? e.s.toLowerCase().slice(0, 40) : null;
        break;
      case "scroll_depth":
        row.value = e.p;
        break;
      case "session_end":
        row.value = e.d;
        break;
    }
    return row;
  });

  await sql.begin(async (tx) => {
    if (consented) {
      const pageviews = events.filter((e) => e.t === "pageview").length;
      const clicks = events.filter((e) => e.t === "click").length;
      const sections = events.filter((e) => e.t === "section_view").length;
      const maxScroll = Math.max(0, ...events.map((e) => (e.t === "scroll_depth" ? e.p : 0)));
      const duration = Math.max(0, ...events.map((e) => (e.t === "session_end" ? e.d : 0)));

      await tx`
        INSERT INTO visitors (id) VALUES (${p.vid!})
        ON CONFLICT (id) DO UPDATE SET last_seen = now()`;

      await tx`
        INSERT INTO sessions (id, visitor_id, is_returning, entry_path, referrer_domain, country,
                              device, browser, os, locale, viewport)
        VALUES (${sessionId}, ${p.vid!},
                EXISTS (SELECT 1 FROM sessions s WHERE s.visitor_id = ${p.vid!}),
                ${base.path}, ${base.referrer_domain}, ${meta.country},
                ${meta.device}, ${meta.browser}, ${meta.os}, ${base.locale}, ${base.viewport})
        ON CONFLICT (id) DO NOTHING`;

      // Il WHERE sul visitor impedisce di "agganciarsi" a una sessione altrui.
      const updated = await tx`
        UPDATE sessions SET
          last_seen_at    = now(),
          pageviews       = pageviews + ${pageviews},
          clicks          = clicks + ${clicks},
          sections_viewed = sections_viewed + ${sections},
          max_scroll      = GREATEST(max_scroll, ${maxScroll}),
          duration_ms     = GREATEST(duration_ms, ${duration})
        WHERE id = ${sessionId} AND visitor_id = ${p.vid!}`;
      if (updated.count === 0) return; // sessione di un altro visitatore: scarta
    }

    await tx`INSERT INTO events ${tx(rows)}`;
  });
}
