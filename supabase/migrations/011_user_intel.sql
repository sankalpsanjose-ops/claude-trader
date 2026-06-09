CREATE TABLE IF NOT EXISTS user_intel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note text NOT NULL,
  created_at timestamptz DEFAULT now()
);
