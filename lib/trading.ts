import type { Holding, HoldingWithLive, Portfolio, SectorAllocation } from '@/types'
import { SECTOR_MAP } from '@/types'

export const STARTING_CAPITAL = 50000
export const MIN_CASH_RESERVE = 5000
export const MAX_POSITION_PCT = 0.20

export function enrichHoldings(
  holdings: Holding[],
  livePrices: Record<string, number>
): HoldingWithLive[] {
  return holdings.map(h => {
    const live_price = livePrices[h.symbol] ?? h.current_price
    const invested = h.buy_price * h.quantity
    const current_value = live_price * h.quantity
    const pnl = current_value - invested
    const pnl_pct = invested > 0 ? (pnl / invested) * 100 : 0
    return { ...h, live_price, invested, current_value, pnl, pnl_pct }
  })
}

export function calcTotalValue(portfolio: Portfolio, holdings: HoldingWithLive[]): number {
  const market_value = holdings.reduce((sum, h) => sum + h.current_value, 0)
  return portfolio.cash + market_value
}

export function calcSectorAllocation(
  holdings: HoldingWithLive[],
  cash: number
): SectorAllocation[] {
  const total = holdings.reduce((s, h) => s + h.current_value, 0) + cash
  const sectorMap: Record<string, number> = { Cash: cash }

  for (const h of holdings) {
    const sector = SECTOR_MAP[h.symbol] ?? 'Other'
    sectorMap[sector] = (sectorMap[sector] ?? 0) + h.current_value
  }

  return Object.entries(sectorMap)
    .map(([sector, value]) => ({ sector, value, pct: (value / total) * 100 }))
    .sort((a, b) => b.value - a.value)
}

export function maxBuyQuantity(
  price: number,
  availableCash: number,
  portfolioValue: number
): number {
  const cashAfterReserve = availableCash - MIN_CASH_RESERVE
  const maxByReserve = Math.floor(cashAfterReserve / price)
  const maxByPosition = Math.floor((portfolioValue * MAX_POSITION_PCT) / price)
  return Math.max(0, Math.min(maxByReserve, maxByPosition))
}
