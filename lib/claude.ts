import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import type { Holding, Trade, DailyAnalysis } from '@/types'
import type { QuoteResult } from '@/lib/yahoo'
import type { AgentReports } from '@/lib/agents/types'
import { describeExit, type ExitLevel } from '@/lib/strategy'

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
  const startingCapital = parseInt(process.env.STARTING_CAPITAL ?? '500000', 10)
  const cashReserve = Math.round(startingCapital * 0.10)
  return `You are an autonomous stock trader operating on NSE and BSE (Indian markets).

RULES (non-negotiable):
- Starting capital: ₹${startingCapital.toLocaleString('en-IN')} INR (paper trading — no real money)
- Never hold less than ₹${cashReserve.toLocaleString('en-IN')} cash (10% of starting capital)
- Never put more than 20% of total portfolio value in any single stock
- You can only trade stocks listed on NSE (suffix .NS) or BSE (suffix .BO)
- Trades queue at end of day, execute at next morning's open price
- Each trade incurs Zerodha delivery fees: STT 0.1% on buy + STT 0.1% on sell + DP charge ₹15.34 on sell. Factor this into sizing — trades under ₹15,000 are rarely worth the friction.

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
  today_is_trading_day: boolean
  execution_date: string
  observe_only: boolean
  traderProfile?: string
  /** Injected by the trading team orchestrator (team.ts) before calling Foxtrot */
  teamContext?: string
  /** Code-computed stop levels per holding; any triggered stop is sold automatically. */
  exit_levels?: ExitLevel[]
  /** Sprint goal, progress, and today's eligible buys — built by the analyze cron. */
  sprint_brief?: string
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
  /** Set by runTradingTeam — Echo's intelligence brief passed to Foxtrot */
  team_brief?: string
  /** Set by runTradingTeam — all five specialist reports for the Decision Trail UI */
  agent_reports?: AgentReports
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
        const exit = input.exit_levels?.find(x => x.symbol === h.symbol)
        const exitNote = exit
          ? ` | ${exit.triggered ? 'STOP HIT — auto-sell queued' : describeExit(exit)}`
          : ''
        return `  - ${h.name} (${h.symbol}): ${h.quantity} shares @ avg ₹${h.buy_price} since ${h.buy_date} | now ₹${currentPrice.toFixed(2)} | P&L: ${pnl >= 0 ? '+' : ''}₹${pnl.toFixed(0)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%)${exitNote}`
      }).join('\n')

  const marketSummary = input.watchlist_quotes
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .map(q => `  ${q.symbol}: ₹${q.price.toFixed(2)} (${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%)`)
    .join('\n')

  const recentTradesSummary = input.recent_trades.length === 0
    ? 'No trades yet.'
    : input.recent_trades.slice(0, 20).map(t =>
        `  ${new Date(t.executed_at).toLocaleDateString('en-IN')} ${t.action} ${t.quantity}x ${t.symbol} @ ₹${t.price} — ${t.rationale}${t.realised_pnl != null ? ` | P&L: ₹${t.realised_pnl.toFixed(0)}` : ''}`
      ).join('\n')

  const pastJournals = input.past_analyses.length === 0
    ? 'This is my first analysis.'
    : input.past_analyses.slice(0, 7).map(a => {
        const decisions = (a.decisions ?? [])
          .filter((d: { action: string }) => d.action !== 'HOLD')
          .map((d: { action: string; quantity?: number; symbol: string; rationale: string }) =>
            `      ${d.action} ${d.quantity ?? ''}x ${d.symbol} — ${d.rationale}`
          ).join('\n')
        return [
          `  [${a.date}] ${a.market_summary ?? ''}`,
          `  ${a.journal.slice(0, 600)}${a.journal.length > 600 ? '...' : ''}`,
          decisions ? `  Decisions made:\n${decisions}` : '  No trades queued.',
        ].join('\n')
      }).join('\n\n')

  const priceNote = input.today_is_trading_day
    ? `Today's prices reflect today's market close.`
    : `NSE/BSE prices shown are from the last trading day — markets are closed today.`

  const executionNote = input.observe_only
    ? `${priceNote} Next market open is ${input.execution_date}. Do NOT queue any trades today — write your journal and market observations only. Set all decisions to HOLD.`
    : `${priceNote} Trades will execute at tomorrow's (${input.execution_date}) market open.`

  const userMessage = `${input.teamContext ? input.teamContext + '\n\n' : ''}${input.sprint_brief ? input.sprint_brief + '\n\n' : ''}Today is ${input.today_date}. ${executionNote}

Here is my current situation:

PORTFOLIO
  Cash available: ₹${input.portfolio_cash.toFixed(2)}
  Total value: ₹${input.portfolio_total_value.toFixed(2)}
  P&L since inception: ${input.total_pnl >= 0 ? '+' : ''}₹${input.total_pnl.toFixed(0)} (${input.total_pnl_pct >= 0 ? '+' : ''}${input.total_pnl_pct.toFixed(2)}%)

OPEN POSITIONS
${holdingsSummary}

TODAY'S MARKET CLOSE (full watchlist — sorted by move size)
${marketSummary}

RECENT TRADE HISTORY
${recentTradesSummary}

MY PAST JOURNAL ENTRIES
${pastJournals}

Based on this, decide what to do.

Field guidance:
- journal: your honest, detailed market commentary — what you saw today, your thesis, what you're thinking.
- market_summary: one sentence on the overall market mood today.
- decisions: one entry per trade. quantity is required for BUY and SELL (a positive integer); use 0 for HOLD. rationale is one clear sentence.
- watchlist_update: NSE (.NS) or BSE (.BO) symbols to watch next session.
- learning: one concrete lesson from today that reinforces, challenges, or updates your approach.`

  const request = {
    model: 'claude-sonnet-5',
    max_tokens: 16000,
    system: buildSystemPrompt(profile),
    messages: [{ role: 'user' as const, content: userMessage }],
  }
  let message
  try {
    message = await client.messages.create({
      ...request,
      output_config: { format: { type: 'json_schema', schema: FOXTROT_SCHEMA } },
    })
  } catch (e) {
    // Structured outputs were untested live when this shipped — if the API
    // rejects the parameter, fall back to free-text JSON rather than lose the day.
    if (!(e instanceof Anthropic.BadRequestError)) throw e
    console.error('[Foxtrot] Structured output rejected, retrying as free text:', e.message)
    message = await client.messages.create({
      ...request,
      messages: [{ role: 'user', content: `${userMessage}\n\nRespond with JSON only, matching this schema:\n${JSON.stringify(FOXTROT_SCHEMA)}` }],
    })
  }

  if (message.stop_reason === 'max_tokens') throw new Error('Foxtrot hit max_tokens before finishing')
  // Sonnet 5 runs adaptive thinking by default, so content[0] may be a
  // thinking block — take the last text block instead.
  const textBlocks = message.content.filter(b => b.type === 'text')
  const text = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude did not return valid JSON')

  return JSON.parse(jsonMatch[0]) as AgentOutput
}

const FOXTROT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['journal', 'market_summary', 'decisions', 'watchlist_update', 'learning'],
  properties: {
    journal: { type: 'string' },
    market_summary: { type: 'string' },
    decisions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['symbol', 'action', 'quantity', 'rationale'],
        properties: {
          symbol: { type: 'string' },
          action: { type: 'string', enum: ['BUY', 'SELL', 'HOLD'] },
          quantity: { type: 'integer' },
          rationale: { type: 'string' },
        },
      },
    },
    watchlist_update: { type: 'array', items: { type: 'string' } },
    learning: {
      type: 'object',
      additionalProperties: false,
      required: ['insight', 'category'],
      properties: {
        insight: { type: 'string' },
        category: { type: 'string', enum: ['sizing', 'exits', 'patience', 'sector', 'risk', 'process'] },
      },
    },
  },
} as const

export async function reviseFoxtrotDecisions(
  decisions: AgentOutput['decisions'],
  hotelWarnings: string,
  traderProfile: string,
): Promise<AgentOutput['decisions']> {
  const profile = traderProfile ?? loadTraderProfileFromFile()
  const decisionsSummary = decisions
    .filter(d => d.action !== 'HOLD')
    .map(d => `  ${d.action} ${d.quantity ?? ''}x ${d.symbol} — ${d.rationale}`)
    .join('\n')

  if (!decisionsSummary) return decisions

  const message = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 4096,
    system: buildSystemPrompt(profile),
    messages: [{
      role: 'user',
      content: `You queued these trades, but the Auditor (Hotel) raised concerns before execution:

YOUR DECISIONS:
${decisionsSummary}

HOTEL'S WARNINGS:
${hotelWarnings}

Review each flagged decision and either:
- REVISE: adjust quantity or rationale to address the concern
- CONFIRM: keep as-is but add a sentence explaining why the concern is outweighed
- DROP: remove the decision if the concern is valid

Return ONLY the revised decisions array as JSON — no other fields:
[
  {
    "symbol": "SYMBOL.NS",
    "action": "BUY" | "SELL" | "HOLD",
    "quantity": <integer>,
    "rationale": "Updated rationale"
  }
]
Include all original decisions (revised or unchanged). HOLD decisions can be omitted.`,
    }],
  })

  const textBlocks = message.content.filter(b => b.type === 'text')
  const text = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : ''
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return decisions
  try {
    return JSON.parse(match[0]) as AgentOutput['decisions']
  } catch {
    return decisions
  }
}
