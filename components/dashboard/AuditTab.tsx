import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { DailyAudit, PendingTrade } from '@/types'

interface Props {
  audits: DailyAudit[]
  pendingTrades: PendingTrade[]
}

export function AuditTab({ audits, pendingTrades }: Props) {
  return (
    <div className="space-y-4">
      {/* Pending trades queue */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-[#e6edf3]">Queued for Tomorrow's Open</div>
            {pendingTrades.length > 0 && (
              <span className="text-[11px] bg-[#1f6feb] text-[#cae8ff] px-2 py-0.5 rounded-full font-semibold">
                {pendingTrades.length} trade{pendingTrades.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="text-xs text-[#8b949e]">Executes at market open</div>
        </div>
        {pendingTrades.length === 0 ? (
          <div className="px-4 py-8 text-center text-[#6e7681] text-sm">
            No trades queued — run today's analysis to generate decisions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#30363d] hover:bg-transparent">
                  <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider">Symbol</TableHead>
                  <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider">Action</TableHead>
                  <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-right">Qty</TableHead>
                  <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider">Exchange</TableHead>
                  <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider">Rationale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingTrades.map(t => (
                  <TableRow key={t.id} className="border-[#21262d] hover:bg-[#1c2128] align-top">
                    <TableCell className="font-mono text-[#e6edf3] font-semibold">{t.symbol}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-semibold ${
                          t.action === 'BUY'
                            ? 'border-[#3fb950] text-[#3fb950]'
                            : 'border-[#f85149] text-[#f85149]'
                        }`}
                      >
                        {t.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-[#e6edf3] font-mono">{t.quantity}</TableCell>
                    <TableCell className="text-[#8b949e] text-xs">{t.exchange}</TableCell>
                    <TableCell className="text-xs text-[#8b949e] max-w-[340px]">{t.rationale}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {audits.length === 0 ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-12 text-center text-[#6e7681] text-sm">
          No audit records yet — they appear after the first end-of-day analysis runs.
        </div>
      ) : (<>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-wider text-[#8b949e] font-semibold mb-1">Days Audited</div>
          <div className="text-2xl font-bold text-[#e6edf3]">{audits.length}</div>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-wider text-[#8b949e] font-semibold mb-1">Decisions Rejected</div>
          <div className="text-2xl font-bold text-[#f85149]">
            {audits.reduce((s, a) => s + (a.rejections?.length ?? 0), 0)}
          </div>
          <div className="text-xs text-[#8b949e] mt-1">hallucinations + rule breaches caught</div>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-wider text-[#8b949e] font-semibold mb-1">Sanity Check</div>
          <div className="text-2xl font-bold">
            <span className="text-[#3fb950]">
              {audits.filter(a => a.sanity_passed).length}
            </span>
            <span className="text-[#484f58] text-lg"> / </span>
            <span className="text-[#e6edf3]">{audits.length}</span>
          </div>
          <div className="text-xs text-[#8b949e] mt-1">days passed second-opinion check</div>
        </div>
      </div>

      {/* Per-day audit log */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
          <div className="font-semibold text-[#e6edf3]">Daily Audit Log</div>
          <div className="text-xs text-[#8b949e]">Most recent first</div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[#30363d] hover:bg-transparent">
                <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider">Date</TableHead>
                <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-center">Proposed</TableHead>
                <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-center">Approved</TableHead>
                <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-center">Rejected</TableHead>
                <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider text-center">Sanity</TableHead>
                <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider">Rejection Details</TableHead>
                <TableHead className="text-[#8b949e] text-[11px] uppercase tracking-wider">Sanity Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.map(a => {
                const rejCount = a.rejections?.length ?? 0
                const rawCount = a.decisions_raw?.length ?? 0
                const validCount = a.decisions_valid?.length ?? 0

                return (
                  <TableRow key={a.id} className="border-[#21262d] hover:bg-[#1c2128] align-top">
                    <TableCell className="text-[#8b949e] text-sm whitespace-nowrap font-mono">
                      {new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-center text-[#e6edf3]">{rawCount}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-[#3fb950] font-semibold">{validCount}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {rejCount > 0
                        ? <span className="text-[#f85149] font-semibold">{rejCount}</span>
                        : <span className="text-[#484f58]">—</span>
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${a.sanity_passed
                          ? 'border-[#3fb950] text-[#3fb950]'
                          : 'border-[#f85149] text-[#f85149]'}`}
                      >
                        {a.sanity_passed ? 'PASS' : 'WARN'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[#f85149] max-w-[220px]">
                      {rejCount > 0
                        ? a.rejections.map((r, i) => (
                            <div key={i} className="mb-1">
                              <span className="text-[#e6edf3] font-mono">{r.symbol}</span>
                              {' — '}{r.reason}
                            </div>
                          ))
                        : <span className="text-[#484f58]">All decisions passed</span>
                      }
                    </TableCell>
                    <TableCell className="text-xs text-[#8b949e] max-w-[200px]">
                      {a.sanity_notes || '—'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
      </>)}
    </div>
  )
}
