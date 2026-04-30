// NSE/BSE market holiday calendar and trading day utilities

const NSE_HOLIDAYS: Record<number, string[]> = {
  2026: [
    '2026-01-26', // Republic Day
    '2026-03-20', // Holi
    '2026-04-02', // Ram Navami
    '2026-04-14', // Dr. Ambedkar Jayanti
    '2026-04-15', // Good Friday
    '2026-05-01', // Maharashtra Day
    '2026-08-15', // Independence Day
    '2026-10-02', // Gandhi Jayanti
    '2026-10-20', // Diwali (Laxmi Pujan)
    '2026-10-21', // Diwali (Balipratipada)
    '2026-11-04', // Gurunanak Jayanti
    '2026-12-25', // Christmas
  ],
}

export function isTradingDay(dateStr: string): boolean {
  const date = new Date(dateStr)
  const day = date.getUTCDay() // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false
  const year = date.getUTCFullYear()
  const holidays = NSE_HOLIDAYS[year] ?? []
  return !holidays.includes(dateStr)
}

export function getNextTradingDay(fromDateStr: string): string {
  const date = new Date(fromDateStr)
  date.setUTCDate(date.getUTCDate() + 1)
  while (!isTradingDay(date.toISOString().split('T')[0])) {
    date.setUTCDate(date.getUTCDate() + 1)
  }
  return date.toISOString().split('T')[0]
}

export function isTomorrowTradingDay(todayStr: string): boolean {
  const tomorrow = new Date(todayStr)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  return isTradingDay(tomorrow.toISOString().split('T')[0])
}
