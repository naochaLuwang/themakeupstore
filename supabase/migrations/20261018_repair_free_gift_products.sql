-- =============================================================================
-- Repair: free_gift_products table missing from live DB (2026-10-18)
-- Run in Supabase SQL Editor. Idempotent — safe to re-run.
--
-- The 20260704_create_free_gifts_bxgy.sql migration only partially applied on
-- the live database: free_gifts / free_gift_categories / free_gift_brands and
-- the BXGY tables exist, but free_gift_products was never created. Everything
-- that touches product-specific free-gift rules 404s on /rest/v1/
-- (promo badges on product cards, admin free-gift edit page, placeOrder
-- gift validation).
--
-- Schema/RLS copied verbatim from 20260704_create_free_gifts_bxgy.sql.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.free_gift_products (
  free_gift_id uuid NOT NULL REFERENCES public.free_gifts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  PRIMARY KEY (free_gift_id, product_id)
);

ALTER TABLE public.free_gift_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Free gift products are viewable by everyone" ON public.free_gift_products;
DROP POLICY IF EXISTS "Free gift products are manageable by admins" ON public.free_gift_products;

CREATE POLICY "Free gift products are viewable by everyone" ON public.free_gift_products
  FOR SELECT USING (true);
CREATE POLICY "Free gift products are manageable by admins" ON public.free_gift_products
  FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_free_gift_products_gift ON public.free_gift_products(free_gift_id);
