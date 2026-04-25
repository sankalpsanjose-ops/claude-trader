'use client'

import type { SectorAllocation } from '@/types'

const COLORS: Record<string, string> = {
  Banking: '#58a6ff',
  IT: '#bc8cff',
  Energy: '#f0883e',
  Auto: '#3fb950',
  Pharma: '#f78166',
  FMCG: '#ffa657',
  Consumer: '#79c0ff',
  Telecom: '#a5d6ff',
  Materials: '#d2a8ff',
  Other: '#6e7681',
  Cash: '#484f58',
}

interface Props {
  data: SectorAllocation[]
}

export function SectorChart({ data }: Props) {
  return (
    <div className="space-y-3">
      {data.map(item => (
        <div key={item.sector} className="flex items-center gap-3">
          <div className="w-24 text-sm text-[#c9d1d9] shrink-0">{item.sector}</div>
          <div className="flex-1 bg-[#21262d] rounded h-1.5">
            <div
              className="h-1.5 rounded transition-all duration-500"
              style={{
                width: `${Math.min(item.pct, 100)}%`,
                backgroundColor: COLORS[item.sector] ?? COLORS.Other,
              }}
            />
          </div>
          <div className="w-10 text-right text-xs text-[#8b949e]">{item.pct.toFixed(1)}%</div>
        </div>
      ))}
    </div>
  )
}
