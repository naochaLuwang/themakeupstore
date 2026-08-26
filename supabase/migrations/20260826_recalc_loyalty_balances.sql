-- Recalculate ALL loyalty_points balances from the actual transaction ledger
-- This fixes inflated balances from cancelled transactions that were never decremented

UPDATE loyalty_points lp
SET balance = COALESCE(tx_calc.correct_balance, 0),
    lifetime_earned = COALESCE(tx_calc.correct_lifetime, 0),
    updated_at = now()
FROM (
  SELECT
    user_id,
    SUM(CASE
      WHEN type IN ('earn', 'bonus') AND status = 'available' THEN amount
      WHEN type IN ('spend', 'expired') AND status = 'available' THEN -amount
      ELSE 0
    END) as correct_balance,
    SUM(CASE
      WHEN type IN ('earn', 'bonus') AND status = 'available' THEN amount
      ELSE 0
    END) as correct_lifetime
  FROM loyalty_transactions
  GROUP BY user_id
) tx_calc
WHERE lp.user_id = tx_calc.user_id;
