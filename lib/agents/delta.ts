import Anthropic from '@anthropic-ai/sdk'
import { getFundamentalsForSymbols } from '@/lib/yahoo'
import type { DeltaReport } from './types'

const anthropic = new Anthropic()

const FALLBACK: DeltaReport = { perSymbol: {} }

export async function runDelta(symbols: string[]): Promise<DeltaReport> {
  const fundamentals = await getFundamentalsForSymbols(symbols.slice(0, 15))
  if (fundamentals.length === 0) return FALLBACK

  const rows = fundamentals.map(f => {
    const upside = f.targetMeanPrice && f.currentPrice && f.currentPrice > 0
      ? (((f.targetMeanPrice - f.currentPrice) / f.currentPrice) * 100).toFixed(1) + '%'
      : 'N/A'
    const pe = f.trailingPE != null ? f.trailingPE.toFixed(1) : 'N/A'
    return `${f.symbol}: P/E=${pe}, analyst=${f.recommendationKey}, target upside=${upside}`
  }).join('\n')

  const prompt = `You are Delta, the Fundamental Research analyst for an Indian equity trading team.

Fundamentals for today's key stocks:
${rows}

For each stock, assess the investment signal based on valuation and analyst consensus. A P/E below 20 for a large-cap Indian stock is cheap; above 40 is expensive. Analyst "strong_buy" or "buy" with >10% upside is bullish. "sell" or "underperform" is bearish.

Respond with JSON only — no prose outside the JSON:
{
  "perSymbol": {
    "SYMBOL.NS": {
      "signal": "bullish",
      "trailingPE": 18.5,
      "analystTargetUpside": 12.3,
      "recommendation": "buy",
      "rationale": "2-3 sentences. State the valuation verdict (cheap/fair/expensive vs sector average), cite the specific P/E or analyst target upside number that drives it, and note one key business quality factor (growth rate, ROE, margin trend, or debt level)."
    }
  }
}
Valid signal values: "bullish", "bearish", "neutral"
Use null for trailingPE or analystTargetUpside when data is unavailable.`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return FALLBACK
    return JSON.parse(match[0]) as DeltaReport
  } catch {
    return FALLBACK
  }
}
