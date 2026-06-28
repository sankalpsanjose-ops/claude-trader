interface StatCardProps {
  label: string
  value: string
  sub?: string
  subPositive?: boolean
  subNegative?: boolean
}

export function StatCard({ label, value, sub, subPositive, subNegative }: StatCardProps) {
  const subClass = subPositive
    ? 'text-[#3fb950]'
    : subNegative
    ? 'text-[#f85149]'
    : 'text-[#8b949e]'

  const accentBorder = subPositive
    ? 'border-l-[#3fb950]'
    : subNegative
    ? 'border-l-[#f85149]'
    : 'border-l-[#30363d]'

  return (
    <div className={`bg-[#161b22] border border-[#30363d] border-l-4 ${accentBorder} rounded-lg p-4 shadow-[0_2px_12px_rgba(0,0,0,0.45)]`}>
      <div className="text-[11px] uppercase tracking-wider text-[#8b949e] font-semibold mb-1.5">
        {label}
      </div>
      <div className="text-2xl font-bold text-[#e6edf3]">{value}</div>
      {sub && <div className={`text-xs mt-1 ${subClass}`}>{sub}</div>}
    </div>
  )
}
