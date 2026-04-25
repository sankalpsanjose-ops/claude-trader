/**
 * Tests the validator with known-bad inputs to confirm it catches each failure mode.
 * Usage: npx tsx scripts/test-validator.ts
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { validateDecisions, sanityCheckDecisions } from '../lib/validator'

const PRICES = {
  'RELIANCE.NS': 1327.80,
  'TCS.NS':      3412.50,
  'INFY.NS':     1480.00,
  'HDFCBANK.NS': 1910.50,
}

const HOLDINGS = [
  { symbol: 'TCS.NS',      quantity: 3, buy_price: 3200 },
  { symbol: 'HDFCBANK.NS', quantity: 4, buy_price: 1842 },
]

const CTX = {
  cash: 12000,
  total_value: 50000,
  holdings: HOLDINGS,
  prices: PRICES,
}

type Result = { passed: boolean; detail: string }

function check(label: string, expected: 'REJECT' | 'PASS', decisions: object[]): Result {
  const { valid, rejected } = validateDecisions(decisions as never, CTX)
  const gotRejected = rejected.length > 0
  const pass = expected === 'REJECT' ? gotRejected : !gotRejected
  const symbol = pass ? '✅' : '❌'
  const detail = gotRejected ? `rejected: ${rejected[0]}` : `passed: ${valid.map(d => d.symbol).join(', ')}`
  console.log(`${symbol} ${label}`)
  if (gotRejected) console.log(`   → ${rejected[0]}`)
  return { passed: pass, detail }
}

console.log('\n─── Validator unit tests ───────────────────────────────\n')

const results: Result[] = []

// 1. Hallucinated symbol (no price in Yahoo Finance data)
results.push(check(
  'Hallucinated symbol (FAKESTOCK.NS)',
  'REJECT',
  [{ symbol: 'FAKESTOCK.NS', action: 'BUY', quantity: 5, rationale: 'looks good' }]
))

// 2. Invalid suffix
results.push(check(
  'Invalid suffix (RELIANCE without .NS/.BO)',
  'REJECT',
  [{ symbol: 'RELIANCE', action: 'BUY', quantity: 2, rationale: 'strong fundamentals' }]
))

// 3. Insufficient cash (would breach ₹5,000 reserve)
results.push(check(
  'Insufficient cash — breach ₹5k reserve',
  'REJECT',
  [{ symbol: 'RELIANCE.NS', action: 'BUY', quantity: 10, rationale: 'buy lots' }]
  // 10 × ₹1327 = ₹13,270 but only ₹12,000 - ₹5,000 = ₹7,000 available
))

// 4. Exceeds 20% position limit
results.push(check(
  'Exceeds 20% position limit',
  'REJECT',
  [{ symbol: 'TCS.NS', action: 'BUY', quantity: 5, rationale: 'double down' }]
  // existing 3 shares + 5 more = 8 × ₹3412 = ₹27,296 = 54% of ₹50,000
))

// 5. SELL stock not in holdings
results.push(check(
  'SELL stock not in holdings',
  'REJECT',
  [{ symbol: 'INFY.NS', action: 'SELL', quantity: 3, rationale: 'take profit' }]
))

// 6. Zero quantity
results.push(check(
  'Zero quantity',
  'REJECT',
  [{ symbol: 'RELIANCE.NS', action: 'BUY', quantity: 0, rationale: 'test' }]
))

// 7. Valid BUY — should pass
results.push(check(
  'Valid BUY within limits',
  'PASS',
  [{ symbol: 'RELIANCE.NS', action: 'BUY', quantity: 3, rationale: 'momentum strong' }]
  // 3 × ₹1327 = ₹3,981 — cash becomes ₹12,000 - ₹3,981 = ₹8,019 > ₹5,000 ✓
  // position = ₹3,981 / ₹50,000 = 7.9% < 20% ✓
))

// 8. Valid SELL — should pass
results.push(check(
  'Valid SELL of held stock',
  'PASS',
  [{ symbol: 'TCS.NS', action: 'SELL', quantity: 2, rationale: 'trim position' }]
))

// 9. HOLD always passes
results.push(check(
  'HOLD always passes',
  'PASS',
  [{ symbol: 'FAKESTOCK.NS', action: 'HOLD', quantity: 0, rationale: 'wait' }]
))

const passed = results.filter(r => r.passed).length
const total  = results.length
console.log(`\n─── Results: ${passed}/${total} tests passed ───────────────────────────\n`)

if (passed < total) {
  console.log('⚠️  Some tests failed — validator has gaps')
  process.exit(1)
} else {
  console.log('✅  All validator tests passed — safe to run backtest\n')
}
