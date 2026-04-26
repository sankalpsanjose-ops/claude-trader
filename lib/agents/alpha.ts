import { getQuotes } from '@/lib/yahoo'
import type { AlphaReport } from './types'

const INDICES: Record<string, string> = {
  '^GSPC':     'S&P 500 (US)',
  '^FTSE':     'FTSE 100 (UK)',
  '^N225':     'Nikkei 225 (Japan)',
  '^HSI':      'Hang Seng (HK)',
  '^STOXX50E': 'Euro Stoxx 50',
}

const COMMODITIES: Record<string, string> = {
  'CL=F':  'Crude Oil WTI',
  'GC=F':  'Gold',
  'NG=F':  'Natural Gas',
}

const FOREX: Record<string, string> = {
  'USDINR=X':   'USD/INR',
  'DX-Y.NYB':   'US Dollar Index',
}

export async function runAlpha(): Promise<AlphaReport> {
  const tickers = [
    ...Object.keys(INDICES),
    ...Object.keys(COMMODITIES),
    ...Object.keys(FOREX),
  ]

  const quotes = await getQuotes(tickers)
  const qmap = Object.fromEntries(quotes.map(q => [q.symbol, q]))

  const report: AlphaReport = { indices: {}, commodities: {}, forex: {} }

  for (const [ticker, name] of Object.entries(INDICES)) {
    const q = qmap[ticker]
    if (q) report.indices[ticker] = { price: q.price, changePct: q.changePct, name }
  }

  for (const [ticker, name] of Object.entries(COMMODITIES)) {
    const q = qmap[ticker]
    if (q) report.commodities[ticker] = { price: q.price, changePct: q.changePct, name }
  }

  for (const [ticker, name] of Object.entries(FOREX)) {
    const q = qmap[ticker]
    if (q) report.forex[ticker] = { rate: q.price, changePct: q.changePct, name }
  }

  return report
}
