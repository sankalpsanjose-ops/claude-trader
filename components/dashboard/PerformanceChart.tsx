'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import type { PerformancePoint } from '@/types'

interface Props {
  data: PerformancePoint[]
  benchmark?: PerformancePoint[]
  liveStartDate?: string
  startingCapital: number
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function formatINR(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function PerformanceChart({ data, benchmark = [], liveStartDate, startingCapital }: Props) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-[#6e7681]">
        Chart will appear after a few trading days
      </div>
    )
  }

  // Merge portfolio + benchmark by date
  const benchmarkMap = new Map(benchmark.map(p => [p.date, p.value]))
  const chartData = data.map(p => ({
    date: formatDate(p.date),
    claude: p.value,
    nifty: benchmarkMap.get(p.date) ?? null,
  }))

  // Find the formatted x-axis label for the first live data point (>= liveStartDate)
  const liveStartFormatted = liveStartDate
    ? (() => {
        const idx = data.findIndex(p => p.date >= liveStartDate)
        return idx >= 0 ? chartData[idx].date : null
      })()
    : null

  const lastValue = data[data.length - 1].value
  const isUp = lastValue >= startingCapital

  const lastBenchmark = benchmark.length ? benchmark[benchmark.length - 1].value : null
  const benchmarkPct = lastBenchmark ? ((lastBenchmark - startingCapital) / startingCapital * 100) : null
  const claudePct = (lastValue - startingCapital) / startingCapital * 100

  return (
    <div className="space-y-3">
      {/* Mini legend with live returns */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: isUp ? '#3fb950' : '#f85149' }} />
          <span className="text-[#8b949e]">Claude</span>
          <span className={isUp ? 'text-[#3fb950]' : 'text-[#f85149]'}>
            {claudePct >= 0 ? '+' : ''}{claudePct.toFixed(2)}%
          </span>
        </div>
        {lastBenchmark && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: '#58a6ff', opacity: 0.6 }} />
            <span className="text-[#8b949e]">Nifty 50</span>
            <span className={benchmarkPct! >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}>
              {benchmarkPct! >= 0 ? '+' : ''}{benchmarkPct!.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={96}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#6e7681' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: '#8b949e' }}
            formatter={(v: unknown, name: unknown) => [
              formatINR(v as number),
              name === 'claude' ? 'Claude' : 'Nifty 50',
            ]}
          />
          <ReferenceLine y={startingCapital} stroke="#484f58" strokeDasharray="4 3" label={{ value: `₹${(startingCapital / 100000).toFixed(1)}L`, position: 'insideTopRight', fontSize: 10, fill: '#484f58' }} />
          {liveStartFormatted && (
            <ReferenceLine
              x={liveStartFormatted}
              stroke="#e3b341"
              strokeDasharray="4 3"
              label={{ value: 'Live', position: 'insideTopLeft', fontSize: 10, fill: '#e3b341' }}
            />
          )}
          <Line
            type="monotone"
            dataKey="claude"
            stroke={isUp ? '#3fb950' : '#f85149'}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: isUp ? '#3fb950' : '#f85149' }}
          />
          {benchmark.length > 0 && (
            <Line
              type="monotone"
              dataKey="nifty"
              stroke="#58a6ff"
              strokeWidth={1.5}
              strokeOpacity={0.6}
              dot={false}
              activeDot={{ r: 3, fill: '#58a6ff' }}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
