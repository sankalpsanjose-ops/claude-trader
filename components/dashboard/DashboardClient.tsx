'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SummaryTab } from './SummaryTab'
import { HoldingsTab } from './HoldingsTab'
import { TradesTab } from './TradesTab'
import { AuditTab } from './AuditTab'
import { StrategyTab } from './StrategyTab'
import { ChangelogTab } from './ChangelogTab'
import { DecisionTrailTab } from './DecisionTrailTab'
import { AskTab } from './AskTab'
import { todayIST } from '@/lib/ist'
import type { PortfolioSummary, HoldingWithLive, Trade, DailyAudit, Learning, PendingTrade, TraderProfile, DailyAnalysis } from '@/types'

interface Props {
  summary: PortfolioSummary | null
  holdings: HoldingWithLive[]
  trades: Trade[]
  audits: DailyAudit[]
  learnings: Learning[]
  pendingTrades: PendingTrade[]
  traderProfiles: TraderProfile[]
  analyses: DailyAnalysis[]
  traderProfile: string
  profileUpdatedAt: string
  profileVersion: number
  usingTradingTeam: boolean
  liveStartDate?: string
  startingCapital: number
}

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function DashboardClient({ summary, holdings, trades, audits, learnings, pendingTrades, traderProfiles, analyses, traderProfile, profileUpdatedAt, profileVersion, usingTradingTeam, liveStartDate, startingCapital }: Props) {
  const [tab, setTab] = useState('summary')

  const portfolioValue = summary?.portfolio.total_value ?? startingCapital
  const totalPnl = summary?.total_pnl ?? 0
  const totalPnlPct = summary?.total_pnl_pct ?? 0
  const lastUpdated = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
    timeZoneName: 'short',
  })

  // Under normal operation the evening cron writes a new analysis every calendar
  // day (weekends included — it just runs observe-only), so a gap of 2+ days
  // means the pipeline actually failed, not just "hasn't run yet today."
  // Displayed in the Summary tab's stat row (Task 6) as "Last Analysis".
  const latestAnalysisDate = summary?.latest_analysis?.date ?? null
  const daysSinceAnalysis = latestAnalysisDate
    ? Math.max(0, Math.round((new Date(todayIST()).getTime() - new Date(latestAnalysisDate).getTime()) / 86400000))
    : null

  const inceptionDate = summary?.portfolio.inception_date ?? null
  const formattedInceptionDate = inceptionDate
    ? new Date(inceptionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const lastBenchmark = summary?.benchmark_history?.length
    ? summary.benchmark_history[summary.benchmark_history.length - 1].value
    : null
  const benchmarkPct = lastBenchmark ? ((lastBenchmark - startingCapital) / startingCapital * 100) : null

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Header: quiet identity strip + hero portfolio value */}
      <div className="bg-[#12151a] border-b border-[#1f242c]">
        {/* Quiet top strip */}
        <div className="px-4 md:px-6 pt-4 pb-3 flex items-center justify-between gap-3">
          <div className="rounded-md overflow-hidden">
            <Image src="/logo.png" alt="Claude Trader" width={120} height={32} className="h-6 md:h-7 w-auto block" priority />
          </div>
          <div className="flex items-center gap-2 text-[12px] text-[#7a7f88] whitespace-nowrap">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#5a5f65]" aria-hidden="true" />
            <span suppressHydrationWarning>
              Paper trading · {usingTradingTeam ? 'Trading team' : 'Solo agent'} · Updated {lastUpdated}
            </span>
          </div>
        </div>

        {/* Hero: portfolio value */}
        <div className="px-4 md:px-6 pb-6">
          <div className="text-[11px] uppercase tracking-[0.1em] text-[#7a7f88] mb-2">
            Portfolio Value{summary?.days_running != null ? ` · Day ${summary.days_running} of Season 2` : ''}
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-5xl md:text-6xl font-light text-[#f4f2ec] tabular-nums">{fmt(portfolioValue)}</span>
            <span className={`text-lg md:text-xl font-medium ${totalPnl >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
              {totalPnl >= 0 ? '▲' : '▼'} {totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%
            </span>
          </div>
          <div className="text-[13px] text-[#7a7f88] mt-2">
            Started {fmt(startingCapital)}{formattedInceptionDate ? ` on ${formattedInceptionDate}` : ''}
            {benchmarkPct !== null ? ` · vs Nifty 50 ${benchmarkPct >= 0 ? '+' : ''}${benchmarkPct.toFixed(2)}% since inception` : ''}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="bg-[#12151a] border-b border-[#1f242c] overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <div className="px-4 md:px-6">
          <TabsList className="bg-transparent h-auto p-0 gap-0 rounded-none flex-nowrap min-w-max">
            {(['summary', 'holdings', 'trades', 'audit', 'trail', 'strategy', 'changelog', 'ask'] as const).map(t => (
              <TabsTrigger
                key={t}
                value={t}
                className="rounded-none border-x-0 border-t-0 border-b-[3px] border-b-transparent px-4 py-3 text-[11px] uppercase tracking-[0.1em] font-medium text-[#7a7f88] data-active:bg-transparent data-active:text-[#d4af6a] data-active:border-b-[#d4af6a] data-active:shadow-none hover:text-[#f4f2ec] transition-colors"
              >
                {t}
              </TabsTrigger>
            ))}
          </TabsList>
          </div>
        </div>

        <div className="px-4 md:px-6 py-5">
          <TabsContent value="summary" className="mt-0">
            {summary ? (
              <SummaryTab data={summary} liveStartDate={liveStartDate} startingCapital={startingCapital} daysSinceAnalysis={daysSinceAnalysis} />
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
            <AuditTab audits={audits} pendingTrades={pendingTrades} latestTeamBrief={summary?.latest_analysis?.team_brief} />
          </TabsContent>

          <TabsContent value="trail" className="mt-0">
            <DecisionTrailTab analyses={analyses} />
          </TabsContent>

          <TabsContent value="strategy" className="mt-0">
            <StrategyTab content={traderProfile} lastUpdated={profileUpdatedAt} version={profileVersion} learnings={learnings} usingTradingTeam={usingTradingTeam} />
          </TabsContent>

          <TabsContent value="changelog" className="mt-0">
            <ChangelogTab profiles={traderProfiles} />
          </TabsContent>

          <TabsContent value="ask" className="mt-0">
            <AskTab usingTradingTeam={usingTradingTeam} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Footer */}
      <div className="px-4 md:px-6 pb-6 text-center text-[11px] text-[#5a5f65]">
        Claude Trader · ₹{startingCapital.toLocaleString('en-IN')} starting capital · NSE &amp; BSE · No real money involved
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-[#12151a] border border-[#1f242c] rounded-lg p-12 text-center text-[#7a7f88] text-sm">
      {message}
    </div>
  )
}
