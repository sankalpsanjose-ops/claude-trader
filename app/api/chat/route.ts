import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSupabase, supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ai = new Anthropic()

const KINGPIN_SYSTEM = `You are KingPin — the communications agent for an autonomous AI trading team operating on India's NSE and BSE exchanges with ₹5,00,000 starting capital (paper trading, no real money).

The team has specialists covering global markets, technical analysis, news and geopolitics, fundamental research, synthesis, portfolio management, rules validation, and risk auditing. You speak for all of them as one voice.

PERSONA:
- Always speak as "we" — you are the whole team, not any one member
- You are transparent about what the team observed, analysed, and decided — including context that didn't lead to action
- When the team saw a signal but didn't act: "we weighed X against Y and held off" — never "we missed it"
- When the risk process flagged something: "our risk review flagged X and we adjusted" — never blame or shame
- Refer to specialists by role only — "our macro intelligence", "our technical analysis", "our risk review", "our fundamental research", "our portfolio manager" — never by individual name or callsign
- Be honest, curious, and direct. If the team got something wrong, own it collectively

RULES — non-negotiable:
1. Answer ONLY from the data provided in the context snapshot. If something isn't there, say "we don't have that data right now."
2. NEVER fabricate prices, signals, P&L figures, or events not present in the context.
3. NEVER give investment advice. You explain the team's own past and present analysis and decisions — not what the user should do.
4. For trade rationale, quote the actual rationale from the data verbatim before adding commentary.
5. Elaborate when the question deserves depth — don't truncate a complex answer artificially.
6. If the context shows no relevant data, say so clearly — never invent activity.`

function buildGatePrompt(question: string): string {
  return `Classify the following question as either ON_TOPIC or OFF_TOPIC for an AI trading team called KingPin.

ON_TOPIC includes any question about:
- The team's trades, holdings, portfolio state, or P&L
- Trading strategy, position sizing, risk rules, or decision rationale
- Market analysis the team has done — technical signals, fundamentals, sector views
- Macro context the team has observed — global markets, currencies, commodities, oil
- Geopolitical or news events that affect the team's holdings or watchlist
- What the team has been learning, patterns in its behaviour, or monthly reflections
- How the team's pipeline or agents work
- Audit flags, trade rejections, or risk reviews the team has gone through

OFF_TOPIC means the question has no connection to this trading team:
- Asking the user what stocks to buy for their own portfolio
- Completely personal, political, or social topics unrelated to markets
- Predictions about stocks the team has never analysed or mentioned

When in doubt, classify as ON_TOPIC.

Respond with exactly one word: ON_TOPIC or OFF_TOPIC

Question: ${question}`
}

async function fetchRagContext(): Promise<string> {
  const supabase = getSupabase()

  const [portfolioRes, holdingsRes, tradesRes, analysesRes, learningsRes, profileRes, auditsRes] = await Promise.all([
    supabase.from('portfolio').select('cash, total_value').single(),
    supabase.from('holdings').select('symbol, name, quantity, buy_price, buy_date'),
    supabase.from('trades').select('symbol, action, quantity, price, rationale, executed_at, realised_pnl').order('executed_at', { ascending: false }).limit(50),
    supabase.from('daily_analyses').select('date, journal, market_summary, team_brief').order('date', { ascending: false }).limit(30),
    supabase.from('learnings').select('date, category, insight').order('date', { ascending: false }),
    supabase.from('trader_profile').select('content').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('audits').select('date, sanity_notes, rejections').order('date', { ascending: false }).limit(10),
  ])

  const portfolio = portfolioRes.data
  const holdings = holdingsRes.data ?? []
  const trades = tradesRes.data ?? []
  const analyses = analysesRes.data ?? []
  const learnings = learningsRes.data ?? []
  const profile = profileRes.data
  const audits = (auditsRes.data ?? []).filter(a => a.sanity_notes || (a.rejections as unknown[])?.length > 0)

  const lines: string[] = [
    `=== KINGPIN TEAM CONTEXT ===`,
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

  lines.push(``, `ALL TRADES (${trades.length} total)`)
  if (trades.length === 0) {
    lines.push(`  No trades executed yet.`)
  } else {
    for (const t of trades) {
      const date = new Date(t.executed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      const pnlPart = t.realised_pnl != null ? ` | P&L: ₹${Math.round(t.realised_pnl).toLocaleString('en-IN')}` : ''
      lines.push(`  - ${date} ${t.action} ${t.quantity}x ${t.symbol} @ ₹${t.price} | reason: "${t.rationale}"${pnlPart}`)
    }
  }

  lines.push(``, `DAILY ANALYSIS LOG (last ${analyses.length} days)`)
  if (analyses.length === 0) {
    lines.push(`  No daily analyses yet.`)
  } else {
    for (const a of analyses) {
      lines.push(`  [${a.date}]`)
      if (a.market_summary) lines.push(`    Market: ${a.market_summary}`)
      if (a.team_brief) lines.push(`    Team brief: ${a.team_brief}`)
      if (a.journal) lines.push(`    Journal: ${a.journal}`)
    }
  }

  lines.push(``, `LEARNINGS (${learnings.length} total)`)
  if (learnings.length === 0) {
    lines.push(`  No learnings recorded yet.`)
  } else {
    for (const l of learnings) {
      lines.push(`  [${l.date}] [${l.category}] ${l.insight}`)
    }
  }

  if (audits.length > 0) {
    lines.push(``, `RISK REVIEW FLAGS (last ${audits.length} flagged days)`)
    for (const a of audits) {
      const rejections = (a.rejections as Array<{ symbol: string; action: string; reason: string }> ?? [])
      if (a.sanity_notes) lines.push(`  [${a.date}] Risk note: ${a.sanity_notes}`)
      for (const r of rejections) {
        lines.push(`  [${a.date}] Rules blocked: ${r.action} ${r.symbol} — ${r.reason}`)
      }
    }
  }

  if (profile?.content) {
    lines.push(``, `ACTIVE STRATEGY & RULES`, profile.content)
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
    model: 'claude-haiku-4-5',
    max_tokens: 10,
    messages: [{ role: 'user', content: buildGatePrompt(trimmed) }],
  })

  const gateText = gateMsg.content[0].type === 'text' ? gateMsg.content[0].text.trim() : ''
  if (!gateText.startsWith('ON_TOPIC')) {
    return NextResponse.json({
      answer: "That's outside what I can speak to. Ask us about our trades, holdings, market analysis, strategy, or what we've been learning — we're an open book on all of that.",
      blocked: true,
    })
  }

  // RAG context fetch → Sonnet answer
  const context = await fetchRagContext()

  const response = await ai.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 2048,
    system: KINGPIN_SYSTEM,
    messages: [{ role: 'user', content: `${context}\n\nQuestion: ${trimmed}` }],
  })

  // Sonnet 5 runs adaptive thinking by default — take the last text block.
  const answerBlocks = response.content.filter(b => b.type === 'text')
  const answer = answerBlocks.length > 0
    ? answerBlocks[answerBlocks.length - 1].text
    : 'Sorry, we could not generate a response right now.'

  return NextResponse.json({ answer })
}
