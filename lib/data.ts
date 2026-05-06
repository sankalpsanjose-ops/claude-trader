import { getSupabase } from '@/lib/supabase'
import { getCurrentPrices } from '@/lib/yahoo'
import { enrichHoldings, calcTotalValue, calcSectorAllocation, STARTING_CAPITAL } from '@/lib/trading'
import type { PortfolioSummary, HoldingWithLive, Trade, DailyAudit, PerformancePoint, Learning, TraderProfile, PendingTrade, DailyAnalysis } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require('yahoo-finance2').default
const yf = new YahooFinanceClass({ suppressNotices: ['yahooSurvey', 'ripHistorical'] })

interface NiftyData {
  benchmark: PerformancePoint[] // scaled to ₹ for comparison chart
  raw: PerformancePoint[]       // actual Nifty index values in points
}

async function fetchNiftyData(
  from: string,
  baseValue: number,
  snapshots: Array<{ date: string; nifty_close?: number | null }>
): Promise<NiftyData> {
  const empty = { benchmark: [], raw: [] }
  try {
    // Fetch from 5 days before `from` to get the anchor close (the last trading close before our start date)
    const lookback = new Date(from)
    lookback.setUTCDate(lookback.getUTCDate() - 5)
    const tomorrow = new Date()
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

    const rows: Array<{ date: Date; close?: number | null }> = await yf.historical(
      '^NSEI',
      { period1: lookback.toISOString().split('T')[0], period2: tomorrow.toISOString().split('T')[0], interval: '1d' },
      { validateResult: false }
    )

    // Find anchor: last valid close on or before `from`
    const anchorRows = (rows ?? []).filter(r => r.close != null && r.date.toISOString().split('T')[0] <= from)
    if (!anchorRows.length) return empty
    const baseClose = anchorRows[anchorRows.length - 1].close!
    if (!baseClose) return empty

    // Build history: start with anchor point, then fill from stored DB closes
    const benchmark: PerformancePoint[] = [{ date: from, value: baseValue }]
    const raw: PerformancePoint[] = [{ date: from, value: baseClose }]

    // Use stored Nifty closes from snapshots for all days after `from`
    const storedByDate = new Map(
      snapshots
        .filter(s => s.date > from && s.nifty_close != null)
        .map(s => [s.date, s.nifty_close!])
    )

    // Also collect any Yahoo rows after `from` that aren't in stored data (fills today if cron hasn't run)
    const yahooByDate = new Map(
      (rows ?? [])
        .filter(r => r.close != null)
        .map(r => [r.date.toISOString().split('T')[0], r.close!])
    )

    // Union of all dates after `from`, prefer stored over Yahoo
    const allDatesAfter = [...new Set([...storedByDate.keys(), ...yahooByDate.keys()])]
      .filter(d => d > from)
      .sort()

    for (const date of allDatesAfter) {
      const close = storedByDate.get(date) ?? yahooByDate.get(date)!
      benchmark.push({ date, value: (close / baseClose) * baseValue })
      raw.push({ date, value: close })
    }

    if (raw.length < 2) return empty

    // On non-trading days extend with last known value so chart aligns with portfolio line
    const todayStr = new Date().toISOString().split('T')[0]
    if (raw[raw.length - 1].date < todayStr) {
      benchmark.push({ date: todayStr, value: benchmark[benchmark.length - 1].value })
      raw.push({ date: todayStr, value: raw[raw.length - 1].value })
    }

    return { benchmark, raw }
  } catch {
    return empty
  }
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
  const today = new Date()
  const daysRunning = Math.max(1, Math.floor((today.getTime() - inception.getTime()) / (1000 * 60 * 60 * 24)))

  // Annualised return: (1 + r)^(365/days) - 1
  const annualisedReturn = (Math.pow(1 + totalPnlPct / 100, 365 / daysRunning) - 1) * 100

  // Today's P&L vs yesterday's snapshot
  const snapshots: Array<{ date: string; total_value: number; nifty_close?: number | null }> = snapshotsRes.data ?? []
  const yesterday = snapshots.at(-1)
  const todayPnl = yesterday ? totalValue - yesterday.total_value : 0

  // Performance history: use snapshots + inject today's live value as final point
  const todayStr = today.toISOString().split('T')[0]
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
