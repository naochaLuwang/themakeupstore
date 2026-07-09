-- Add tier restriction to reward_products
-- NULL = all tiers, otherwise 'bronze', 'silver', or 'gold'
ALTER TABLE reward_products
  ADD COLUMN tier_restriction TEXT DEFAULT NULL;
