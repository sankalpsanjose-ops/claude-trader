'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
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

  const base = data[0].value
  const chartData = data.map(p => ({
    date: formatDate(p.date),
    pct: ((p.value - base) / base) * 100,
    close: p.value,
  }))

  const lastPct = chartData[chartData.length - 1].pct
  const isUp = lastPct >= 0

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs">
        <span className="text-[#8b949e]">Base</span>
        <span className="text-[#e6edf3] font-medium">{base.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        <span className="text-[#8b949e]">on {formatDate(data[0].date)}</span>
        <span className={isUp ? 'text-[#3fb950]' : 'text-[#f85149]'}>
          {lastPct >= 0 ? '+' : ''}{lastPct.toFixed(2)}% now
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
          <ReferenceLine y={0} stroke="#484f58" strokeDasharray="4 3" />
          <Tooltip
            contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: '#8b949e' }}
            formatter={(_v: unknown, _name: unknown, props: { payload?: { pct: number; close: number } }) => {
              const { pct, close } = props.payload ?? { pct: 0, close: 0 }
              return [
                `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}% (${close.toLocaleString('en-IN', { maximumFractionDigits: 0 })})`,
                'Nifty 50',
              ]
            }}
          />
          <Line
            type="monotone"
            dataKey="pct"
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
