-- Fix RLS policies: users need INSERT/UPDATE on their own data for the loyalty system to work.
-- Previously only SELECT policies existed, so all earn/redemption operations silently failed.

-- Allow users to insert their own loyalty_points row (needed by ensureLoyaltyPoints)
CREATE POLICY "Users can insert own loyalty_points"
  ON public.loyalty_points FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own loyalty_points row (needed by releasePendingPoints, redeemReward)
CREATE POLICY "Users can update own loyalty_points"
  ON public.loyalty_points FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to insert their own transactions (needed by earnOrderPoints, redeemReward)
CREATE POLICY "Users can insert own transactions"
  ON public.loyalty_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own transactions (needed by releasePendingPoints)
CREATE POLICY "Users can update own transactions"
  ON public.loyalty_transactions FOR UPDATE
  USING (auth.uid() = user_id);
