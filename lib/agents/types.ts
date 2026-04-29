export interface AlphaReport {
  indices: Record<string, { price: number; changePct: number; name: string }>
  commodities: Record<string, { price: number; changePct: number; name: string }>
  forex: Record<string, { rate: number; changePct: number; name: string }>
}

export interface TechnicalSignal {
  rsi14: number
  sma20: number
  sma50: number
  aboveSma20: boolean
  aboveSma50: boolean
  momentum: 'strong' | 'weak' | 'neutral'
  currentPrice: number
}

export interface BravoReport {
  signals: Record<string, TechnicalSignal>
}

export interface CharlieReport {
  perSymbol: Record<string, { signal: 'bullish' | 'bearish' | 'neutral'; reason: string }>
  geopoliticalRisks: string[]
  macroThemes: string[]
  overallSentiment: 'bullish' | 'bearish' | 'neutral'
}

export interface DeltaReport {
  perSymbol: Record<string, {
    signal: 'bullish' | 'bearish' | 'neutral'
    trailingPE: number | null
    analystTargetUpside: number | null
    recommendation: string
    rationale: string
  }>
}

export interface EchoReport {
  perSymbol: Record<string, {
    outlook: 'bullish' | 'bearish' | 'neutral'
    conviction: 'high' | 'medium' | 'low'
    keyReason: string
    conflicts: string[]
  }>
  macroContext: string
  topOpportunities: string[]
  topRisks: string[]
}

export interface AgentReports {
  alpha: AlphaReport
  bravo: BravoReport
  charlie: CharlieReport
  delta: DeltaReport
  echo: EchoReport
}
