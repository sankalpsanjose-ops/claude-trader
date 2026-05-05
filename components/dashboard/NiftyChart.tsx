'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { PerformancePoint } from '@/types'

interface Props {
  data: PerformancePoint[]
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function NiftyChart({ data }: Props) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-20 text-sm text-[#6e7681]">
        Nifty data will appear after the first trading day
      </div>
    )
  }

  const chartData = data.map(p => ({ date: formatDate(p.date), value: p.value }))
  const first = data[0].value
  const last = data[data.length - 1].value
  const changePct = ((last - first) / first) * 100
  const isUp = last >= first

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs">
        <span className="text-[#8b949e]">Current</span>
        <span className="text-[#e6edf3] font-medium">{last.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
        <span className={isUp ? 'text-[#3fb950]' : 'text-[#f85149]'}>
          {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}% since {formatDate(data[0].date)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={80}>
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
            formatter={(v: unknown) => [
              (v as number).toLocaleString('en-IN', { maximumFractionDigits: 0 }),
              'Nifty 50',
            ]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#58a6ff"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: '#58a6ff' }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
