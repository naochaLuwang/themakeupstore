-- Add coupon support to reward_products
ALTER TABLE reward_products
  ADD COLUMN reward_type TEXT NOT NULL DEFAULT 'product' CHECK (reward_type IN ('product', 'coupon')),
  ADD COLUMN discount_amount INTEGER,
  ADD COLUMN min_order_value INTEGER;

-- Coupon redemptions (generated codes)
CREATE TABLE reward_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES reward_products(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  discount_amount INTEGER NOT NULL,
  min_order_value INTEGER NOT NULL DEFAULT 0,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);

CREATE INDEX idx_reward_coupons_user ON reward_coupons(user_id);
CREATE INDEX idx_reward_coupons_code ON reward_coupons(code);
