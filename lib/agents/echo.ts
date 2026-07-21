import Anthropic from '@anthropic-ai/sdk'
import type { AlphaReport, BravoReport, CharlieReport, DeltaReport, EchoReport, IndiaReport } from './types'

const anthropic = new Anthropic()

function fmtAlpha(r: AlphaReport): string {
  const lines: string[] = ['GLOBAL MARKETS (Alpha):']
  for (const v of Object.values(r.indices)) {
    lines.push(`  ${v.name}: ${v.changePct >= 0 ? '+' : ''}${v.changePct.toFixed(2)}%`)
  }
  lines.push('COMMODITIES:')
  for (const v of Object.values(r.commodities)) {
    lines.push(`  ${v.name}: $${v.price.toFixed(2)} (${v.changePct >= 0 ? '+' : ''}${v.changePct.toFixed(2)}%)`)
  }
  lines.push('FOREX:')
  for (const v of Object.values(r.forex)) {
    lines.push(`  ${v.name}: ${v.rate.toFixed(2)} (${v.changePct >= 0 ? '+' : ''}${v.changePct.toFixed(2)}%)`)
  }
  return lines.join('\n')
}

function fmtBravo(r: BravoReport): string {
  const lines = ['TECHNICAL SIGNALS (Bravo):']
  for (const [symbol, s] of Object.entries(r.signals)) {
    const trend = s.aboveSma50 ? 'above 50SMA' : 'below 50SMA'
    const vol = s.volumeRatio >= 2.0 ? `vol=${s.volumeRatio}x HIGH` : s.volumeRatio >= 1.5 ? `vol=${s.volumeRatio}x elevated` : `vol=${s.volumeRatio}x`
    lines.push(`  ${symbol}: RSI=${s.rsi14}, ${trend}, momentum=${s.momentum}, ${vol}`)
  }
  if (Object.keys(r.signals).length === 0) lines.push('  No signals computed.')
  return lines.join('\n')
}

function fmtCharlie(r: CharlieReport): string {
  const lines = [`NEWS & GEOPOLITICS (Charlie): overall=${r.overallSentiment}`]
  if (r.geopoliticalRisks.length) lines.push('  Geopolitical: ' + r.geopoliticalRisks.join('; '))
  if (r.macroThemes.length) lines.push('  Macro: ' + r.macroThemes.join('; '))
  for (const [s, v] of Object.entries(r.perSymbol)) {
    lines.push(`  ${s}: ${v.signal} — ${v.reason}`)
  }
  return lines.join('\n')
}

function fmtIndia(r: IndiaReport): string {
  const lines = [`PORTFOLIO MANAGER INTEL (India): overall=${r.sentiment}`]
  lines.push(`  Summary: ${r.summary}`)
  if (r.flaggedSymbols.length) {
    for (const s of r.flaggedSymbols) {
      lines.push(`  ${s.symbol}: ${s.signal} — ${s.reason}`)
    }
  }
  if (r.macroNotes.length) lines.push('  Macro: ' + r.macroNotes.join('; '))
  return lines.join('\n')
}

function fmtDelta(r: DeltaReport): string {
  const lines = ['FUNDAMENTAL RESEARCH (Delta):']
  for (const [s, v] of Object.entries(r.perSymbol)) {
    const upside = v.analystTargetUpside != null ? v.analystTargetUpside.toFixed(1) + '%' : 'N/A'
    lines.push(`  ${s}: ${v.signal}, ${v.recommendation}, upside=${upside} — ${v.rationale}`)
  }
  if (Object.keys(r.perSymbol).length === 0) lines.push('  No fundamental data available.')
  return lines.join('\n')
}

function buildFallback(reason: string): EchoReport {
  return {
    perSymbol: {},
    macroContext: `Intelligence synthesis unavailable — ${reason}`,
    topOpportunities: [],
    topRisks: [],
  }
}

export async function runEcho(
  alpha: AlphaReport,
  bravo: BravoReport,
  charlie: CharlieReport,
  delta: DeltaReport,
  macroMemory: string,
  india?: IndiaReport,
): Promise<EchoReport> {
  const parts = [fmtAlpha(alpha), fmtBravo(bravo), fmtCharlie(charlie), fmtDelta(delta)]
  if (india) parts.push(fmtIndia(india))
  const context = parts.join('\n\n')

  const macroMemorySection = macroMemory.trim()
    ? `CHARLIE'S MACRO INTELLIGENCE DOCUMENT (built from news across sessions):\n${macroMemory}\n\n`
    : ''

  const agentCount = india ? 'Five' : 'Four'
  const prompt = `You are Echo, the Supervisor for an Indian equity trading team. ${agentCount} specialist agents have filed their reports below.

${macroMemorySection}${context}

Synthesise their findings for the Portfolio Manager. For each stock, identify where specialists agree (high conviction) vs. conflict (e.g. RSI overbought but analyst says strong buy). Note macro amplifiers from the macro intelligence document and today's Alpha data. If India (portfolio manager intel) is present, treat it as high-signal ground truth from the decision-maker — weight it heavily when it conflicts with other agents.

Respond with JSON only — no prose outside the JSON:
{
  "perSymbol": {
    "SYMBOL.NS": {
      "outlook": "bullish",
      "conviction": "high",
      "keyReason": "single most important factor in 15-20 words — include a specific number or data point",
      "conflicts": ["Each conflict: which two agents disagree, what each says, and how Foxtrot should weigh them"]
    }
  },
  "macroContext": "3-4 sentences: global backdrop, key macro tailwinds and risks for Indian equities today. Reference the macro memory document and today's Alpha data.",
  "topOpportunities": ["SYMBOL.NS: one-line thesis"],
  "topRisks": ["risk description"]
}
Valid outlook values: "bullish", "bearish", "neutral"
Valid conviction values: "high", "medium", "low"
Limit topOpportunities and topRisks to 3 items each.`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })
    // Sonnet 5 runs adaptive thinking by default — take the last text block.
    const textBlocks = msg.content.filter(b => b.type === 'text')
    const text = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      const reason = `no JSON in model response (stop_reason: ${msg.stop_reason})`
      console.error('[Echo] No JSON found in response. Stop reason:', msg.stop_reason, '| Preview:', text.slice(0, 200))
      return buildFallback(reason)
    }
    return JSON.parse(match[0]) as EchoReport
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    console.error('[Echo] Failed:', reason)
    return buildFallback(reason)
  }
}
