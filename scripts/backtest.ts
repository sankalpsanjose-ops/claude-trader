/**
 * Backtest: runs Claude through every trading day from May 1 2025 → Apr 25 2026
 * Uses real historical prices from Yahoo Finance + validation layer.
 *
 * Usage: npx tsx scripts/backtest.ts
 * Expected runtime: ~25-35 minutes (~245 trading days)
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// ─── Config ────────────────────────────────────────────────────────────────

const STARTING_CAPITAL = 50000
const MIN_CASH_RESERVE = 5000
const MAX_POSITION_PCT = 0.20
const BACKTEST_START   = '2025-05-01'
const BACKTEST_END     = '2026-04-25'

// ─── Clients ───────────────────────────────────────────────────────────────

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ai = new Anthropic()

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require('yahoo-finance2').default
const yf = new YahooFinanceClass({ suppressNotices: ['yahooSurvey', 'ripHistorical'] })

// ─── Watchlist ─────────────────────────────────────────────────────────────

const WATCHLIST = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
  'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS',
  'AXISBANK.NS', 'LT.NS', 'ASIANPAINT.NS', 'MARUTI.NS', 'SUNPHARMA.NS',
  'WIPRO.NS', 'HCLTECH.NS', 'ULTRACEMCO.NS', 'TITAN.NS', 'BAJFINANCE.NS',
  'BAJAJFINSV.NS', 'NESTLEIND.NS', 'TATAMOTORS.NS', 'POWERGRID.NS', 'NTPC.NS',
  'TECHM.NS', 'DRREDDY.NS', 'CIPLA.NS', 'DIVISLAB.NS', 'JSWSTEEL.NS',
  'TATASTEEL.NS', 'ONGC.NS', 'HEROMOTOCO.NS', 'BAJAJ-AUTO.NS', 'ADANIENT.NS',
  'ADANIPORTS.NS', 'COALINDIA.NS', 'GRASIM.NS', 'BPCL.NS', 'INDUSINDBK.NS',
]

// ─── Types ─────────────────────────────────────────────────────────────────

type DayBar    = { open: number; close: number }
type PriceMap  = Record<string, DayBar>
type HistoryMap = Record<string, PriceMap>   // date → { symbol → bar }

interface Holding { symbol: string; name: string; exchange: string; quantity: number; buy_price: number; buy_date: string }
interface Trade   { symbol: string; action: string; quantity: number; price: number; rationale: string; realised_pnl: number | null; executed_at: string }
interface Analysis{ date: string; journal: string }

// ─── Fetch all historical data upfront ─────────────────────────────────────

async function fetchAllHistory(): Promise<HistoryMap> {
  console.log(`📥 Fetching ${WATCHLIST.length} symbols from ${BACKTEST_START} → ${BACKTEST_END}...`)
  const history: HistoryMap = {}

  for (let i = 0; i < WATCHLIST.length; i += 5) {
    const batch = WATCHLIST.slice(i, i + 5)
    await Promise.all(batch.map(async symbol => {
      try {
        const rows = await yf.historical(symbol, {
          period1: BACKTEST_START,
          period2: BACKTEST_END,
          interval: '1d',
        })
        for (const row of rows) {
          const date = row.date.toISOString().split('T')[0]
          if (!history[date]) history[date] = {}
          history[date][symbol] = {
            open:  row.open  ?? 0,
            close: row.adjclose ?? row.close ?? 0,
          }
        }
      } catch { /* symbol unavailable — skip */ }
    }))
    process.stdout.write(`  ${Math.min(i + 5, WATCHLIST.length)}/${WATCHLIST.length} symbols fetched\r`)
  }
  console.log('\n✅ Historical data ready')
  return history
}

// ─── Validation layer ───────────────────────────────────────────────────────

interface Decision { symbol: string; action: string; quantity?: number; rationale: string }

function validateDecisions(
  decisions: Decision[],
  cash: number,
  totalValue: number,
  holdings: Holding[],
  prices: Record<string, number>,
): { valid: Decision[]; rejected: string[] } {
  const valid: Decision[] = []
  const rejected: string[] = []

  for (const d of decisions) {
    if (d.action === 'HOLD') { valid.push(d); continue }

    const qty   = d.quantity ?? 0
    const price = prices[d.symbol]

    if (!d.symbol.endsWith('.NS') && !d.symbol.endsWith('.BO')) {
      rejected.push(`${d.symbol}: invalid suffix`); continue
    }
    if (!price || price <= 0) {
      rejected.push(`${d.symbol}: no market price — hallucinated symbol?`); continue
    }
    if (qty <= 0 || !Number.isInteger(qty)) {
      rejected.push(`${d.symbol}: invalid quantity ${qty}`); continue
    }

    if (d.action === 'BUY') {
      const cost = price * qty
      if (cash - cost < MIN_CASH_RESERVE) {
        rejected.push(`BUY ${d.symbol}: insufficient cash (need ₹${cost.toFixed(0)}, have ₹${(cash - MIN_CASH_RESERVE).toFixed(0)})`); continue
      }
      const existing = holdings.find(h => h.symbol === d.symbol)
      const currentVal = (existing?.quantity ?? 0) * price
      if ((currentVal + cost) / totalValue > MAX_POSITION_PCT) {
        rejected.push(`BUY ${d.symbol}: would exceed 20% position limit`); continue
      }
    }

    if (d.action === 'SELL') {
      const holding = holdings.find(h => h.symbol === d.symbol)
      if (!holding) { rejected.push(`SELL ${d.symbol}: not in holdings`); continue }
      if (qty > holding.quantity) d.quantity = holding.quantity  // clamp
    }

    valid.push(d)
  }
  return { valid, rejected }
}

async function sanityCheck(
  decisions: Decision[],
  prices: Record<string, number>,
  journal: string,
): Promise<string> {
  const trades = decisions.filter(d => d.action !== 'HOLD')
  if (!trades.length) return 'no trades'

  const lines = trades.map(d =>
    `${d.symbol}: ₹${(prices[d.symbol] ?? 0).toFixed(2)} — ${d.action} ${d.quantity} — "${d.rationale}"`
  ).join('\n')

  try {
    const res = await ai.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Audit these trades. Are rationales grounded in the actual prices? Flag hallucinations briefly.

${lines}

Journal excerpt: ${journal.slice(0, 200)}

Reply JSON: { "passed": true|false, "notes": "one sentence" }`,
      }],
    })
    const text = res.content[0].type === 'text' ? res.content[0].text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      const r = JSON.parse(match[0])
      return `${r.passed ? '✓' : '⚠'} ${r.notes}`
    }
  } catch { /* non-fatal */ }
  return 'sanity check skipped'
}

// ─── Claude agent ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an autonomous stock trader on NSE/BSE (India).
RULES: ₹50,000 starting capital. Never go below ₹5,000 cash. Max 20% in any one stock.
GOAL: Maximise returns. Beat Nifty 50.
RESPOND WITH VALID JSON ONLY — no text outside the JSON object.`

async function runClaude(
  date: string,
  cash: number,
  totalValue: number,
  holdings: Holding[],
  prices: PriceMap,
  recentTrades: Trade[],
  pastAnalyses: Analysis[],
): Promise<{ journal: string; market_summary: string; decisions: Decision[] }> {
  const holdingLines = holdings.length === 0 ? 'None.' :
    holdings.map(h => {
      const p = prices[h.symbol]?.close ?? h.buy_price
      const pnl = (p - h.buy_price) * h.quantity
      return `  ${h.symbol}: ${h.quantity} @ ₹${h.buy_price.toFixed(2)} | now ₹${p.toFixed(2)} | P&L ${pnl >= 0 ? '+' : ''}₹${pnl.toFixed(0)}`
    }).join('\n')

  const movers = Object.entries(prices)
    .filter(([, v]) => v.close > 0 && v.open > 0)
    .map(([sym, v]) => ({ sym, close: v.close, pct: (v.close - v.open) / v.open * 100 }))
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 12)
    .map(x => `  ${x.sym}: ₹${x.close.toFixed(2)} (${x.pct >= 0 ? '+' : ''}${x.pct.toFixed(2)}%)`)
    .join('\n')

  const tradeLine = recentTrades.length === 0 ? 'None yet.' :
    recentTrades.slice(0, 15).map(t =>
      `  ${t.executed_at.split('T')[0]} ${t.action} ${t.quantity}x ${t.symbol} @ ₹${t.price.toFixed(2)} — ${t.rationale}${t.realised_pnl != null ? ` [P&L ₹${t.realised_pnl.toFixed(0)}]` : ''}`
    ).join('\n')

  const journalLines = pastAnalyses.length === 0 ? 'First day.' :
    pastAnalyses.slice(0, 4).map(a => `  [${a.date}] ${a.journal.slice(0, 120)}...`).join('\n')

  const pnl = totalValue - STARTING_CAPITAL

  const msg = `Today: ${date}

PORTFOLIO: Cash ₹${cash.toFixed(0)} | Total ₹${totalValue.toFixed(0)} | P&L ${pnl >= 0 ? '+' : ''}₹${pnl.toFixed(0)} (${(pnl / STARTING_CAPITAL * 100).toFixed(2)}%)

HOLDINGS:
${holdingLines}

TODAY'S CLOSE (top movers):
${movers}

RECENT TRADES:
${tradeLine}

PAST JOURNALS:
${journalLines}

Respond with JSON:
{
  "journal": "your detailed market commentary and reasoning",
  "market_summary": "one sentence overall mood",
  "decisions": [
    { "symbol": "X.NS", "action": "BUY"|"SELL"|"HOLD", "quantity": <int>, "rationale": "one sentence" }
  ],
  "learning": {
    "insight": "one concrete lesson from today — something that reinforces or updates your trading approach",
    "category": "sizing" | "exits" | "patience" | "sector" | "risk" | "process"
  }
}`

  const res = await ai.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: msg }],
  })

  const text = res.content[0].type === 'text' ? res.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in response')
  return JSON.parse(match[0])
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🗑  Resetting database...')
  await Promise.all([
    db.from('holdings').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    db.from('trades').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    db.from('pending_trades').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    db.from('daily_analyses').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    db.from('portfolio_snapshots').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    db.from('audits').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    db.from('learnings').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
  ])
  await db.from('portfolio').update({
    cash: STARTING_CAPITAL,
    total_value: STARTING_CAPITAL,
    inception_date: BACKTEST_START,
    updated_at: new Date().toISOString(),
  }).neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('✅ Reset done\n')

  const history   = await fetchAllHistory()
  const allDays   = Object.keys(history).filter(d => d >= BACKTEST_START && d <= BACKTEST_END).sort()
  const tradingDays = allDays.filter(d => Object.keys(history[d]).length >= 5)
  console.log(`📅 ${tradingDays.length} trading days: ${tradingDays[0]} → ${tradingDays.at(-1)}\n`)

  let cash = STARTING_CAPITAL
  const holdings: Holding[] = []
  const trades:   Trade[]   = []
  const analyses: Analysis[] = []
  let totalDays = 0, totalTrades = 0, rejectedCount = 0

  for (let i = 0; i < tradingDays.length; i++) {
    const day    = tradingDays[i]
    const prices = history[day]
    const priceClose: Record<string, number> = {}
    for (const [sym, bar] of Object.entries(prices)) priceClose[sym] = bar.close

    const mktVal   = holdings.reduce((s, h) => s + (priceClose[h.symbol] ?? h.buy_price) * h.quantity, 0)
    const totalVal = cash + mktVal

    const progress = `[${i + 1}/${tradingDays.length}]`
    process.stdout.write(`${progress} ${day} — ₹${totalVal.toFixed(0)} | ${holdings.length} pos\r`)

    // Run Claude
    let result
    try {
      result = await runClaude(day, cash, totalVal, holdings, prices, trades, analyses)
    } catch (e) {
      console.log(`\n  ❌ Claude error on ${day}: ${e}`)
      continue
    }

    // Validate decisions
    const { valid, rejected } = validateDecisions(
      result.decisions ?? [],
      cash, totalVal, holdings, priceClose
    )
    rejectedCount += rejected.length

    // Sanity check (async, non-blocking for the loop)
    const sanityNote = await sanityCheck(valid, priceClose, result.journal)

    // Store analysis + audit + learning
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writes: any[] = [
      db.from('daily_analyses').insert({
        date: day,
        journal: result.journal,
        decisions: valid,
        market_summary: result.market_summary ?? '',
      }),
      db.from('audits').upsert({
        date: day,
        decisions_raw: result.decisions ?? [],
        decisions_valid: valid,
        rejections: rejected.map(r => ({ symbol: (r as {symbol?:string}).symbol ?? r, reason: String(r) })),
        sanity_passed: sanityNote.startsWith('✓'),
        sanity_notes: sanityNote,
      }),
      db.from('portfolio_snapshots').upsert({ date: day, total_value: totalVal, cash }),
    ]

    const learning = (result as { learning?: { insight?: string; category?: string } }).learning
    const validCategories = ['sizing', 'exits', 'patience', 'sector', 'risk', 'process', 'monthly']
    if (learning?.insight) {
      writes.push(
        db.from('learnings').upsert({
          date: day,
          category: validCategories.includes(learning.category ?? '') ? learning.category : 'process',
          insight: learning.insight,
          source: 'daily',
        }) as unknown as Promise<unknown>
      )
    }

    await Promise.all(writes)
    analyses.unshift({ date: day, journal: result.journal })
    totalDays++

    if (rejected.length > 0) {
      console.log(`\n  ⚠  ${day}: rejected ${rejected.length} decision(s): ${rejected.join(' | ')}`)
    }
    if (!sanityNote.startsWith('✓')) {
      console.log(`\n  🔍 ${day} sanity: ${sanityNote}`)
    }

    // Execute at next day's open
    const nextDay  = tradingDays[i + 1]
    const buySells = valid.filter(d => d.action !== 'HOLD' && d.quantity)
    if (!buySells.length || !nextDay) continue

    const nextPrices = history[nextDay]
    const executedThisDay: string[] = []

    for (const d of buySells) {
      const bar = nextPrices?.[d.symbol]
      if (!bar?.open) continue

      const price = bar.open
      const exch  = d.symbol.endsWith('.BO') ? 'BSE' : 'NSE'
      const qty   = d.quantity!

      if (d.action === 'BUY') {
        const cost = price * qty
        if (cash - cost < MIN_CASH_RESERVE) continue
        cash -= cost

        const existing = holdings.find(h => h.symbol === d.symbol)
        if (existing) {
          const newQty = existing.quantity + qty
          const newAvg = (existing.buy_price * existing.quantity + price * qty) / newQty
          existing.quantity  = newQty
          existing.buy_price = newAvg
          await db.from('holdings').update({ quantity: newQty, buy_price: newAvg, current_price: price, updated_at: new Date().toISOString() }).eq('symbol', d.symbol)
        } else {
          const h: Holding = { symbol: d.symbol, name: d.symbol, exchange: exch, quantity: qty, buy_price: price, buy_date: nextDay }
          holdings.push(h)
          await db.from('holdings').insert({ ...h, current_price: price })
        }
        await db.from('trades').insert({ symbol: d.symbol, name: d.symbol, exchange: exch, action: 'BUY', quantity: qty, price, total_value: cost, realised_pnl: null, rationale: d.rationale, executed_at: `${nextDay}T09:20:00+05:30` })
        trades.unshift({ symbol: d.symbol, action: 'BUY', quantity: qty, price, rationale: d.rationale, realised_pnl: null, executed_at: `${nextDay}T09:20:00+05:30` })
        executedThisDay.push(`BUY ${qty}x ${d.symbol} @₹${price.toFixed(0)}`)
        totalTrades++
      }

      if (d.action === 'SELL') {
        const existing = holdings.find(h => h.symbol === d.symbol)
        if (!existing) continue
        const sellQty     = Math.min(qty, existing.quantity)
        const proceeds    = price * sellQty
        const realisedPnl = (price - existing.buy_price) * sellQty
        cash += proceeds

        if (existing.quantity - sellQty <= 0) {
          holdings.splice(holdings.indexOf(existing), 1)
          await db.from('holdings').delete().eq('symbol', d.symbol)
        } else {
          existing.quantity -= sellQty
          await db.from('holdings').update({ quantity: existing.quantity, current_price: price, updated_at: new Date().toISOString() }).eq('symbol', d.symbol)
        }
        await db.from('trades').insert({ symbol: d.symbol, name: d.symbol, exchange: exch, action: 'SELL', quantity: sellQty, price, total_value: proceeds, realised_pnl: realisedPnl, rationale: d.rationale, executed_at: `${nextDay}T09:20:00+05:30` })
        trades.unshift({ symbol: d.symbol, action: 'SELL', quantity: sellQty, price, rationale: d.rationale, realised_pnl: realisedPnl, executed_at: `${nextDay}T09:20:00+05:30` })
        executedThisDay.push(`SELL ${sellQty}x ${d.symbol} @₹${price.toFixed(0)} P&L:${realisedPnl >= 0 ? '+' : ''}₹${realisedPnl.toFixed(0)}`)
        totalTrades++
      }
    }

    if (executedThisDay.length) {
      const nextMktVal = holdings.reduce((s, h) => s + (nextPrices?.[h.symbol]?.open ?? h.buy_price) * h.quantity, 0)
      await db.from('portfolio').update({ cash, total_value: cash + nextMktVal, updated_at: new Date().toISOString() }).neq('id', '00000000-0000-0000-0000-000000000000')
      console.log(`\n  ✅ ${executedThisDay.join(' | ')}`)
    }

    // Pace Claude calls: 2s delay every day
    await new Promise(r => setTimeout(r, 2000))
  }

  // Final portfolio value
  const lastDay    = tradingDays.at(-1)!
  const lastPrices = history[lastDay]
  const finalMkt   = holdings.reduce((s, h) => s + (lastPrices?.[h.symbol]?.close ?? h.buy_price) * h.quantity, 0)
  const finalValue = cash + finalMkt
  await db.from('portfolio').update({ cash, total_value: finalValue, updated_at: new Date().toISOString() }).neq('id', '00000000-0000-0000-0000-000000000000')

  const totalReturn = (finalValue - STARTING_CAPITAL) / STARTING_CAPITAL * 100

  console.log('\n' + '═'.repeat(55))
  console.log('🏁  BACKTEST COMPLETE')
  console.log(`    Period:           ${BACKTEST_START} → ${BACKTEST_END}`)
  console.log(`    Trading days:     ${totalDays}`)
  console.log(`    Starting capital: ₹${STARTING_CAPITAL.toLocaleString('en-IN')}`)
  console.log(`    Final value:      ₹${finalValue.toFixed(0)}`)
  console.log(`    Total return:     ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`)
  console.log(`    Trades executed:  ${totalTrades}`)
  console.log(`    Decisions rejected by validator: ${rejectedCount}`)
  console.log(`    Open positions:   ${holdings.length}`)
  console.log('═'.repeat(55) + '\n')
}

main().catch(err => { console.error(err); process.exit(1) })
