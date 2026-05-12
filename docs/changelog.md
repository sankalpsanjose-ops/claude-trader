# Changelog

Major changes to the trading system, newest first.

---

## 2026-05-08

### Watchlist expanded to Nifty Next 50
`DEFAULT_WATCHLIST` in `lib/yahoo.ts` expanded from 40 Nifty 50 stocks to 70 stocks by adding 30 Nifty Next 50 names. Rationale: pure Nifty 50 trading sets a low ceiling on alpha — the index already owns the same stocks. Nifty Next 50 stocks have more analyst blind spots, higher beta, and are accessible at ₹5L portfolio size where institutions can't build meaningful positions.

Added: ZOMATO, TRENT, APOLLOHOSP, DMART, SIEMENS, HAVELLS, PIDILITIND, DABUR, MARICO, GODREJCP, COLPAL, BERGEPAINT, MUTHOOTFIN, TORNTPHARM, LUPIN, DLF, GODREJPROP, OBEROIRLTY, IRCTC, NAUKRI, POLYCAB, PERSISTENT, LTIM, OFSS, PIIND, CHOLAFIN, SBICARD, HDFCLIFE, SBILIFE, TATACONSUM.

Performance vs Nifty 50 to be reviewed after one week (2026-05-15).

---

## 2026-05-07 (continued)

### Ask KingPin — RAG chat feature
New "Ask" tab on the dashboard lets viewers chat directly with KingPin about its trades, holdings, strategy, and reasoning. Architecture:
- `/api/chat` (POST) — two-tier LLM pipeline: Haiku topic gate first (blocks off-topic questions cheaply), then Sonnet answers grounded in live DB context.
- RAG context: 6 parallel DB queries (portfolio, holdings, last 10 trades, last 5 journals, last 5 learnings, trader profile excerpt) assembled into a structured snapshot passed to Sonnet.
- IP rate limit: 10 questions per IP per hour, tracked in new `ask_rate_limits` table. IPs stored as SHA-256 hashes. Stale rows cleaned up inline on each request.
- KingPin persona: strict rules — only speaks from data provided, never gives investment advice, never fabricates figures.
- `components/dashboard/AskTab.tsx`: self-contained client component, no props. Chat bubbles, animated loading dots, dismissible error bar, 500-char input limit with amber/red counter.

Requires migration `008_ask_rate_limits.sql`:
```sql
CREATE TABLE IF NOT EXISTS ask_rate_limits (ip_hash text, asked_at timestamptz DEFAULT now());
CREATE INDEX IF NOT EXISTS ask_rate_limits_ip_hash_asked_at_idx ON ask_rate_limits (ip_hash, asked_at);
```

### Hotel audit warnings fed into monthly reflection
Monthly reflection (`/api/cron/reflect`) now fetches all WARN days from the `audits` table and passes them as a distinct section — separate from Foxtrot's self-generated learnings. The reflection can now synthesise both perspectives (Foxtrot's own insights + Hotel's external audit flags) when rewriting the trader profile each month. Reflection `max_tokens` raised 4,000 → 6,000 to handle the larger input.

### Hotel → Foxtrot feedback loop
When Hotel (sanity check) warns, Foxtrot now receives the exact warning notes and gets one revision pass before trades are queued. Foxtrot can revise quantity, strengthen rationale, or drop the trade. Golf and Hotel re-run on the revised decisions. No further retries — whatever comes out of the second pass gets queued regardless.

### Pipeline flow added to Strategy tab
New "How it works" section in the Strategy tab shows the full 4-phase pipeline visually: Intelligence (Alpha/Bravo/Charlie/Delta in parallel) → Synthesis (Echo) → Decision (Foxtrot) → Validation (Golf → Hotel) → Queue. Includes callout cards explaining the Hotel feedback loop, Golf's hard gates, and solo vs team mode.

### Echo max_tokens raised 3000 → 6000
Echo receives the combined output of all four specialist agents — 3,000 tokens was too low, causing truncated JSON and silent fallback to "Intelligence synthesis unavailable" on May 5. Now on Sonnet with 6,000 tokens and logs the stop_reason if it still fails.

---

## 2026-05-07

### Nifty data made persistent — DB-first architecture
Nifty closes are now stored in `portfolio_snapshots.nifty_close` and used as the primary source for charts. Yahoo Finance is only needed for the anchor close (pre-inception, narrow date range) and today's live close.

Root cause of today's outage: Yahoo Finance returns `close: null` for recent dates when queried over a wide date range, causing the `yahoo-finance2` library to throw a validation error even with `validateResult: false`. The fix: two narrow fetches instead of one wide one, plus DB-first for all past days.

Three-layer fallback for the anchor close:
1. `portfolio_snapshots.nifty_close` for the inception date row
2. Narrow Yahoo fetch (Apr 26 → May 1 only — clean historical data)
3. Hardcoded `NIFTY_ANCHOR_CLOSE` env var (23,997.55)

Past Nifty closes backfilled directly to DB: May 1 (23,997.55), May 4 (24,119.30), May 5 (24,032.80), May 6 (24,330.95).

Requires migration `007_nifty_close.sql`:
```sql
ALTER TABLE portfolio_snapshots ADD COLUMN IF NOT EXISTS nifty_close numeric;
```

### Strategy tab agent model labels corrected
Delta and Echo were still showing "Haiku" after yesterday's upgrade. Labels and badge colours updated to Sonnet (purple).

---

## 2026-05-06

### Agents Delta & Echo upgraded to Sonnet
Delta (Fundamental Research) and Echo (Synthesis/Supervisor) upgraded from `claude-haiku-4-5` to `claude-sonnet-4-6`. Charlie (News & Sentiment) remains on Haiku — speed over depth for news volume. Alpha, Bravo, and Foxtrot were already on Sonnet.

Full agent model lineup:
| Agent | Role | Model |
|-------|------|-------|
| Alpha | Global Markets | claude-sonnet-4-6 |
| Bravo | Technical Analysis | claude-sonnet-4-6 |
| Charlie | News & Sentiment | claude-haiku-4-5 |
| Delta | Fundamental Research | claude-sonnet-4-6 |
| Echo | Synthesis / Supervisor | claude-sonnet-4-6 |
| Foxtrot | Portfolio Manager / Decisions | claude-sonnet-4-6 |

### Nifty 50 Index chart — % growth view
Raw Nifty chart switched from absolute index values to % growth from the Apr 30 anchor (23,997.55). Y-axis shows ±%, tooltip shows both % and absolute value. Reference line at 0%.

### Nifty benchmark data stored in DB
`portfolio_snapshots.nifty_close` column added (migration `007`). Analysis cron now saves Nifty close alongside each daily portfolio snapshot. Future Yahoo Finance outages will only affect today's data at worst.

---

## 2026-05-05

### Nifty chart alignment fixed
Both Claude and Nifty lines now start at May 1 on the "vs Nifty 50" comparison chart. Previously Nifty started from Apr 30 (one day early) because the inception date was set to Apr 30. Inception date corrected to May 1; `fetchNiftyData` now uses Apr 30 close as the base and outputs from May 1 onwards.

### Raw Nifty 50 Index chart added
New full-width chart below the sector + performance row showing Nifty 50 index movement since inception. Separate from the comparison chart.

### Union-of-dates fix for PerformanceChart
Previously the comparison chart only used portfolio snapshot dates to build the x-axis. On non-trading days (May 1–3) portfolio had snapshots but Nifty had no data, leaving the Nifty line invisible. Fixed by building the x-axis from the union of both date sets.

### Journal truncation fixed
`max_tokens` in Foxtrot's prompt raised from 4,000 to 8,192. Previously the sanity check notes were being cut off mid-sentence.

---

## 2026-05-01

### Season 2 started — ₹5,00,000 fresh capital
Season 1 holdings closed, portfolio reset to ₹5,00,000 starting capital. Key changes:
- `STARTING_CAPITAL` now an env var (500000)
- `MIN_CASH_RESERVE` set to 10% (₹50,000)
- Zerodha delivery fees added: STT 0.1% on buy + sell, DP ₹15.34 per sell
- Trader profile updated with Season 2 sizing guide and handoff notes from Season 1 learnings
- Inception date set to 2026-05-01
