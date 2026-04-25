import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentPrices } from '@/lib/yahoo'
import { enrichHoldings } from '@/lib/trading'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data: holdings, error } = await supabase.from('holdings').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!holdings?.length) return NextResponse.json([])

  const livePrices = await getCurrentPrices(holdings.map(h => h.symbol))
  const enriched = enrichHoldings(holdings, livePrices)

  return NextResponse.json(enriched.sort((a, b) => b.pnl_pct - a.pnl_pct))
}
