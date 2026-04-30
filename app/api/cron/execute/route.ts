import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getOpenPrices } from '@/lib/yahoo'
import { MIN_CASH_RESERVE } from '@/lib/trading'
import { isTradingDay } from '@/lib/market-calendar'
import type { PendingTrade } from '@/types'

export const maxDuration = 120

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]
  if (!isTradingDay(today)) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Market closed today — pending trades preserved' })
  }

  // Fetch pending trades and current portfolio
  const [pendingRes, portfolioRes, holdingsRes] = await Promise.all([
    supabaseAdmin.from('pending_trades').select('*'),
    supabaseAdmin.from('portfolio').select('*').single(),
    supabaseAdmin.from('holdings').select('*'),
  ])

  if (portfolioRes.error) return NextResponse.json({ error: portfolioRes.error.message }, { status: 500 })

  const pending: PendingTrade[] = pendingRes.data ?? []
  if (pending.length === 0) return NextResponse.json({ ok: true, executed: 0 })

  const portfolio = portfolioRes.data
  const holdings = holdingsRes.data ?? []

  // Fetch today's open prices for all pending symbols
  const symbols = [...new Set(pending.map(t => t.symbol))]
  const openPrices = await getOpenPrices(symbols)

  let cash = portfolio.cash
  const executed: string[] = []

  for (const trade of pending) {
    const price = openPrices[trade.symbol]
    if (!price) continue

    if (trade.action === 'BUY') {
      const cost = price * trade.quantity
      if (cash - cost < MIN_CASH_RESERVE) continue // enforce cash floor

      cash -= cost

      // Upsert holding (add to existing or create new)
      const existing = holdings.find(h => h.symbol === trade.symbol)
      if (existing) {
        const newQty = existing.quantity + trade.quantity
        const newAvgPrice = (existing.buy_price * existing.quantity + price * trade.quantity) / newQty
        await supabaseAdmin.from('holdings').update({
          quantity: newQty,
          buy_price: newAvgPrice,
          current_price: price,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id)
      } else {
        await supabaseAdmin.from('holdings').insert({
          symbol: trade.symbol,
          name: trade.name,
          exchange: trade.exchange,
          quantity: trade.quantity,
          buy_price: price,
          buy_date: today,
          current_price: price,
        })
      }

      await supabaseAdmin.from('trades').insert({
        symbol: trade.symbol,
        name: trade.name,
        exchange: trade.exchange,
        action: 'BUY',
        quantity: trade.quantity,
        price,
        total_value: cost,
        realised_pnl: null,
        rationale: trade.rationale,
      })
      executed.push(`BUY ${trade.quantity}x ${trade.symbol} @ ₹${price}`)
    }

    if (trade.action === 'SELL') {
      const existing = holdings.find(h => h.symbol === trade.symbol)
      if (!existing) continue

      const qty = Math.min(trade.quantity, existing.quantity)
      const proceeds = price * qty
      const realisedPnl = (price - existing.buy_price) * qty
      cash += proceeds

      if (existing.quantity - qty <= 0) {
        await supabaseAdmin.from('holdings').delete().eq('id', existing.id)
      } else {
        await supabaseAdmin.from('holdings').update({
          quantity: existing.quantity - qty,
          current_price: price,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id)
      }

      await supabaseAdmin.from('trades').insert({
        symbol: trade.symbol,
        name: trade.name,
        exchange: trade.exchange,
        action: 'SELL',
        quantity: qty,
        price,
        total_value: proceeds,
        realised_pnl: realisedPnl,
        rationale: trade.rationale,
      })
      executed.push(`SELL ${qty}x ${trade.symbol} @ ₹${price}`)
    }
  }

  // Update portfolio cash + total value
  const updatedHoldings = await supabaseAdmin.from('holdings').select('*')
  const holdingsData = updatedHoldings.data ?? []
  const marketValue = holdingsData.reduce((s: number, h: { current_price: number; quantity: number }) => s + h.current_price * h.quantity, 0)

  await supabaseAdmin.from('portfolio').update({
    cash,
    total_value: cash + marketValue,
    updated_at: new Date().toISOString(),
  }).eq('id', portfolio.id)

  // Clear pending trades
  await supabaseAdmin.from('pending_trades').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  return NextResponse.json({ ok: true, executed: executed.length, trades: executed })
}
