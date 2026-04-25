-- Portfolio (single row, the trader's account)
create table if not exists portfolio (
  id            uuid primary key default gen_random_uuid(),
  cash          numeric not null default 50000,
  total_value   numeric not null default 50000,
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
  created_at  timestamptz not null default now()
);

-- Seed starting portfolio
insert into portfolio (cash, total_value, inception_date)
values (50000, 50000, current_date)
on conflict do nothing;

-- Seed today's snapshot
insert into portfolio_snapshots (date, total_value, cash)
values (current_date, 50000, 50000)
on conflict (date) do nothing;

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
