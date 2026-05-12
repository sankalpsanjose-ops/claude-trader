// IST date helpers — India has no DST, always UTC+5:30
// Use these everywhere instead of new Date().toISOString().split('T')[0]
// Vercel servers run UTC; without this, dates roll over at 6:30 PM IST

const TZ = 'Asia/Kolkata'
const FMT = new Intl.DateTimeFormat('en-CA', { timeZone: TZ })

export function todayIST(): string {
  return FMT.format(new Date())
}

export function dateToIST(date: Date): string {
  return FMT.format(date)
}

export function offsetDaysIST(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return FMT.format(d)
}
