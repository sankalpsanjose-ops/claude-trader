CREATE TABLE IF NOT EXISTS macro_context (
  id integer PRIMARY KEY DEFAULT 1,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

-- Single-row document — seed the row so upsert always finds it
INSERT INTO macro_context (id, content)
VALUES (1, '')
ON CONFLICT (id) DO NOTHING;
