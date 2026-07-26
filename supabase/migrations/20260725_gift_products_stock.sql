-- Add stock column to gift_products (was missing — made free gifts unshippable)
ALTER TABLE public.gift_products
  ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0;

-- Make gift_product_id nullable (admin can supply gift_product_ref_id instead)
ALTER TABLE public.free_gifts
  ALTER COLUMN gift_product_id DROP NOT NULL;

-- Ensure RLS exists for gift_products
ALTER TABLE public.gift_products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gift_products' AND policyname = 'Gift products are viewable by everyone') THEN
    CREATE POLICY "Gift products are viewable by everyone" ON public.gift_products
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gift_products' AND policyname = 'Gift products are manageable by admins') THEN
    CREATE POLICY "Gift products are manageable by admins" ON public.gift_products
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
