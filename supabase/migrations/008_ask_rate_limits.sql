CREATE TABLE IF NOT EXISTS ask_rate_limits (
  ip_hash text,
  asked_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ask_rate_limits_ip_hash_asked_at_idx ON ask_rate_limits (ip_hash, asked_at);
