-- Add coin_discount_amount column to orders table
-- Stores the M Coins discount applied at checkout
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coin_discount_amount numeric NOT NULL DEFAULT 0;

-- Backfill from loyalty_transactions for existing orders
UPDATE orders o
SET coin_discount_amount = tx.amount
FROM loyalty_transactions tx
WHERE tx.reference_id = o.id
  AND tx.reference_type = 'order'
  AND tx.type = 'spend'
  AND tx.status = 'available';
