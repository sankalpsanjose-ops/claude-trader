-- Season 2 reset: upgrade to ₹5,00,000 starting capital
-- Season 1 history (trades, learnings, daily_analyses) is preserved.
-- Holdings are closed at their last known price and recorded as trades.

-- 1. Record season-closing sell trades for all open holdings
INSERT INTO trades (symbol, name, exchange, action, quantity, price, total_value, realised_pnl, rationale, executed_at)
SELECT
  symbol,
  name,
  exchange,
  'SELL',
  quantity,
  current_price,
  current_price * quantity,
  (current_price - buy_price) * quantity,
  'Season 1 close — system reset to ₹5,00,000 capital (2026-04-29)',
  now()
FROM holdings;

-- 2. Remove all open holdings
DELETE FROM holdings;

-- 3. Reset portfolio to Season 2 starting capital
UPDATE portfolio SET
  cash = 500000,
  total_value = 500000,
  inception_date = '2026-04-29',
  updated_at = now();

-- 4. Clear portfolio snapshots (start a clean performance chart)
DELETE FROM portfolio_snapshots;

-- 5. Clear any pending trades
DELETE FROM pending_trades;
