import { getSupabase } from '@/lib/supabase'
import { getCurrentPrices } from '@/lib/yahoo'
import { enrichHoldings, calcTotalValue, calcSectorAllocation } from '@/lib/trading'
import type { PortfolioSummary, HoldingWithLive, Trade, DailyAudit, PerformancePoint, Learning, TraderProfile, PendingTrade, DailyAnalysis } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require('yahoo-finance2').default
const yf = new YahooFinanceClass({ suppressNotices: ['yahooSurvey', 'ripHistorical'] })

async function fetchBenchmark(from: string, baseValue: number): Promise<PerformancePoint[]> {
  try {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const rows = await yf.historical('^NSEI', { period1: from, period2: tomorrow.toISOString().split('T')[0], interval: '1d' })
    if (!rows?.length) return []
    // Use first day's OPEN as base — aligns with portfolio starting capital at market open
    const base = rows[0].open ?? rows[0].adjclose ?? rows[0].close ?? 0
    if (!base) return []
    return rows.map((r: { date: Date; open?: number; adjclose?: number; close?: number }) => ({
      date: r.date.toISOString().split('T')[0],
      value: ((r.adjclose ?? r.close ?? base) / base) * baseValue,
    }))
  } catch {
    return []
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

  const [livePrices, benchmarkHistory] = await Promise.all([
    holdings.length > 0
      ? getCurrentPrices(holdings.map((h: { symbol: string }) => h.symbol))
      : Promise.resolve({}),
    fetchBenchmark(portfolio.inception_date, 50000),
  ])

  const enriched = enrichHoldings(holdings, livePrices)
  const totalValue = calcTotalValue(portfolio, enriched)
  const totalPnl = totalValue - 50000
  const totalPnlPct = (totalPnl / 50000) * 100

  // Days since inception
  const inception = new Date(portfolio.inception_date)
  const today = new Date()
  const daysRunning = Math.max(1, Math.floor((today.getTime() - inception.getTime()) / (1000 * 60 * 60 * 24)))

  // Annualised return: (1 + r)^(365/days) - 1
  const annualisedReturn = (Math.pow(1 + totalPnlPct / 100, 365 / daysRunning) - 1) * 100

  // Today's P&L vs yesterday's snapshot
  const snapshots = snapshotsRes.data ?? []
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
