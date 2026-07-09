ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS abandoned_email_sent_at timestamptz;
