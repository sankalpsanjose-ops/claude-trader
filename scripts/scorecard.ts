/**
 * Sprint scorecard (2026-11-16 → 2026-11-30): progress to ₹5,00,000, pipeline health, rule violations.
 * Read-only — queries Supabase, no API calls.
 * Usage: npx tsx scripts/scorecard.ts
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { SPRINT } from '../lib/strategy'

const BASELINE_DATE = '2026-11-13' // last close before the sprint
// Nifty close on 2026-11-13. Weekday snapshot rows hold the previous day's Nifty
// close (the fetch window's end date is exclusive), so the baseline is pinned here.
const BASELINE_NIFTY = 25144.3
const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const [snapsRes, auditsRes, tradesRes] = await Promise.all([
    db.from('portfolio_snapshots').select('date,total_value,nifty_close').gte('date', BASELINE_DATE).order('date'),
    db.from('audits').select('date,sanity_notes,rejections').gte('date', BASELINE_DATE).order('date'),
    db.from('trades').select('executed_at,action,symbol,quantity,price,realised_pnl,rationale').gte('executed_at', '2026-11-16').order('executed_at'),
  ])
  const snaps = snapsRes.data ?? []
  const base = snaps.find(s => s.date === BASELINE_DATE) ?? snaps[0]
  const baseNifty = BASELINE_NIFTY
  const audits = new Map((auditsRes.data ?? []).map(a => [a.date, a]))

  const pct = (a: number, b: number) => `${a >= b ? '+' : ''}${((a / b - 1) * 100).toFixed(2)}%`
  console.log(`\nSPRINT SCORECARD — goal ₹${SPRINT.GOAL_VALUE.toLocaleString('en-IN')} by ${SPRINT.END_DATE}, checkpoint ₹${SPRINT.CHECKPOINT_VALUE.toLocaleString('en-IN')} by ${SPRINT.CHECKPOINT_DATE}\n`)
  console.log('date        value       vs base   vs goal     nifty    health')
  for (const s of snaps) {
    const a = audits.get(s.date)
    const health = a?.sanity_notes?.match(/\[health\][^\n]*/)?.[0].replace('[health] ', '') ?? (a?.sanity_notes?.startsWith('Analysis failed') ? 'ANALYSIS FAILED' : '—')
    const nifty = s.nifty_close ? pct(s.nifty_close, baseNifty) : '   —   '
    console.log(
      `${s.date}  ₹${Math.round(s.total_value).toLocaleString('en-IN').padStart(9)}  ${pct(s.total_value, base.total_value).padStart(7)}  ${pct(s.total_value, SPRINT.GOAL_VALUE).padStart(7)}  ${nifty.padStart(7)}   ${health}`,
    )
  }

  const latest = snaps.at(-1)
  if (latest) {
    const gap = SPRINT.GOAL_VALUE - latest.total_value
    console.log(`\nLatest ₹${Math.round(latest.total_value).toLocaleString('en-IN')} — ${gap > 0 ? `₹${Math.round(gap).toLocaleString('en-IN')} short of goal` : 'GOAL MET'}`)
  }

  const sprintAudits = [...audits.values()].filter(a => a.date >= '2026-11-15')
  const echoFails = sprintAudits.filter(a => /echo=FAILED|Analysis failed/.test(a.sanity_notes ?? '')).length
  const rejections = sprintAudits.flatMap(a => (a.rejections as Array<{ symbol: string; reason: string }>) ?? [])
  console.log(`Pipeline: ${echoFails} failed day(s) of ${sprintAudits.length} — more than 1 voids the test`)
  console.log(`Rejected proposals: ${rejections.length}`)
  for (const r of rejections.slice(-8)) console.log(`  ${r.symbol}: ${r.reason}`)

  const trades = tradesRes.data ?? []
  console.log(`\nTrades since 2026-11-16: ${trades.length}`)
  for (const t of trades) {
    const pnl = t.realised_pnl != null ? ` pnl ₹${Math.round(t.realised_pnl)}` : ''
    console.log(`  ${t.executed_at.slice(0, 10)} ${t.action.padEnd(4)} ${t.quantity}x ${t.symbol} @ ₹${t.price}${pnl}${t.rationale?.startsWith('[AUTO-EXIT]') ? ' (auto-exit)' : ''}`)
  }
}

main()
