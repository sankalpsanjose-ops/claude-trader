'use client'

import { useState, useEffect } from 'react'
import type { DailyAnalysis } from '@/types'
import type { AlphaReport, BravoReport, CharlieReport, DeltaReport, EchoReport, IndiaReport, TechnicalSignal } from '@/lib/agents/types'

interface Props {
  analyses: DailyAnalysis[]
}

function AgentTag({ agent }: { agent: 'alpha' | 'bravo' | 'charlie' | 'delta' | 'echo' | 'foxtrot' | 'india' }) {
  const styles: Record<string, string> = {
    alpha:   'text-[#79c0ff] border-[#79c0ff40] bg-[#79c0ff0d]',
    bravo:   'text-[#a5d6ff] border-[#a5d6ff40] bg-[#a5d6ff0d]',
    charlie: 'text-[#f0883e] border-[#f0883e40] bg-[#f0883e0d]',
    delta:   'text-[#d2a8ff] border-[#d2a8ff40] bg-[#d2a8ff0d]',
    echo:    'text-[#56d364] border-[#56d36440] bg-[#56d3640d]',
    foxtrot: 'text-[#ffa657] border-[#ffa65740] bg-[#ffa6570d]',
    india:   'text-[#3fb950] border-[#3fb95040] bg-[#3fb9500d]',
  }
  const labels: Record<string, string> = {
    alpha: 'Alpha', bravo: 'Bravo', charlie: 'Charlie',
    delta: 'Delta', echo: 'Echo', foxtrot: 'Foxtrot', india: 'India',
  }
  const roles: Record<string, string> = {
    alpha: 'Market data', bravo: 'Technicals', charlie: 'News & macro',
    delta: 'Fundamentals', echo: 'Synthesis', foxtrot: 'Decision', india: 'Your intel',
  }
  return (
    <div className="flex flex-col gap-1 min-w-[88px]">
      <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded border ${styles[agent]}`}>
        {labels[agent]}
      </span>
      <span className="text-[10px] text-[#5a5f65]">{roles[agent]}</span>
    </div>
  )
}

function AgentRow({ agent, children }: { agent: 'alpha' | 'bravo' | 'charlie' | 'delta' | 'echo' | 'foxtrot' | 'india'; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-3 border-b border-[#161819] last:border-0 last:pb-0 items-start">
      <AgentTag agent={agent} />
      <div className="text-[13px] text-[#f4f2ec] leading-relaxed flex-1">{children}</div>
    </div>
  )
}

function formatBravo(signal: TechnicalSignal, symbol: string): string {
  const smaStatus = signal.aboveSma50
    ? `above 50-SMA (₹${signal.sma50.toFixed(0)})`
    : `below 50-SMA (₹${signal.sma50.toFixed(0)})`
  const rsiNote = signal.rsi14 > 70 ? 'overbought' : signal.rsi14 < 30 ? 'oversold' : 'neutral range'
  const mom = signal.momentum === 'strong'
    ? 'strong positive momentum'
    : signal.momentum === 'weak'
    ? 'weak/negative momentum'
    : 'neutral momentum'
  const volNote = signal.volumeRatio != null
    ? signal.volumeRatio >= 2.0
      ? ` · vol ${signal.volumeRatio.toFixed(1)}× avg — HIGH confirmation`
      : signal.volumeRatio >= 1.5
      ? ` · vol ${signal.volumeRatio.toFixed(1)}× avg — elevated`
      : ` · vol ${signal.volumeRatio.toFixed(1)}× avg`
    : ''
  return `${symbol}: RSI ${signal.rsi14} (${rsiNote}), currently ${smaStatus}. 10-day price shows ${mom}. Current price ₹${signal.currentPrice.toFixed(2)}.${volNote}`
}

function IndiaIntelCard() {
  const [note, setNote] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/intel').then(r => r.json()).then(d => setPending(d.note ?? null)).catch(() => {})
  }, [])

  async function submit() {
    if (!note.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() }),
      })
      if (res.ok) {
        setPending(note.trim())
        setNote('')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#12151a] border border-[#1f242c] rounded-lg overflow-hidden mb-3">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#f4f2ec] text-sm">India — Your Intel</span>
          {pending ? (
            <span className="text-[10px] bg-[#1a3a2a] text-[#3fb950] border border-[#3fb95040] px-2 py-0.5 rounded font-semibold">
              Active · runs at next cron
            </span>
          ) : (
            <span className="text-[10px] bg-[#161819] text-[#7a7f88] border border-[#1f242c] px-2 py-0.5 rounded">
              Silent · no note pending
            </span>
          )}
        </div>
      </div>
      <div className="border-t border-[#1f242c] px-4 py-3">
        {pending ? (
          <div className="space-y-2">
            <p className="text-[12px] text-[#7a7f88]">Pending note (will be consumed by next cron):</p>
            <pre className="text-[12px] text-[#f4f2ec] whitespace-pre-wrap font-sans bg-[#181a1e] rounded p-3 border border-[#1f242c]">
              {pending}
            </pre>
            <button
              onClick={async () => {
                await fetch('/api/intel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: '' }) }).catch(() => {})
                setPending(null)
              }}
              className="text-[11px] text-[#f85149] hover:underline"
            >
              Clear note
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-[#5a5f65]">Submit a URL, search topic, or plain text. India will research it and file a report for Echo to synthesise.</p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="e.g. RBI likely to cut rates this week · https://example.com/article · IRCTC had a major outage today"
              className="w-full bg-[#0a0b0d] border border-[#1f242c] rounded px-3 py-2 text-[13px] text-[#f4f2ec] placeholder-[#5a5f65] resize-none focus:outline-none focus:border-[#3fb950]"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#5a5f65]">{note.length}/1000</span>
              <button
                onClick={submit}
                disabled={loading || !note.trim()}
                className="text-[12px] bg-[#1a3a2a] text-[#3fb950] border border-[#3fb95040] px-3 py-1 rounded hover:bg-[#1f4a33] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Submitting…' : 'Submit to India'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MacroMemoryCard({ content }: { content: string }) {
  const [open, setOpen] = useState(false)
  if (!content?.trim()) return null
  return (
    <div className="bg-[#12151a] border border-[#1f242c] rounded-lg overflow-hidden mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#181a1e] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#f4f2ec] text-sm">Charlie&apos;s Macro Memory</span>
          <span className="text-[10px] bg-[#f0883e22] text-[#f0883e] border border-[#f0883e40] px-2 py-0.5 rounded font-semibold">
            Self-updating · persists across sessions
          </span>
        </div>
        <span className="text-[#5a5f65] text-xs">{open ? '▲ collapse' : '▼ expand'}</span>
      </button>
      {open && (
        <div className="border-t border-[#1f242c] px-4 py-4">
          <pre className="text-[12px] text-[#f4f2ec] leading-relaxed whitespace-pre-wrap font-sans">
            {content}
          </pre>
        </div>
      )}
    </div>
  )
}

function DailyBrief({ alpha, charlie, echo, india }: { alpha: AlphaReport; charlie: CharlieReport; echo: EchoReport; india?: IndiaReport }) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <MacroMemoryCard content={charlie.macroMemory ?? ''} />
      <div className="bg-[#12151a] border border-[#1f242c] rounded-lg overflow-hidden mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#181a1e] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#f4f2ec] text-sm">Daily Market Brief</span>
          <span className="text-[10px] bg-[#d4af6a22] text-[#d4af6a] border border-[#d4af6a55] px-2 py-0.5 rounded font-semibold">
            Alpha · Charlie · Echo
          </span>
        </div>
        <span className="text-[#5a5f65] text-xs">{open ? '▲ collapse' : '▼ expand'}</span>
      </button>
      {open && (
        <div className="border-t border-[#1f242c] px-4 py-3">
          <AgentRow agent="alpha">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {Object.values(alpha.indices).map(v => (
                <span key={v.name}>
                  <span className="text-[#f4f2ec] font-medium">{v.name}</span>{' '}
                  <span className={v.changePct >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}>
                    {v.changePct >= 0 ? '+' : ''}{v.changePct.toFixed(2)}%
                  </span>
                </span>
              ))}
              {Object.values(alpha.commodities).map(v => (
                <span key={v.name}>
                  <span className="text-[#f4f2ec] font-medium">{v.name}</span>{' '}
                  <span className="text-[#7a7f88]">${v.price.toFixed(2)}</span>{' '}
                  <span className={v.changePct >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}>
                    {v.changePct >= 0 ? '+' : ''}{v.changePct.toFixed(2)}%
                  </span>
                </span>
              ))}
              {Object.values(alpha.forex).map(v => (
                <span key={v.name}>
                  <span className="text-[#f4f2ec] font-medium">{v.name}</span>{' '}
                  <span className="text-[#7a7f88]">{v.rate.toFixed(2)}</span>{' '}
                  <span className={v.changePct >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}>
                    {v.changePct >= 0 ? '+' : ''}{v.changePct.toFixed(2)}%
                  </span>
                </span>
              ))}
            </div>
          </AgentRow>
          <AgentRow agent="charlie">
            <div className="space-y-1">
              {charlie.macroThemes.length > 0 && (
                <div>
                  <span className="text-[#7a7f88] text-[10px] uppercase tracking-[0.1em]">Macro: </span>
                  {charlie.macroThemes.join(' · ')}
                </div>
              )}
              {charlie.geopoliticalRisks.length > 0 && (
                <div>
                  <span className="text-[#7a7f88] text-[10px] uppercase tracking-[0.1em]">Geopolitical: </span>
                  {charlie.geopoliticalRisks.join(' · ')}
                </div>
              )}
              <div>
                <span className="text-[#7a7f88] text-[10px] uppercase tracking-[0.1em]">Overall: </span>
                <span className={charlie.overallSentiment === 'bullish' ? 'text-[#3fb950]' : charlie.overallSentiment === 'bearish' ? 'text-[#f85149]' : 'text-[#7a7f88]'}>
                  {charlie.overallSentiment}
                </span>
              </div>
            </div>
          </AgentRow>
          <AgentRow agent="echo">
            <div className="space-y-1">
              <div>{echo.macroContext}</div>
              {echo.topOpportunities.length > 0 && (
                <div className="text-[12px]">
                  <span className="text-[#3fb950]">Opportunities: </span>
                  {echo.topOpportunities.join(' · ')}
                </div>
              )}
              {echo.topRisks.length > 0 && (
                <div className="text-[12px]">
                  <span className="text-[#f85149]">Risks: </span>
                  {echo.topRisks.join(' · ')}
                </div>
              )}
            </div>
          </AgentRow>
          {india && (
            <AgentRow agent="india">
              <div className="space-y-1">
                <div>{india.summary}</div>
                {india.flaggedSymbols.length > 0 && (
                  <div className="text-[12px] flex flex-wrap gap-x-3">
                    {india.flaggedSymbols.map(s => (
                      <span key={s.symbol}>
                        <span className="text-[#f4f2ec] font-medium font-mono">{s.symbol}</span>{' '}
                        <span className={s.signal === 'bullish' ? 'text-[#3fb950]' : s.signal === 'bearish' ? 'text-[#f85149]' : 'text-[#7a7f88]'}>
                          {s.signal}
                        </span>
                        {' — '}{s.reason}
                      </span>
                    ))}
                  </div>
                )}
                {india.macroNotes.length > 0 && (
                  <div className="text-[12px] text-[#7a7f88]">{india.macroNotes.join(' · ')}</div>
                )}
              </div>
            </AgentRow>
          )}
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-[#181a1e] rounded border border-dashed border-[#1f242c]">
            <span className="text-[#5a5f65] text-xs">↓</span>
            <span className="text-[11px] text-[#5a5f65]">
              <span className="text-[#a5d6ff] font-semibold">Bravo</span> (technicals) and{' '}
              <span className="text-[#d2a8ff] font-semibold">Delta</span> (fundamentals) work stock-by-stock — see each position below.
            </span>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

interface SymbolSectionProps {
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  quantity?: number
  foxtrotRationale: string
  bravo: BravoReport
  charlie: CharlieReport
  delta: DeltaReport
  echo: EchoReport
}

function SymbolSection({ symbol, action, quantity, foxtrotRationale, bravo, charlie, delta, echo }: SymbolSectionProps) {
  const [open, setOpen] = useState(false)
  const bravoSignal = bravo.signals[symbol]
  const charlieData = charlie.perSymbol[symbol]
  const deltaData = delta.perSymbol[symbol]
  const echoData = echo.perSymbol[symbol]
  const hasAgentData = !!(bravoSignal || charlieData || deltaData || echoData)

  const actionColors: Record<string, string> = {
    BUY:  'text-[#3fb950] border-[#3fb950]',
    SELL: 'text-[#f85149] border-[#f85149]',
    HOLD: 'text-[#7a7f88] border-[#7a7f88]',
  }

  return (
    <div className="bg-[#12151a] border border-[#1f242c] rounded-lg overflow-hidden mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#181a1e] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`inline-flex text-[11px] font-bold px-2.5 py-0.5 rounded border ${actionColors[action]}`}>
            {action}
          </span>
          <span className="font-semibold text-[#f4f2ec] text-sm font-mono">{symbol}</span>
          {quantity && <span className="text-[12px] text-[#7a7f88]">{quantity} shares</span>}
        </div>
        <div className="flex items-center gap-2">
          {hasAgentData && <span className="text-[11px] text-[#5a5f65]">click to read agent reports</span>}
          <span className="text-[#5a5f65] text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="border-t border-[#1f242c] px-4 py-3">
          {bravoSignal && (
            <AgentRow agent="bravo">{formatBravo(bravoSignal, symbol)}</AgentRow>
          )}
          {charlieData && (
            <AgentRow agent="charlie">
              <span className={charlieData.signal === 'bullish' ? 'text-[#3fb950]' : charlieData.signal === 'bearish' ? 'text-[#f85149]' : 'text-[#7a7f88]'}>
                {charlieData.signal}
              </span>
              {' — '}{charlieData.reason}
            </AgentRow>
          )}
          {deltaData && (
            <AgentRow agent="delta">
              <span className={deltaData.signal === 'bullish' ? 'text-[#3fb950]' : deltaData.signal === 'bearish' ? 'text-[#f85149]' : 'text-[#7a7f88]'}>
                {deltaData.signal}
              </span>
              {deltaData.trailingPE != null && <span className="text-[#7a7f88]"> · P/E {deltaData.trailingPE.toFixed(1)}</span>}
              {deltaData.analystTargetUpside != null && <span className="text-[#7a7f88]"> · analyst upside {deltaData.analystTargetUpside.toFixed(1)}%</span>}
              {' — '}{deltaData.rationale}
            </AgentRow>
          )}
          {echoData && (
            <AgentRow agent="echo">
              <div>
                <span className={echoData.outlook === 'bullish' ? 'text-[#3fb950]' : echoData.outlook === 'bearish' ? 'text-[#f85149]' : 'text-[#7a7f88]'}>
                  {echoData.outlook}
                </span>
                <span className="text-[#5a5f65]"> ({echoData.conviction} conviction)</span>
                {' — '}{echoData.keyReason}
                {echoData.conflicts.length > 0 && (
                  <div className="mt-1 text-[11px] text-[#e3b341]">
                    Conflict: {echoData.conflicts.join(' · ')}
                  </div>
                )}
              </div>
            </AgentRow>
          )}
          <div className="mt-2 flex gap-3 items-start bg-[#181a1e] rounded px-3 py-2.5">
            <AgentTag agent="foxtrot" />
            <div className="text-[13px] text-[#f4f2ec] leading-relaxed pt-0.5">{foxtrotRationale}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export function DecisionTrailTab({ analyses }: Props) {
  const withReports = analyses.filter(a => a.agent_reports)
  const [selectedDate, setSelectedDate] = useState<string>(withReports[0]?.date ?? '')

  if (withReports.length === 0) {
    return (
      <div className="bg-[#12151a] border border-[#1f242c] rounded-lg p-12 text-center space-y-2">
        <div className="text-[#f4f2ec] font-semibold">No decision trail yet</div>
        <div className="text-[#5a5f65] text-sm max-w-md mx-auto">
          Decision trails are recorded when the trading team runs. Make sure{' '}
          <code className="text-[#d4af6a] bg-[#161819] px-1 rounded text-xs">USE_TRADING_TEAM=true</code>{' '}
          is set, then run the analysis cron. Agent reports will appear here from the next run forward.
        </div>
      </div>
    )
  }

  const selected = withReports.find(a => a.date === selectedDate) ?? withReports[0]
  const reports = selected.agent_reports!

  return (
    <div className="space-y-4">
      {/* India intel input */}
      <IndiaIntelCard />

      {/* Agent directory */}
      <div className="bg-[#12151a] border border-[#1f242c] rounded-lg p-4">
        <div className="text-[11px] uppercase tracking-[0.1em] font-semibold text-[#7a7f88] mb-3">
          Intelligence pipeline · 6 of 8 agents shown · Golf &amp; Hotel validation in Audit tab
        </div>
        <div className="flex flex-wrap gap-3">
          {(['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot'] as const).map(agent => (
            <AgentTag key={agent} agent={agent} />
          ))}
        </div>
      </div>

      {/* Date selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] uppercase tracking-[0.1em] text-[#7a7f88]">Trail for:</span>
        {withReports.slice(0, 10).map(a => (
          <button
            key={a.date}
            onClick={() => setSelectedDate(a.date)}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${
              a.date === (selectedDate || withReports[0].date)
                ? 'bg-[#d4af6a] border-[#d4af6a] text-[#0a0b0d]'
                : 'bg-[#12151a] border-[#1f242c] text-[#7a7f88] hover:border-[#d4af6a] hover:text-[#d4af6a]'
            }`}
          >
            {new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </button>
        ))}
      </div>

      {/* Daily brief */}
      <DailyBrief alpha={reports.alpha} charlie={reports.charlie} echo={reports.echo} india={reports.india} />

      {/* Per-symbol decisions */}
      {selected.decisions.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-[0.1em] font-semibold text-[#7a7f88] mb-2">
            Decisions · {selected.decisions.length} reviewed · per-stock: Bravo, Charlie, Delta, Echo → Foxtrot
          </div>
          {selected.decisions.map(d => (
            <SymbolSection
              key={d.symbol}
              symbol={d.symbol}
              action={d.action}
              quantity={d.quantity}
              foxtrotRationale={d.rationale}
              bravo={reports.bravo}
              charlie={reports.charlie}
              delta={reports.delta}
              echo={reports.echo}
            />
          ))}
        </div>
      )}
    </div>
  )
}
