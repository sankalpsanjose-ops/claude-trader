import Anthropic from '@anthropic-ai/sdk'
import type { IndiaReport } from './types'

const anthropic = new Anthropic()

async function fetchUrlContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const html = await res.text()
    // Strip HTML tags, collapse whitespace
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return text.slice(0, 5000)
  } catch {
    return ''
  }
}

const FALLBACK: null = null

export async function runIndia(userNote: string): Promise<IndiaReport | null> {
  const isUrl = /^https?:\/\//i.test(userNote.trim())

  let content = ''
  let promptContext = ''

  if (isUrl) {
    content = await fetchUrlContent(userNote.trim())
    if (!content) {
      console.error('[India] Failed to fetch URL:', userNote)
      return FALLBACK
    }
    promptContext = `The portfolio manager has provided a URL. Here is the page content:\n\n${content}`
  } else {
    promptContext = `The portfolio manager has provided this note:\n\n${userNote}`
  }

  const tools: Anthropic.Tool[] = isUrl ? [] : [
    {
      name: 'web_search',
      description: 'Search the web for current information',
      input_schema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'The search query' },
        },
        required: ['query'],
      },
    },
  ]

  const prompt = `You are India, an intelligence agent for an Indian equity trading team. The portfolio manager — your direct source — has provided intelligence below. Your job is to analyse it and file a structured report for the synthesis agent (Echo).

${promptContext}

Extract actionable intelligence for Indian equity trading. Identify:
- Which NSE/BSE stocks are mentioned or implicated (use .NS suffix)
- Whether the signal is bullish, bearish, or neutral for each
- Macro themes that affect the broader market
- Overall sentiment of the intelligence

Respond with JSON only:
{
  "originalNote": "${userNote.replace(/"/g, '\\"').slice(0, 200)}",
  "summary": "2-3 sentence summary of the key intelligence and its market implications",
  "flaggedSymbols": [
    { "symbol": "SYMBOL.NS", "signal": "bullish|bearish|neutral", "reason": "why in one sentence" }
  ],
  "macroNotes": ["macro theme 1", "macro theme 2"],
  "sentiment": "bullish|bearish|neutral|mixed"
}`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      tools: tools.length > 0 ? tools : undefined,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = msg.content.find(b => b.type === 'text')
    const text = textBlock?.type === 'text' ? textBlock.text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      console.error('[India] No JSON in response')
      return FALLBACK
    }
    return JSON.parse(match[0]) as IndiaReport
  } catch (e) {
    console.error('[India] Failed:', e instanceof Error ? e.message : e)
    return FALLBACK
  }
}
