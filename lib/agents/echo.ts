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
    const trend = `${s.aboveSma20 ? 'above' : 'below'} 20SMA, ${s.aboveSma50 ? 'above' : 'below'} 50SMA`
    const vol = s.volumeRatio >= 2.0 ? `vol=${s.volumeRatio}x HIGH` : s.volumeRatio >= 1.5 ? `vol=${s.volumeRatio}x elevated` : `vol=${s.volumeRatio}x`
    const mom = s.momentumPct != null ? `10d=${s.momentumPct >= 0 ? '+' : ''}${s.momentumPct}%` : `momentum=${s.momentum}`
    lines.push(`  ${symbol}: RSI=${s.rsi14}, ${trend}, ${mom}, ${vol}`)
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
    failed: true,
  }
}

// Structured output guarantees parseable JSON. perSymbol is an array here
// (strict schemas can't express a map with dynamic keys) and is converted back
// to the Record shape the rest of the app reads.
const ECHO_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['perSymbol', 'macroContext', 'topOpportunities', 'topRisks'],
  properties: {
    perSymbol: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['symbol', 'outlook', 'conviction', 'keyReason', 'conflicts'],
        properties: {
          symbol: { type: 'string' },
          outlook: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
          conviction: { type: 'string', enum: ['high', 'medium', 'low'] },
          keyReason: { type: 'string' },
          conflicts: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    macroContext: { type: 'string' },
    topOpportunities: { type: 'array', items: { type: 'string' } },
    topRisks: { type: 'array', items: { type: 'string' } },
  },
} as const

interface EchoStructured {
  perSymbol: Array<{ symbol: string } & EchoReport['perSymbol'][string]>
  macroContext: string
  topOpportunities: string[]
  topRisks: string[]
}

/**
 * @param focusSymbols Held positions plus today's momentum candidates. Echo rates
 * only these — asking it to rate the full ~100-symbol watchlist overflowed the
 * output budget and broke synthesis on 161 of 193 days before 2026-11-15.
 */
export async function runEcho(
  alpha: AlphaReport,
  bravo: BravoReport,
  charlie: CharlieReport,
  delta: DeltaReport,
  macroMemory: string,
  focusSymbols: string[],
  india?: IndiaReport,
): Promise<EchoReport> {
  const focus = new Set(focusSymbols)
  const focusedBravo: BravoReport = {
    signals: Object.fromEntries(Object.entries(bravo.signals).filter(([s]) => focus.has(s))),
  }
  const parts = [fmtAlpha(alpha), fmtBravo(focusedBravo), fmtCharlie(charlie), fmtDelta(delta)]
  if (india) parts.push(fmtIndia(india))
  const context = parts.join('\n\n')

  const macroMemorySection = macroMemory.trim()
    ? `CHARLIE'S MACRO INTELLIGENCE DOCUMENT (built from news across sessions):\n${macroMemory}\n\n`
    : ''

  const agentCount = india ? 'Five' : 'Four'
  const prompt = `You are Echo, the Supervisor for an Indian equity trading team. ${agentCount} specialist agents have filed their reports below.

${macroMemorySection}${context}

Synthesise their findings for the Portfolio Manager. For each stock, identify where specialists agree (high conviction) vs. conflict (e.g. RSI overbought but analyst says strong buy). Note macro amplifiers from the macro intelligence document and today's Alpha data. If India (portfolio manager intel) is present, treat it as high-signal ground truth from the decision-maker — weight it heavily when it conflicts with other agents.

Rate exactly these symbols, one perSymbol entry each: ${focusSymbols.join(', ')}

The team is running a momentum strategy: it buys stocks already trending up (above their 20- and 50-day averages, positive 10-day momentum) and avoids falling ones. "bullish" means you expect the uptrend to continue over the next two weeks. A new buy is only allowed when your rating is bullish with high or medium conviction, so reserve those for names where the evidence actually supports it.

Field guidance:
- keyReason: the single most important factor in 15-20 words, including a specific number or data point.
- conflicts: each entry names which two agents disagree, what each says, and how Foxtrot should weigh them. Empty if none.
- macroContext: 3-4 sentences on the global backdrop and key macro tailwinds and risks for Indian equities today, referencing the macro memory document and today's Alpha data.
- topOpportunities: up to 3, formatted "SYMBOL.NS: one-line thesis".
- topRisks: up to 3.`

  try {
    const request = {
      model: 'claude-sonnet-5',
      max_tokens: 16000,
      messages: [{ role: 'user' as const, content: prompt }],
    }
    let msg
    try {
      msg = await anthropic.messages.create({
        ...request,
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: ECHO_SCHEMA } },
      })
    } catch (e) {
      // Structured outputs were untested live when this shipped — if the API
      // rejects the parameter, fall back to free-text JSON rather than lose the day.
      if (!(e instanceof Anthropic.BadRequestError)) throw e
      console.error('[Echo] Structured output rejected, retrying as free text:', e.message)
      msg = await anthropic.messages.create({
        ...request,
        messages: [{ role: 'user', content: `${prompt}\n\nRespond with JSON only, matching this schema:\n${JSON.stringify(ECHO_SCHEMA)}` }],
      })
    }

    if (msg.stop_reason === 'max_tokens') {
      console.error('[Echo] Hit max_tokens before finishing')
      return buildFallback('response truncated (stop_reason: max_tokens)')
    }
    // Sonnet 5 runs adaptive thinking by default — take the last text block.
    const textBlocks = msg.content.filter(b => b.type === 'text')
    const text = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      const reason = `no JSON in model response (stop_reason: ${msg.stop_reason})`
      console.error('[Echo] No JSON found in response. Stop reason:', msg.stop_reason, '| Preview:', text.slice(0, 200))
      return buildFallback(reason)
    }
    const parsed = JSON.parse(match[0]) as EchoStructured
    const perSymbol: EchoReport['perSymbol'] = {}
    for (const { symbol, ...rest } of parsed.perSymbol ?? []) perSymbol[symbol] = rest
    return {
      perSymbol,
      macroContext: parsed.macroContext,
      topOpportunities: parsed.topOpportunities ?? [],
      topRisks: parsed.topRisks ?? [],
    }
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    console.error('[Echo] Failed:', reason)
    return buildFallback(reason)
  }
}
