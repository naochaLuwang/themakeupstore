-- Backfill lifetime_earned from bonus transactions that were never tracked
-- This fixes the discrepancy where admin bonus credits updated balance but not lifetime_earned

UPDATE loyalty_points lp
SET lifetime_earned = lifetime_earned + COALESCE(bonus_sum.total, 0),
    updated_at = now()
FROM (
  SELECT user_id, SUM(amount) as total
  FROM loyalty_transactions
  WHERE type = 'bonus'
    AND status = 'available'
  GROUP BY user_id
) bonus_sum
WHERE lp.user_id = bonus_sum.user_id
  AND bonus_sum.total > 0;
