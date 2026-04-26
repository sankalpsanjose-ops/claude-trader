import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import type { Holding, Trade, DailyAnalysis } from '@/types'
import type { QuoteResult } from '@/lib/yahoo'

export type { QuoteResult }

const client = new Anthropic()

export function loadTraderProfileFromFile(): string {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'docs/trader-profile.md'), 'utf-8')
  } catch {
    return ''
  }
}

function buildSystemPrompt(traderProfile: string): string {
  return `You are an autonomous stock trader operating on NSE and BSE (Indian markets).

RULES (non-negotiable):
- Starting capital: ₹50,000 INR (paper trading — no real money)
- Never hold less than ₹5,000 cash
- Never put more than 20% of total portfolio value in any single stock
- You can only trade stocks listed on NSE (suffix .NS) or BSE (suffix .BO)
- Trades queue at end of day, execute at next morning's open price

YOUR GOAL: Maximise portfolio returns over time. Beat a simple buy-and-hold of Nifty 50.

TRADING PROFILE & LEARNINGS:
${traderProfile}

RESPONSE FORMAT: You must respond with valid JSON only. No prose outside the JSON.`
}

export interface AgentInput {
  portfolio_cash: number
  portfolio_total_value: number
  total_pnl: number
  total_pnl_pct: number
  holdings: Holding[]
  watchlist_quotes: QuoteResult[]
  recent_trades: Trade[]
  past_analyses: DailyAnalysis[]
  today_date: string
  traderProfile?: string
  /** Injected by the trading team orchestrator (team.ts) before calling Foxtrot */
  teamContext?: string
}

export interface AgentOutput {
  journal: string
  market_summary: string
  decisions: Array<{
    symbol: string
    action: 'BUY' | 'SELL' | 'HOLD'
    quantity?: number
    rationale: string
  }>
  watchlist_update: string[]
  learning?: {
    insight: string
    category: 'sizing' | 'exits' | 'patience' | 'sector' | 'risk' | 'process'
  }
}

export async function runDailyAnalysis(input: AgentInput): Promise<AgentOutput> {
  const profile = input.traderProfile ?? loadTraderProfileFromFile()

  const holdingsSummary = input.holdings.length === 0
    ? 'No open positions.'
    : input.holdings.map(h => {
        const liveQ = input.watchlist_quotes.find(q => q.symbol === h.symbol)
        const currentPrice = liveQ?.price ?? h.current_price
        const pnl = (currentPrice - h.buy_price) * h.quantity
        const pnlPct = ((currentPrice - h.buy_price) / h.buy_price) * 100
        return `  - ${h.name} (${h.symbol}): ${h.quantity} shares @ avg ₹${h.buy_price} | now ₹${currentPrice.toFixed(2)} | P&L: ${pnl >= 0 ? '+' : ''}₹${pnl.toFixed(0)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%)`
      }).join('\n')

  const marketSummary = input.watchlist_quotes
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, 15)
    .map(q => `  ${q.symbol}: ₹${q.price.toFixed(2)} (${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%)`)
    .join('\n')

  const recentTradesSummary = input.recent_trades.length === 0
    ? 'No trades yet.'
    : input.recent_trades.slice(0, 20).map(t =>
        `  ${new Date(t.executed_at).toLocaleDateString('en-IN')} ${t.action} ${t.quantity}x ${t.symbol} @ ₹${t.price} — ${t.rationale}${t.realised_pnl != null ? ` | P&L: ₹${t.realised_pnl.toFixed(0)}` : ''}`
      ).join('\n')

  const pastJournals = input.past_analyses.length === 0
    ? 'This is my first analysis.'
    : input.past_analyses.slice(0, 5).map(a =>
        `  [${a.date}] ${a.journal.slice(0, 200)}...`
      ).join('\n')

  const userMessage = `${input.teamContext ? input.teamContext + '\n\n' : ''}Today is ${input.today_date}. Here is my current situation:

PORTFOLIO
  Cash available: ₹${input.portfolio_cash.toFixed(2)}
  Total value: ₹${input.portfolio_total_value.toFixed(2)}
  P&L since inception: ${input.total_pnl >= 0 ? '+' : ''}₹${input.total_pnl.toFixed(0)} (${input.total_pnl_pct >= 0 ? '+' : ''}${input.total_pnl_pct.toFixed(2)}%)

OPEN POSITIONS
${holdingsSummary}

TODAY'S MARKET CLOSE (top movers)
${marketSummary}

RECENT TRADE HISTORY
${recentTradesSummary}

MY PAST JOURNAL ENTRIES
${pastJournals}

Based on this, decide what to do tomorrow morning. Respond with JSON matching this exact schema:
{
  "journal": "Your honest, detailed market commentary — what you saw today, your thesis, what you're thinking",
  "market_summary": "One sentence: overall market mood today",
  "decisions": [
    {
      "symbol": "SYMBOL.NS",
      "action": "BUY" | "SELL" | "HOLD",
      "quantity": <integer, required for BUY/SELL>,
      "rationale": "One clear sentence explaining why"
    }
  ],
  "watchlist_update": ["SYMBOL.NS", "SYMBOL.BO"],
  "learning": {
    "insight": "One concrete lesson from today — something that reinforces, challenges, or updates your trading approach",
    "category": "sizing" | "exits" | "patience" | "sector" | "risk" | "process"
  }
}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: buildSystemPrompt(profile),
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude did not return valid JSON')

  return JSON.parse(jsonMatch[0]) as AgentOutput
}
