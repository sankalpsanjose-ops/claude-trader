'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SummaryTab } from './SummaryTab'
import { HoldingsTab } from './HoldingsTab'
import { TradesTab } from './TradesTab'
import { AuditTab } from './AuditTab'
import { StrategyTab } from './StrategyTab'
import type { PortfolioSummary, HoldingWithLive, Trade, DailyAudit, Learning } from '@/types'

interface Props {
  summary: PortfolioSummary | null
  holdings: HoldingWithLive[]
  trades: Trade[]
  audits: DailyAudit[]
  learnings: Learning[]
  traderProfile: string
  profileUpdatedAt: string
  profileVersion: number
}

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function DashboardClient({ summary, holdings, trades, audits, learnings, traderProfile, profileUpdatedAt, profileVersion }: Props) {
  const [tab, setTab] = useState('summary')

  const portfolioValue = summary?.portfolio.total_value ?? 50000
  const totalPnl = summary?.total_pnl ?? 0
  const totalPnlPct = summary?.total_pnl_pct ?? 0
  const lastUpdated = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Top bar */}
      <div className="bg-[#161b22] border-b border-[#30363d] px-4 md:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(56,189,248,0.18),0_8px_32px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
            <Image src="/logo.png" alt="Claude Trader" width={200} height={54} className="h-12 w-auto block" priority />
          </div>
          <span className="text-[11px] bg-[#1f6feb] text-[#cae8ff] px-2.5 py-1 rounded-full font-semibold tracking-wide">
            Paper Trading
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-[#e6edf3] font-semibold">{fmt(portfolioValue)}</span>
          <span className={`text-sm font-medium ${totalPnl >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
            {totalPnl >= 0 ? '▲' : '▼'} {totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%
          </span>
          <span className="text-[#6e7681] text-xs hidden md:inline" suppressHydrationWarning>Updated {lastUpdated}</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="bg-[#161b22] border-b border-[#30363d] px-4 md:px-6">
          <TabsList className="bg-transparent h-auto p-0 gap-0 rounded-none">
            {(['summary', 'holdings', 'trades', 'audit', 'strategy'] as const).map(t => (
              <TabsTrigger
                key={t}
                value={t}
                className="capitalize rounded-none border-b-2 border-transparent px-4 py-3 text-[13px] font-medium text-[#8b949e] data-[state=active]:text-[#58a6ff] data-[state=active]:border-[#58a6ff] data-[state=active]:bg-transparent hover:text-[#e6edf3] transition-colors"
              >
                {t}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="px-4 md:px-6 py-5">
          <TabsContent value="summary" className="mt-0">
            {summary ? (
              <SummaryTab data={summary} />
            ) : (
              <EmptyState message="Portfolio data is loading. Make sure your Supabase and API keys are configured." />
            )}
          </TabsContent>

          <TabsContent value="holdings" className="mt-0">
            <HoldingsTab holdings={holdings} />
          </TabsContent>

          <TabsContent value="trades" className="mt-0">
            <TradesTab trades={trades} />
          </TabsContent>

          <TabsContent value="audit" className="mt-0">
            <AuditTab audits={audits} />
          </TabsContent>

          <TabsContent value="strategy" className="mt-0">
            <StrategyTab content={traderProfile} lastUpdated={profileUpdatedAt} version={profileVersion} learnings={learnings} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Footer */}
      <div className="px-4 md:px-6 pb-6 text-center text-[11px] text-[#484f58]">
        Claude Trader · ₹50,000 starting capital · NSE &amp; BSE · No real money involved
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-12 text-center text-[#6e7681] text-sm">
      {message}
    </div>
  )
}
