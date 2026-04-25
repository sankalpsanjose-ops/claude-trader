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
