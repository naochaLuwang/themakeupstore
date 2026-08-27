-- Atomic coin redemption: check balance + insert transaction in one locked transaction
-- Prevents race condition double-spend
CREATE OR REPLACE FUNCTION atomic_redeem_coins(p_user_id UUID, p_amount INTEGER, p_order_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  SELECT balance INTO current_balance FROM loyalty_points WHERE user_id = p_user_id FOR UPDATE;
  IF COALESCE(current_balance, 0) < p_amount THEN
    RETURN FALSE;
  END IF;

  INSERT INTO loyalty_transactions (user_id, type, amount, reference_type, reference_id, status, note)
  VALUES (p_user_id, 'spend', p_amount, 'order', p_order_id, 'available',
          p_amount || ' M Coins redeemed at checkout');

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Atomic coin reversal: used on order cancellation
CREATE OR REPLACE FUNCTION atomic_reverse_coins(p_order_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  tx_record RECORD;
BEGIN
  SELECT id, user_id, amount INTO tx_record
  FROM loyalty_transactions
  WHERE reference_id = p_order_id
    AND type = 'spend'
    AND reference_type = 'order'
    AND status = 'available'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  UPDATE loyalty_transactions
  SET status = 'cancelled', note = note || ' (reversed on cancel)'
  WHERE id = tx_record.id;

  RETURN tx_record.amount;
END;
$$ LANGUAGE plpgsql;
