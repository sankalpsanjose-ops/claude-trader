-- Daily micro-learnings logged by Claude after each analysis
create table if not exists learnings (
  id          uuid primary key default gen_random_uuid(),
  date        date not null unique,
  category    text not null check (category in ('sizing', 'exits', 'patience', 'sector', 'risk', 'process', 'monthly')),
  insight     text not null,
  source      text not null default 'daily' check (source in ('daily', 'monthly_reflection')),
  created_at  timestamptz not null default now()
);

-- Versioned trader profile — active profile is the most recently inserted row
create table if not exists trader_profile (
  id           uuid primary key default gen_random_uuid(),
  version      integer not null,
  content      text not null,
  change_notes text not null default '',
  created_at   timestamptz not null default now()
);
