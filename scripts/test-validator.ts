/**
 * Tests the validator with known-bad inputs to confirm it catches each failure mode.
 * Pure function — no network, no API calls.
 * Usage: npx tsx scripts/test-validator.ts
 */
import assert from 'node:assert/strict'
import { validateDecisions, type ValidationContext } from '../lib/validator'
import type { TradeDecision } from '../types'
import type { TechnicalSignal } from '../lib/agents/types'

// STARTING_CAPITAL defaults to 500,000 → MIN_CASH_RESERVE = 50,000.
const PRICES: Record<string, number> = {
  'RELIANCE.NS': 1300,
  'TCS.NS': 2500,
  'INFY.NS': 1140,
  'LT.NS': 4000,
  'SBIN.NS': 1080,
  'ITC.NS': 285,
}

const sig = (over: Partial<TechnicalSignal> = {}): TechnicalSignal => ({
  rsi14: 62, sma20: 100, sma50: 95, aboveSma20: true, aboveSma50: true,
  momentum: 'strong', momentumPct: 5, currentPrice: 105, avgVolume20: 1e6, volumeRatio: 1,
  ...over,
})

function ctx(over: Partial<ValidationContext> = {}): ValidationContext {
  return {
    cash: 200_000,
    total_value: 500_000,
    holdings: [
      { symbol: 'TCS.NS', quantity: 20, buy_price: 2400 },
      { symbol: 'ITC.NS', quantity: 170, buy_price: 269 },
    ],
    prices: PRICES,
    ...over,
  }
}

const sprint = (over: Partial<NonNullable<ValidationContext['sprint']>> = {}): NonNullable<ValidationContext['sprint']> => ({
  signals: { 'LT.NS': sig(), 'SBIN.NS': sig(), 'TCS.NS': sig(), 'RELIANCE.NS': sig({ aboveSma50: false }) },
  regimeOk: true,
  intelOk: true,
  echo: {
    'LT.NS': { outlook: 'bullish', conviction: 'high' },
    'SBIN.NS': { outlook: 'bullish', conviction: 'medium' },
    'TCS.NS': { outlook: 'bullish', conviction: 'high' },
    'RELIANCE.NS': { outlook: 'bullish', conviction: 'high' },
  },
  ...over,
})

const buy = (symbol: string, quantity: number): TradeDecision => ({ symbol, action: 'BUY', quantity, rationale: 't' })
const sell = (symbol: string, quantity: number): TradeDecision => ({ symbol, action: 'SELL', quantity, rationale: 't' })

let failures = 0
function test(name: string, fn: () => void) {
  try { fn(); console.log(`  ✓ ${name}`) } catch (e) { failures++; console.log(`  ✗ ${name}\n    ${(e as Error).message}`) }
}
const rejectedFor = (decisions: TradeDecision[], c: ValidationContext) => validateDecisions(decisions, c).rejected.map(r => r.reason)

console.log('basic rules')
test('hallucinated symbol rejected', () => assert.equal(rejectedFor([buy('FAKE.NS', 5)], ctx()).length, 1))
test('invalid suffix rejected', () => assert.equal(rejectedFor([buy('RELIANCE', 5)], ctx()).length, 1))
test('zero quantity rejected', () => assert.equal(rejectedFor([buy('RELIANCE.NS', 0)], ctx()).length, 1))
test('cash floor enforced', () => assert.match(rejectedFor([buy('LT.NS', 40)], ctx({ cash: 150_000 }))[0], /reserve/))
test('20% cap enforced', () => assert.match(rejectedFor([buy('TCS.NS', 25)], ctx())[0], /20%/))
test('SELL of unheld stock rejected', () => assert.equal(rejectedFor([sell('INFY.NS', 3)], ctx()).length, 1))
test('SELL quantity clamped to holding', () => {
  const { valid } = validateDecisions([sell('TCS.NS', 999)], ctx())
  assert.equal(valid[0].quantity, 20)
})
test('HOLD always passes', () => assert.equal(rejectedFor([{ symbol: 'FAKE.NS', action: 'HOLD', rationale: 'w' }], ctx()).length, 0))
test('valid BUY passes without sprint context', () => assert.equal(rejectedFor([buy('LT.NS', 15)], ctx()).length, 0))

console.log('same-day rotation')
test('SELL proceeds fund a BUY even when listed after it', () => {
  // cash 60k: alone, LT 14 × 4000 = 56k would breach the 50k floor.
  // Selling TCS 20 × 2500 = 50k (49k after haircut) leaves 109k − 56k = 53k.
  const c = ctx({ cash: 60_000 })
  assert.equal(rejectedFor([buy('LT.NS', 14)], c).length, 1)
  assert.equal(rejectedFor([buy('LT.NS', 14), sell('TCS.NS', 20)], c).length, 0)
})

console.log('sprint rules')
test('BUY blocked when intelligence brief failed', () => {
  assert.match(rejectedFor([buy('LT.NS', 15)], ctx({ sprint: sprint({ intelOk: false }) }))[0], /intelligence/)
})
test('BUY blocked when Nifty is below its 50-day average', () => {
  assert.match(rejectedFor([buy('LT.NS', 15)], ctx({ sprint: sprint({ regimeOk: false }) }))[0], /Nifty/)
})
test('BUY blocked for a stock in a downtrend', () => {
  assert.match(rejectedFor([buy('RELIANCE.NS', 50)], ctx({ sprint: sprint() }))[0], /50-day/)
})
test('BUY blocked without a bullish high/medium Echo rating', () => {
  const s = sprint({ echo: { 'LT.NS': { outlook: 'neutral', conviction: 'high' } } })
  assert.match(rejectedFor([buy('LT.NS', 15)], ctx({ sprint: s }))[0], /Echo/)
})
test('new position below 12% of portfolio rejected', () => {
  assert.match(rejectedFor([buy('LT.NS', 10)], ctx({ sprint: sprint() }))[0], /12%/) // 40k < 60k
})
test('new position at 12%+ passes', () => {
  assert.equal(rejectedFor([buy('LT.NS', 15)], ctx({ sprint: sprint() })).length, 0) // 60k
})
test('adding to an existing position only needs the add minimum', () => {
  assert.equal(rejectedFor([buy('TCS.NS', 8)], ctx({ sprint: sprint() })).length, 0) // 20k add
})
test('max 5 positions: new symbol blocked when book is full', () => {
  const full = ['A', 'B', 'C', 'D', 'E'].map(s => ({ symbol: `${s}.NS`, quantity: 1, buy_price: 100 }))
  assert.match(rejectedFor([buy('LT.NS', 15)], ctx({ holdings: full, sprint: sprint() }))[0], /positions/)
})
test('max 5 positions: a full exit frees a slot the same day', () => {
  const full = ['A', 'B', 'C', 'D', 'E'].map(s => ({ symbol: `${s}.NS`, quantity: 1, buy_price: 100 }))
  const prices = { ...PRICES, 'A.NS': 100 }
  assert.equal(rejectedFor([sell('A.NS', 1), buy('LT.NS', 15)], ctx({ holdings: full, prices, sprint: sprint() })).length, 0)
})
test('SELLs are never blocked by sprint rules', () => {
  assert.equal(rejectedFor([sell('TCS.NS', 20)], ctx({ sprint: sprint({ intelOk: false, regimeOk: false }) })).length, 0)
})

console.log(failures === 0 ? '\nAll validator tests passed' : `\n${failures} test(s) FAILED`)
process.exit(failures === 0 ? 0 : 1)
