import { Suspense } from 'react'
import { readFileSync } from 'fs'
import { join } from 'path'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { getSummary, getHoldings, getTrades, getAudits, getLearnings, getActiveTraderProfile, getPendingTrades, getTraderProfiles, getAnalyses } from '@/lib/data'

export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0d1117]">
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </div>
  )
}

async function Dashboard() {
  const profilePath = join(process.cwd(), 'docs/trader-profile.md')
  let traderProfile = ''
  try {
    traderProfile = readFileSync(profilePath, 'utf-8')
  } catch { /* file missing — tab shows empty state */ }

  const [summary, holdings, trades, audits, learnings, dbProfile, pendingTrades, traderProfiles, analyses] = await Promise.all([
    getSummary().catch(() => null),
    getHoldings().catch(() => []),
    getTrades().catch(() => []),
    getAudits().catch(() => []),
    getLearnings().catch(() => []),
    getActiveTraderProfile().catch(() => null),
    getPendingTrades().catch(() => []),
    getTraderProfiles().catch(() => []),
    getAnalyses().catch(() => []),
  ])

  // Prefer DB profile (updated by monthly reflection), fall back to bundled file
  const activeProfile = dbProfile?.content ?? traderProfile
  const activeProfileUpdatedAt = dbProfile?.created_at ?? new Date().toISOString()
  const activeProfileVersion = dbProfile?.version ?? 1

  return (
    <DashboardClient
      summary={summary}
      holdings={holdings}
      trades={trades}
      audits={audits}
      learnings={learnings}
      pendingTrades={pendingTrades}
      traderProfiles={traderProfiles}
      analyses={analyses}
      traderProfile={activeProfile}
      profileUpdatedAt={activeProfileUpdatedAt}
      profileVersion={activeProfileVersion}
      usingTradingTeam={process.env.USE_TRADING_TEAM === 'true'}
      liveStartDate={process.env.LIVE_START_DATE}
    />
  )
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-[#161b22] border-b border-[#30363d] h-14" />
      <div className="bg-[#161b22] border-b border-[#30363d] h-11" />
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-lg h-20" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg h-40" />
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg h-40" />
        </div>
      </div>
    </div>
  )
}
