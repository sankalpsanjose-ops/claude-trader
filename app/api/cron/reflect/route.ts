import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { STARTING_CAPITAL } from '@/lib/trading'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

const ai = new Anthropic()

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)
  const fromDate = thirtyDaysAgo.toISOString().split('T')[0]

  // Fetch last 30 days of data
  const [learningsRes, tradesRes, analysesRes, profileRes] = await Promise.all([
    supabaseAdmin.from('learnings').select('*').gte('date', fromDate).order('date'),
    supabaseAdmin.from('trades').select('*').gte('executed_at', fromDate).order('executed_at'),
    supabaseAdmin.from('daily_analyses').select('date, journal, market_summary').gte('date', fromDate).order('date'),
    supabaseAdmin.from('trader_profile').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const learnings = learningsRes.data ?? []
  const trades = tradesRes.data ?? []
  const analyses = analysesRes.data ?? []
  const currentProfile = profileRes.data

  if (!currentProfile) {
    return NextResponse.json({ error: 'No active trader profile found' }, { status: 500 })
  }

  // Build context for reflection
  const learningLines = learnings.length === 0
    ? 'No daily learnings recorded this month.'
    : learnings.map(l => `  [${l.date}] [${l.category}] ${l.insight}`).join('\n')

  const tradeLines = trades.length === 0
    ? 'No trades executed this month.'
    : trades.map(t =>
        `  ${t.executed_at.split('T')[0]} ${t.action} ${t.quantity}x ${t.symbol} @ ₹${t.price} — ${t.rationale}${t.realised_pnl != null ? ` | P&L: ₹${Number(t.realised_pnl).toFixed(0)}` : ''}`
      ).join('\n')

  const journalLines = analyses.length === 0
    ? 'No journal entries this month.'
    : analyses.map(a => `  [${a.date}] ${a.journal.slice(0, 150)}...`).join('\n')

  const portfolioRes = await supabaseAdmin.from('portfolio').select('cash, total_value').single()
  const portfolio = portfolioRes.data
  const totalReturn = portfolio ? ((portfolio.total_value - STARTING_CAPITAL) / STARTING_CAPITAL * 100).toFixed(2) : 'unknown'

  const prompt = `You are reviewing the past month of trading activity for an autonomous Claude trader.

CURRENT PORTFOLIO RETURN: ${totalReturn}%

DAILY LEARNINGS LOGGED (last 30 days):
${learningLines}

TRADES EXECUTED (last 30 days):
${tradeLines}

JOURNAL EXCERPTS (last 30 days):
${journalLines}

CURRENT TRADER PROFILE (v${currentProfile.version}):
${currentProfile.content.slice(0, 2000)}...

Your task:
1. Identify 2-3 concrete behavioural patterns (good or bad) from this month's data
2. Write a monthly reflection paragraph summarising what happened and why
3. Write an updated full trader profile in markdown that incorporates lessons learned — keep what worked, fix what didn't. Preserve the existing structure and all sections, but update the content where the evidence suggests change is needed.

Respond with JSON only:
{
  "monthly_insight": "One sentence summary of the month's key lesson",
  "patterns": ["pattern 1", "pattern 2", "pattern 3"],
  "reflection": "Full paragraph monthly reflection",
  "updated_profile": "Full updated markdown content for trader-profile.md"
}`

  const res = await ai.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = res.content[0].type === 'text' ? res.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) {
    return NextResponse.json({ error: 'Reflection did not return valid JSON' }, { status: 500 })
  }

  const reflection = JSON.parse(match[0])
  const monthLabel = today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  // Store monthly reflection as a learning entry
  const reflectionInsight = [
    reflection.monthly_insight,
    ...(reflection.patterns ?? []).map((p: string) => `• ${p}`),
    '',
    reflection.reflection,
  ].join('\n')

  await Promise.all([
    supabaseAdmin.from('learnings').upsert({
      date: today.toISOString().split('T')[0],
      category: 'monthly',
      insight: reflectionInsight,
      source: 'monthly_reflection',
    }),
    // Write new versioned profile to DB
    supabaseAdmin.from('trader_profile').insert({
      version: currentProfile.version + 1,
      content: reflection.updated_profile,
      change_notes: `Monthly reflection — ${monthLabel}. Patterns: ${(reflection.patterns ?? []).join('; ')}`,
    }),
  ])

  return NextResponse.json({
    ok: true,
    month: monthLabel,
    new_profile_version: currentProfile.version + 1,
    monthly_insight: reflection.monthly_insight,
    patterns: reflection.patterns,
  })
}
