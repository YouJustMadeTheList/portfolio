-- Schema del database del sito (PostgreSQL >= 13).
-- Idempotente: ogni istruzione usa IF NOT EXISTS, quindi `npm run db:migrate`
-- si puo' rilanciare a ogni deploy senza effetti collaterali.
--
-- Principi privacy (vedi content/legal.ts):
--   * nessun indirizzo IP viene mai salvato, in nessuna tabella;
--   * gli eventi anonimi (senza consenso) hanno session_id NULL e consented = false;
--   * visitor_id / session_id sono UUID casuali generati nel browser SOLO dopo il consenso.

CREATE TABLE IF NOT EXISTS visitors (
  id           uuid PRIMARY KEY,
  first_seen   timestamptz NOT NULL DEFAULT now(),
  last_seen    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS visitors_last_seen_idx ON visitors (last_seen);

CREATE TABLE IF NOT EXISTS sessions (
  id               uuid PRIMARY KEY,
  visitor_id       uuid NOT NULL REFERENCES visitors (id) ON DELETE CASCADE,
  started_at       timestamptz NOT NULL DEFAULT now(),
  last_seen_at     timestamptz NOT NULL DEFAULT now(),
  is_returning     boolean NOT NULL DEFAULT false,
  entry_path       text,
  referrer_domain  text,
  country          char(2),
  device           text,
  browser          text,
  os               text,
  locale           text,
  viewport         text,
  pageviews        integer NOT NULL DEFAULT 0,
  clicks           integer NOT NULL DEFAULT 0,
  sections_viewed  integer NOT NULL DEFAULT 0,
  max_scroll       smallint NOT NULL DEFAULT 0,
  duration_ms      integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS sessions_started_at_idx ON sessions (started_at);
CREATE INDEX IF NOT EXISTS sessions_visitor_idx ON sessions (visitor_id, started_at);

-- Tipi evento:
--   pageview       caricamento di una pagina
--   section_view   una sezione e' rimasta visibile >= 1s (una volta per pagina vista); dwell_ms = permanenza fino al primo invio
--   section_dwell  permanenza aggiuntiva sulla stessa sezione, inviata ai flush successivi
--   click          click su link/bottone/[data-track] (solo con consenso)
--   scroll_depth   profondita' massima di scroll in % (solo con consenso)
--   session_end    durata della sessione in ms (solo con consenso)
CREATE TABLE IF NOT EXISTS events (
  id               bigserial PRIMARY KEY,
  ts               timestamptz NOT NULL DEFAULT now(),
  type             text NOT NULL CHECK (type IN ('pageview','section_view','section_dwell','click','scroll_depth','session_end')),
  consented        boolean NOT NULL DEFAULT false,
  session_id       uuid REFERENCES sessions (id) ON DELETE CASCADE,
  path             text NOT NULL,
  locale           text,
  section          text,
  section_index    smallint,
  label            text,
  href             text,
  dwell_ms         integer,
  value            integer,
  referrer_domain  text,
  country          char(2),
  device           text,
  browser          text,
  os               text,
  viewport         text,
  CONSTRAINT events_anon_no_session CHECK (consented OR session_id IS NULL)
);
CREATE INDEX IF NOT EXISTS events_ts_idx ON events (ts);
CREATE INDEX IF NOT EXISTS events_type_ts_idx ON events (type, ts);
CREATE INDEX IF NOT EXISTS events_session_idx ON events (session_id) WHERE session_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS contact_requests (
  id            bigserial PRIMARY KEY,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  name          text NOT NULL,
  email         text NOT NULL,
  project_type  text NOT NULL,
  message       text NOT NULL,
  locale        text NOT NULL,
  status        text NOT NULL DEFAULT 'new' CHECK (status IN ('new','replied','archived')),
  -- keep = true: la richiesta e' diventata un rapporto (preventivo/contratto) e
  -- non va cancellata dalla purge automatica dei 24 mesi.
  keep          boolean NOT NULL DEFAULT false,
  email_sent    boolean
);
CREATE INDEX IF NOT EXISTS contact_requests_created_idx ON contact_requests (created_at);
CREATE INDEX IF NOT EXISTS contact_requests_status_idx ON contact_requests (status, created_at);

CREATE TABLE IF NOT EXISTS admin_users (
  id             serial PRIMARY KEY,
  email          text NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash  text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_login_at  timestamptz,
  disabled       boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id            bigserial PRIMARY KEY,
  token_hash    text NOT NULL UNIQUE,
  user_id       integer NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_sessions_expires_idx ON admin_sessions (expires_at);
