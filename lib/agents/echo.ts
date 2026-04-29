import Anthropic from '@anthropic-ai/sdk'
import type { AlphaReport, BravoReport, CharlieReport, DeltaReport, EchoReport } from './types'

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
    lines.push(`  ${symbol}: RSI=${s.rsi14}, ${trend}, momentum=${s.momentum}`)
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

function fmtDelta(r: DeltaReport): string {
  const lines = ['FUNDAMENTAL RESEARCH (Delta):']
  for (const [s, v] of Object.entries(r.perSymbol)) {
    const upside = v.analystTargetUpside != null ? v.analystTargetUpside.toFixed(1) + '%' : 'N/A'
    lines.push(`  ${s}: ${v.signal}, ${v.recommendation}, upside=${upside} — ${v.rationale}`)
  }
  if (Object.keys(r.perSymbol).length === 0) lines.push('  No fundamental data available.')
  return lines.join('\n')
}

const FALLBACK: EchoReport = {
  perSymbol: {},
  macroContext: 'Intelligence synthesis unavailable.',
  topOpportunities: [],
  topRisks: [],
}

export async function runEcho(
  alpha: AlphaReport,
  bravo: BravoReport,
  charlie: CharlieReport,
  delta: DeltaReport,
): Promise<EchoReport> {
  const context = [fmtAlpha(alpha), fmtBravo(bravo), fmtCharlie(charlie), fmtDelta(delta)].join('\n\n')

  const prompt = `You are Echo, the Supervisor for an Indian equity trading team. Four specialist agents have filed their reports below.

${context}

Synthesise their findings for the Portfolio Manager. For each stock, identify where specialists agree (high conviction) vs. conflict (e.g. RSI overbought but analyst says strong buy). Note macro amplifiers (e.g. crude drop = bullish for OMCs, USD strength = bullish for IT exporters).

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
  "macroContext": "3-4 sentences: global backdrop, key macro tailwinds and risks for Indian equities today. Mention FII/DII flows if known from Alpha data, commodity impact on relevant sectors, and any central bank or currency development.",
  "topOpportunities": ["SYMBOL.NS: one-line thesis"],
  "topRisks": ["risk description"]
}
Valid outlook values: "bullish", "bearish", "neutral"
Valid conviction values: "high", "medium", "low"
Limit topOpportunities and topRisks to 3 items each.`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return FALLBACK
    return JSON.parse(match[0]) as EchoReport
  } catch {
    return FALLBACK
  }
}
