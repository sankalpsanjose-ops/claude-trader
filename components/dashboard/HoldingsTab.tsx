import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { HoldingWithLive } from '@/types'

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface Props {
  holdings: HoldingWithLive[]
}

export function HoldingsTab({ holdings }: Props) {
  if (holdings.length === 0) {
    return (
      <div className="bg-[#12151a] border border-[#1f242c] rounded-lg p-12 text-center text-[#5a5f65] text-sm">
        No open positions yet — Claude will make its first trades after market close today.
      </div>
    )
  }

  return (
    <div className="bg-[#12151a] border border-[#1f242c] rounded-lg overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f242c]">
        <div className="font-semibold text-[#f4f2ec]">Current Holdings</div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#5a5f65]">Prices via Yahoo Finance · updated on page load</span>
          <span className="text-sm text-[#7a7f88]">{holdings.length} positions</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[#1f242c] hover:bg-transparent">
              <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em]">Stock</TableHead>
              <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] hidden sm:table-cell">Exchange</TableHead>
              <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] hidden sm:table-cell">Buy Date</TableHead>
              <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] text-right">Qty</TableHead>
              <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] text-right hidden sm:table-cell">Avg Cost</TableHead>
              <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] text-right">Current</TableHead>
              <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] text-right hidden sm:table-cell">Invested</TableHead>
              <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] text-right">Value</TableHead>
              <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] text-right">P&amp;L</TableHead>
              <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] text-right">P&amp;L %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map(h => (
              <TableRow key={h.id} className="border-[#161819] hover:bg-[#181a1e]">
                <TableCell>
                  <div className="font-semibold text-[#f4f2ec]">{h.name}</div>
                  <div className="text-[11px] text-[#7a7f88] font-mono">{h.symbol}</div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="outline" className="text-[10px] border-[#1f242c] text-[#7a7f88]">
                    {h.exchange}
                  </Badge>
                </TableCell>
                <TableCell className="text-[#7a7f88] text-sm hidden sm:table-cell">
                  {new Date(h.buy_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </TableCell>
                <TableCell className="text-right text-[#f4f2ec]">{h.quantity}</TableCell>
                <TableCell className="text-right text-[#f4f2ec] font-mono hidden sm:table-cell">{fmt(h.buy_price)}</TableCell>
                <TableCell className="text-right text-[#f4f2ec] font-mono">{fmt(h.live_price)}</TableCell>
                <TableCell className="text-right text-[#7a7f88] font-mono hidden sm:table-cell">{fmt(h.invested)}</TableCell>
                <TableCell className="text-right text-[#f4f2ec] font-mono">{fmt(h.current_value)}</TableCell>
                <TableCell className={`text-right font-semibold font-mono ${h.pnl >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                  {h.pnl >= 0 ? '+' : ''}{fmt(h.pnl)}
                </TableCell>
                <TableCell className={`text-right font-semibold ${h.pnl_pct >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                  {h.pnl_pct >= 0 ? '+' : ''}{h.pnl_pct.toFixed(2)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
