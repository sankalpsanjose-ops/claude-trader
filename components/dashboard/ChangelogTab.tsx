import type { TraderProfile } from '@/types'

interface Props {
  profiles: TraderProfile[]
}

export function ChangelogTab({ profiles }: Props) {
  if (profiles.length === 0) {
    return (
      <div className="bg-[#12151a] border border-[#1f242c] rounded-lg p-12 text-center text-[#5a5f65] text-sm">
        Profile history will appear here after the first monthly reflection runs.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-[11px] uppercase tracking-[0.1em] text-[#7a7f88] font-semibold">
        Trader Profile Version History
      </div>
      {profiles.map(p => (
        <div key={p.id} className="bg-[#12151a] border border-[#1f242c] rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono font-semibold bg-[#d4af6a]/20 text-[#d4af6a] border border-[#d4af6a]/40 px-2 py-0.5 rounded">
              v{p.version}
            </span>
            <span className="text-xs text-[#7a7f88]">
              {new Date(p.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>
            {p.version === profiles[profiles.length - 1].version && (
              <span className="text-[10px] bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/30 px-2 py-0.5 rounded font-semibold">
                INITIAL
              </span>
            )}
            {p.version === profiles[0].version && profiles.length > 1 && (
              <span className="text-[10px] bg-[#d4af6a]/10 text-[#d4af6a] border border-[#d4af6a]/30 px-2 py-0.5 rounded font-semibold">
                CURRENT
              </span>
            )}
          </div>
          <p className="text-sm text-[#f4f2ec] leading-relaxed">{p.change_notes}</p>
        </div>
      ))}
    </div>
  )
}
