'use client'

import { useState } from 'react'
import type { DailyAnalysis } from '@/types'
import type { AlphaReport, BravoReport, CharlieReport, DeltaReport, EchoReport, TechnicalSignal } from '@/lib/agents/types'

interface Props {
  analyses: DailyAnalysis[]
}

function AgentTag({ agent }: { agent: 'alpha' | 'bravo' | 'charlie' | 'delta' | 'echo' | 'foxtrot' }) {
  const styles: Record<string, string> = {
    alpha:   'text-[#79c0ff] border-[#79c0ff40] bg-[#79c0ff0d]',
    bravo:   'text-[#a5d6ff] border-[#a5d6ff40] bg-[#a5d6ff0d]',
    charlie: 'text-[#f0883e] border-[#f0883e40] bg-[#f0883e0d]',
    delta:   'text-[#d2a8ff] border-[#d2a8ff40] bg-[#d2a8ff0d]',
    echo:    'text-[#56d364] border-[#56d36440] bg-[#56d3640d]',
    foxtrot: 'text-[#ffa657] border-[#ffa65740] bg-[#ffa6570d]',
  }
  const labels: Record<string, string> = {
    alpha: 'Alpha', bravo: 'Bravo', charlie: 'Charlie',
    delta: 'Delta', echo: 'Echo', foxtrot: 'Foxtrot',
  }
  const roles: Record<string, string> = {
    alpha: 'Market data', bravo: 'Technicals', charlie: 'News & macro',
    delta: 'Fundamentals', echo: 'Synthesis', foxtrot: 'Decision',
  }
  return (
    <div className="flex flex-col gap-1 min-w-[88px]">
      <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${styles[agent]}`}>
        {labels[agent]}
      </span>
      <span className="text-[10px] text-[#484f58]">{roles[agent]}</span>
    </div>
  )
}

function AgentRow({ agent, children }: { agent: 'alpha' | 'bravo' | 'charlie' | 'delta' | 'echo' | 'foxtrot'; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-3 border-b border-[#21262d] last:border-0 last:pb-0 items-start">
      <AgentTag agent={agent} />
      <div className="text-[13px] text-[#c9d1d9] leading-relaxed flex-1">{children}</div>
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
  return `${symbol}: RSI ${signal.rsi14} (${rsiNote}), currently ${smaStatus}. 10-day price shows ${mom}. Current price ₹${signal.currentPrice.toFixed(2)}.`
}

function DailyBrief({ alpha, charlie, echo }: { alpha: AlphaReport; charlie: CharlieReport; echo: EchoReport }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#1c2128] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#e6edf3] text-sm">Daily Market Brief</span>
          <span className="text-[10px] bg-[#1f6feb22] text-[#79c0ff] border border-[#1f6feb55] px-2 py-0.5 rounded font-semibold">
            Alpha · Charlie · Echo
          </span>
        </div>
        <span className="text-[#484f58] text-xs">{open ? '▲ collapse' : '▼ expand'}</span>
      </button>
      {open && (
        <div className="border-t border-[#30363d] px-4 py-3">
          <AgentRow agent="alpha">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {Object.values(alpha.indices).map(v => (
                <span key={v.name}>
                  <span className="text-[#e6edf3] font-medium">{v.name}</span>{' '}
                  <span className={v.changePct >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}>
                    {v.changePct >= 0 ? '+' : ''}{v.changePct.toFixed(2)}%
                  </span>
                </span>
              ))}
              {Object.values(alpha.commodities).map(v => (
                <span key={v.name}>
                  <span className="text-[#e6edf3] font-medium">{v.name}</span>{' '}
                  <span className="text-[#8b949e]">${v.price.toFixed(2)}</span>{' '}
                  <span className={v.changePct >= 0 ? 'text-[#3fb950]' : 'text-[#f85149]'}>
                    {v.changePct >= 0 ? '+' : ''}{v.changePct.toFixed(2)}%
                  </span>
                </span>
              ))}
              {Object.values(alpha.forex).map(v => (
                <span key={v.name}>
                  <span className="text-[#e6edf3] font-medium">{v.name}</span>{' '}
                  <span className="text-[#8b949e]">{v.rate.toFixed(2)}</span>
                </span>
              ))}
            </div>
          </AgentRow>
          <AgentRow agent="charlie">
            <div className="space-y-1">
              {charlie.macroThemes.length > 0 && (
                <div>
                  <span className="text-[#8b949e] text-[10px] uppercase tracking-wider">Macro: </span>
                  {charlie.macroThemes.join(' · ')}
                </div>
              )}
              {charlie.geopoliticalRisks.length > 0 && (
                <div>
                  <span className="text-[#8b949e] text-[10px] uppercase tracking-wider">Geopolitical: </span>
                  {charlie.geopoliticalRisks.join(' · ')}
                </div>
              )}
              <div>
                <span className="text-[#8b949e] text-[10px] uppercase tracking-wider">Overall: </span>
                <span className={charlie.overallSentiment === 'bullish' ? 'text-[#3fb950]' : charlie.overallSentiment === 'bearish' ? 'text-[#f85149]' : 'text-[#8b949e]'}>
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
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-[#1c2128] rounded border border-dashed border-[#30363d]">
            <span className="text-[#484f58] text-xs">↓</span>
            <span className="text-[11px] text-[#484f58]">
              <span className="text-[#a5d6ff] font-semibold">Bravo</span> (technicals) and{' '}
              <span className="text-[#d2a8ff] font-semibold">Delta</span> (fundamentals) work stock-by-stock — see each position below.
            </span>
          </div>
        </div>
      )}
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

  const actionColors: Record<string, string> = {
    BUY:  'text-[#3fb950] border-[#3fb950]',
    SELL: 'text-[#f85149] border-[#f85149]',
    HOLD: 'text-[#8b949e] border-[#8b949e]',
  }

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#1c2128] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`inline-flex text-[11px] font-bold px-2.5 py-0.5 rounded border ${actionColors[action]}`}>
            {action}
          </span>
          <span className="font-semibold text-[#e6edf3] text-sm font-mono">{symbol}</span>
          {quantity && <span className="text-[12px] text-[#8b949e]">{quantity} shares</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#484f58]">click to read agent reports</span>
          <span className="text-[#484f58] text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="border-t border-[#30363d] px-4 py-3">
          {bravoSignal && (
            <AgentRow agent="bravo">{formatBravo(bravoSignal, symbol)}</AgentRow>
          )}
          {charlieData && (
            <AgentRow agent="charlie">
              <span className={charlieData.signal === 'bullish' ? 'text-[#3fb950]' : charlieData.signal === 'bearish' ? 'text-[#f85149]' : 'text-[#8b949e]'}>
                {charlieData.signal}
              </span>
              {' — '}{charlieData.reason}
            </AgentRow>
          )}
          {deltaData && (
            <AgentRow agent="delta">
              <span className={deltaData.signal === 'bullish' ? 'text-[#3fb950]' : deltaData.signal === 'bearish' ? 'text-[#f85149]' : 'text-[#8b949e]'}>
                {deltaData.signal}
              </span>
              {deltaData.trailingPE != null && <span className="text-[#8b949e]"> · P/E {deltaData.trailingPE.toFixed(1)}</span>}
              {deltaData.analystTargetUpside != null && <span className="text-[#8b949e]"> · analyst upside {deltaData.analystTargetUpside.toFixed(1)}%</span>}
              {' — '}{deltaData.rationale}
            </AgentRow>
          )}
          {echoData && (
            <AgentRow agent="echo">
              <div>
                <span className={echoData.outlook === 'bullish' ? 'text-[#3fb950]' : echoData.outlook === 'bearish' ? 'text-[#f85149]' : 'text-[#8b949e]'}>
                  {echoData.outlook}
                </span>
                <span className="text-[#484f58]"> ({echoData.conviction} conviction)</span>
                {' — '}{echoData.keyReason}
                {echoData.conflicts.length > 0 && (
                  <div className="mt-1 text-[11px] text-[#e3b341]">
                    Conflict: {echoData.conflicts.join(' · ')}
                  </div>
                )}
              </div>
            </AgentRow>
          )}
          <div className="mt-2 flex gap-3 items-start bg-[#1c2128] rounded px-3 py-2.5">
            <AgentTag agent="foxtrot" />
            <div className="text-[13px] text-[#c9d1d9] leading-relaxed pt-0.5">{foxtrotRationale}</div>
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
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-12 text-center space-y-2">
        <div className="text-[#e6edf3] font-semibold">No decision trail yet</div>
        <div className="text-[#6e7681] text-sm max-w-md mx-auto">
          Decision trails are recorded when the trading team runs. Make sure{' '}
          <code className="text-[#79c0ff] bg-[#21262d] px-1 rounded text-xs">USE_TRADING_TEAM=true</code>{' '}
          is set, then run the analysis cron. Agent reports will appear here from the next run forward.
        </div>
      </div>
    )
  }

  const selected = withReports.find(a => a.date === selectedDate) ?? withReports[0]
  const reports = selected.agent_reports!

  return (
    <div className="space-y-4">
      {/* Agent directory */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-[#8b949e] mb-3">
          The Trading Team · 6 agents ran today
        </div>
        <div className="flex flex-wrap gap-3">
          {(['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot'] as const).map(agent => (
            <AgentTag key={agent} agent={agent} />
          ))}
        </div>
      </div>

      {/* Date selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] uppercase tracking-wider text-[#8b949e]">Trail for:</span>
        {withReports.slice(0, 10).map(a => (
          <button
            key={a.date}
            onClick={() => setSelectedDate(a.date)}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${
              a.date === (selectedDate || withReports[0].date)
                ? 'bg-[#1f6feb] border-[#1f6feb] text-white'
                : 'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:border-[#58a6ff] hover:text-[#58a6ff]'
            }`}
          >
            {new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </button>
        ))}
      </div>

      {/* Daily brief */}
      <DailyBrief alpha={reports.alpha} charlie={reports.charlie} echo={reports.echo} />

      {/* Per-symbol decisions */}
      {selected.decisions.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-[#8b949e] mb-2">
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
