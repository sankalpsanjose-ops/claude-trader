import { StatCard } from './StatCard'
import { SectorChart } from './SectorChart'
import { PerformanceChart } from './PerformanceChart'
import { NiftyChart } from './NiftyChart'
import { ClaudeJournal } from './ClaudeJournal'
import { SubscribeCard } from './SubscribeCard'
import type { PortfolioSummary } from '@/types'

function fmtINR(n: number) {
  return `₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function fmtSigned(n: number) {
  return `${n >= 0 ? '+' : '-'}${fmtINR(n)}`
}

interface Props {
  data: PortfolioSummary
  liveStartDate?: string
  startingCapital: number
  daysSinceAnalysis: number | null
}

function fmtLastAnalysis(daysSinceAnalysis: number | null) {
  if (daysSinceAnalysis === null) return 'No analysis yet'
  if (daysSinceAnalysis === 0) return 'Today'
  if (daysSinceAnalysis === 1) return 'Yesterday'
  return `${daysSinceAnalysis} days ago`
}

export function SummaryTab({ data, liveStartDate, startingCapital, daysSinceAnalysis }: Props) {
  const { total_pnl_pct, annualised_return, days_running, today_pnl, open_positions } = data
  const analysisStale = daysSinceAnalysis !== null && daysSinceAnalysis >= 2

  return (
    <div className="space-y-5">
      {/* Row 1: run rate, today's P&L, open positions, analysis freshness */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label={days_running >= 90 ? 'Annualised Return' : 'Monthly Run Rate'}
          value={
            days_running >= 90
              ? `${annualised_return >= 0 ? '+' : ''}${annualised_return.toFixed(1)}%`
              : `${(total_pnl_pct / days_running * 30).toFixed(2)}%`
          }
          sub={days_running >= 90 ? 'annualised (1yr+)' : `est. from ${days_running} days — needs more data`}
          subPositive={total_pnl_pct >= 0}
          subNegative={total_pnl_pct < 0}
        />
        <StatCard
          label="Today's P&L"
          value={fmtSigned(today_pnl)}
          subPositive={today_pnl >= 0}
          subNegative={today_pnl < 0}
        />
        <StatCard
          label="Open Positions"
          value={`${open_positions}`}
          sub={`position${open_positions !== 1 ? 's' : ''} open`}
        />
        <StatCard
          label="Last Analysis"
          value={fmtLastAnalysis(daysSinceAnalysis)}
          subNegative={analysisStale}
          valueMuted={!analysisStale}
        />
      </div>

      {/* Row 2: sector chart + performance chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#12151a] border border-[#1f242c] rounded-lg p-4 shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
          <div className="text-[11px] uppercase tracking-[0.1em] text-[#7a7f88] font-semibold mb-4">
            Sector Allocation
          </div>
          <SectorChart data={data.sector_allocation} />
        </div>

        <div className="bg-[#12151a] border border-[#1f242c] rounded-lg p-4 shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-[0.1em] text-[#7a7f88] font-semibold">
              vs Nifty 50
            </div>
            <div className="text-xs text-[#7a7f88]">
              Base <span className="text-[#f4f2ec]">{fmtINR(startingCapital)}</span>
            </div>
          </div>
          <PerformanceChart data={data.performance_history} benchmark={data.benchmark_history} liveStartDate={liveStartDate} startingCapital={startingCapital} />
        </div>
      </div>

      {/* Row 3: raw Nifty index chart */}
      <div className="bg-[#12151a] border border-[#1f242c] rounded-lg p-4 shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
        <div className="text-[11px] uppercase tracking-[0.1em] text-[#7a7f88] font-semibold mb-3">
          Nifty 50 Index
        </div>
        {data.nifty_raw_history.length > 0
          ? <NiftyChart data={data.nifty_raw_history} />
          : <div className="flex items-center justify-center h-20 text-sm text-[#7a7f88]">Nifty data unavailable — Yahoo Finance may be temporarily down. Refresh to retry.</div>
        }
      </div>

      {/* Claude's journal */}
      {data.latest_analysis && <ClaudeJournal analysis={data.latest_analysis} />}

      {/* Newsletter subscribe */}
      <SubscribeCard />
    </div>
  )
}
