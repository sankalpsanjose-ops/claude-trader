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
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-12 text-center text-[#6e7681] text-sm">
        No trades yet — Claude will place its first orders tonight.
      </div>
    )
  }

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
        <div className="font-semibold text-[#e6edf3]">Trade History</div>
        <div className="text-sm text-[#8b949e]">{trades.length} trades</div>
      </div>

      {/* Mobile: stacked cards — the table's hidden columns (price, P&L, rationale)
          would otherwise be scrolled off-screen with no affordance that they exist */}
      <div className="sm:hidden divide-y divide-[#21262d]">
        {trades.map(t => {
          const { buyPrice, sellPrice } = deriveTradeMath(t)
          return (
            <div key={t.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#8b949e]">
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
              <div className="font-semibold text-[#e6edf3]">{t.name}</div>
              <div className="text-[11px] text-[#8b949e] font-mono mb-2">{t.symbol} · {t.exchange}</div>
              <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                <div>
                  <div className="text-[10px] text-[#8b949e] uppercase tracking-wider">Qty</div>
                  <div className="text-[#e6edf3] font-mono">{t.quantity}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8b949e] uppercase tracking-wider">{sellPrice != null ? 'Sell' : 'Buy'}</div>
                  <div className="text-[#e6edf3] font-mono">{fmt(sellPrice ?? buyPrice)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8b949e] uppercase tracking-wider">P&amp;L</div>
                  <div className="font-mono font-semibold">
                    {t.realised_pnl != null ? (
                      <span className={t.realised_pnl >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}>
                        {t.realised_pnl >= 0 ? '+' : ''}{fmt(t.realised_pnl)}
                      </span>
                    ) : (
                      <span className="text-[#484f58]">—</span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-[#8b949e] leading-relaxed">{t.rationale}</p>
            </div>
          )
        })}
      </div>

      <div className="overflow-x-auto hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow className="border-[#30363d] hover:bg-transparent">
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider">Date</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider">Stock</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider hidden sm:table-cell">Exch</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider">Action</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-right">Qty</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-right hidden sm:table-cell">Buy Price</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-right hidden sm:table-cell">Sell Price</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-right hidden sm:table-cell">Net Proceeds</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-right">P&amp;L</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider">Rationale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map(t => {
              const { buyPrice, sellPrice } = deriveTradeMath(t)

              return (
                <TableRow key={t.id} className="border-[#21262d] hover:bg-[#1c2128]">
                  <TableCell className="text-[#8b949e] text-sm whitespace-nowrap">
                    {new Date(t.executed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-[#e6edf3]">{t.name}</div>
                    <div className="text-[11px] text-[#8b949e] font-mono">{t.symbol}</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="text-[10px] border-[#30363d] text-[#8b949e]">
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
                  <TableCell className="text-right text-[#e6edf3]">{t.quantity}</TableCell>

                  {/* Buy price — shown for all rows */}
                  <TableCell className="text-right font-mono text-[#e6edf3] hidden sm:table-cell">
                    {fmt(buyPrice)}
                  </TableCell>

                  {/* Sell price — only for SELL rows */}
                  <TableCell className="text-right font-mono hidden sm:table-cell">
                    {sellPrice != null
                      ? <span className="text-[#f85149]">{fmt(sellPrice)}</span>
                      : <span className="text-[#484f58]">—</span>
                    }
                  </TableCell>

                  {/* Net proceeds for SELL, cost for BUY */}
                  <TableCell className="text-right font-mono text-[#8b949e] hidden sm:table-cell">
                    {fmt(t.total_value)}
                  </TableCell>

                  {/* Realised P&L — SELL only */}
                  <TableCell className="text-right font-semibold font-mono">
                    {t.realised_pnl != null ? (
                      <span className={t.realised_pnl >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}>
                        {t.realised_pnl >= 0 ? '+' : ''}{fmt(t.realised_pnl)}
                      </span>
                    ) : (
                      <span className="text-[#484f58]">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-sm text-[#8b949e] max-w-[220px]">
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
