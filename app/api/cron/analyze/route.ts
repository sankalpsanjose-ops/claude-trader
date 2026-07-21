import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getQuotes, DEFAULT_WATCHLIST } from '@/lib/yahoo'
import { runDailyAnalysis, reviseFoxtrotDecisions, loadTraderProfileFromFile } from '@/lib/claude'
import type { AgentOutput } from '@/lib/claude'
import { runTradingTeam } from '@/lib/agents/team'
import { validateDecisions, sanityCheckDecisions } from '@/lib/validator'
import { isTradingDay, isTomorrowTradingDay, getNextTradingDay } from '@/lib/market-calendar'
import { STARTING_CAPITAL } from '@/lib/trading'
import { sendNewsletter } from '@/lib/newsletter'
import { todayIST, offsetDaysIST } from '@/lib/ist'
import type { Holding, Trade, DailyAnalysis } from '@/types'

export const maxDuration = 300

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require('yahoo-finance2').default
const yf = new YahooFinanceClass({ suppressNotices: ['yahooSurvey', 'ripHistorical'] })

async function fetchNiftyClose(): Promise<number | null> {
  try {
    const today = todayIST()
    const yesterday = offsetDaysIST(-1)
    const rows: Array<{ date: Date; close?: number | null }> = await yf.historical(
      '^NSEI',
      { period1: yesterday, period2: today, interval: '1d' },
      { validateResult: false }
    )
    const valid = rows.filter(r => r.close != null).sort((a, b) => b.date.getTime() - a.date.getTime())
    return valid[0]?.close ?? null
  } catch {
    return null
  }
}

async function getActiveProfile(): Promise<string> {
  // Try DB first (updated by monthly reflection), fall back to bundled file
  const { data } = await supabaseAdmin
    .from('trader_profile')
    .select('content')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (data?.content) return data.content

  // First run — seed the DB from the bundled file and return it
  const fileContent = loadTraderProfileFromFile()
  if (fileContent) {
    await supabaseAdmin.from('trader_profile').insert({
      version: 1,
      content: fileContent,
      change_notes: 'Initial profile seeded from docs/trader-profile.md',
    })
  }
  return fileContent
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = todayIST()
  const todayIsTrading = isTradingDay(today)
  const observeOnly = !isTomorrowTradingDay(today)
  const executionDate = getNextTradingDay(today)

  const [portfolioRes, holdingsRes, tradesRes, analysesRes, traderProfile] = await Promise.all([
    supabaseAdmin.from('portfolio').select('*').single(),
    supabaseAdmin.from('holdings').select('*'),
    supabaseAdmin.from('trades').select('*').order('executed_at', { ascending: false }).limit(30),
    supabaseAdmin.from('daily_analyses').select('*').order('date', { ascending: false }).limit(10),
    getActiveProfile(),
  ])

  if (portfolioRes.error) return NextResponse.json({ error: portfolioRes.error.message }, { status: 500 })

  const portfolio = portfolioRes.data
  const holdings: Holding[] = holdingsRes.data ?? []
  const recentTrades: Trade[] = tradesRes.data ?? []
  const pastAnalyses: DailyAnalysis[] = analysesRes.data ?? []

  // Load Claude's last watchlist update so it persists across sessions
  const { data: latestAnalysis } = await supabaseAdmin
    .from('daily_analyses')
    .select('watchlist')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const savedWatchlist: string[] = (latestAnalysis?.watchlist as string[]) ?? []
  const heldSymbols = holdings.map(h => h.symbol)
  const watchlist = [...new Set([...DEFAULT_WATCHLIST, ...savedWatchlist, ...heldSymbols])]
  const [quotes, niftyClose] = await Promise.all([
    getQuotes(watchlist),
    fetchNiftyClose(),
  ])
  const priceMap = Object.fromEntries(quotes.map(q => [q.symbol, q.price]))

  const marketValue = holdings.reduce((sum, h) => {
    return sum + (priceMap[h.symbol] ?? h.current_price) * h.quantity
  }, 0)
  const totalValue = portfolio.cash + marketValue
  const totalPnl = totalValue - STARTING_CAPITAL
  const totalPnlPct = (totalPnl / STARTING_CAPITAL) * 100

  const agentInput = {
    portfolio_cash: portfolio.cash,
    portfolio_total_value: totalValue,
    total_pnl: totalPnl,
    total_pnl_pct: totalPnlPct,
    holdings,
    watchlist_quotes: quotes,
    recent_trades: recentTrades,
    past_analyses: pastAnalyses,
    today_date: today,
    today_is_trading_day: todayIsTrading,
    execution_date: executionDate,
    observe_only: observeOnly,
    traderProfile,
  }

  let analysis: AgentOutput
  try {
    analysis = process.env.USE_TRADING_TEAM === 'true'
      ? await runTradingTeam(agentInput)
      : await runDailyAnalysis(agentInput)
  } catch (e) {
    // Without this, a failed LLM call (e.g. insufficient API credit) throws here
    // and the entire day silently produces zero rows anywhere — no daily_analyses,
    // no audit, no pending trade — leaving no trace that anything went wrong.
    const message = e instanceof Error ? e.message : String(e)
    console.error('[analyze] Analysis failed:', message)
    await supabaseAdmin.from('audits').upsert({
      date: today,
      decisions_raw: [],
      decisions_valid: [],
      rejections: [],
      sanity_passed: false,
      sanity_notes: `Analysis failed: ${message}`,
    })
    return NextResponse.json({ error: 'Analysis failed', detail: message }, { status: 500 })
  }

  let { valid, rejected } = validateDecisions(analysis.decisions, {
    cash: portfolio.cash,
    total_value: totalValue,
    holdings: holdings.map(h => ({ symbol: h.symbol, quantity: h.quantity, buy_price: h.buy_price })),
    prices: priceMap,
  })

  let sanity = await sanityCheckDecisions(valid, priceMap, analysis.journal)

  // If Hotel warns, give Foxtrot one revision pass — no further retries
  if (!sanity.passed && !observeOnly && valid.some(d => d.action !== 'HOLD')) {
    const revised = await reviseFoxtrotDecisions(valid, sanity.notes, traderProfile)
    const reValidated = validateDecisions(revised, {
      cash: portfolio.cash,
      total_value: totalValue,
      holdings: holdings.map(h => ({ symbol: h.symbol, quantity: h.quantity, buy_price: h.buy_price })),
      prices: priceMap,
    })
    valid = reValidated.valid
    rejected = [...rejected, ...reValidated.rejected]
    sanity = await sanityCheckDecisions(valid, priceMap, analysis.journal)
  }

  await Promise.all([
    supabaseAdmin.from('daily_analyses').upsert({
      date: today,
      journal: analysis.journal,
      decisions: valid,
      market_summary: analysis.market_summary,
      watchlist: analysis.watchlist_update ?? [],
      team_brief: analysis.team_brief ?? null,
      agent_reports: analysis.agent_reports ?? null,
    }),
    supabaseAdmin.from('audits').upsert({
      date: today,
      decisions_raw: analysis.decisions,
      decisions_valid: valid,
      rejections: rejected.map(r => ({
        symbol: r.decision.symbol,
        action: r.decision.action,
        quantity: r.decision.quantity,
        reason: r.reason,
      })),
      sanity_passed: sanity.passed,
      sanity_notes: sanity.notes,
    }),
    supabaseAdmin.from('portfolio_snapshots').upsert({
      date: today,
      total_value: totalValue,
      cash: portfolio.cash,
      ...(niftyClose != null ? { nifty_close: niftyClose } : {}),
    }),
    ...(analysis.learning?.insight ? [
      supabaseAdmin.from('learnings').upsert({
        date: today,
        category: analysis.learning.category ?? 'process',
        insight: analysis.learning.insight,
        source: 'daily',
      }),
    ] : []),
  ])

  const tradesToQueue = observeOnly ? [] : valid.filter(d => d.action !== 'HOLD' && d.quantity)
  if (tradesToQueue.length > 0) {
    await supabaseAdmin.from('pending_trades').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const quoteMap = Object.fromEntries(quotes.map(q => [q.symbol, q]))
    await supabaseAdmin.from('pending_trades').insert(
      tradesToQueue.map(d => ({
        symbol: d.symbol,
        name: quoteMap[d.symbol]?.name ?? d.symbol,
        exchange: d.symbol.endsWith('.BO') ? 'BSE' : 'NSE',
        action: d.action,
        quantity: d.quantity!,
        rationale: d.rationale,
      }))
    )
  }

  sendNewsletter({
    date: today,
    marketSummary: analysis.market_summary,
    journal: analysis.journal,
    teamBrief: analysis.team_brief ?? undefined,
    decisions: valid,
    learning: analysis.learning ?? undefined,
    portfolioValue: totalValue,
    totalPnlPct,
    observeOnly,
    executionDate,
  }).catch(() => {})

  return NextResponse.json({
    ok: true,
    date: today,
    observe_only: observeOnly,
    execution_date: executionDate,
    trades_queued: tradesToQueue.length,
    decisions_raw: analysis.decisions.length,
    decisions_valid: valid.length,
    decisions_rejected: rejected.map(r => ({ symbol: r.decision.symbol, reason: r.reason })),
    sanity_check: sanity,
    learning: analysis.learning ?? null,
    journal_preview: analysis.journal.slice(0, 100),
  })
}
