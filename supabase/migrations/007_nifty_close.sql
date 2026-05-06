-- Store daily Nifty 50 close price alongside portfolio snapshot
-- so chart history survives Yahoo Finance outages
ALTER TABLE portfolio_snapshots ADD COLUMN IF NOT EXISTS nifty_close numeric;
