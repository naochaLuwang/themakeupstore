ALTER TABLE public.push_subscriptions
  ADD COLUMN fcm_token text,
  ADD COLUMN platform text DEFAULT 'web';

ALTER TABLE public.push_subscriptions
  ALTER COLUMN endpoint DROP NOT NULL,
  ALTER COLUMN subscription_json DROP NOT NULL;

CREATE UNIQUE INDEX push_subscriptions_fcm_token_idx ON public.push_subscriptions (fcm_token) WHERE fcm_token IS NOT NULL;

ALTER TABLE public.push_subscriptions
  DROP CONSTRAINT push_subscriptions_pkey CASCADE,
  ADD PRIMARY KEY (id);
