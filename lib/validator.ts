import Anthropic from '@anthropic-ai/sdk'
import type { TradeDecision } from '@/types'
import { MIN_CASH_RESERVE, MAX_POSITION_PCT } from '@/lib/trading'

const ai = new Anthropic()

export interface HoldingSnapshot {
  symbol: string
  quantity: number
  buy_price: number
}

export interface ValidationContext {
  cash: number
  total_value: number
  holdings: HoldingSnapshot[]
  prices: Record<string, number>  // symbol → actual price from Yahoo Finance
}

export interface ValidationResult {
  valid: TradeDecision[]
  rejected: Array<{ decision: TradeDecision; reason: string }>
}

const VALID_SUFFIXES = ['.NS', '.BO']

export function validateDecisions(
  decisions: TradeDecision[],
  ctx: ValidationContext,
): ValidationResult {
  const valid: TradeDecision[] = []
  const rejected: Array<{ decision: TradeDecision; reason: string }> = []

  for (const d of decisions) {
    if (d.action === 'HOLD') { valid.push(d); continue }

    const qty = d.quantity ?? 0

    // 1. Symbol must have a valid suffix
    if (!VALID_SUFFIXES.some(s => d.symbol.endsWith(s))) {
      rejected.push({ decision: d, reason: `Invalid symbol suffix: ${d.symbol}` }); continue
    }

    // 2. Symbol must have a real price from Yahoo Finance
    const price = ctx.prices[d.symbol]
    if (!price || price <= 0) {
      rejected.push({ decision: d, reason: `No market price found for ${d.symbol} — possible hallucination` }); continue
    }

    // 3. Quantity must be a positive integer
    if (!qty || qty <= 0 || !Number.isInteger(qty)) {
      rejected.push({ decision: d, reason: `Invalid quantity ${qty} for ${d.symbol}` }); continue
    }

    if (d.action === 'BUY') {
      const cost = price * qty

      // 4. Cash floor: must keep ≥ MIN_CASH_RESERVE after buy
      if (ctx.cash - cost < MIN_CASH_RESERVE) {
        rejected.push({ decision: d, reason: `BUY ${qty}x ${d.symbol} costs ₹${cost.toFixed(0)} but only ₹${(ctx.cash - MIN_CASH_RESERVE).toFixed(0)} available after reserve` }); continue
      }

      // 5. Position size: can't exceed MAX_POSITION_PCT of portfolio
      const currentPositionValue = (ctx.holdings.find(h => h.symbol === d.symbol)?.quantity ?? 0) * price
      if ((currentPositionValue + cost) / ctx.total_value > MAX_POSITION_PCT) {
        rejected.push({ decision: d, reason: `BUY would make ${d.symbol} exceed 20% portfolio limit` }); continue
      }
    }

    if (d.action === 'SELL') {
      // 6. Must actually hold the stock
      const holding = ctx.holdings.find(h => h.symbol === d.symbol)
      if (!holding) {
        rejected.push({ decision: d, reason: `SELL ${d.symbol} rejected — not in holdings` }); continue
      }

      // 7. Can't sell more than held
      if (qty > holding.quantity) {
        // Clamp to what we have rather than reject outright
        d.quantity = holding.quantity
      }
    }

    valid.push(d)
  }

  return { valid, rejected }
}

// Second-opinion Claude call using Haiku (cheap + fast)
// Checks that reasoning is grounded in actual price movements
export async function sanityCheckDecisions(
  decisions: TradeDecision[],
  prices: Record<string, number>,
  journal: string,
): Promise<{ passed: boolean; notes: string }> {
  const tradingDecisions = decisions.filter(d => d.action !== 'HOLD')
  if (tradingDecisions.length === 0) return { passed: true, notes: 'No trades to validate' }

  const priceLines = tradingDecisions
    .map(d => `${d.symbol}: ₹${(prices[d.symbol] ?? 0).toFixed(2)} (${d.action} ${d.quantity} — "${d.rationale}")`)
    .join('\n')

  const res = await ai.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `You are a trading decision auditor. Check if these trade decisions are grounded in reality.

ACTUAL PRICES FROM YAHOO FINANCE TODAY:
${priceLines}

TRADER'S JOURNAL:
${journal.slice(0, 300)}

For each trade, answer: does the rationale make sense given the actual price? Flag any decisions where the reasoning appears fabricated or contradicts the actual price data.

Respond with JSON only:
{ "passed": true|false, "notes": "brief summary of any issues found, or 'all decisions look reasonable'" }`,
    }],
  })

  try {
    const text = res.content[0].type === 'text' ? res.content[0].text : '{}'
    const match = text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : { passed: true, notes: 'Could not parse sanity check' }
  } catch {
    return { passed: true, notes: 'Sanity check parse error — proceeding' }
  }
}
