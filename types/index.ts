export interface Portfolio {
  id: string
  cash: number
  total_value: number
  inception_date: string
  created_at: string
  updated_at: string
}

export interface Holding {
  id: string
  symbol: string
  name: string
  exchange: 'NSE' | 'BSE'
  quantity: number
  buy_price: number
  buy_date: string
  current_price: number
  updated_at: string
}

export interface HoldingWithLive extends Holding {
  live_price: number
  invested: number
  current_value: number
  pnl: number
  pnl_pct: number
}

export interface Trade {
  id: string
  symbol: string
  name: string
  exchange: 'NSE' | 'BSE'
  action: 'BUY' | 'SELL'
  quantity: number
  price: number
  total_value: number
  realised_pnl: number | null
  rationale: string
  executed_at: string
}

export interface DailyAnalysis {
  id: string
  date: string
  journal: string
  decisions: TradeDecision[]
  market_summary: string
  team_brief?: string
  agent_reports?: import('@/lib/agents/types').AgentReports
  created_at: string
}

export interface TradeDecision {
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  quantity?: number
  rationale: string
}

export interface PendingTrade {
  id: string
  symbol: string
  name: string
  exchange: 'NSE' | 'BSE'
  action: 'BUY' | 'SELL'
  quantity: number
  rationale: string
  decided_at: string
}

export interface PortfolioSummary {
  portfolio: Portfolio
  total_invested: number
  market_value: number
  total_pnl: number
  total_pnl_pct: number
  annualised_return: number
  days_running: number
  today_pnl: number
  open_positions: number
  sector_allocation: SectorAllocation[]
  performance_history: PerformancePoint[]
  benchmark_history: PerformancePoint[]
  latest_analysis: DailyAnalysis | null
}

export interface SectorAllocation {
  sector: string
  value: number
  pct: number
}

export interface PerformancePoint {
  date: string
  value: number
}

export interface AuditRejection {
  symbol: string
  action: string
  quantity?: number
  reason: string
}

export interface Learning {
  id: string
  date: string
  category: 'sizing' | 'exits' | 'patience' | 'sector' | 'risk' | 'process' | 'monthly'
  insight: string
  source: 'daily' | 'monthly_reflection'
  created_at: string
}

export interface TraderProfile {
  id: string
  version: number
  content: string
  change_notes: string
  created_at: string
}

export interface DailyAudit {
  id: string
  date: string
  decisions_raw: TradeDecision[]
  decisions_valid: TradeDecision[]
  rejections: AuditRejection[]
  sanity_passed: boolean
  sanity_notes: string
  created_at: string
}

export const SECTOR_MAP: Record<string, string> = {
  'HDFCBANK.NS': 'Banking',
  'ICICIBANK.NS': 'Banking',
  'SBIN.NS': 'Banking',
  'AXISBANK.NS': 'Banking',
  'KOTAKBANK.NS': 'Banking',
  'HDFCBANK.BO': 'Banking',
  'ICICIBANK.BO': 'Banking',
  'TCS.NS': 'IT',
  'TCS.BO': 'IT',
  'INFY.NS': 'IT',
  'INFY.BO': 'IT',
  'WIPRO.NS': 'IT',
  'WIPRO.BO': 'IT',
  'HCLTECH.NS': 'IT',
  'TECHM.NS': 'IT',
  'RELIANCE.NS': 'Energy',
  'RELIANCE.BO': 'Energy',
  'ONGC.NS': 'Energy',
  'POWERGRID.NS': 'Energy',
  'NTPC.NS': 'Energy',
  'MARUTI.NS': 'Auto',
  'TATAMOTORS.NS': 'Auto',
  'BAJAJ-AUTO.NS': 'Auto',
  'HEROMOTOCO.NS': 'Auto',
  'SUNPHARMA.NS': 'Pharma',
  'DRREDDY.NS': 'Pharma',
  'CIPLA.NS': 'Pharma',
  'DIVISLAB.NS': 'Pharma',
  'HINDUNILVR.NS': 'FMCG',
  'ITC.NS': 'FMCG',
  'NESTLEIND.NS': 'FMCG',
  'TITAN.NS': 'Consumer',
  'ASIANPAINT.NS': 'Consumer',
  'ULTRACEMCO.NS': 'Materials',
  'JSWSTEEL.NS': 'Materials',
  'TATASTEEL.NS': 'Materials',
  'BHARTIARTL.NS': 'Telecom',
}
