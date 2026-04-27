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
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-12 text-center text-[#6e7681] text-sm">
        No open positions yet — Claude will make its first trades after market close today.
      </div>
    )
  }

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
        <div className="font-semibold text-[#e6edf3]">Current Holdings</div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#484f58]">Prices via Yahoo Finance · updated on page load</span>
          <span className="text-sm text-[#8b949e]">{holdings.length} positions</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[#30363d] hover:bg-transparent">
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider">Stock</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider">Exchange</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider">Buy Date</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-right">Qty</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-right">Avg Cost</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-right">Current</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-right">Invested</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-right">Value</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-right">P&amp;L</TableHead>
              <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-right">P&amp;L %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map(h => (
              <TableRow key={h.id} className="border-[#21262d] hover:bg-[#1c2128]">
                <TableCell>
                  <div className="font-semibold text-[#e6edf3]">{h.name}</div>
                  <div className="text-[11px] text-[#8b949e] font-mono">{h.symbol}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] border-[#30363d] text-[#8b949e]">
                    {h.exchange}
                  </Badge>
                </TableCell>
                <TableCell className="text-[#8b949e] text-sm">
                  {new Date(h.buy_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </TableCell>
                <TableCell className="text-right text-[#e6edf3]">{h.quantity}</TableCell>
                <TableCell className="text-right text-[#e6edf3] font-mono">{fmt(h.buy_price)}</TableCell>
                <TableCell className="text-right text-[#e6edf3] font-mono">{fmt(h.live_price)}</TableCell>
                <TableCell className="text-right text-[#8b949e] font-mono">{fmt(h.invested)}</TableCell>
                <TableCell className="text-right text-[#e6edf3] font-mono">{fmt(h.current_value)}</TableCell>
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
