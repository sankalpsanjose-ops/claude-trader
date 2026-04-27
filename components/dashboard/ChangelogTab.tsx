import type { TraderProfile } from '@/types'

interface Props {
  profiles: TraderProfile[]
}

export function ChangelogTab({ profiles }: Props) {
  if (profiles.length === 0) {
    return (
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-12 text-center text-[#6e7681] text-sm">
        Profile history will appear here after the first monthly reflection runs.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-[11px] uppercase tracking-wider text-[#8b949e] font-semibold">
        Trader Profile Version History
      </div>
      {profiles.map(p => (
        <div key={p.id} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono font-semibold bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/40 px-2 py-0.5 rounded">
              v{p.version}
            </span>
            <span className="text-xs text-[#8b949e]">
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
              <span className="text-[10px] bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/30 px-2 py-0.5 rounded font-semibold">
                CURRENT
              </span>
            )}
          </div>
          <p className="text-sm text-[#e6edf3] leading-relaxed">{p.change_notes}</p>
        </div>
      ))}
    </div>
  )
}
