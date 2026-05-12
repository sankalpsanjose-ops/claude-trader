import { getSupabase } from '@/lib/supabase'
import { getCurrentPrices } from '@/lib/yahoo'
import { enrichHoldings, calcTotalValue, calcSectorAllocation, STARTING_CAPITAL } from '@/lib/trading'
import { todayIST, offsetDaysIST, dateToIST } from '@/lib/ist'
import type { PortfolioSummary, HoldingWithLive, Trade, DailyAudit, PerformancePoint, Learning, TraderProfile, PendingTrade, DailyAnalysis } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require('yahoo-finance2').default
const yf = new YahooFinanceClass({ suppressNotices: ['yahooSurvey', 'ripHistorical'] })

interface NiftyData {
  benchmark: PerformancePoint[] // scaled to ₹ for comparison chart
  raw: PerformancePoint[]       // actual Nifty index values in points
}

// Hardcoded anchor as last-resort fallback — Apr 30 2026 NSE close
const NIFTY_ANCHOR_DATE = process.env.NIFTY_ANCHOR_DATE ?? '2026-04-30'
const NIFTY_ANCHOR_CLOSE = parseFloat(process.env.NIFTY_ANCHOR_CLOSE ?? '23997.55')

async function fetchNiftyData(
  from: string,
  baseValue: number,
  snapshots: Array<{ date: string; nifty_close?: number | null }>
): Promise<NiftyData> {
  const empty = { benchmark: [], raw: [] }

  // --- Step 1: anchor close (last trading close before `from`) ---
  // Primary: DB snapshot for `from` date stores the anchor close
  // Fallback 1: narrow Yahoo fetch (Apr 26 → from, avoids recent null-close rows)
  // Fallback 2: hardcoded constant
  let baseClose: number = snapshots.find(s => s.date === from)?.nifty_close ?? 0

  if (!baseClose) {
    try {
      const lookback = new Date(from)
      lookback.setUTCDate(lookback.getUTCDate() - 5)
      const anchorRows: Array<{ date: Date; close?: number | null }> = await yf.historical(
        '^NSEI',
        { period1: lookback.toISOString().split('T')[0], period2: from, interval: '1d' },
        { validateResult: false }
      )
      const valid = (anchorRows ?? []).filter(r => r.close != null)
      baseClose = valid[valid.length - 1]?.close ?? 0
    } catch { /* fall through to hardcoded */ }
  }

  if (!baseClose) {
    // Last resort: use hardcoded anchor only if inception date matches
    if (from <= NIFTY_ANCHOR_DATE || NIFTY_ANCHOR_DATE <= from) baseClose = NIFTY_ANCHOR_CLOSE
  }

  if (!baseClose) return empty

  // --- Step 2: build history from DB snapshots (trading days after `from`) ---
  const storedByDate = new Map(
    snapshots
      .filter(s => s.date > from && s.nifty_close != null)
      .map(s => [s.date, s.nifty_close!])
  )

  // --- Step 3: today's close — narrow Yahoo fetch if not yet in DB ---
  const todayStr = todayIST()
  if (!storedByDate.has(todayStr)) {
    try {
      const yesterday = offsetDaysIST(-1)
      const tomorrow = offsetDaysIST(1)
      const recentRows: Array<{ date: Date; close?: number | null }> = await yf.historical(
        '^NSEI',
        { period1: yesterday, period2: tomorrow, interval: '1d' },
        { validateResult: false }
      )
      for (const r of recentRows ?? []) {
        if (r.close != null) {
          const d = dateToIST(r.date)
          if (d > from) storedByDate.set(d, r.close)
        }
      }
    } catch { /* extend with last known value below */ }
  }

  // --- Build output arrays ---
  const benchmark: PerformancePoint[] = [{ date: from, value: baseValue }]
  const raw: PerformancePoint[] = [{ date: from, value: baseClose }]

  for (const [date, close] of [...storedByDate.entries()].sort()) {
    benchmark.push({ date, value: (close / baseClose) * baseValue })
    raw.push({ date, value: close })
  }

  if (raw.length < 2) return empty

  // On non-trading days extend with last known value so chart aligns with portfolio line
  if (raw[raw.length - 1].date < todayStr) {
    benchmark.push({ date: todayStr, value: benchmark[benchmark.length - 1].value })
    raw.push({ date: todayStr, value: raw[raw.length - 1].value })
  }

  return { benchmark, raw }
}

export async function getSummary(): Promise<PortfolioSummary | null> {
  const supabase = getSupabase()
  const [portfolioRes, holdingsRes, snapshotsRes, analysisRes] = await Promise.all([
    supabase.from('portfolio').select('*').single(),
    supabase.from('holdings').select('*'),
    supabase.from('portfolio_snapshots').select('*').order('date', { ascending: true }),
    supabase.from('daily_analyses').select('*').order('date', { ascending: false }).limit(1).maybeSingle(),
  ])

  if (portfolioRes.error || !portfolioRes.data) return null

  const portfolio = portfolioRes.data
  const holdings = holdingsRes.data ?? []

  const [livePrices, niftyData] = await Promise.all([
    holdings.length > 0
      ? getCurrentPrices(holdings.map((h: { symbol: string }) => h.symbol))
      : Promise.resolve({}),
    fetchNiftyData(portfolio.inception_date, STARTING_CAPITAL, snapshotsRes.data ?? []),
  ])
  const { benchmark: benchmarkHistory, raw: niftyRawHistory } = niftyData

  const enriched = enrichHoldings(holdings, livePrices)
  const totalValue = calcTotalValue(portfolio, enriched)
  const totalPnl = totalValue - STARTING_CAPITAL
  const totalPnlPct = (totalPnl / STARTING_CAPITAL) * 100

  // Days since inception
  const inception = new Date(portfolio.inception_date)
  const daysRunning = Math.max(1, Math.floor((Date.now() - inception.getTime()) / (1000 * 60 * 60 * 24)))

  // Annualised return: (1 + r)^(365/days) - 1
  const annualisedReturn = (Math.pow(1 + totalPnlPct / 100, 365 / daysRunning) - 1) * 100

  // Today's P&L vs yesterday's snapshot
  const snapshots: Array<{ date: string; total_value: number; nifty_close?: number | null }> = snapshotsRes.data ?? []
  const yesterday = snapshots.at(-1)
  const todayPnl = yesterday ? totalValue - yesterday.total_value : 0

  // Performance history: use snapshots + inject today's live value as final point
  const todayStr = todayIST()
  const history = snapshots
    .filter((s: { date: string }) => s.date >= portfolio.inception_date)
    .map((s: { date: string; total_value: number }) => ({ date: s.date, value: s.total_value }))
  if (history.at(-1)?.date !== todayStr) {
    history.push({ date: todayStr, value: totalValue })
  } else {
    history[history.length - 1] = { date: todayStr, value: totalValue }
  }

  return {
    portfolio: { ...portfolio, total_value: totalValue },
    total_invested: enriched.reduce((s: number, h: HoldingWithLive) => s + h.invested, 0),
    market_value: enriched.reduce((s: number, h: HoldingWithLive) => s + h.current_value, 0),
    total_pnl: totalPnl,
    total_pnl_pct: totalPnlPct,
    annualised_return: annualisedReturn,
    days_running: daysRunning,
    today_pnl: todayPnl,
    open_positions: holdings.length,
    sector_allocation: calcSectorAllocation(enriched, portfolio.cash),
    performance_history: history,
    benchmark_history: benchmarkHistory,
    nifty_raw_history: niftyRawHistory,
    latest_analysis: analysisRes.data ?? null,
  }
}

export async function getHoldings(): Promise<HoldingWithLive[]> {
  const supabase = getSupabase()
  const { data: holdings } = await supabase.from('holdings').select('*')
  if (!holdings?.length) return []
  const livePrices = await getCurrentPrices(holdings.map((h: { symbol: string }) => h.symbol))
  return enrichHoldings(holdings, livePrices).sort((a: HoldingWithLive, b: HoldingWithLive) => b.pnl_pct - a.pnl_pct)
}

export async function getTrades(): Promise<Trade[]> {
  const supabase = getSupabase()
  const { data } = await supabase.from('trades').select('*').order('executed_at', { ascending: false })
  return data ?? []
}

export async function getAudits(): Promise<DailyAudit[]> {
  const supabase = getSupabase()
  const { data } = await supabase.from('audits').select('*').order('date', { ascending: false })
  return data ?? []
}

export async function getLearnings(): Promise<Learning[]> {
  const supabase = getSupabase()
  const { data } = await supabase.from('learnings').select('*').order('date', { ascending: false })
  return data ?? []
}

export async function getPendingTrades(): Promise<PendingTrade[]> {
  const supabase = getSupabase()
  const { data } = await supabase.from('pending_trades').select('*').order('decided_at', { ascending: true })
  return data ?? []
}

export async function getTraderProfiles(): Promise<TraderProfile[]> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('trader_profile')
    .select('*')
    .order('version', { ascending: false })
  return data ?? []
}

export async function getAnalyses(): Promise<DailyAnalysis[]> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('daily_analyses')
    .select('*')
    .order('date', { ascending: false })
    .limit(30)
  return data ?? []
}

export async function getActiveTraderProfile(): Promise<TraderProfile | null> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('trader_profile')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ?? null
}
