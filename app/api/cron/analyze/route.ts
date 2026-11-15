import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getQuotes, getClosesSince, DEFAULT_WATCHLIST } from '@/lib/yahoo'
import { runDailyAnalysis, reviseFoxtrotDecisions, loadTraderProfileFromFile } from '@/lib/claude'
import type { AgentOutput } from '@/lib/claude'
import { runTradingTeam } from '@/lib/agents/team'
import { runBravo } from '@/lib/agents/bravo'
import {
  SPRINT, NIFTY_SYMBOL, computeExitLevel, describeExit, marketRegimeOk, pickMomentumCandidates,
  type ExitLevel,
} from '@/lib/strategy'
import type { BravoReport } from '@/lib/agents/types'
import { validateDecisions, sanityCheckDecisions } from '@/lib/validator'
import { isTradingDay, isTomorrowTradingDay, getNextTradingDay } from '@/lib/market-calendar'
import { STARTING_CAPITAL } from '@/lib/trading'
import { sendNewsletter } from '@/lib/newsletter'
import { todayIST, offsetDaysIST } from '@/lib/ist'
import type { Holding, Trade, DailyAnalysis, TradeDecision } from '@/types'

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

function buildSprintBrief(args: {
  today: string
  totalValue: number
  regimeOk: boolean
  nifty: BravoReport['signals'][string] | undefined
  candidates: string[]
  bravo: BravoReport
  priceMap: Record<string, number>
  heldCount: number
  autoExits: ExitLevel[]
}): string {
  const { today, totalValue, regimeOk, nifty, candidates, bravo, priceMap, heldCount, autoExits } = args
  const gap = SPRINT.GOAL_VALUE - totalValue
  const lines = [
    '═══════════════════════════════════════════════',
    `SPRINT MANDATE — ${today} (ends ${SPRINT.END_DATE} close)`,
    '═══════════════════════════════════════════════',
    `Goal: portfolio ≥ ₹${SPRINT.GOAL_VALUE.toLocaleString('en-IN')} at the ${SPRINT.END_DATE} close. Checkpoint: ≥ ₹${SPRINT.CHECKPOINT_VALUE.toLocaleString('en-IN')} by ${SPRINT.CHECKPOINT_DATE}.`,
    `Now: ₹${totalValue.toFixed(0)} — ${gap > 0 ? `₹${gap.toFixed(0)} (${((gap / totalValue) * 100).toFixed(2)}%) short of goal` : 'goal reached — protect it'}.`,
    'If the goal is missed, the project is shut down.',
    '',
    'RULES ENFORCED IN CODE (a decision that breaks one is rejected — do not propose it):',
    `- Exits are automatic: hard stop −${SPRINT.STOP_PCT * 100}% from entry; once a holding has closed ≥ +${SPRINT.BREAKEVEN_TRIGGER_PCT * 100}% above entry its stop moves to breakeven; once ≥ +${SPRINT.TRAIL_TRIGGER_PCT * 100}%, the stop trails ${SPRINT.TRAIL_PCT * 100}% below the highest close. You may still sell earlier on a broken thesis or to rotate into a stronger name.`,
    `- BUY only names on the ELIGIBLE list below (above 20- and 50-day averages, positive 10-day momentum, RSI ≤ ${SPRINT.RSI_MAX}) that Echo rates bullish with high or medium conviction.`,
    `- No new buys while Nifty is below its 50-day average.`,
    `- Max ${SPRINT.MAX_POSITIONS} positions. You hold ${heldCount}${heldCount >= SPRINT.MAX_POSITIONS ? ' — to open anything new you must fully exit laggards first (same-day sell proceeds fund buys; sells execute before buys)' : ''}.`,
    `- New position ≥ ${SPRINT.MIN_NEW_POSITION_PCT * 100}% of portfolio (target 16–18%); max 20% per stock; ₹50,000 cash floor. Adds to an existing winner ≥ ₹${SPRINT.MIN_ADD_VALUE.toLocaleString('en-IN')}.`,
    '',
    'Strategy: concentrate in the strongest uptrends and cut laggards. Do not buy dips in falling stocks.',
    '',
    `MARKET REGIME: Nifty ${nifty ? `RSI ${nifty.rsi14}, ${nifty.aboveSma50 ? 'above' : 'below'} 50-day avg, 10d ${nifty.momentumPct ?? '?'}%` : 'data unavailable'} → new buys ${regimeOk ? 'ALLOWED' : 'BLOCKED'}`,
  ]
  if (autoExits.length) {
    lines.push('', 'AUTO-EXITS QUEUED FOR NEXT OPEN (stop hit):')
    for (const x of autoExits) lines.push(`  ${x.symbol}: close ₹${x.price.toFixed(2)} ≤ ${describeExit(x)}`)
  }
  lines.push('', 'ELIGIBLE BUYS (ranked by 10-day momentum):')
  if (candidates.length === 0) lines.push('  none today')
  for (const sym of candidates) {
    const t = bravo.signals[sym]
    lines.push(`  ${sym}: ₹${(priceMap[sym] ?? t.currentPrice).toFixed(2)} | 10d ${t.momentumPct}% | RSI ${t.rsi14} | vol ${t.volumeRatio}x`)
  }
  lines.push('═══════════════════════════════════════════════')
  return lines.join('\n')
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
  const [quotes, niftyClose, bravo, closesSinceEntry] = await Promise.all([
    getQuotes(watchlist),
    fetchNiftyClose(),
    runBravo([...watchlist, NIFTY_SYMBOL]),
    getClosesSince(holdings.map(h => ({ symbol: h.symbol, since: h.buy_date }))),
  ])
  const priceMap = Object.fromEntries(quotes.map(q => [q.symbol, q.price]))

  // Code-enforced exits: stop levels from entry price + closes since entry.
  const exitLevels: ExitLevel[] = holdings
    .filter(h => priceMap[h.symbol] != null)
    .map(h => computeExitLevel(h.symbol, h.buy_price, closesSinceEntry[h.symbol] ?? [], priceMap[h.symbol]))
  const autoExits = exitLevels.filter(x => x.triggered)
  const autoExitDecisions: TradeDecision[] = autoExits.map(x => ({
    symbol: x.symbol,
    action: 'SELL',
    quantity: holdings.find(h => h.symbol === x.symbol)!.quantity,
    rationale: `[AUTO-EXIT] Close ₹${x.price.toFixed(2)} hit ${x.stopKind} stop ₹${x.stop} (entry ₹${x.entry}, high ₹${x.highWater.toFixed(2)})`,
  }))

  const quoteMap = Object.fromEntries(quotes.map(q => [q.symbol, q]))
  async function queuePendingTrades(trades: TradeDecision[]) {
    if (trades.length === 0) return
    await supabaseAdmin.from('pending_trades').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('pending_trades').insert(
      trades.map(d => ({
        symbol: d.symbol,
        name: quoteMap[d.symbol]?.name ?? d.symbol,
        exchange: d.symbol.endsWith('.BO') ? 'BSE' : 'NSE',
        action: d.action,
        quantity: d.quantity!,
        rationale: d.rationale,
      }))
    )
  }

  const niftySignal = bravo.signals[NIFTY_SYMBOL]
  const regimeOk = marketRegimeOk(niftySignal)
  const candidates = pickMomentumCandidates(bravo.signals, heldSymbols)

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
    exit_levels: exitLevels,
    sprint_brief: buildSprintBrief({
      today, totalValue, regimeOk, nifty: niftySignal, candidates, bravo, priceMap,
      heldCount: holdings.length, autoExits,
    }),
  }

  let analysis: AgentOutput
  try {
    analysis = process.env.USE_TRADING_TEAM === 'true'
      ? await runTradingTeam(agentInput, bravo, candidates)
      : await runDailyAnalysis(agentInput)
  } catch (e) {
    // Without this, a failed LLM call (e.g. insufficient API credit) throws here
    // and the entire day silently produces zero rows anywhere — no daily_analyses,
    // no audit, no pending trade — leaving no trace that anything went wrong.
    const message = e instanceof Error ? e.message : String(e)
    console.error('[analyze] Analysis failed:', message)
    // Stops are mechanical — they still go out when the model call fails.
    const queuedExits = observeOnly ? [] : autoExitDecisions
    await queuePendingTrades(queuedExits)
    await supabaseAdmin.from('audits').upsert({
      date: today,
      decisions_raw: [],
      decisions_valid: queuedExits,
      rejections: [],
      sanity_passed: false,
      sanity_notes: `Analysis failed: ${message}${queuedExits.length ? ` — auto-exits still queued: ${queuedExits.map(d => d.symbol).join(', ')}` : ''}`,
    })
    return NextResponse.json({ error: 'Analysis failed', detail: message }, { status: 500 })
  }

  // Echo's ratings gate new buys. Without the team (or if Echo failed) no buys go through.
  const echo = analysis.agent_reports?.echo
  const intelOk = !!echo && !echo.failed
  const validationCtx = {
    cash: portfolio.cash,
    total_value: totalValue,
    holdings: holdings.map(h => ({ symbol: h.symbol, quantity: h.quantity, buy_price: h.buy_price })),
    prices: priceMap,
    sprint: {
      signals: bravo.signals,
      regimeOk,
      intelOk,
      echo: echo?.perSymbol ?? {},
    },
  }
  // Auto-exits override whatever the model said about those symbols.
  const autoExitSymbols = new Set(autoExitDecisions.map(d => d.symbol))
  const withAutoExits = (decisions: TradeDecision[]) => [
    ...autoExitDecisions.map(d => ({ ...d })),
    ...decisions.filter(d => !autoExitSymbols.has(d.symbol)),
  ]

  let { valid, rejected } = validateDecisions(withAutoExits(analysis.decisions), validationCtx)

  const modelDecisions = (ds: TradeDecision[]) => ds.filter(d => !d.rationale.startsWith('[AUTO-EXIT]'))
  let sanity = await sanityCheckDecisions(modelDecisions(valid), priceMap, analysis.journal)

  // If Hotel warns, give Foxtrot one revision pass — no further retries
  if (!sanity.passed && !observeOnly && modelDecisions(valid).some(d => d.action !== 'HOLD')) {
    const revised = await reviseFoxtrotDecisions(modelDecisions(valid), sanity.notes, traderProfile)
    const reValidated = validateDecisions(withAutoExits(revised), validationCtx)
    valid = reValidated.valid
    rejected = [...rejected, ...reValidated.rejected]
    sanity = await sanityCheckDecisions(modelDecisions(valid), priceMap, analysis.journal)
  }

  const health = [
    `[health] echo=${intelOk ? 'ok' : 'FAILED'}`,
    `regime=${regimeOk ? 'on' : 'off'}`,
    `candidates=${candidates.length}`,
    `auto_exits=${autoExits.map(x => x.symbol).join(',') || 'none'}`,
  ].join(' ')

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
      sanity_notes: `${health}\n${sanity.notes}`,
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
  await queuePendingTrades(tradesToQueue)


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
    health,
    learning: analysis.learning ?? null,
    journal_preview: analysis.journal.slice(0, 100),
  })
}
