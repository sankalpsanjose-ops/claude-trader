import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getQuotes, DEFAULT_WATCHLIST } from '@/lib/yahoo'
import { runDailyAnalysis, loadTraderProfileFromFile } from '@/lib/claude'
import { runTradingTeam } from '@/lib/agents/team'
import { validateDecisions, sanityCheckDecisions } from '@/lib/validator'
import type { Holding, Trade, DailyAnalysis } from '@/types'

export const maxDuration = 300

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

  const today = new Date().toISOString().split('T')[0]

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

  const heldSymbols = holdings.map(h => h.symbol)
  const watchlist = [...new Set([...DEFAULT_WATCHLIST, ...heldSymbols])]
  const quotes = await getQuotes(watchlist)
  const priceMap = Object.fromEntries(quotes.map(q => [q.symbol, q.price]))

  const marketValue = holdings.reduce((sum, h) => {
    return sum + (priceMap[h.symbol] ?? h.current_price) * h.quantity
  }, 0)
  const totalValue = portfolio.cash + marketValue
  const totalPnl = totalValue - 50000
  const totalPnlPct = (totalPnl / 50000) * 100

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
    traderProfile,
  }

  const analysis = process.env.USE_TRADING_TEAM === 'true'
    ? await runTradingTeam(agentInput)
    : await runDailyAnalysis(agentInput)

  const { valid, rejected } = validateDecisions(analysis.decisions, {
    cash: portfolio.cash,
    total_value: totalValue,
    holdings: holdings.map(h => ({ symbol: h.symbol, quantity: h.quantity, buy_price: h.buy_price })),
    prices: priceMap,
  })

  const sanity = await sanityCheckDecisions(valid, priceMap, analysis.journal)

  await Promise.all([
    supabaseAdmin.from('daily_analyses').upsert({
      date: today,
      journal: analysis.journal,
      decisions: valid,
      market_summary: analysis.market_summary,
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

  const tradesToQueue = valid.filter(d => d.action !== 'HOLD' && d.quantity)
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

  return NextResponse.json({
    ok: true,
    date: today,
    decisions_raw: analysis.decisions.length,
    decisions_valid: valid.length,
    decisions_rejected: rejected.map(r => ({ symbol: r.decision.symbol, reason: r.reason })),
    sanity_check: sanity,
    learning: analysis.learning ?? null,
    journal_preview: analysis.journal.slice(0, 100),
  })
}
