import { runDailyAnalysis } from '@/lib/claude'
import type { AgentInput, AgentOutput } from '@/lib/claude'
import { runAlpha } from './alpha'
import { runBravo } from './bravo'
import { runCharlie } from './charlie'
import { runDelta } from './delta'
import { runEcho } from './echo'
import type { AlphaReport, EchoReport } from './types'

function buildTeamContext(echo: EchoReport, alpha: AlphaReport): string {
  const lines = [
    '═══════════════════════════════════════════════',
    'INTELLIGENCE BRIEF — TRADING TEAM',
    '═══════════════════════════════════════════════',
    '',
    'MACRO BACKDROP:',
    echo.macroContext,
    '',
  ]

  if (echo.topOpportunities.length) {
    lines.push('TOP OPPORTUNITIES:')
    echo.topOpportunities.forEach(o => lines.push(`  • ${o}`))
    lines.push('')
  }

  if (echo.topRisks.length) {
    lines.push('KEY RISKS:')
    echo.topRisks.forEach(r => lines.push(`  • ${r}`))
    lines.push('')
  }

  if (Object.keys(echo.perSymbol).length) {
    lines.push('SYMBOL SIGNALS:')
    for (const [symbol, data] of Object.entries(echo.perSymbol)) {
      const conflict = data.conflicts.length ? ` [CONFLICT: ${data.conflicts[0]}]` : ''
      lines.push(
        `  ${symbol}: ${data.outlook.toUpperCase()} (${data.conviction} conviction) — ${data.keyReason}${conflict}`
      )
    }
    lines.push('')
  }

  // Include raw Alpha numbers so Foxtrot can reference exact price levels
  lines.push('GLOBAL MARKETS:')
  for (const v of Object.values(alpha.indices)) {
    lines.push(`  ${v.name}: ${v.changePct >= 0 ? '+' : ''}${v.changePct.toFixed(2)}%`)
  }
  lines.push('COMMODITIES:')
  for (const v of Object.values(alpha.commodities)) {
    lines.push(`  ${v.name}: $${v.price.toFixed(2)} (${v.changePct >= 0 ? '+' : ''}${v.changePct.toFixed(2)}%)`)
  }
  lines.push('FOREX:')
  for (const v of Object.values(alpha.forex)) {
    lines.push(`  ${v.name}: ${v.rate.toFixed(2)} (${v.changePct >= 0 ? '+' : ''}${v.changePct.toFixed(2)}%)`)
  }
  lines.push('')
  lines.push('═══════════════════════════════════════════════')

  return lines.join('\n')
}

export async function runTradingTeam(input: AgentInput): Promise<AgentOutput> {
  const topMovers = [...input.watchlist_quotes]
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, 10)

  const heldSymbols = input.holdings.map(h => h.symbol)
  const keySymbols = [...new Set([...heldSymbols, ...topMovers.map(q => q.symbol)])]

  // Phase 1: all 4 specialists in parallel
  const [alphaReport, bravoReport, charlieReport, deltaReport] = await Promise.all([
    runAlpha(),
    runBravo(keySymbols),
    runCharlie(topMovers, heldSymbols),
    runDelta(keySymbols),
  ])

  // Phase 2: Echo synthesises specialist outputs
  const echoReport = await runEcho(alphaReport, bravoReport, charlieReport, deltaReport)

  // Phase 3: Foxtrot (Portfolio Manager) decides with full intelligence context injected
  const teamContext = buildTeamContext(echoReport, alphaReport)
  return runDailyAnalysis({ ...input, teamContext })
}
