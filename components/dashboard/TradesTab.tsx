import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { Trade } from '@/types'

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface Props {
  trades: Trade[]
}

function deriveTradeMath(t: Trade) {
  const isSell = t.action === 'SELL'
  // For SELL rows: derive cost basis from realised_pnl
  const buyPrice  = isSell && t.realised_pnl != null
    ? t.price - t.realised_pnl / t.quantity
    : t.price
  const sellPrice = isSell ? t.price : null
  return { isSell, buyPrice, sellPrice }
}

export function TradesTab({ trades }: Props) {
  if (trades.length === 0) {
    return (
      <div className="bg-[#12151a] border border-[#1f242c] rounded-lg p-12 text-center text-[#7a7f88] text-sm">
        No trades yet — Claude will place its first orders tonight.
      </div>
    )
  }

  return (
    <div className="bg-[#12151a] border border-[#1f242c] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f242c]">
        <div className="font-semibold text-[#f4f2ec]">Trade History</div>
        <div className="text-sm text-[#7a7f88]">{trades.length} trades</div>
      </div>

      {/* Mobile: stacked cards — the table's hidden columns (price, P&L, rationale)
          would otherwise be scrolled off-screen with no affordance that they exist */}
      <div className="sm:hidden divide-y divide-[#161819]">
        {trades.map(t => {
          const { buyPrice, sellPrice } = deriveTradeMath(t)
          return (
            <div key={t.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#7a7f88]">
                  {new Date(t.executed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                  t.action === 'BUY'
                    ? 'bg-[#1a4024] text-[#3fb950]'
                    : 'bg-[#3d1a1a] text-[#f85149]'
                }`}>
                  {t.action}
                </span>
              </div>
              <div className="font-semibold text-[#f4f2ec]">{t.name}</div>
              <div className="text-[11px] text-[#7a7f88] font-mono mb-2">{t.symbol} · {t.exchange}</div>
              <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                <div>
                  <div className="text-[10px] text-[#7a7f88] uppercase tracking-[0.1em]">Qty</div>
                  <div className="text-[#f4f2ec] font-mono">{t.quantity}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#7a7f88] uppercase tracking-[0.1em]">{sellPrice != null ? 'Sell' : 'Buy'}</div>
                  <div className="text-[#f4f2ec] font-mono">{fmt(sellPrice ?? buyPrice)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#7a7f88] uppercase tracking-[0.1em]">P&amp;L</div>
                  <div className="font-mono font-semibold">
                    {t.realised_pnl != null ? (
                      <span className={t.realised_pnl >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}>
                        {t.realised_pnl >= 0 ? '+' : ''}{fmt(t.realised_pnl)}
                      </span>
                    ) : (
                      <span className="text-[#5a5f65]">—</span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-[#7a7f88] leading-relaxed">{t.rationale}</p>
            </div>
          )
        })}
      </div>

      <div className="overflow-x-auto hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow className="border-[#1f242c] hover:bg-transparent">
              <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em]">Date</TableHead>
              <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em]">Stock</TableHead>
              <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] hidden sm:table-cell">Exch</TableHead>
              <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em]">Action</TableHead>
              <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] text-right">Qty</TableHead>
              <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] text-right hidden sm:table-cell">Buy Price</TableHead>
              <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] text-right hidden sm:table-cell">Sell Price</TableHead>
              <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] text-right hidden sm:table-cell">Net Proceeds</TableHead>
              <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] text-right">P&amp;L</TableHead>
              <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em]">Rationale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map(t => {
              const { buyPrice, sellPrice } = deriveTradeMath(t)

              return (
                <TableRow key={t.id} className="border-[#161819] hover:bg-[#181a1e]">
                  <TableCell className="text-[#7a7f88] text-sm whitespace-nowrap">
                    {new Date(t.executed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-[#f4f2ec]">{t.name}</div>
                    <div className="text-[11px] text-[#7a7f88] font-mono">{t.symbol}</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="text-[10px] border-[#1f242c] text-[#7a7f88]">
                      {t.exchange}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                      t.action === 'BUY'
                        ? 'bg-[#1a4024] text-[#3fb950]'
                        : 'bg-[#3d1a1a] text-[#f85149]'
                    }`}>
                      {t.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-[#f4f2ec]">{t.quantity}</TableCell>

                  {/* Buy price — shown for all rows */}
                  <TableCell className="text-right font-mono text-[#f4f2ec] hidden sm:table-cell">
                    {fmt(buyPrice)}
                  </TableCell>

                  {/* Sell price — only for SELL rows */}
                  <TableCell className="text-right font-mono hidden sm:table-cell">
                    {sellPrice != null
                      ? <span className="text-[#f85149]">{fmt(sellPrice)}</span>
                      : <span className="text-[#5a5f65]">—</span>
                    }
                  </TableCell>

                  {/* Net proceeds for SELL, cost for BUY */}
                  <TableCell className="text-right font-mono text-[#7a7f88] hidden sm:table-cell">
                    {fmt(t.total_value)}
                  </TableCell>

                  {/* Realised P&L — SELL only */}
                  <TableCell className="text-right font-semibold font-mono">
                    {t.realised_pnl != null ? (
                      <span className={t.realised_pnl >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}>
                        {t.realised_pnl >= 0 ? '+' : ''}{fmt(t.realised_pnl)}
                      </span>
                    ) : (
                      <span className="text-[#5a5f65]">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-sm text-[#7a7f88] max-w-[220px]">
                    <span className="line-clamp-2" title={t.rationale}>{t.rationale}</span>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
