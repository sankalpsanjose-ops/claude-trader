import { getHistoricals } from '@/lib/yahoo'
import type { BravoReport, TechnicalSignal } from './types'

function computeRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50

  let avgGain = 0
  let avgLoss = 0

  // First period: simple average
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1]
    if (change > 0) avgGain += change
    else avgLoss += Math.abs(change)
  }
  avgGain /= period
  avgLoss /= period

  // Wilder smoothing for the rest
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1]
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period
  }

  if (avgLoss === 0) return 100
  return 100 - 100 / (1 + avgGain / avgLoss)
}

function computeSMA(closes: number[], period: number): number {
  if (closes.length < period) return closes[closes.length - 1] ?? 0
  const slice = closes.slice(closes.length - period)
  return slice.reduce((sum, v) => sum + v, 0) / period
}

export async function runBravo(symbols: string[]): Promise<BravoReport> {
  const historicals = await getHistoricals(symbols, 60)
  const signals: Record<string, TechnicalSignal> = {}

  for (const symbol of symbols) {
    const rows = historicals[symbol] ?? []
    if (rows.length < 20) continue

    const closes = rows.map(r => r.close)
    const currentPrice = closes[closes.length - 1]
    const rsi14 = computeRSI(closes)
    const sma20 = computeSMA(closes, 20)
    const sma50 = computeSMA(closes, 50)

    const tenDaysAgo = closes[closes.length - 11] ?? closes[0]
    const momentumPct = ((currentPrice - tenDaysAgo) / tenDaysAgo) * 100
    const momentum: 'strong' | 'weak' | 'neutral' =
      momentumPct > 3 ? 'strong' : momentumPct < -3 ? 'weak' : 'neutral'

    signals[symbol] = {
      rsi14: Math.round(rsi14 * 10) / 10,
      sma20: Math.round(sma20 * 100) / 100,
      sma50: Math.round(sma50 * 100) / 100,
      aboveSma20: currentPrice > sma20,
      aboveSma50: currentPrice > sma50,
      momentum,
      currentPrice,
    }
  }

  return { signals }
}
