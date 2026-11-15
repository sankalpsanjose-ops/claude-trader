/**
 * Tests the sprint strategy rules (exit levels, momentum filter, candidate picking).
 * Pure functions only — no network, no API calls.
 * Usage: npx tsx scripts/test-strategy.ts
 */
import assert from 'node:assert/strict'
import {
  SPRINT,
  computeExitLevel,
  checkMomentumEntry,
  pickMomentumCandidates,
} from '../lib/strategy'
import type { TechnicalSignal } from '../lib/agents/types'

let failures = 0
function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failures++
    console.log(`  ✗ ${name}\n    ${(e as Error).message}`)
  }
}

const sig = (over: Partial<TechnicalSignal> = {}): TechnicalSignal => ({
  rsi14: 60, sma20: 100, sma50: 95, aboveSma20: true, aboveSma50: true,
  momentum: 'strong', momentumPct: 5, currentPrice: 105, avgVolume20: 1e6, volumeRatio: 1,
  ...over,
})

console.log('computeExitLevel')

test('fresh position: initial stop 8% below entry, not triggered', () => {
  const x = computeExitLevel('A.NS', 100, [101, 99, 102], 98)
  assert.equal(x.stopKind, 'initial')
  assert.equal(x.stop, 92)
  assert.equal(x.triggered, false)
})

test('hard stop triggers at or below -8%', () => {
  const x = computeExitLevel('A.NS', 100, [97, 94], 92)
  assert.equal(x.triggered, true)
})

test('after +6% high, stop locks to breakeven + fees buffer', () => {
  const x = computeExitLevel('A.NS', 100, [103, 106.5, 102], 101)
  assert.equal(x.stopKind, 'breakeven')
  assert.equal(x.stop, 100.5)
  assert.equal(x.triggered, false)
  assert.equal(computeExitLevel('A.NS', 100, [106.5], 100.4).triggered, true)
})

test('SBIN replay: +12.1% high then fade exits near +3%, not -0.4%', () => {
  // Real trade: entry 1002.7, peaked ~+12.1%, was sold at 999 (-0.4%).
  const entry = 1002.7
  const high = entry * 1.121
  const x = computeExitLevel('SBIN.NS', entry, [entry, high, entry * 1.05], entry * 1.03)
  assert.equal(x.stopKind, 'trailing')
  assert.ok(Math.abs(x.stop - high * 0.92) <= 0.005, `stop ${x.stop}`) // rounded to paise
  assert.equal(x.triggered, true) // 1.03 < 1.121 * 0.92 = 1.0313
})

test('ICICIBANK today (+24.6%, peak +27.1%): trailing, not triggered', () => {
  const entry = 1271.3
  const x = computeExitLevel('ICICIBANK.NS', entry, [entry * 1.1, entry * 1.271], entry * 1.246)
  assert.equal(x.stopKind, 'trailing')
  assert.equal(x.triggered, false)
})

test('current price counts toward high-water', () => {
  const x = computeExitLevel('A.NS', 100, [100], 111)
  assert.equal(x.highWater, 111)
  assert.equal(x.stopKind, 'trailing')
})

console.log('checkMomentumEntry')

test('passes: above both SMAs, RSI under cap', () => {
  assert.equal(checkMomentumEntry('A.NS', sig()).ok, true)
})
test('rejects: no technical data', () => {
  assert.equal(checkMomentumEntry('A.NS', undefined).ok, false)
})
test('rejects: below 50 SMA (falling stock — the TATASTEEL/COALINDIA pattern)', () => {
  const r = checkMomentumEntry('A.NS', sig({ aboveSma50: false }))
  assert.equal(r.ok, false)
  assert.match(r.reason, /50/)
})
test('rejects: below 20 SMA', () => {
  assert.equal(checkMomentumEntry('A.NS', sig({ aboveSma20: false })).ok, false)
})
test('rejects: RSI above cap (blow-off)', () => {
  assert.equal(checkMomentumEntry('A.NS', sig({ rsi14: SPRINT.RSI_MAX + 1 })).ok, false)
})
test('rejects: negative 10-day momentum', () => {
  assert.equal(checkMomentumEntry('A.NS', sig({ momentumPct: -1 })).ok, false)
})

console.log('pickMomentumCandidates')

test('ranks eligible by 10-day momentum, excludes held and index symbols', () => {
  const signals: Record<string, TechnicalSignal> = {
    'A.NS': sig({ momentumPct: 2 }),
    'B.NS': sig({ momentumPct: 9 }),
    'C.NS': sig({ momentumPct: 5 }),
    'D.NS': sig({ aboveSma50: false, momentumPct: 20 }),
    'HELD.NS': sig({ momentumPct: 30 }),
    '^NSEI': sig({ momentumPct: 40 }),
  }
  assert.deepEqual(pickMomentumCandidates(signals, ['HELD.NS'], 2), ['B.NS', 'C.NS'])
})

console.log(failures === 0 ? '\nAll strategy tests passed' : `\n${failures} test(s) FAILED`)
process.exit(failures === 0 ? 0 : 1)
