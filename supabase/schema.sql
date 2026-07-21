-- Full DB schema, consolidated through migrations/011_user_intel.sql.
-- This file bootstraps a NEW environment in one shot. For an EXISTING database,
-- keep applying migrations/*.sql in order instead — this file is not itself a
-- migration and re-running it against a live DB will re-seed the portfolio.

-- Portfolio (single row, the trader's account)
create table if not exists portfolio (
  id            uuid primary key default gen_random_uuid(),
  cash          numeric not null default 500000,
  total_value   numeric not null default 500000,
  inception_date date not null default current_date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Current open holdings
create table if not exists holdings (
  id            uuid primary key default gen_random_uuid(),
  symbol        text not null,
  name          text not null,
  exchange      text not null check (exchange in ('NSE', 'BSE')),
  quantity      integer not null check (quantity > 0),
  buy_price     numeric not null,
  buy_date      date not null,
  current_price numeric not null,
  updated_at    timestamptz not null default now()
);

-- Full trade history
create table if not exists trades (
  id            uuid primary key default gen_random_uuid(),
  symbol        text not null,
  name          text not null,
  exchange      text not null check (exchange in ('NSE', 'BSE')),
  action        text not null check (action in ('BUY', 'SELL')),
  quantity      integer not null check (quantity > 0),
  price         numeric not null,
  total_value   numeric not null,
  realised_pnl  numeric,
  rationale     text not null,
  executed_at   timestamptz not null default now()
);

-- Claude's daily end-of-day analysis
create table if not exists daily_analyses (
  id              uuid primary key default gen_random_uuid(),
  date            date not null unique,
  journal         text not null,
  decisions       jsonb not null default '[]',
  market_summary  text not null,
  watchlist       jsonb default '[]'::jsonb,  -- 003_watchlist.sql
  team_brief      text,                       -- 004_team_brief.sql
  agent_reports   jsonb,                      -- 005_agent_reports.sql
  created_at      timestamptz not null default now()
);

-- Pending trades queued by evening analysis, executed next morning
create table if not exists pending_trades (
  id            uuid primary key default gen_random_uuid(),
  symbol        text not null,
  name          text not null,
  exchange      text not null check (exchange in ('NSE', 'BSE')),
  action        text not null check (action in ('BUY', 'SELL')),
  quantity      integer not null check (quantity > 0),
  rationale     text not null,
  decided_at    timestamptz not null default now()
);

-- Portfolio value snapshots for the performance chart
create table if not exists portfolio_snapshots (
  id          uuid primary key default gen_random_uuid(),
  date        date not null unique,
  total_value numeric not null,
  cash        numeric not null,
  nifty_close numeric,  -- 007_nifty_close.sql
  created_at  timestamptz not null default now()
);

-- Daily audit log: validator results + sanity check per trading day
create table if not exists audits (
  id              uuid primary key default gen_random_uuid(),
  date            date not null unique,
  decisions_raw   jsonb not null default '[]',
  decisions_valid jsonb not null default '[]',
  rejections      jsonb not null default '[]',
  sanity_passed   boolean not null default true,
  sanity_notes    text not null default '',
  created_at      timestamptz not null default now()
);

-- Daily micro-learnings logged by Claude after each analysis, plus monthly reflections
-- (002_learnings.sql)
create table if not exists learnings (
  id          uuid primary key default gen_random_uuid(),
  date        date not null unique,
  category    text not null check (category in ('sizing', 'exits', 'patience', 'sector', 'risk', 'process', 'monthly')),
  insight     text not null,
  source      text not null default 'daily' check (source in ('daily', 'monthly_reflection')),
  created_at  timestamptz not null default now()
);

-- Versioned trader profile — active profile is the most recently inserted row
-- (002_learnings.sql)
create table if not exists trader_profile (
  id           uuid primary key default gen_random_uuid(),
  version      integer not null,
  content      text not null,
  change_notes text not null default '',
  created_at   timestamptz not null default now()
);

-- Per-IP rate limiting for the Ask tab (/api/chat) — 10 questions/IP/hour
-- (008_ask_rate_limits.sql)
create table if not exists ask_rate_limits (
  ip_hash   text,
  asked_at  timestamptz default now()
);
create index if not exists ask_rate_limits_ip_hash_asked_at_idx on ask_rate_limits (ip_hash, asked_at);

-- Newsletter subscribers (009_subscribers.sql)
create table if not exists subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             text unique not null,
  subscribed_at     timestamptz default now(),
  unsubscribe_token text not null default encode(gen_random_bytes(32), 'hex')
);
create index if not exists subscribers_email_idx on subscribers (email);
create index if not exists subscribers_token_idx on subscribers (unsubscribe_token);

-- Charlie's persistent macro intelligence document — single row, id fixed at 1
-- (010_macro_context.sql)
create table if not exists macro_context (
  id         integer primary key default 1,
  content    text not null default '',
  updated_at timestamptz default now()
);
insert into macro_context (id, content) values (1, '') on conflict (id) do nothing;

-- Ad-hoc intelligence notes submitted by the portfolio manager for Agent India
-- (011_user_intel.sql)
create table if not exists user_intel (
  id         uuid primary key default gen_random_uuid(),
  note       text not null,
  created_at timestamptz default now()
);

-- Seed starting portfolio — Season 2 capital (₹5,00,000)
insert into portfolio (cash, total_value, inception_date)
values (500000, 500000, current_date)
on conflict do nothing;

-- Seed today's snapshot
insert into portfolio_snapshots (date, total_value, cash)
values (current_date, 500000, 500000)
on conflict (date) do nothing;
