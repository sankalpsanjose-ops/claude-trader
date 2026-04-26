import { StatCard } from './StatCard'
import { SectorChart } from './SectorChart'
import { PerformanceChart } from './PerformanceChart'
import { ClaudeJournal } from './ClaudeJournal'
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
}

export function SummaryTab({ data, liveStartDate }: Props) {
  const { portfolio, total_pnl, total_pnl_pct, annualised_return, days_running, today_pnl, open_positions } = data

  return (
    <div className="space-y-5">
      {/* Row 1: portfolio value + absolute P&L */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Portfolio Value"
          value={fmtINR(portfolio.total_value)}
          sub={`Started ${fmtINR(50000)} · Day ${days_running}`}
        />
        <StatCard
          label="Total P&L"
          value={fmtSigned(total_pnl)}
          sub={`${total_pnl_pct >= 0 ? '+' : ''}${total_pnl_pct.toFixed(2)}% since inception`}
          subPositive={total_pnl >= 0}
          subNegative={total_pnl < 0}
        />
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
          sub={`${open_positions} open position${open_positions !== 1 ? 's' : ''}`}
          subPositive={today_pnl >= 0}
          subNegative={today_pnl < 0}
        />
      </div>

      {/* Row 2: sector chart + performance chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-wider text-[#8b949e] font-semibold mb-4">
            Sector Allocation
          </div>
          <SectorChart data={data.sector_allocation} />
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-wider text-[#8b949e] font-semibold">
              vs Nifty 50
            </div>
            <div className="text-xs text-[#8b949e]">
              Base <span className="text-[#e6edf3]">{fmtINR(50000)}</span>
            </div>
          </div>
          <PerformanceChart data={data.performance_history} benchmark={data.benchmark_history} liveStartDate={liveStartDate} />
        </div>
      </div>

      {/* Claude's journal */}
      {data.latest_analysis && <ClaudeJournal analysis={data.latest_analysis} />}
    </div>
  )
}
