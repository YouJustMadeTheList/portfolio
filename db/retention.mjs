// Fonte UNICA dei periodi di conservazione. Importata da:
//   - lib/analytics/purge.ts   (route /api/cron/purge)
//   - scripts/db-purge.mjs     (npm run db:purge)
//   - content/legal.ts         (i numeri citati nella privacy policy)
// Se cambi un valore qui, la policy si aggiorna da sola.

export const RETENTION = {
  /** Eventi analytics (anonimi e con consenso). */
  analyticsMonths: 13,
  /** Sessioni e visitatori: cancellati 13 mesi dopo l'ultima attivita'. */
  sessionsMonths: 13,
  /** Richieste di contatto non contrassegnate come "da conservare". */
  contactMonths: 24,
  /** Durata della scelta sui cookie prima di riproporre il banner. */
  consentMonths: 6,
  /** Durata della sessione admin. */
  adminSessionDays: 7,
};

/**
 * Istruzioni di purge, in ordine. Parametri fissi (nessun input utente).
 * @type {{ label: string, sql: string }[]}
 */
export const PURGE_STATEMENTS = [
  {
    label: "events",
    sql: `DELETE FROM events WHERE ts < now() - interval '${RETENTION.analyticsMonths} months'`,
  },
  {
    label: "sessions",
    sql: `DELETE FROM sessions WHERE last_seen_at < now() - interval '${RETENTION.sessionsMonths} months'`,
  },
  {
    label: "visitors",
    sql: `DELETE FROM visitors v WHERE v.last_seen < now() - interval '${RETENTION.sessionsMonths} months'
          AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.visitor_id = v.id)`,
  },
  {
    label: "contact_requests",
    sql: `DELETE FROM contact_requests WHERE keep = false AND created_at < now() - interval '${RETENTION.contactMonths} months'`,
  },
  {
    label: "admin_sessions",
    sql: `DELETE FROM admin_sessions WHERE expires_at < now()`,
  },
];
