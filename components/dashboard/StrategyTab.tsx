import type { Learning } from '@/types'

interface Props {
  content: string
  lastUpdated: string
  version: number
  learnings: Learning[]
}

const CATEGORY_COLOURS: Record<string, string> = {
  sizing:   'bg-[#1f3a5f] text-[#79c0ff]',
  exits:    'bg-[#3d1a1a] text-[#f85149]',
  patience: 'bg-[#1a3a1a] text-[#3fb950]',
  sector:   'bg-[#2d2a1a] text-[#e3b341]',
  risk:     'bg-[#3a1a2d] text-[#db61a2]',
  process:  'bg-[#1a2d3a] text-[#58a6ff]',
  monthly:  'bg-[#21262d] text-[#8b949e]',
}

function renderMarkdown(md: string) {
  const lines = md.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('# ')) { i++; continue }

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="text-[#e6edf3] font-semibold text-sm mt-6 mb-2 pb-1 border-b border-[#21262d]">
          {line.slice(3)}
        </h2>
      )
      i++; continue
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-[#8b949e] text-[11px] uppercase tracking-wider font-semibold mt-4 mb-1">
          {line.slice(4)}
        </h3>
      )
      i++; continue
    }

    if (line.trim() === '---') {
      elements.push(<hr key={key++} className="border-[#21262d] my-4" />)
      i++; continue
    }

    if (line.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const rows = tableLines.filter(l => !l.match(/^\|[-| ]+\|$/))
      elements.push(
        <div key={key++} className="overflow-x-auto my-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#30363d]">
                {rows[0]?.split('|').filter((_, ci) => ci > 0 && ci < rows[0].split('|').length - 1).map((cell, ci) => (
                  <th key={ci} className="text-left text-[11px] uppercase tracking-wider text-[#8b949e] py-2 pr-4 font-semibold">
                    {cell.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, ri) => (
                <tr key={ri} className="border-b border-[#21262d]">
                  {row.split('|').filter((_, ci) => ci > 0 && ci < row.split('|').length - 1).map((cell, ci) => (
                    <td key={ci} className="text-[#e6edf3] font-mono py-2 pr-4 text-sm">
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    if (line.startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={key++} className="space-y-1 my-2 ml-1">
          {items.map((item, ii) => (
            <li key={ii} className="flex gap-2 text-sm text-[#8b949e]">
              <span className="text-[#484f58] mt-0.5 shrink-0">·</span>
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
            </li>
          ))}
        </ul>
      )
      continue
    }

    if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''))
        i++
      }
      elements.push(
        <ol key={key++} className="space-y-1 my-2 ml-1 list-none">
          {items.map((item, ii) => (
            <li key={ii} className="flex gap-2 text-sm text-[#8b949e]">
              <span className="text-[#484f58] shrink-0 font-mono">{ii + 1}.</span>
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
            </li>
          ))}
        </ol>
      )
      continue
    }

    if (line.trim() === '') { i++; continue }

    elements.push(
      <p key={key++} className="text-sm text-[#8b949e] my-1 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
    )
    i++
  }

  return elements
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#e6edf3] font-semibold">$1</strong>')
    .replace(/`(.+?)`/g, '<code class="text-[#79c0ff] bg-[#161b22] px-1 rounded text-[11px] font-mono">$1</code>')
}

export function StrategyTab({ content, lastUpdated, version, learnings }: Props) {
  const dailyLearnings = learnings.filter(l => l.source === 'daily').slice(0, 30)
  const monthlyReflections = learnings.filter(l => l.source === 'monthly_reflection')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 flex items-start justify-between">
        <div>
          <div className="text-[#e6edf3] font-semibold">Claude Trader — Strategy & Mindset</div>
          <div className="text-xs text-[#8b949e] mt-0.5">
            The philosophy, rules, and learnings that drive every trading decision
          </div>
        </div>
        <div className="text-right shrink-0 ml-4">
          <div className="text-[11px] text-[#484f58]">
            v{version} · Updated {new Date(lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          {version > 1 && (
            <div className="text-[10px] text-[#3fb950] mt-0.5">Evolved from backtest learnings</div>
          )}
        </div>
      </div>

      {/* Monthly reflections — shown first if they exist */}
      {monthlyReflections.length > 0 && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#30363d]">
            <div className="font-semibold text-[#e6edf3]">Monthly Reflections</div>
            <div className="text-xs text-[#8b949e] mt-0.5">End-of-month synthesis — what changed and why</div>
          </div>
          <div className="divide-y divide-[#21262d]">
            {monthlyReflections.map(r => (
              <div key={r.id} className="px-4 py-4">
                <div className="text-[11px] text-[#484f58] font-mono mb-2">
                  {new Date(r.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </div>
                <p className="text-sm text-[#8b949e] leading-relaxed whitespace-pre-line">{r.insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily learnings log */}
      {dailyLearnings.length > 0 && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
            <div>
              <div className="font-semibold text-[#e6edf3]">Daily Learnings Log</div>
              <div className="text-xs text-[#8b949e] mt-0.5">One lesson captured after each trading day</div>
            </div>
            <div className="text-xs text-[#8b949e]">{dailyLearnings.length} entries</div>
          </div>
          <div className="divide-y divide-[#21262d]">
            {dailyLearnings.map(l => (
              <div key={l.id} className="px-4 py-3 flex items-start gap-3">
                <div className="text-[11px] text-[#484f58] font-mono whitespace-nowrap mt-0.5 w-20 shrink-0">
                  {new Date(l.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </div>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${CATEGORY_COLOURS[l.category] ?? CATEGORY_COLOURS.process}`}>
                  {l.category}
                </span>
                <p className="text-sm text-[#8b949e] leading-relaxed">{l.insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No learnings yet */}
      {dailyLearnings.length === 0 && monthlyReflections.length === 0 && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 text-center text-[#6e7681] text-sm">
          Learnings log will populate after the first live trading day.
        </div>
      )}

      {/* Profile content */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
        <div className="text-[11px] uppercase tracking-wider text-[#8b949e] font-semibold mb-4">
          Active Trading Profile
        </div>
        {content ? renderMarkdown(content) : (
          <p className="text-sm text-[#6e7681]">Profile not loaded.</p>
        )}
      </div>
    </div>
  )
}
