ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gift_card_discount numeric DEFAULT 0;
