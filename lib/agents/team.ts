import { runDailyAnalysis } from '@/lib/claude'
import type { AgentInput, AgentOutput } from '@/lib/claude'
import { supabaseAdmin } from '@/lib/supabase'
import { runAlpha } from './alpha'
import { runBravo } from './bravo'
import { runCharlie } from './charlie'
import { runDelta } from './delta'
import { runEcho } from './echo'
import { runIndia } from './india'
import type { AlphaReport, EchoReport, AgentReports } from './types'

async function readMacroMemory(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('macro_context')
    .select('content')
    .eq('id', 1)
    .single()
  return data?.content ?? ''
}

async function writeMacroMemory(content: string): Promise<void> {
  await supabaseAdmin
    .from('macro_context')
    .upsert({ id: 1, content, updated_at: new Date().toISOString() })
}

async function readUserIntel(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('user_intel')
    .select('note')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.note ?? null
}

async function deleteUserIntel(): Promise<void> {
  await supabaseAdmin
    .from('user_intel')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
}

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
  const heldSymbols = input.holdings.map(h => h.symbol)
  const allSymbols = input.watchlist_quotes.map(q => q.symbol)

  // Top movers for Charlie context and Delta prioritisation
  const topMovers = [...input.watchlist_quotes]
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, 20)

  // Delta: held positions first (always review), then top movers — cap at 20
  const deltaSymbols = [...new Set([...heldSymbols, ...topMovers.map(q => q.symbol)])].slice(0, 20)

  // Read macro memory and any pending user intel before running agents
  const [existingMacroMemory, userNote] = await Promise.all([
    readMacroMemory(),
    readUserIntel(),
  ])

  // Phase 1: all specialists in parallel
  // Bravo runs on full watchlist (pure math, no LLM)
  // Delta runs on held + top 20 movers
  // Charlie receives macro memory and updates it
  // India runs only when user has submitted a note
  const [alphaReport, bravoReport, charlieReport, deltaReport, indiaReport] = await Promise.all([
    runAlpha(),
    runBravo(allSymbols),
    runCharlie(topMovers.slice(0, 10), heldSymbols, existingMacroMemory),
    runDelta(deltaSymbols),
    userNote ? runIndia(userNote) : Promise.resolve(null),
  ])

  // Persist updated macro memory (fire and forget — never block the pipeline)
  if (charlieReport.macroMemory) {
    writeMacroMemory(charlieReport.macroMemory).catch(e =>
      console.error('[team] Failed to write macro memory:', e)
    )
  }

  // Consume user intel — delete after session (fire and forget)
  if (userNote) {
    deleteUserIntel().catch(e =>
      console.error('[team] Failed to delete user intel:', e)
    )
  }

  // Phase 2: Echo synthesises — India included only when it ran
  const echoReport = await runEcho(
    alphaReport, bravoReport, charlieReport, deltaReport,
    charlieReport.macroMemory,
    indiaReport ?? undefined,
  )

  // Phase 3: Foxtrot decides
  const teamContext = buildTeamContext(echoReport, alphaReport)
  const result = await runDailyAnalysis({ ...input, teamContext })

  const agent_reports: AgentReports = {
    alpha: alphaReport,
    bravo: bravoReport,
    charlie: charlieReport,
    delta: deltaReport,
    echo: echoReport,
    ...(indiaReport ? { india: indiaReport } : {}),
  }
  return { ...result, team_brief: teamContext, agent_reports }
}
