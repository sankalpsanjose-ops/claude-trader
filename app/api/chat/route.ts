import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSupabase, supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ai = new Anthropic()

const KINGPIN_SYSTEM = `You are KingPin — an autonomous AI trading bot operating on India's NSE and BSE exchanges with ₹5,00,000 starting capital (paper trading, no real money).

You have been given a snapshot of your actual trading data: current holdings, recent trades with their rationale, recent journal entries, recent learnings, and your active strategy profile.

RULES — non-negotiable:
1. Answer ONLY from the data provided. If a fact is not in the context, say "I don't have that data right now."
2. NEVER fabricate stock picks, prices, P&L figures, or future predictions not present in the context.
3. NEVER give investment advice. You describe YOUR OWN past and present decisions — you are not advising the user.
4. Be direct and first-person. You ARE KingPin talking about your own portfolio.
5. Keep answers concise — 3-6 sentences unless the question genuinely requires more detail.
6. For any trade rationale questions, quote the actual rationale from the trades data verbatim before adding commentary.
7. If the context shows no relevant data (e.g. no trades yet), say so clearly — never invent activity that isn't there.`

function buildGatePrompt(question: string): string {
  return `Classify the following question as either ON_TOPIC or OFF_TOPIC for a trading bot called KingPin.

ON_TOPIC means the question is about:
- KingPin's own trades, holdings, portfolio, or P&L
- KingPin's trading strategy, rationale, or decisions
- KingPin's market analysis, journal entries, or learnings
- KingPin's sector exposure, risk profile, or performance
- General questions about how KingPin works

OFF_TOPIC means the question is:
- Asking for general investment advice unrelated to KingPin's portfolio
- Political, social, or unrelated to trading
- Asking KingPin to predict future prices or recommend stocks to buy
- Personal questions unrelated to the bot's trading activity

Respond with exactly one word: ON_TOPIC or OFF_TOPIC

Question: ${question}`
}

async function fetchRagContext(): Promise<string> {
  const supabase = getSupabase()

  const [portfolioRes, holdingsRes, tradesRes, analysesRes, learningsRes, profileRes] = await Promise.all([
    supabase.from('portfolio').select('cash, total_value').single(),
    supabase.from('holdings').select('symbol, name, quantity, buy_price, buy_date'),
    supabase.from('trades').select('symbol, action, quantity, price, rationale, executed_at, realised_pnl').order('executed_at', { ascending: false }).limit(10),
    supabase.from('daily_analyses').select('date, journal').order('date', { ascending: false }).limit(5),
    supabase.from('learnings').select('date, category, insight').order('date', { ascending: false }).limit(5),
    supabase.from('trader_profile').select('content').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const portfolio = portfolioRes.data
  const holdings = holdingsRes.data ?? []
  const trades = tradesRes.data ?? []
  const analyses = analysesRes.data ?? []
  const learnings = learningsRes.data ?? []
  const profile = profileRes.data

  const lines: string[] = [
    `=== KINGPIN CONTEXT SNAPSHOT ===`,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `PORTFOLIO STATE`,
  ]

  if (portfolio) {
    lines.push(`  Cash available: ₹${Math.round(portfolio.cash).toLocaleString('en-IN')}`)
    lines.push(`  Total value: ₹${Math.round(portfolio.total_value).toLocaleString('en-IN')}`)
  } else {
    lines.push(`  Portfolio data unavailable.`)
  }

  lines.push(``, `CURRENT HOLDINGS (${holdings.length} positions)`)
  if (holdings.length === 0) {
    lines.push(`  No open positions.`)
  } else {
    for (const h of holdings) {
      lines.push(`  - ${h.name} (${h.symbol}): ${h.quantity} shares @ avg ₹${h.buy_price} | held since ${h.buy_date}`)
    }
  }

  lines.push(``, `RECENT TRADES (last ${trades.length})`)
  if (trades.length === 0) {
    lines.push(`  No trades executed yet.`)
  } else {
    for (const t of trades) {
      const date = new Date(t.executed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      const pnlPart = t.realised_pnl != null ? ` | P&L: ₹${Math.round(t.realised_pnl).toLocaleString('en-IN')}` : ''
      lines.push(`  - ${date} ${t.action} ${t.quantity}x ${t.symbol} @ ₹${t.price} | reason: "${t.rationale}"${pnlPart}`)
    }
  }

  lines.push(``, `RECENT JOURNAL ENTRIES (last ${analyses.length})`)
  if (analyses.length === 0) {
    lines.push(`  No journal entries yet.`)
  } else {
    for (const a of analyses) {
      const excerpt = a.journal.length > 300 ? a.journal.slice(0, 300) + '...' : a.journal
      lines.push(`  [${a.date}] ${excerpt}`)
    }
  }

  lines.push(``, `RECENT LEARNINGS (last ${learnings.length})`)
  if (learnings.length === 0) {
    lines.push(`  No learnings recorded yet.`)
  } else {
    for (const l of learnings) {
      lines.push(`  [${l.date}] [${l.category}] ${l.insight}`)
    }
  }

  if (profile?.content) {
    const excerpt = profile.content.length > 1500 ? profile.content.slice(0, 1500) + '\n...(truncated)' : profile.content
    lines.push(``, `ACTIVE STRATEGY PROFILE (excerpt)`, excerpt)
  }

  lines.push(``, `=== END CONTEXT ===`)
  return lines.join('\n')
}

export async function POST(req: NextRequest) {
  let body: { question?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const question = body.question
  if (typeof question !== 'string' || question.trim().length === 0) {
    return NextResponse.json({ error: 'question must be a non-empty string' }, { status: 400 })
  }
  if (question.length > 500) {
    return NextResponse.json({ error: 'question must be 500 characters or fewer' }, { status: 400 })
  }

  const trimmed = question.trim()

  // IP rate limit: 10 questions per IP per hour
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ipBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip))
  const ipHash = Buffer.from(ipBuf).toString('hex')
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString()

  const [, { count }] = await Promise.all([
    supabaseAdmin.from('ask_rate_limits').delete().lt('asked_at', hourAgo),
    supabaseAdmin.from('ask_rate_limits').select('*', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('asked_at', hourAgo),
  ])

  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: 'Rate limit exceeded — 10 questions per hour.' }, { status: 429 })
  }

  await supabaseAdmin.from('ask_rate_limits').insert({ ip_hash: ipHash })

  // Haiku topic gate
  const gateMsg = await ai.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 10,
    messages: [{ role: 'user', content: buildGatePrompt(trimmed) }],
  })

  const gateText = gateMsg.content[0].type === 'text' ? gateMsg.content[0].text.trim() : ''
  if (!gateText.startsWith('ON_TOPIC')) {
    return NextResponse.json({
      answer: "That's outside what I can help with. I'm KingPin — ask me about my trades, holdings, portfolio performance, or trading strategy.",
      blocked: true,
    })
  }

  // RAG context fetch → Sonnet answer (sequential: Sonnet needs context)
  const context = await fetchRagContext()

  const response = await ai.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: KINGPIN_SYSTEM,
    messages: [{ role: 'user', content: `${context}\n\nQuestion: ${trimmed}` }],
  })

  const answer = response.content[0].type === 'text' ? response.content[0].text : 'Sorry, I could not generate a response.'

  return NextResponse.json({ answer })
}
