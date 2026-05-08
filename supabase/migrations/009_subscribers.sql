CREATE TABLE IF NOT EXISTS subscribers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  subscribed_at timestamptz DEFAULT now(),
  unsubscribe_token text DEFAULT encode(gen_random_bytes(32), 'hex') NOT NULL
);

CREATE INDEX IF NOT EXISTS subscribers_email_idx ON subscribers (email);
CREATE INDEX IF NOT EXISTS subscribers_token_idx ON subscribers (unsubscribe_token);
