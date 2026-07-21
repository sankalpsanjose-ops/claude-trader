# Claude Trader

An autonomous AI trading system for Indian equities (NSE/BSE). A six-agent intelligence team analyses markets each evening and queues trades for execution the next morning. All decisions are logged, audited, and reflected on monthly.

**Live dashboard:** https://claude-trader-delta.vercel.app

---

## What it does

1. **Evening analysis** (`/api/cron/analyze`) — six specialist agents file reports, a Portfolio Manager synthesises them into buy/sell/hold decisions, and a Validator + Auditor cross-check everything before trades are queued. If the Auditor warns, the Portfolio Manager sees the exact concerns and gets one revision pass before final queuing.
2. **Morning execution** (`/api/cron/execute`) — queued trades are priced live and executed against the portfolio; Zerodha delivery fees (STT + DP) are deducted.
3. **Monthly reflection** (`/api/cron/reflect`) — Claude reviews the month's trades, learnings, and all Auditor warnings, rewrites the trader profile incorporating lessons from both self-assessment and external audit feedback.

---

## Agent team

| Callsign | Role | Model | Notes |
|----------|------|-------|-------|
| Alpha | Global Markets | Pure TS | Fetches S&P 500, FTSE, Nikkei, crude oil, gold, USD/INR |
| Bravo | Technical Analysis | Pure TS | RSI-14, 20/50-day SMA, 10-day momentum |
| Charlie | News & Geopolitics | Haiku | Headlines, geopolitical risks, macro themes |
| Delta | Fundamental Research | Sonnet | P/E, analyst targets, recommendation consensus |
| Echo | Synthesis / Supervisor | Sonnet | Reconciles all four reports, flags conflicts |
| Foxtrot | Portfolio Manager | Sonnet | Final buy/sell/hold decisions + daily journal |
| Golf | Validator | Pure TS | Hard rules: cash floor, position limits, symbol format |
| Hotel | Auditor | Haiku | Cross-checks decisions against real Yahoo Finance prices |

Alpha and Bravo are pure TypeScript — no LLM call. Golf is also pure TypeScript. Charlie and Hotel use Haiku (speed over depth). Delta, Echo, and Foxtrot use Sonnet.

---

## Tech stack

- **Framework:** Next.js 16 App Router (`force-dynamic` server components)
- **Database:** Supabase (Postgres via REST API)
- **Market data:** Yahoo Finance (`yahoo-finance2`)
- **AI:** Anthropic API (`claude-sonnet-5`, `claude-haiku-4-5`)
- **Hosting:** Vercel (with cron job triggers)

---

## Season 2

Started **1 May 2026** with ₹5,00,000 fresh capital. Season 1 learnings are baked into the trader profile.

- Starting capital: ₹5,00,000
- Cash floor: ₹50,000 (10%)
- Min position size: ₹15,000
- Max single position: 20% of portfolio
- Fees: STT 0.1% on buy + sell; DP ₹15.34 per scrip on delivery sell

---

## Database tables

| Table | Purpose |
|-------|---------|
| `portfolio` | Single-row portfolio state (cash, total value, inception date) |
| `holdings` | Open positions |
| `trades` | Executed trade history |
| `portfolio_snapshots` | Daily EOD portfolio value + Nifty close (used for charts) |
| `daily_analyses` | Agent journal, decisions, market summary per day |
| `audits` | Validator + sanity check results per day |
| `pending_trades` | Trades queued for next morning's execution |
| `learnings` | Lessons extracted from daily and monthly reflection |
| `trader_profile` | Versioned trading rules and sizing guide |

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (cron routes) |
| `CRON_SECRET` | Yes | Bearer token for cron job authorization |
| `STARTING_CAPITAL` | Yes | Starting capital in ₹ (e.g. `500000`) |
| `NIFTY_ANCHOR_DATE` | Yes | Inception date anchor for Nifty chart (e.g. `2026-04-30`) |
| `NIFTY_ANCHOR_CLOSE` | Yes | Nifty close on anchor date (e.g. `23997.55`) |
| `USE_TRADING_TEAM` | No | `true` to use 6-agent team; omit for single-agent mode |
| `LIVE_START_DATE` | No | Date live trading began — draws a reference line on the chart |

---

## Local development

```bash
npm install
# Add all env vars to .env.local
npm run dev
```

Cron routes can be triggered manually:

```bash
# Evening analysis
curl -H "Authorization: Bearer trader-secret-123" http://localhost:3000/api/cron/analyze

# Morning execution
curl -H "Authorization: Bearer trader-secret-123" http://localhost:3000/api/cron/execute
```

---

## Key files

```
app/
  page.tsx                  — Dashboard (server component, force-dynamic)
  api/cron/
    analyze/route.ts        — Evening analysis + trade queuing
    execute/route.ts        — Morning trade execution
    reflect/route.ts        — Monthly reflection

lib/
  agents/                   — Six specialist agents + team orchestrator
  claude.ts                 — Single-agent analysis + Foxtrot prompts
  data.ts                   — getSummary(), getHoldings(), Nifty data fetch
  trading.ts                — STARTING_CAPITAL, fees, enrichHoldings
  yahoo.ts                  — Price fetching via yahoo-finance2
  market-calendar.ts        — NSE holiday calendar + trading day utils
  validator.ts              — Hard trading rule enforcement

docs/
  trader-profile.md         — Active trading rules (also stored in DB)
  changelog.md              — Major system changes
  future-edits.md           — Planned improvements backlog

supabase/
  schema.sql                — Full DB schema
  migrations/               — Incremental migrations (run manually in Supabase SQL editor)
```

---

## Agent pipeline

```
Phase 1 (parallel): Alpha + Bravo + Charlie + Delta
Phase 2:            Echo  — synthesises all four reports, flags conflicts
Phase 3:            Foxtrot — buy/sell/hold decisions + journal
Phase 4:            Golf  — hard rule validation (cash floor, position limits, symbol format)
                    Hotel — price sanity check against live Yahoo Finance data
                      └─ if WARN → Foxtrot revision pass (one retry only)
Output:             Queued trades executed next market open
```

Monthly reflection reads all WARN days from Hotel and incorporates them into the updated trader profile alongside Foxtrot's own daily learnings.

---

## Nifty benchmark data

Nifty closes are stored in `portfolio_snapshots.nifty_close` each evening when the analysis cron runs. This means chart history is permanently safe in the DB — Yahoo Finance is only needed for the anchor close (pre-inception) and today's live close. If Yahoo fails, past data still renders and today extends with yesterday's value.
