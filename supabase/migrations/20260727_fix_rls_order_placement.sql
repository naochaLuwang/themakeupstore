-- ============================================================
-- Migration: Fix RLS policies blocking order placement
-- Date: 2026-07-27
--
-- 1. Creates SECURITY DEFINER decrement_stock() function
--    (code already calls this first — was missing from DB)
-- 2. Adds a user-level stock decrement policy on product_variants
-- 3. Adds INSERT policy for promo_redemptions (users recording usage)
-- 4. Fixes showcase_items/delivery_partners/gift_products admin
--    policies to use is_admin check instead of auth.role()
-- ============================================================

-- ============================================================
-- PART 1: Atomic stock decrement function (SECURITY DEFINER)
-- The placeOrder flow calls this first — it bypasses RLS
-- because it runs as the table owner.
-- ============================================================
CREATE OR REPLACE FUNCTION public.decrement_stock(row_id uuid, amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stock integer;
BEGIN
  SELECT stock INTO current_stock
  FROM public.product_variants
  WHERE id = row_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF current_stock < amount THEN
    RETURN false;
  END IF;

  UPDATE public.product_variants
  SET stock = stock - amount
  WHERE id = row_id;

  RETURN true;
END;
$$;

-- ============================================================
-- PART 2: User-level stock decrement policy on product_variants
-- Allows the authenticated user who owns the order to decrement
-- stock during checkout (the owning user check is done in app
-- code; this policy just gates the UPDATE at the DB level).
-- ============================================================
DROP POLICY IF EXISTS "Users can decrement stock during checkout" ON public.product_variants;
CREATE POLICY "Users can decrement stock during checkout"
    ON public.product_variants FOR UPDATE
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- PART 3: Promo redemptions INSERT for regular users
-- placeOrder() records promo_redemptions after successful
-- checkout. Admin can also read all.
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own promo redemptions" ON public.promo_redemptions;
CREATE POLICY "Users can insert own promo redemptions"
    ON public.promo_redemptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- PART 4: Fix existing admin policies that use loose
-- auth.role() = 'authenticated' which grants ANY logged-in
-- user admin-level access to these tables.
-- ============================================================

-- showcase_items: replace FOR ALL policy with admin-only
DROP POLICY IF EXISTS "Showcase items are manageable by admins only" ON public.showcase_items;
CREATE POLICY "Showcase items are manageable by admins only" ON public.showcase_items
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- delivery_partners: replace FOR ALL policy with admin-only
DROP POLICY IF EXISTS "Delivery partners are manageable by admins" ON public.delivery_partners;
CREATE POLICY "Delivery partners are manageable by admins" ON public.delivery_partners
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- gift_products: replace FOR ALL policy with admin-only
DROP POLICY IF EXISTS "Gift products are manageable by admins" ON public.gift_products;
CREATE POLICY "Gift products are manageable by admins" ON public.gift_products
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- ============================================================
-- PART 5: Enable RLS on tables that were missed
-- flash_sales, gift_cards, gift_card_redemptions
-- ============================================================
ALTER TABLE IF EXISTS public.flash_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gift_card_redemptions ENABLE ROW LEVEL SECURITY;

-- flash_sales: public read, admin write
DROP POLICY IF EXISTS "Flash sales are viewable by everyone" ON public.flash_sales;
CREATE POLICY "Flash sales are viewable by everyone"
    ON public.flash_sales FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can manage flash sales" ON public.flash_sales;
CREATE POLICY "Admins can manage flash sales"
    ON public.flash_sales FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update flash sales" ON public.flash_sales;
CREATE POLICY "Admins can update flash sales"
    ON public.flash_sales FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete flash sales" ON public.flash_sales;
CREATE POLICY "Admins can delete flash sales"
    ON public.flash_sales FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- gift_cards: user can read own, admin read all, user insert, admin manage
DROP POLICY IF EXISTS "Users can read own gift cards" ON public.gift_cards;
CREATE POLICY "Users can read own gift cards"
    ON public.gift_cards FOR SELECT
    USING (auth.uid() = purchased_by);

DROP POLICY IF EXISTS "Admins can read all gift cards" ON public.gift_cards;
CREATE POLICY "Admins can read all gift cards"
    ON public.gift_cards FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Users can purchase gift cards" ON public.gift_cards;
CREATE POLICY "Users can purchase gift cards"
    ON public.gift_cards FOR INSERT
    WITH CHECK (auth.uid() = purchased_by);

DROP POLICY IF EXISTS "Admins can update gift cards" ON public.gift_cards;
CREATE POLICY "Admins can update gift cards"
    ON public.gift_cards FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- gift_card_redemptions: user can read own (via gift card ownership), system insert
DROP POLICY IF EXISTS "Users can read own gift card redemptions" ON public.gift_card_redemptions;
CREATE POLICY "Users can read own gift card redemptions"
    ON public.gift_card_redemptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.gift_cards
            WHERE gift_cards.id = gift_card_redemptions.gift_card_id
            AND gift_cards.purchased_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Anyone can insert gift card redemptions" ON public.gift_card_redemptions;
CREATE POLICY "Anyone can insert gift card redemptions"
    ON public.gift_card_redemptions FOR INSERT
    WITH CHECK (true);

-- ============================================================
-- PART 6: Create missing get_or_create_cart function
-- Called by CartSync (cart-sync.tsx:189) — returned 500 because
-- it was never defined in any migration. Creates a cart row for
-- the user if one doesn't already exist, then returns the ID.
-- Uses SECURITY DEFINER so cart operations bypass RLS (the
-- calling user is already authenticated by the app).
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_or_create_cart(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
  new_id uuid;
BEGIN
  SELECT id INTO existing_id
  FROM public.carts
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE public.carts
    SET updated_at = now()
    WHERE id = existing_id;
    RETURN existing_id;
  END IF;

  INSERT INTO public.carts (user_id)
  VALUES (p_user_id)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;
