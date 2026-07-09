-- M Beauty Rewards — Loyalty Program

-- User point balances + tier tracking (tier is updated server-side from orders.total)
CREATE TABLE IF NOT EXISTS public.loyalty_points (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  balance           INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned   INTEGER NOT NULL DEFAULT 0,
  tier              TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Point transaction ledger
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('earn', 'spend', 'bonus', 'expired')),
  amount          INTEGER NOT NULL CHECK (amount > 0),
  balance_before  INTEGER NOT NULL DEFAULT 0,
  balance_after   INTEGER NOT NULL DEFAULT 0,
  reference_type  TEXT CHECK (reference_type IN ('order', 'review', 'referral', 'signup', 'redemption', 'admin')),
  reference_id    UUID,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'cancelled')),
  note            TEXT,
  order_delivered_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reward catalog: products users can redeem coins for
CREATE TABLE IF NOT EXISTS public.reward_products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name      TEXT NOT NULL,
  description       TEXT,
  thumbnail_url     TEXT,
  coins_required    INTEGER NOT NULL CHECK (coins_required > 0),
  stock             INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- (Tier is computed server-side from orders table, not via trigger)

-- Auto-update balance_before and balance_after on transaction insert
CREATE OR REPLACE FUNCTION public.set_transaction_balance()
RETURNS TRIGGER AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  SELECT balance INTO current_balance FROM public.loyalty_points WHERE user_id = NEW.user_id;
  NEW.balance_before = COALESCE(current_balance, 0);
  IF NEW.type IN ('earn', 'bonus') THEN
    NEW.balance_after = NEW.balance_before + NEW.amount;
  ELSIF NEW.type IN ('spend', 'expired') THEN
    NEW.balance_after = GREATEST(NEW.balance_before - NEW.amount, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_transaction_balance ON public.loyalty_transactions;
CREATE TRIGGER trg_set_transaction_balance
  BEFORE INSERT ON public.loyalty_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_transaction_balance();

-- Auto-update loyalty_points balance on transaction insert
CREATE OR REPLACE FUNCTION public.update_points_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.loyalty_points
  SET balance = NEW.balance_after,
      lifetime_earned = CASE WHEN NEW.type IN ('earn', 'bonus') AND NEW.status = 'available'
                             THEN lifetime_earned + NEW.amount
                             ELSE lifetime_earned
                        END,
      updated_at = now()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_points_balance ON public.loyalty_transactions;
CREATE TRIGGER trg_update_points_balance
  AFTER INSERT ON public.loyalty_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_points_balance();

-- Enable RLS
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_products ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own loyalty_points"
  ON public.loyalty_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own transactions"
  ON public.loyalty_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone can read active reward products
CREATE POLICY "Anyone can read reward_products"
  ON public.reward_products FOR SELECT
  USING (active = true);

-- Admin gets full access via service_role
