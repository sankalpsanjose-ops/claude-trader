interface StatCardProps {
  label: string
  value: string
  sub?: string
  subPositive?: boolean
  subNegative?: boolean
  /** Force the value to render muted instead of the default bright primary text
   *  (used for neutral/informational values, e.g. "Last Analysis" when fresh). */
  valueMuted?: boolean
}

export function StatCard({ label, value, sub, subPositive, subNegative, valueMuted }: StatCardProps) {
  const valueClass = subPositive
    ? 'text-[#3fb950]'
    : subNegative
    ? 'text-[#f85149]'
    : valueMuted
    ? 'text-[#7a7f88]'
    : 'text-[#f4f2ec]'

  const subClass = subPositive
    ? 'text-[#3fb950]'
    : subNegative
    ? 'text-[#f85149]'
    : 'text-[#7a7f88]'

  return (
    <div className="border-l border-[#1f242c] pl-4 max-md:[&:nth-child(odd)]:border-l-0 max-md:[&:nth-child(odd)]:pl-0 md:first:border-l-0 md:first:pl-0">
      <div className="text-[11px] uppercase tracking-[0.1em] text-[#7a7f88] font-semibold mb-1.5">
        {label}
      </div>
      <div className={`text-2xl font-bold ${valueClass}`}>{value}</div>
      {sub && <div className={`text-xs mt-1 ${subClass}`}>{sub}</div>}
    </div>
  )
}
