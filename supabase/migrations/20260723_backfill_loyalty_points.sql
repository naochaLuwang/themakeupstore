-- Backfill loyalty points for all past delivered orders
-- Run this AFTER applying 20260723_fix_loyalty_rls_policies.sql

-- 1. Ensure loyalty_points rows exist for all users who have delivered orders
INSERT INTO public.loyalty_points (user_id, balance, lifetime_earned, tier, created_at, updated_at)
SELECT DISTINCT o.user_id, 0, 0, 'bronze', now(), now()
FROM public.orders o
LEFT JOIN public.loyalty_points lp ON lp.user_id = o.user_id
WHERE o.status = 'delivered'
  AND lp.id IS NULL;

-- 2. Insert earn transactions for each delivered order that doesn't have one yet
--    Points = floor(total / 60), matching server-side calcPoints()
--    Triggers auto-compute balance_before/balance_after and update loyalty_points balance
INSERT INTO public.loyalty_transactions (user_id, type, amount, reference_type, reference_id, status, note, order_delivered_at, created_at)
SELECT
  o.user_id,
  'earn',
  GREATEST(FLOOR(o.total / 60)::integer, 1),
  'order',
  o.id,
  'available',
  CONCAT(GREATEST(FLOOR(o.total / 60)::integer, 1), ' M Coins earned from order #', UPPER(SUBSTRING(o.id::text, LENGTH(o.id::text) - 5, 6))),
  o.updated_at,
  o.updated_at
FROM public.orders o
LEFT JOIN public.loyalty_transactions lt ON lt.reference_id = o.id AND lt.reference_type = 'order'
WHERE o.status = 'delivered'
  AND lt.id IS NULL
ORDER BY o.user_id, o.updated_at;
