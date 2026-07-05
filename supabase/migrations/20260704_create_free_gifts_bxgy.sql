-- ============================================================
-- FREE GIFTS & BUY X GET Y PROMOTIONS
-- ============================================================

-- Clean up any partial state from prior runs
DO $$
BEGIN
  DROP POLICY IF EXISTS "Free gifts are viewable by everyone" ON public.free_gifts;
  DROP POLICY IF EXISTS "Free gifts are manageable by admins only" ON public.free_gifts;
  DROP POLICY IF EXISTS "BXGY rules are viewable by everyone" ON public.buy_x_get_y;
  DROP POLICY IF EXISTS "BXGY rules are manageable by admins only" ON public.buy_x_get_y;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DROP TABLE IF EXISTS public.free_gift_products CASCADE;
DROP TABLE IF EXISTS public.free_gift_categories CASCADE;
DROP TABLE IF EXISTS public.free_gift_brands CASCADE;
DROP TABLE IF EXISTS public.free_gifts CASCADE;

DROP TABLE IF EXISTS public.bxgy_buy_products CASCADE;
DROP TABLE IF EXISTS public.bxgy_get_products CASCADE;
DROP TABLE IF EXISTS public.bxgy_buy_categories CASCADE;
DROP TABLE IF EXISTS public.bxgy_buy_brands CASCADE;
DROP TABLE IF EXISTS public.buy_x_get_y CASCADE;

-- Feature 1: Free Gifts
CREATE TABLE public.free_gifts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  gift_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  gift_variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  gift_quantity integer NOT NULL DEFAULT 1,
  trigger_type text NOT NULL CHECK (trigger_type IN ('cart_total', 'specific_products', 'specific_categories', 'specific_brands')),
  trigger_threshold numeric DEFAULT 0,
  min_cart_amount numeric DEFAULT NULL,
  apply_to text NOT NULL DEFAULT 'all' CHECK (apply_to IN ('all', 'specific_products', 'specific_categories', 'specific_brands')),
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  once_per_user boolean NOT NULL DEFAULT false,
  max_per_order integer NOT NULL DEFAULT 1,
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT free_gifts_pkey PRIMARY KEY (id)
);

CREATE TABLE public.free_gift_products (
  free_gift_id uuid NOT NULL REFERENCES public.free_gifts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  PRIMARY KEY (free_gift_id, product_id)
);

CREATE TABLE public.free_gift_categories (
  free_gift_id uuid NOT NULL REFERENCES public.free_gifts(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (free_gift_id, category_id)
);

CREATE TABLE public.free_gift_brands (
  free_gift_id uuid NOT NULL REFERENCES public.free_gifts(id) ON DELETE CASCADE,
  brand text NOT NULL,
  PRIMARY KEY (free_gift_id, brand)
);

-- Feature 2: Buy X Get Y
CREATE TABLE public.buy_x_get_y (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  buy_type text NOT NULL CHECK (buy_type IN ('specific_products', 'specific_categories', 'specific_brands')),
  buy_quantity integer NOT NULL DEFAULT 2,
  get_type text NOT NULL DEFAULT 'cheapest_free' CHECK (get_type IN ('cheapest_free', 'specific_product')),
  get_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  get_variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  get_discount_type text NOT NULL DEFAULT 'percentage' CHECK (get_discount_type IN ('percentage', 'fixed', 'free')),
  get_discount_value numeric NOT NULL DEFAULT 100,
  apply_to text NOT NULL DEFAULT 'all' CHECK (apply_to IN ('all', 'specific_products', 'specific_categories', 'specific_brands')),
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  once_per_user boolean NOT NULL DEFAULT false,
  max_per_order integer,
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT buy_x_get_y_pkey PRIMARY KEY (id)
);

CREATE TABLE public.bxgy_buy_products (
  bxgy_id uuid NOT NULL REFERENCES public.buy_x_get_y(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  PRIMARY KEY (bxgy_id, product_id)
);

CREATE TABLE public.bxgy_get_products (
  bxgy_id uuid NOT NULL REFERENCES public.buy_x_get_y(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  PRIMARY KEY (bxgy_id, product_id)
);

CREATE TABLE public.bxgy_buy_categories (
  bxgy_id uuid NOT NULL REFERENCES public.buy_x_get_y(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (bxgy_id, category_id)
);

CREATE TABLE public.bxgy_buy_brands (
  bxgy_id uuid NOT NULL REFERENCES public.buy_x_get_y(id) ON DELETE CASCADE,
  brand text NOT NULL,
  PRIMARY KEY (bxgy_id, brand)
);

-- Track gift items in orders
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS is_gift boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS bxgy_discount_amount numeric DEFAULT 0;

-- RLS Policies
ALTER TABLE public.free_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buy_x_get_y ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_gift_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_gift_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_gift_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bxgy_buy_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bxgy_get_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bxgy_buy_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bxgy_buy_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Free gifts are viewable by everyone" ON public.free_gifts
  FOR SELECT USING (is_active = true);
CREATE POLICY "Free gift products are viewable by everyone" ON public.free_gift_products
  FOR SELECT USING (true);
CREATE POLICY "Free gift products are manageable by admins" ON public.free_gift_products
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Free gift categories are viewable by everyone" ON public.free_gift_categories
  FOR SELECT USING (true);
CREATE POLICY "Free gift categories are manageable by admins" ON public.free_gift_categories
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Free gift brands are viewable by everyone" ON public.free_gift_brands
  FOR SELECT USING (true);
CREATE POLICY "Free gift brands are manageable by admins" ON public.free_gift_brands
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Free gifts are manageable by admins only" ON public.free_gifts
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "BXGY rules are viewable by everyone" ON public.buy_x_get_y
  FOR SELECT USING (is_active = true);
CREATE POLICY "BXGY buy products are viewable by everyone" ON public.bxgy_buy_products
  FOR SELECT USING (true);
CREATE POLICY "BXGY buy products are manageable by admins" ON public.bxgy_buy_products
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "BXGY get products are viewable by everyone" ON public.bxgy_get_products
  FOR SELECT USING (true);
CREATE POLICY "BXGY get products are manageable by admins" ON public.bxgy_get_products
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "BXGY buy categories are viewable by everyone" ON public.bxgy_buy_categories
  FOR SELECT USING (true);
CREATE POLICY "BXGY buy categories are manageable by admins" ON public.bxgy_buy_categories
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "BXGY buy brands are viewable by everyone" ON public.bxgy_buy_brands
  FOR SELECT USING (true);
CREATE POLICY "BXGY buy brands are manageable by admins" ON public.bxgy_buy_brands
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "BXGY rules are manageable by admins only" ON public.buy_x_get_y
  FOR ALL USING (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_free_gifts_active ON public.free_gifts(is_active, starts_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_buy_x_get_y_active ON public.buy_x_get_y(is_active, starts_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_free_gift_products_gift ON public.free_gift_products(free_gift_id);
CREATE INDEX IF NOT EXISTS idx_bxgy_buy_products_rule ON public.bxgy_buy_products(bxgy_id);
CREATE INDEX IF NOT EXISTS idx_bxgy_get_products_rule ON public.bxgy_get_products(bxgy_id);
