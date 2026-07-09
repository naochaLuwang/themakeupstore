-- Gift Cards
CREATE TABLE IF NOT EXISTS public.gift_cards (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL UNIQUE,
  original_balance  numeric NOT NULL CHECK (original_balance > 0),
  remaining_balance numeric NOT NULL CHECK (remaining_balance >= 0),
  currency          text NOT NULL DEFAULT 'INR',
  purchased_by      uuid REFERENCES public.profiles(id),
  recipient_email   text,
  recipient_name    text,
  message           text,
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active','redeemed','expired','disabled')),
  purchased_at      timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Redemption tracking
CREATE TABLE IF NOT EXISTS public.gift_card_redemptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id  uuid NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  order_id      uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount        numeric NOT NULL CHECK (amount > 0),
  redeemed_at   timestamptz NOT NULL DEFAULT now()
);

-- Auto-update remaining_balance via trigger
CREATE OR REPLACE FUNCTION public.update_gift_card_balance()
RETURNS trigger AS $$
BEGIN
  UPDATE public.gift_cards
  SET remaining_balance = remaining_balance - NEW.amount,
      updated_at = now()
  WHERE id = NEW.gift_card_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_gift_card_balance ON public.gift_card_redemptions;
CREATE TRIGGER trg_update_gift_card_balance
  AFTER INSERT ON public.gift_card_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gift_card_balance();
