-- Add unique constraint on user_id for push_subscriptions
-- This allows upserts with onConflict: 'user_id' to work correctly

-- First, remove duplicate entries (keep only the latest per user)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM public.push_subscriptions
  WHERE user_id IS NOT NULL
)
DELETE FROM public.push_subscriptions
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Add unique constraint
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_user_id_unique UNIQUE (user_id);
