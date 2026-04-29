import Anthropic from '@anthropic-ai/sdk'
import { getNewsForSymbols } from '@/lib/yahoo'
import type { QuoteResult } from '@/lib/yahoo'
import type { CharlieReport } from './types'

const anthropic = new Anthropic()

const FALLBACK: CharlieReport = {
  perSymbol: {},
  geopoliticalRisks: [],
  macroThemes: [],
  overallSentiment: 'neutral',
}

export async function runCharlie(topMovers: QuoteResult[], heldSymbols: string[]): Promise<CharlieReport> {
  // Fetch news for held stocks, top movers, and broad macro queries
  const symbolQueries = [...new Set([...heldSymbols, ...topMovers.map(q => q.symbol)])].slice(0, 6)
  const macroQueries = ['India Nifty stock market', 'crude oil geopolitics']
  const news = await getNewsForSymbols([...symbolQueries, ...macroQueries])

  if (news.length === 0) return FALLBACK

  const newsText = news.slice(0, 30).map(n => `- ${n.title}${n.publisher ? ` (${n.publisher})` : ''}`).join('\n')

  const moversText = topMovers.slice(0, 10)
    .map(q => `${q.symbol} ${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%`)
    .join(', ')

  const prompt = `You are Charlie, the News & Geopolitics analyst for an Indian equity trading team.

Today's top movers on NSE/BSE: ${moversText}

Recent headlines:
${newsText}

Analyse this for an Indian equity portfolio. Identify:
1. Geopolitical risks — wars, sanctions, trade disputes, elections affecting Indian markets (e.g. Middle East tensions = crude spike, US tariffs = IT sector risk)
2. Macro themes — central bank moves, commodity shocks, currency stress
3. Per-symbol sentiment for any stocks mentioned

Respond with JSON only — no prose outside the JSON:
{
  "perSymbol": {
    "SYMBOL.NS": { "signal": "bullish", "reason": "2-3 sentences. Include the specific headline or data point driving the signal. Mention any sector-level tailwind or risk that applies." }
  },
  "geopoliticalRisks": ["Each item 1-2 sentences: what happened and why it matters for Indian equities"],
  "macroThemes": ["Each item 1-2 sentences: the theme and its directional impact on Indian markets"],
  "overallSentiment": "bullish"
}
Valid signal values: "bullish", "bearish", "neutral"
Valid overallSentiment values: "bullish", "bearish", "neutral"`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return FALLBACK
    return JSON.parse(match[0]) as CharlieReport
  } catch {
    return FALLBACK
  }
}
