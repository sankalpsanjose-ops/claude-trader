// Demo: market calendar logic
// Run with: node scripts/demo-market-calendar.mjs

const NSE_HOLIDAYS_2026 = [
  '2026-01-26', // Republic Day
  '2026-03-20', // Holi
  '2026-04-14', // Dr. Ambedkar Jayanti
  '2026-05-01', // Maharashtra Day
  '2026-08-15', // Independence Day
  '2026-10-02', // Gandhi Jayanti
  '2026-10-20', // Diwali (Laxmi Pujan) — approximate
  '2026-11-04', // Diwali (Balipratipada) — approximate
]

function isTradingDay(dateStr) {
  const date = new Date(dateStr)
  const day = date.getUTCDay() // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false
  if (NSE_HOLIDAYS_2026.includes(dateStr)) return false
  return true
}

function getNextTradingDay(fromDateStr) {
  const date = new Date(fromDateStr)
  date.setUTCDate(date.getUTCDate() + 1)
  while (!isTradingDay(date.toISOString().split('T')[0])) {
    date.setUTCDate(date.getUTCDate() + 1)
  }
  return date.toISOString().split('T')[0]
}

function analysisCronDecision(todayStr) {
  const tomorrow = new Date(todayStr)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  if (!isTradingDay(todayStr)) {
    return { action: 'SKIP', reason: `Today (${todayStr}) is not a trading day — no analysis` }
  }

  const executionDate = getNextTradingDay(todayStr)
  const daysUntilExecution = Math.round(
    (new Date(executionDate) - new Date(todayStr)) / (1000 * 60 * 60 * 24)
  )
  const gapNote = daysUntilExecution === 1
    ? 'executes tomorrow'
    : `executes in ${daysUntilExecution} days (${executionDate}) — factor in the longer gap`

  return {
    action: 'RUN',
    executionDate,
    daysGap: daysUntilExecution,
    promptNote: `Trades will execute at ${executionDate} market open. ${gapNote}.`,
  }
}

function executeCronDecision(todayStr) {
  if (!isTradingDay(todayStr)) {
    return { action: 'SKIP', reason: `Today (${todayStr}) is not a trading day — pending trades preserved` }
  }
  return { action: 'EXECUTE', reason: `Market open today — execute pending trades` }
}

// --- Demo ---
const dates = [
  '2026-04-30', // Thu — normal trading day (today)
  '2026-05-01', // Fri — Maharashtra Day (holiday)
  '2026-05-02', // Sat — weekend
  '2026-05-03', // Sun — weekend
  '2026-05-04', // Mon — next trading day
]

console.log('═══════════════════════════════════════════════')
console.log('MARKET CALENDAR DEMO')
console.log('═══════════════════════════════════════════════\n')

for (const date of dates) {
  const dayName = new Date(date).toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'UTC' })
  console.log(`📅 ${date} (${dayName})`)
  console.log(`   Trading day?     ${isTradingDay(date) ? '✅ YES' : '❌ NO'}`)

  const execute = executeCronDecision(date)
  console.log(`   Execute cron:    ${execute.action === 'SKIP' ? '⏭  SKIP — ' + execute.reason.split('—')[1].trim() : '▶  ' + execute.reason}`)

  const analysis = analysisCronDecision(date)
  if (analysis.action === 'SKIP') {
    console.log(`   Analysis cron:   ⏭  SKIP — ${analysis.reason.split('—')[1].trim()}`)
  } else {
    console.log(`   Analysis cron:   ▶  RUN`)
    console.log(`   Execution date:  ${analysis.executionDate} (${analysis.daysGap} day${analysis.daysGap > 1 ? 's' : ''} away)`)
    console.log(`   Foxtrot prompt:  "${analysis.promptNote}"`)
  }
  console.log()
}
