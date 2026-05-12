import Anthropic from '@anthropic-ai/sdk'
import { getNewsForSymbols, fetchRssHeadlines } from '@/lib/yahoo'
import type { QuoteResult } from '@/lib/yahoo'
import type { CharlieReport } from './types'

const anthropic = new Anthropic()

const FALLBACK: CharlieReport = {
  perSymbol: {},
  geopoliticalRisks: [],
  macroThemes: [],
  overallSentiment: 'neutral',
  macroMemory: '',
}

export async function runCharlie(
  topMovers: QuoteResult[],
  heldSymbols: string[],
  existingMacroMemory: string,
): Promise<CharlieReport> {
  const symbolQueries = [...new Set([...heldSymbols, ...topMovers.map(q => q.symbol)])].slice(0, 6)
  const macroQueries = ['India stock market economy', 'Iran Strait Hormuz oil crisis', 'crude oil price India', 'India rupee Modi policy']

  const [yahooNews, rssNews] = await Promise.all([
    getNewsForSymbols([...symbolQueries, ...macroQueries]),
    fetchRssHeadlines(10),
  ])

  const allNews = [...rssNews, ...yahooNews]
  const seen = new Set<string>()
  const news = allNews.filter(n => {
    if (seen.has(n.title)) return false
    seen.add(n.title)
    return true
  })

  if (news.length === 0) return { ...FALLBACK, macroMemory: existingMacroMemory }

  const newsText = news.slice(0, 50).map(n => `- ${n.title}${n.publisher ? ` (${n.publisher})` : ''}`).join('\n')
  const moversText = topMovers.slice(0, 10)
    .map(q => `${q.symbol} ${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%`)
    .join(', ')

  const macroMemorySection = existingMacroMemory.trim()
    ? `EXISTING MACRO MEMORY (your own document from previous sessions):\n${existingMacroMemory}\n\n`
    : `EXISTING MACRO MEMORY: Empty — this is the first session. Build it from today's headlines.\n\n`

  const prompt = `You are Charlie, the News & Geopolitics analyst for an Indian equity trading team. You maintain a living macro intelligence document across sessions.

${macroMemorySection}TODAY'S HEADLINES:
${newsText}

TODAY'S TOP MOVERS ON NSE/BSE: ${moversText}

YOUR TASKS:
1. Update your macro memory document: add new geopolitical or macro developments from today's headlines, update the status of existing situations, remove anything that has clearly resolved. Keep it factual and sourced from headlines — no opinions, no predictions.
2. Classify today's news for the portfolio.

Respond with JSON only — no prose outside the JSON:
{
  "macroMemory": "Your full updated macro intelligence document as plain text. Structure it with named sections for each ongoing situation. Include: what happened, current status, why it matters for Indian equities. Update this from today's headlines.",
  "perSymbol": {
    "SYMBOL.NS": { "signal": "bullish", "reason": "2-3 sentences citing specific headline or data point" }
  },
  "geopoliticalRisks": ["Each item: what happened and why it matters for Indian equities — 1-2 sentences"],
  "macroThemes": ["Each item: the theme and its directional impact on Indian markets — 1-2 sentences"],
  "overallSentiment": "neutral"
}
Valid signal values: "bullish", "bearish", "neutral"
Valid overallSentiment values: "bullish", "bearish", "neutral"`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return { ...FALLBACK, macroMemory: existingMacroMemory }
    const parsed = JSON.parse(match[0]) as CharlieReport
    if (!parsed.macroMemory) parsed.macroMemory = existingMacroMemory
    return parsed
  } catch {
    return { ...FALLBACK, macroMemory: existingMacroMemory }
  }
}
