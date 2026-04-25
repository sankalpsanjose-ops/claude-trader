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
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[#30363d] hover:bg-transparent">
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider">Date</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider">Stock</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider">Exch</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider">Action</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-right">Qty</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-right">Buy Price</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-right">Sell Price</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-right">Net Proceeds</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-right">P&amp;L</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider">Rationale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map(t => {
              const isSell = t.action === 'SELL'
              // For SELL rows: derive cost basis from realised_pnl
              const buyPrice  = isSell && t.realised_pnl != null
                ? t.price - t.realised_pnl / t.quantity
                : t.price
              const sellPrice = isSell ? t.price : null

              return (
                <TableRow key={t.id} className="border-[#21262d] hover:bg-[#1c2128]">
                  <TableCell className="text-[#8b949e] text-sm whitespace-nowrap">
                    {new Date(t.executed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-[#e6edf3]">{t.name}</div>
                    <div className="text-[11px] text-[#8b949e] font-mono">{t.symbol}</div>
                  </TableCell>
                  <TableCell>
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
                  <TableCell className="text-right font-mono text-[#e6edf3]">
                    {fmt(buyPrice)}
                  </TableCell>

                  {/* Sell price — only for SELL rows */}
                  <TableCell className="text-right font-mono">
                    {sellPrice != null
                      ? <span className="text-[#f85149]">{fmt(sellPrice)}</span>
                      : <span className="text-[#484f58]">—</span>
                    }
                  </TableCell>

                  {/* Net proceeds for SELL, cost for BUY */}
                  <TableCell className="text-right font-mono text-[#8b949e]">
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
                    <span className="line-clamp-2">{t.rationale}</span>
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
