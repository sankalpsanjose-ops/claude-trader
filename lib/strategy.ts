import type { TechnicalSignal } from '@/lib/agents/types'

/**
 * Sprint rules (2026-11-16 → 2026-11-30). Goal: portfolio ≥ ₹5,00,000 at the Nov 30 close.
 *
 * Everything here is enforced in code, not in the prompt. The prompt-only rules
 * of earlier seasons (stops, targets, "Echo conviction must be HIGH") were never
 * applied consistently, so these are the rules the system actually executes.
 */
export const SPRINT = {
  GOAL_VALUE: 500_000,
  CHECKPOINT_DATE: '2026-11-20',
  CHECKPOINT_VALUE: 494_000,
  END_DATE: '2026-11-30',

  MAX_POSITIONS: 5,
  /** A new position must be at least this share of portfolio value. */
  MIN_NEW_POSITION_PCT: 0.12,
  /** Adding to an existing position must be at least this much. */
  MIN_ADD_VALUE: 15_000,

  /** Hard stop below entry. */
  STOP_PCT: 0.08,
  /** Once the best close since entry is this far above entry, the stop moves to breakeven. */
  BREAKEVEN_TRIGGER_PCT: 0.06,
  /** Breakeven stop sits this far above entry to cover round-trip fees. */
  BREAKEVEN_BUFFER_PCT: 0.005,
  /** Once the best close is this far above entry, the stop trails the high. */
  TRAIL_TRIGGER_PCT: 0.10,
  TRAIL_PCT: 0.08,

  /** Momentum entries above this RSI are treated as blow-off risk. */
  RSI_MAX: 75,
  MAX_CANDIDATES: 12,
} as const

export const NIFTY_SYMBOL = '^NSEI'

export type StopKind = 'initial' | 'breakeven' | 'trailing'

export interface ExitLevel {
  symbol: string
  entry: number
  highWater: number
  stop: number
  stopKind: StopKind
  price: number
  triggered: boolean
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Stop level for a holding, derived only from its entry price and the closes
 * since entry — no stored state, so nothing can drift or need backfilling.
 */
export function computeExitLevel(
  symbol: string,
  entry: number,
  closesSinceEntry: number[],
  price: number,
): ExitLevel {
  const highWater = Math.max(entry, price, ...closesSinceEntry)
  const gainAtHigh = highWater / entry - 1

  let stop = entry * (1 - SPRINT.STOP_PCT)
  let stopKind: StopKind = 'initial'

  if (gainAtHigh >= SPRINT.BREAKEVEN_TRIGGER_PCT) {
    stop = entry * (1 + SPRINT.BREAKEVEN_BUFFER_PCT)
    stopKind = 'breakeven'
  }
  if (gainAtHigh >= SPRINT.TRAIL_TRIGGER_PCT) {
    const trail = highWater * (1 - SPRINT.TRAIL_PCT)
    if (trail > stop) {
      stop = trail
      stopKind = 'trailing'
    }
  }

  stop = round2(stop)
  return { symbol, entry, highWater, stop, stopKind, price, triggered: price <= stop }
}

export function describeExit(x: ExitLevel): string {
  const pct = (n: number) => `${n >= x.entry ? '+' : ''}${((n / x.entry - 1) * 100).toFixed(1)}%`
  return `${x.stopKind} stop ₹${x.stop} (${pct(x.stop)}) | high since entry ₹${x.highWater.toFixed(2)} (${pct(x.highWater)})`
}

/** Momentum entry filter: the stock must already be trending up, not falling. */
export function checkMomentumEntry(
  symbol: string,
  s: TechnicalSignal | undefined,
): { ok: boolean; reason: string } {
  if (!s) return { ok: false, reason: `no technical data for ${symbol}` }
  if (!s.aboveSma50) return { ok: false, reason: `${symbol} is below its 50-day average (downtrend)` }
  if (!s.aboveSma20) return { ok: false, reason: `${symbol} is below its 20-day average` }
  if ((s.momentumPct ?? 0) <= 0) return { ok: false, reason: `${symbol} 10-day momentum is not positive` }
  if (s.rsi14 > SPRINT.RSI_MAX) return { ok: false, reason: `${symbol} RSI ${s.rsi14} is above ${SPRINT.RSI_MAX}` }
  return { ok: true, reason: 'momentum entry' }
}

/** New buys are allowed only while Nifty itself is above its 50-day average. */
export function marketRegimeOk(nifty: TechnicalSignal | undefined): boolean {
  return !!nifty?.aboveSma50
}

export function pickMomentumCandidates(
  signals: Record<string, TechnicalSignal>,
  exclude: string[],
  limit: number = SPRINT.MAX_CANDIDATES,
): string[] {
  const skip = new Set(exclude)
  return Object.entries(signals)
    .filter(([sym]) => (sym.endsWith('.NS') || sym.endsWith('.BO')) && !skip.has(sym))
    .filter(([sym, s]) => checkMomentumEntry(sym, s).ok)
    .sort(([, a], [, b]) => (b.momentumPct ?? 0) - (a.momentumPct ?? 0))
    .slice(0, limit)
    .map(([sym]) => sym)
}
