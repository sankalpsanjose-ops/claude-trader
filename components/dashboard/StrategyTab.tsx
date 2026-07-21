import type { Learning } from '@/types'

interface Props {
  content: string
  lastUpdated: string
  version: number
  learnings: Learning[]
  usingTradingTeam: boolean
}

interface AgentDef {
  callsign: string
  role: string
  type: string
  typeColour: string
  description: string
  alwaysActive: boolean
}

const AGENTS: AgentDef[] = [
  {
    callsign: 'ALPHA',
    role: 'World Markets',
    type: 'Pure Data',
    typeColour: 'bg-[#161819] text-[#7a7f88]',
    description: 'Fetches global indices (S&P 500, FTSE, Nikkei, Hang Seng, Euro Stoxx, Shanghai, India VIX), commodities (Brent crude, WTI, gold, natural gas), and forex (USD/INR, Dollar Index, US 10Y yield) before every analysis.',
    alwaysActive: false,
  },
  {
    callsign: 'BRAVO',
    role: 'Technical Analysis',
    type: 'Pure TS',
    typeColour: 'bg-[#161819] text-[#7a7f88]',
    description: 'Computes RSI-14, 20/50-day SMAs, 10-day price momentum, and volume ratio (today vs 20-day average) for all 70 watchlist stocks using 60 days of historical OHLC data.',
    alwaysActive: false,
  },
  {
    callsign: 'CHARLIE',
    role: 'News & Geopolitics',
    type: 'Sonnet',
    typeColour: 'bg-[#2d1a3a] text-[#d2a8ff]',
    description: 'Reads Indian RSS feeds and market headlines, flags geopolitical risks and macro themes, and maintains a living macro intelligence document that persists across sessions — no human input required.',
    alwaysActive: false,
  },
  {
    callsign: 'DELTA',
    role: 'Research',
    type: 'Sonnet',
    typeColour: 'bg-[#2d1a3a] text-[#d2a8ff]',
    description: 'Analyses P/E ratios, analyst price targets, and recommendation consensus for all held positions plus the top 20 movers by absolute % change.',
    alwaysActive: false,
  },
  {
    callsign: 'ECHO',
    role: 'Supervisor',
    type: 'Sonnet',
    typeColour: 'bg-[#2d1a3a] text-[#d2a8ff]',
    description: 'Synthesises Alpha–Delta and India reports (India when present) alongside Charlie\'s macro memory document, identifies where specialists agree or conflict, and produces the intelligence brief for the Portfolio Manager.',
    alwaysActive: false,
  },
  {
    callsign: 'FOXTROT',
    role: 'Portfolio Manager',
    type: 'Sonnet',
    typeColour: 'bg-[#2d1a3a] text-[#d2a8ff]',
    description: 'Makes the final buy/sell/hold decisions using the intelligence brief (team mode) or raw market data (solo mode). Reads 7 days of its own journal history including past decisions. Writes the daily journal and captures one trading lesson.',
    alwaysActive: true,
  },
  {
    callsign: 'GOLF',
    role: 'Validator',
    type: 'Pure TS',
    typeColour: 'bg-[#161819] text-[#7a7f88]',
    description: 'Enforces hard trading rules — ₹50,000 cash reserve, 20% position limit, valid NSE/BSE symbol suffixes — before any decision can reach execution.',
    alwaysActive: true,
  },
  {
    callsign: 'HOTEL',
    role: 'Auditor',
    type: 'Haiku',
    typeColour: 'bg-[#1f3a5f] text-[#79c0ff]',
    description: 'Cross-checks every trade decision against real Yahoo Finance prices to flag hallucinated reasoning or logic that contradicts actual market data.',
    alwaysActive: true,
  },
  {
    callsign: 'INDIA',
    role: 'Ad-hoc Intel',
    type: 'Human + Web',
    typeColour: 'bg-[#1a3a2a] text-[#3fb950]',
    description: 'You are the source. Submit a URL, search topic, or plain text in the Trail tab before the cron runs. India fetches, searches if needed, and files a report for Echo to synthesise. Silent when no note is pending.',
    alwaysActive: false,
  },
]

const CATEGORY_COLOURS: Record<string, string> = {
  sizing:   'bg-[#1f3a5f] text-[#79c0ff]',
  exits:    'bg-[#3d1a1a] text-[#f85149]',
  patience: 'bg-[#1a3a1a] text-[#3fb950]',
  sector:   'bg-[#2d2a1a] text-[#e3b341]',
  risk:     'bg-[#3a1a2d] text-[#db61a2]',
  process:  'bg-[#1a2d3a] text-[#58a6ff]',
  monthly:  'bg-[#21262d] text-[#8b949e]',
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function renderMarkdown(md: string): { elements: React.ReactNode[]; headings: { id: string; text: string }[] } {
  const lines = md.split('\n')
  const elements: React.ReactNode[] = []
  const headings: { id: string; text: string }[] = []
  const usedSlugs = new Set<string>()
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('# ')) { i++; continue }

    if (line.startsWith('## ')) {
      const text = line.slice(3)
      const base = slugify(text)
      let id = base
      let suffix = 1
      while (usedSlugs.has(id)) { id = `${base}-${++suffix}` }
      usedSlugs.add(id)
      headings.push({ id, text })
      elements.push(
        <h2 key={key++} id={id} className="text-[#f4f2ec] font-semibold text-sm mt-6 mb-2 pb-1 border-b border-[#161819]">
          {text}
        </h2>
      )
      i++; continue
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-[#7a7f88] text-[11px] uppercase tracking-[0.1em] font-semibold mt-4 mb-1">
          {line.slice(4)}
        </h3>
      )
      i++; continue
    }

    if (line.trim() === '---') {
      elements.push(<hr key={key++} className="border-[#161819] my-4" />)
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
              <tr className="border-b border-[#1f242c]">
                {rows[0]?.split('|').filter((_, ci) => ci > 0 && ci < rows[0].split('|').length - 1).map((cell, ci) => (
                  <th key={ci} className="text-left text-[11px] uppercase tracking-[0.1em] text-[#7a7f88] py-2 pr-4 font-semibold">
                    {cell.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, ri) => (
                <tr key={ri} className="border-b border-[#161819]">
                  {row.split('|').filter((_, ci) => ci > 0 && ci < row.split('|').length - 1).map((cell, ci) => (
                    <td key={ci} className="text-[#f4f2ec] font-mono py-2 pr-4 text-sm">
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
            <li key={ii} className="flex gap-2 text-sm text-[#7a7f88]">
              <span className="text-[#5a5f65] mt-0.5 shrink-0">·</span>
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
            <li key={ii} className="flex gap-2 text-sm text-[#7a7f88]">
              <span className="text-[#5a5f65] shrink-0 font-mono">{ii + 1}.</span>
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
            </li>
          ))}
        </ol>
      )
      continue
    }

    if (line.trim() === '') { i++; continue }

    elements.push(
      <p key={key++} className="text-sm text-[#7a7f88] my-1 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
    )
    i++
  }

  return { elements, headings }
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#f4f2ec] font-semibold">$1</strong>')
    .replace(/`(.+?)`/g, '<code class="text-[#d4af6a] bg-[#12151a] px-1 rounded text-[11px] font-mono">$1</code>')
}

export function StrategyTab({ content, lastUpdated, version, learnings, usingTradingTeam }: Props) {
  const dailyLearnings = learnings.filter(l => l.source === 'daily').slice(0, 30)
  const monthlyReflections = learnings.filter(l => l.source === 'monthly_reflection')
  const parsed = content ? renderMarkdown(content) : null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#12151a] border border-[#1f242c] rounded-lg p-4 flex items-start justify-between">
        <div>
          <div className="text-[#f4f2ec] font-semibold">Claude Trader — Strategy & Mindset</div>
          <div className="text-xs text-[#7a7f88] mt-0.5">
            The philosophy, rules, and learnings that drive every trading decision
          </div>
        </div>
        <div className="text-right shrink-0 ml-4">
          <div className="text-[11px] text-[#7a7f88]">
            v{version} · Updated {new Date(lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          {version > 1 && (
            <div className="text-[10px] text-[#3fb950] mt-0.5">Evolved from backtest learnings</div>
          )}
        </div>
      </div>

      {/* Agent Roster */}
      <div className="bg-[#12151a] border border-[#1f242c] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1f242c] flex items-center justify-between">
          <div>
            <div className="font-semibold text-[#f4f2ec]">Trading Intelligence System</div>
            <div className="text-xs text-[#7a7f88] mt-0.5">
              9 agents · 3 always active · 6 additional in team mode
            </div>
          </div>
          <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold tracking-wide shrink-0 ${
            usingTradingTeam
              ? 'bg-[#1a3a1a] text-[#3fb950]'
              : 'bg-[#161819] text-[#5a5f65]'
          }`}>
            {usingTradingTeam ? 'Team Mode Active' : 'Solo Mode'}
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#1f242c]">
          {AGENTS.map(agent => {
            const isActive = agent.alwaysActive || usingTradingTeam
            return (
              <div key={agent.callsign} className={`bg-[#12151a] p-4 transition-opacity ${!isActive ? 'opacity-40' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-mono font-bold text-[#f4f2ec] tracking-widest">
                    {agent.callsign}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${agent.typeColour}`}>
                    {agent.type}
                  </span>
                </div>
                <div className="text-[11px] text-[#d4af6a] font-semibold mb-2">{agent.role}</div>
                <p className="text-[11px] text-[#7a7f88] leading-relaxed">{agent.description}</p>
                <div className={`mt-3 text-[10px] font-semibold ${
                  agent.alwaysActive ? 'text-[#3fb950]' : isActive ? 'text-[#3fb950]' : 'text-[#5a5f65]'
                }`}>
                  {agent.alwaysActive ? '● Always active' : isActive ? '● Active' : '○ Team mode only'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pipeline flow */}
      <div className="bg-[#12151a] border border-[#1f242c] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1f242c]">
          <div className="font-semibold text-[#f4f2ec]">How it works</div>
          <div className="text-xs text-[#7a7f88] mt-0.5">Evening pipeline · runs after market close</div>
        </div>
        <div className="p-4 space-y-4">

          {/* Phase row */}
          <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <div className="flex items-start gap-2 min-w-max pb-2">

            {/* Phase 1 */}
            <div className="flex flex-col items-center gap-1">
              <div className="text-[10px] uppercase tracking-[0.1em] text-[#5a5f65] font-semibold mb-1">Phase 1 — Intelligence</div>
              <div className="flex flex-col gap-1">
                {['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA'].map(c => (
                  <div key={c} className="text-[11px] font-mono font-bold text-[#f4f2ec] bg-[#161819] border border-[#1f242c] px-2.5 py-1 rounded text-center tracking-widest">{c}</div>
                ))}
                <div className="text-[11px] font-mono font-bold text-[#3fb950] bg-[#1a3a2a] border border-[#3fb95040] px-2.5 py-1 rounded text-center tracking-widest">INDIA</div>
              </div>
              <div className="text-[10px] text-[#5a5f65] mt-1 text-center">run in parallel<br/><span className="text-[#3fb950]">India: if note pending</span></div>
            </div>

            {/* Arrow */}
            <div className="text-[#5a5f65] text-lg mt-8 mx-1">→</div>

            {/* Phase 2 */}
            <div className="flex flex-col items-center gap-1">
              <div className="text-[10px] uppercase tracking-[0.1em] text-[#5a5f65] font-semibold mb-1">Phase 2 — Synthesis</div>
              <div className="text-[11px] font-mono font-bold text-[#f4f2ec] bg-[#161819] border border-[#1f242c] px-2.5 py-1 rounded text-center tracking-widest">ECHO</div>
              <div className="text-[10px] text-[#5a5f65] mt-1 text-center">merges all reports<br/>flags conflicts</div>
            </div>

            {/* Arrow */}
            <div className="text-[#5a5f65] text-lg mt-8 mx-1">→</div>

            {/* Phase 3 */}
            <div className="flex flex-col items-center gap-1">
              <div className="text-[10px] uppercase tracking-[0.1em] text-[#5a5f65] font-semibold mb-1">Phase 3 — Decision</div>
              <div className="text-[11px] font-mono font-bold text-[#f4f2ec] bg-[#2d1a3a] border border-[#6e40c9] px-2.5 py-1 rounded text-center tracking-widest">FOXTROT</div>
              <div className="text-[10px] text-[#5a5f65] mt-1 text-center">buy / sell / hold<br/>writes journal</div>
            </div>

            {/* Arrow */}
            <div className="text-[#5a5f65] text-lg mt-8 mx-1">→</div>

            {/* Phase 4 */}
            <div className="flex flex-col items-center gap-1">
              <div className="text-[10px] uppercase tracking-[0.1em] text-[#5a5f65] font-semibold mb-1">Phase 4 — Validation</div>
              <div className="flex flex-col gap-1">
                <div className="text-[11px] font-mono font-bold text-[#f4f2ec] bg-[#161819] border border-[#1f242c] px-2.5 py-1 rounded text-center tracking-widest">GOLF</div>
                <div className="text-[11px] font-mono font-bold text-[#f4f2ec] bg-[#161819] border border-[#1f242c] px-2.5 py-1 rounded text-center tracking-widest">HOTEL</div>
              </div>
              <div className="text-[10px] text-[#5a5f65] mt-1 text-center">hard rules check<br/>price sanity check</div>
            </div>

            {/* Arrow */}
            <div className="text-[#5a5f65] text-lg mt-8 mx-1">→</div>

            {/* Queue */}
            <div className="flex flex-col items-center gap-1">
              <div className="text-[10px] uppercase tracking-[0.1em] text-[#5a5f65] font-semibold mb-1">Output</div>
              <div className="text-[11px] font-mono font-bold text-[#3fb950] bg-[#1a3a1a] border border-[#3fb95040] px-2.5 py-1 rounded text-center tracking-widest">QUEUE</div>
              <div className="text-[10px] text-[#5a5f65] mt-1 text-center">executed next<br/>market open</div>
            </div>
          </div>
          </div>

          {/* Feedback loop note */}
          <div className="border border-[#1f242c] rounded-md px-3 py-2.5 bg-[#0a0b0d] flex items-start gap-2.5">
            <span className="text-[#e3b341] text-[11px] mt-0.5 shrink-0">⟳</span>
            <p className="text-[11px] text-[#7a7f88] leading-relaxed">
              <span className="text-[#f4f2ec] font-semibold">Hotel feedback loop —</span>{' '}
              If Hotel flags a concern, Foxtrot sees the exact warning and gets one revision pass: revise the quantity, add stronger rationale, or drop the trade. Golf and Hotel then re-check the revised decisions. No further retries.
            </p>
          </div>

          {/* Golf hard rules */}
          <div className="border border-[#1f242c] rounded-md px-3 py-2.5 bg-[#0a0b0d] flex items-start gap-2.5">
            <span className="text-[#f85149] text-[11px] mt-0.5 shrink-0">✕</span>
            <p className="text-[11px] text-[#7a7f88] leading-relaxed">
              <span className="text-[#f4f2ec] font-semibold">Golf hard gates —</span>{' '}
              Cash below ₹50,000 · single position above 20% of portfolio · invalid symbol suffix (must be .NS or .BO). Any decision that trips these is silently dropped — it never reaches execution regardless of Foxtrot&apos;s reasoning.
            </p>
          </div>

          {/* Solo vs team note */}
          <div className="border border-[#1f242c] rounded-md px-3 py-2.5 bg-[#0a0b0d] flex items-start gap-2.5">
            <span className="text-[#d4af6a] text-[11px] mt-0.5 shrink-0">ℹ</span>
            <p className="text-[11px] text-[#7a7f88] leading-relaxed">
              <span className="text-[#f4f2ec] font-semibold">Solo mode —</span>{' '}
              Phases 1 and 2 are skipped. Foxtrot reads raw market data directly and decides alone. Golf and Hotel still run. Faster and cheaper; used when <code className="text-[#d4af6a] bg-[#12151a] px-1 rounded text-[10px] font-mono">USE_TRADING_TEAM</code> is not set.
            </p>
          </div>

        </div>
      </div>

      {/* KingPin */}
      <div className="bg-[#12151a] border border-[#1f242c] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1f242c] flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-[#d4af6a] flex items-center justify-center text-[11px] font-bold text-[#0a0b0d] shrink-0">
            K
          </div>
          <div>
            <div className="font-semibold text-[#f4f2ec]">KingPin — Team Communications</div>
            <div className="text-xs text-[#7a7f88] mt-0.5">The voice of the whole agent team · Ask tab</div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-[#7a7f88] leading-relaxed">
            KingPin is the team&apos;s communications agent — it speaks as &ldquo;we&rdquo; for all nine specialists. It has full memory of every trade, daily analysis, market summary, geopolitical read, and learning since Season 2 began.
          </p>
          <p className="text-sm text-[#7a7f88] leading-relaxed">
            Ask it anything the team has seen or decided. It won&apos;t name individual agents or throw anyone under the bus — it presents the team&apos;s reasoning as one coherent voice. If the team saw a signal but didn&apos;t act, KingPin explains the tradeoff. If the risk review pushed back on a trade, KingPin owns it collectively.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              'Why did you buy that stock?',
              'What is your view on oil?',
              'What have you learned this month?',
              'Did the risk review flag anything?',
              'What sectors are you watching?',
              'How are you thinking about geopolitics?',
            ].map(q => (
              <span key={q} className="text-[11px] text-[#d4af6a] bg-[#d4af6a]/10 border border-[#d4af6a]/20 px-2.5 py-1 rounded-full">
                {q}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Schedule */}
      <div className="bg-[#12151a] border border-[#1f242c] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1f242c]">
          <div className="font-semibold text-[#f4f2ec]">Daily Schedule</div>
          <div className="text-xs text-[#7a7f88] mt-0.5">All times IST · Mon–Fri only</div>
        </div>
        <div className="divide-y divide-[#161819]">
          {[
            { time: '9:20 AM', label: 'Execute', desc: 'Pending trades placed at market open via execute cron', color: '#3fb950' },
            { time: '3:35 PM', label: 'Analyse', desc: 'Post-close analysis runs · Trading Team makes next-day decisions · pending_trades written', color: '#d4af6a' },
            { time: '4:30 PM · 1st of month', label: 'Monthly Reflect', desc: 'Foxtrot reviews the month · trader profile updated · new version written to changelog', color: '#e3b341' },
          ].map(({ time, label, desc, color }) => (
            <div key={label} className="px-4 py-3 flex items-start gap-4">
              <div className="font-mono text-xs shrink-0 w-36 mt-0.5" style={{ color }}>{time}</div>
              <div>
                <div className="text-sm font-semibold text-[#f4f2ec]">{label}</div>
                <div className="text-xs text-[#7a7f88] mt-0.5">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly reflections — shown first if they exist */}
      {monthlyReflections.length > 0 && (
        <div className="bg-[#12151a] border border-[#1f242c] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1f242c]">
            <div className="font-semibold text-[#f4f2ec]">Monthly Reflections</div>
            <div className="text-xs text-[#7a7f88] mt-0.5">End-of-month synthesis — what changed and why</div>
          </div>
          <div className="divide-y divide-[#161819]">
            {monthlyReflections.map(r => (
              <div key={r.id} className="px-4 py-4">
                <div className="text-[11px] text-[#7a7f88] font-mono mb-2">
                  {new Date(r.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </div>
                <p className="text-sm text-[#7a7f88] leading-relaxed whitespace-pre-line">{r.insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily learnings log */}
      {dailyLearnings.length > 0 && (
        <div className="bg-[#12151a] border border-[#1f242c] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1f242c] flex items-center justify-between">
            <div>
              <div className="font-semibold text-[#f4f2ec]">Daily Learnings Log</div>
              <div className="text-xs text-[#7a7f88] mt-0.5">One lesson captured after each trading day</div>
            </div>
            <div className="text-xs text-[#7a7f88]">{dailyLearnings.length} entries</div>
          </div>
          <div className="divide-y divide-[#161819]">
            {dailyLearnings.map(l => (
              <div key={l.id} className="px-4 py-3 flex items-start gap-3">
                <div className="text-[11px] text-[#7a7f88] font-mono whitespace-nowrap mt-0.5 w-20 shrink-0">
                  {new Date(l.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </div>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${CATEGORY_COLOURS[l.category] ?? CATEGORY_COLOURS.process}`}>
                  {l.category}
                </span>
                <p className="text-sm text-[#7a7f88] leading-relaxed">{l.insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No learnings yet */}
      {dailyLearnings.length === 0 && monthlyReflections.length === 0 && (
        <div className="bg-[#12151a] border border-[#1f242c] rounded-lg p-6 text-center text-[#7a7f88] text-sm">
          Learnings log will populate after the first live trading day.
        </div>
      )}

      {/* Jump to section — the profile below runs to hundreds of lines */}
      {parsed && parsed.headings.length >= 2 && (
        <div className="bg-[#12151a] border border-[#1f242c] rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-[0.1em] text-[#7a7f88] font-semibold mb-3">
            Jump to Section
          </div>
          <div className="flex flex-wrap gap-2">
            {parsed.headings.map(h => (
              <a
                key={h.id}
                href={`#${h.id}`}
                className="text-[11px] px-2.5 py-1 rounded-full border border-[#2a2f38] text-[#d4af6a] hover:bg-[#161819] transition-colors whitespace-nowrap"
              >
                {h.text}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Profile content */}
      <div className="bg-[#12151a] border border-[#1f242c] rounded-lg p-5">
        <div className="text-[11px] uppercase tracking-[0.1em] text-[#7a7f88] font-semibold mb-4">
          Active Trading Profile
        </div>
        {parsed ? parsed.elements : (
          <p className="text-sm text-[#7a7f88]">Profile not loaded.</p>
        )}
      </div>
    </div>
  )
}
