'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { DailyAudit, PendingTrade } from '@/types'

interface Props {
  audits: DailyAudit[]
  pendingTrades: PendingTrade[]
  latestTeamBrief?: string
}

export function AuditTab({ audits, pendingTrades, latestTeamBrief }: Props) {
  const [briefOpen, setBriefOpen] = useState(false)
  return (
    <div className="space-y-4">
      {/* Intelligence brief */}
      {latestTeamBrief && (
        <div className="bg-[#12151a] border border-[#1f242c] rounded-lg overflow-hidden">
          <button
            onClick={() => setBriefOpen(o => !o)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#181a1e] transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="font-semibold text-[#f4f2ec]">Intelligence Brief</div>
              <span className="text-[11px] bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/30 px-2 py-0.5 rounded font-semibold">
                Trading Team
              </span>
            </div>
            <span className="text-[#7a7f88] text-xs">{briefOpen ? '▲ collapse' : '▼ expand'}</span>
          </button>
          {briefOpen && (
            <div className="border-t border-[#1f242c] px-4 py-4">
              <pre className="whitespace-pre-wrap text-xs font-mono text-[#7a7f88] leading-relaxed">
                {latestTeamBrief}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Pending trades queue */}
      <div className="bg-[#12151a] border border-[#1f242c] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1f242c] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-[#f4f2ec]">Queued for Tomorrow&apos;s Open</div>
            {pendingTrades.length > 0 && (
              <span className="text-[11px] bg-[#d4af6a] text-[#f4f2ec] px-2 py-0.5 rounded-full font-semibold">
                {pendingTrades.length} trade{pendingTrades.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="text-xs text-[#7a7f88]">Executes at market open</div>
        </div>
        {pendingTrades.length === 0 ? (
          <div className="px-4 py-8 text-center text-[#7a7f88] text-sm">
            No trades queued — run today&apos;s analysis to generate decisions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#1f242c] hover:bg-transparent">
                  <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em]">Symbol</TableHead>
                  <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em]">Action</TableHead>
                  <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] text-right">Qty</TableHead>
                  <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em]">Exchange</TableHead>
                  <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em]">Rationale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingTrades.map(t => (
                  <TableRow key={t.id} className="border-[#161819] hover:bg-[#181a1e] align-top">
                    <TableCell className="font-mono text-[#f4f2ec] font-semibold">{t.symbol}</TableCell>
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
                    <TableCell className="text-right text-[#f4f2ec] font-mono">{t.quantity}</TableCell>
                    <TableCell className="text-[#7a7f88] text-xs">{t.exchange}</TableCell>
                    <TableCell className="text-xs text-[#7a7f88] whitespace-normal break-words min-w-[120px] sm:min-w-[200px] max-w-[400px]">{t.rationale}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {audits.length === 0 ? (
        <div className="bg-[#12151a] border border-[#1f242c] rounded-lg p-12 text-center text-[#7a7f88] text-sm">
          No audit records yet — they appear after the first end-of-day analysis runs.
        </div>
      ) : (<>
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#12151a] border border-[#1f242c] rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-[0.1em] text-[#7a7f88] font-semibold mb-1">Days Audited</div>
          <div className="text-2xl font-bold text-[#f4f2ec]">{audits.length}</div>
        </div>
        <div className="bg-[#12151a] border border-[#1f242c] rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-[0.1em] text-[#7a7f88] font-semibold mb-1">Decisions Rejected</div>
          <div className="text-2xl font-bold text-[#f85149]">
            {audits.reduce((s, a) => s + (a.rejections?.length ?? 0), 0)}
          </div>
          <div className="text-xs text-[#7a7f88] mt-1">hallucinations + rule breaches caught</div>
        </div>
        <div className="bg-[#12151a] border border-[#1f242c] rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-[0.1em] text-[#7a7f88] font-semibold mb-1">Sanity Check</div>
          <div className="text-2xl font-bold">
            <span className="text-[#3fb950]">
              {audits.filter(a => a.sanity_passed).length}
            </span>
            <span className="text-[#5a5f65] text-lg"> / </span>
            <span className="text-[#f4f2ec]">{audits.length}</span>
          </div>
          <div className="text-xs text-[#7a7f88] mt-1">days passed second-opinion check</div>
        </div>
      </div>

      {/* Per-day audit log */}
      <div className="bg-[#12151a] border border-[#1f242c] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1f242c] flex items-center justify-between">
          <div className="font-semibold text-[#f4f2ec]">Daily Audit Log</div>
          <div className="text-xs text-[#7a7f88]">Most recent first</div>
        </div>

        {/* Mobile: stacked cards — the table hides Rejection Details and Sanity
            Notes below sm, which is the actual substance of this log */}
        <div className="sm:hidden divide-y divide-[#161819]">
          {audits.map(a => {
            const rejCount = a.rejections?.length ?? 0
            const rawCount = a.decisions_raw?.length ?? 0
            const validCount = a.decisions_valid?.length ?? 0

            return (
              <div key={a.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono text-[#7a7f88]">
                    {new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${a.sanity_passed
                      ? 'border-[#3fb950] text-[#3fb950]'
                      : 'border-[#d4af6a] text-[#d4af6a]'}`}
                  >
                    {a.sanity_passed ? 'PASS' : 'WARN'}
                  </Badge>
                </div>
                <div className="flex gap-4 text-sm mb-2">
                  <div><span className="text-[#7a7f88]">Proposed </span><span className="text-[#f4f2ec]">{rawCount}</span></div>
                  <div><span className="text-[#7a7f88]">Approved </span><span className="text-[#3fb950] font-semibold">{validCount}</span></div>
                  <div>
                    <span className="text-[#7a7f88]">Rejected </span>
                    {rejCount > 0
                      ? <span className="text-[#f85149] font-semibold">{rejCount}</span>
                      : <span className="text-[#5a5f65]">—</span>
                    }
                  </div>
                </div>
                {rejCount > 0 && (
                  <div className="text-xs text-[#f85149] mb-2">
                    {a.rejections.map((r, i) => (
                      <div key={i} className="mb-1">
                        <span className="text-[#f4f2ec] font-mono">{r.symbol}</span>
                        {' — '}{r.reason}
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-xs text-[#7a7f88] leading-relaxed">
                  {a.sanity_notes || '—'}
                </div>
              </div>
            )
          })}
        </div>

        <div className="overflow-x-auto hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow className="border-[#1f242c] hover:bg-transparent">
                <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em]">Date</TableHead>
                <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] text-center">Proposed</TableHead>
                <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] text-center">Approved</TableHead>
                <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] text-center">Rejected</TableHead>
                <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] text-center">Sanity</TableHead>
                <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] hidden sm:table-cell">Rejection Details</TableHead>
                <TableHead className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] hidden sm:table-cell">Sanity Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.map(a => {
                const rejCount = a.rejections?.length ?? 0
                const rawCount = a.decisions_raw?.length ?? 0
                const validCount = a.decisions_valid?.length ?? 0

                return (
                  <TableRow key={a.id} className="border-[#161819] hover:bg-[#181a1e] align-top">
                    <TableCell className="text-[#7a7f88] text-sm whitespace-nowrap font-mono">
                      {new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-center text-[#f4f2ec]">{rawCount}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-[#3fb950] font-semibold">{validCount}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {rejCount > 0
                        ? <span className="text-[#f85149] font-semibold">{rejCount}</span>
                        : <span className="text-[#5a5f65]">—</span>
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${a.sanity_passed
                          ? 'border-[#3fb950] text-[#3fb950]'
                          : 'border-[#d4af6a] text-[#d4af6a]'}`}
                      >
                        {a.sanity_passed ? 'PASS' : 'WARN'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[#f85149] max-w-[220px] hidden sm:table-cell">
                      {rejCount > 0
                        ? a.rejections.map((r, i) => (
                            <div key={i} className="mb-1">
                              <span className="text-[#f4f2ec] font-mono">{r.symbol}</span>
                              {' — '}{r.reason}
                            </div>
                          ))
                        : <span className="text-[#7a7f88]">All decisions passed</span>
                      }
                    </TableCell>
                    <TableCell className="text-xs text-[#7a7f88] whitespace-normal break-words min-w-[160px] max-w-[280px] hidden sm:table-cell">
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
