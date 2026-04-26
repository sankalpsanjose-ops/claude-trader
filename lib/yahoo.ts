// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require('yahoo-finance2').default
const yahooFinance = new YahooFinanceClass({ suppressNotices: ['yahooSurvey'] })

export interface QuoteResult {
  symbol: string
  price: number
  open: number
  previousClose: number
  change: number
  changePct: number
  name: string
}

// Nifty 50 + Sensex 30 starting universe
export const DEFAULT_WATCHLIST = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
  'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS',
  'AXISBANK.NS', 'LT.NS', 'ASIANPAINT.NS', 'MARUTI.NS', 'SUNPHARMA.NS',
  'WIPRO.NS', 'HCLTECH.NS', 'ULTRACEMCO.NS', 'TITAN.NS', 'BAJFINANCE.NS',
  'BAJAJFINSV.NS', 'NESTLEIND.NS', 'TATAMOTORS.NS', 'POWERGRID.NS', 'NTPC.NS',
  'TECHM.NS', 'DRREDDY.NS', 'CIPLA.NS', 'DIVISLAB.NS', 'JSWSTEEL.NS',
  'TATASTEEL.NS', 'ONGC.NS', 'HEROMOTOCO.NS', 'BAJAJ-AUTO.NS', 'ADANIENT.NS',
  'ADANIPORTS.NS', 'COALINDIA.NS', 'GRASIM.NS', 'BPCL.NS', 'INDUSINDBK.NS',
]

export async function getQuotes(symbols: string[]): Promise<QuoteResult[]> {
  const results: QuoteResult[] = []

  // Batch in groups of 10 to avoid rate limits
  for (let i = 0; i < symbols.length; i += 10) {
    const batch = symbols.slice(i, i + 10)
    const quotes = await Promise.allSettled(
      batch.map((symbol: string) => yahooFinance.quote(symbol))
    )
    for (let j = 0; j < quotes.length; j++) {
      const q = quotes[j] as PromiseSettledResult<Record<string, unknown>>
      if (q.status === 'fulfilled' && q.value?.regularMarketPrice) {
        const v = q.value
        results.push({
          symbol: batch[j],
          price: (v.regularMarketPrice as number) ?? 0,
          open: (v.regularMarketOpen as number) ?? 0,
          previousClose: (v.regularMarketPreviousClose as number) ?? 0,
          change: (v.regularMarketChange as number) ?? 0,
          changePct: (v.regularMarketChangePercent as number) ?? 0,
          name: (v.longName as string) ?? (v.shortName as string) ?? batch[j],
        })
      }
    }
  }

  return results
}

export async function getOpenPrices(symbols: string[]): Promise<Record<string, number>> {
  const quotes = await getQuotes(symbols)
  return Object.fromEntries(quotes.map(q => [q.symbol, q.open]))
}

export async function getCurrentPrices(symbols: string[]): Promise<Record<string, number>> {
  const quotes = await getQuotes(symbols)
  return Object.fromEntries(quotes.map(q => [q.symbol, q.price]))
}

export function exchangeFromSymbol(symbol: string): 'NSE' | 'BSE' {
  return symbol.endsWith('.BO') ? 'BSE' : 'NSE'
}

export interface HistoricalRow {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export async function getHistoricals(symbols: string[], days = 60): Promise<Record<string, HistoricalRow[]>> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - Math.ceil(days * 1.6)) // extra buffer for weekends/holidays

  const result: Record<string, HistoricalRow[]> = {}

  for (let i = 0; i < symbols.length; i += 5) {
    const batch = symbols.slice(i, i + 5)
    await Promise.allSettled(batch.map(async (symbol: string) => {
      try {
        const rows = await yahooFinance.historical(symbol, {
          period1: startDate.toISOString().split('T')[0],
          period2: endDate.toISOString().split('T')[0],
          interval: '1d',
        })
        result[symbol] = (rows as Record<string, unknown>[])
          .slice(-days)
          .map(row => ({
            date: (row.date as Date).toISOString().split('T')[0],
            open: (row.open as number) ?? 0,
            high: (row.high as number) ?? 0,
            low: (row.low as number) ?? 0,
            close: (row.adjclose as number) ?? (row.close as number) ?? 0,
            volume: (row.volume as number) ?? 0,
          }))
      } catch {
        result[symbol] = []
      }
    }))
  }

  return result
}

export interface NewsItem {
  title: string
  publisher: string
}

// Accepts both stock symbols (e.g. "RELIANCE.NS") and free-text search queries
export async function getNewsForSymbols(queries: string[]): Promise<NewsItem[]> {
  const allNews: NewsItem[] = []

  for (const query of queries.slice(0, 10)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (yahooFinance as any).search(query, { newsCount: 5 })
      if (Array.isArray(result?.news)) {
        for (const n of result.news as Record<string, unknown>[]) {
          if (n.title) allNews.push({ title: n.title as string, publisher: (n.publisher as string) ?? '' })
        }
      }
    } catch { /* query failed — skip */ }
  }

  // Deduplicate by title
  const seen = new Set<string>()
  return allNews.filter(n => {
    if (seen.has(n.title)) return false
    seen.add(n.title)
    return true
  })
}

export interface FundamentalsData {
  symbol: string
  trailingPE: number | null
  targetMeanPrice: number | null
  currentPrice: number | null
  recommendationKey: string
}

export async function getFundamentalsForSymbols(symbols: string[]): Promise<FundamentalsData[]> {
  const results: FundamentalsData[] = []

  for (let i = 0; i < symbols.length; i += 5) {
    const batch = symbols.slice(i, i + 5)
    const settled = await Promise.allSettled(batch.map(async (symbol: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await (yahooFinance as any).quoteSummary(symbol, {
        modules: ['summaryDetail', 'financialData'],
      }) as Record<string, Record<string, unknown>>
      return {
        symbol,
        trailingPE: (data?.summaryDetail?.trailingPE as number) ?? null,
        targetMeanPrice: (data?.financialData?.targetMeanPrice as number) ?? null,
        currentPrice: (data?.financialData?.currentPrice as number) ?? null,
        recommendationKey: (data?.financialData?.recommendationKey as string) ?? 'none',
      } satisfies FundamentalsData
    }))

    for (let j = 0; j < settled.length; j++) {
      const r = settled[j]
      if (r.status === 'fulfilled') {
        results.push(r.value)
      } else {
        results.push({ symbol: batch[j], trailingPE: null, targetMeanPrice: null, currentPrice: null, recommendationKey: 'none' })
      }
    }
  }

  return results
}
