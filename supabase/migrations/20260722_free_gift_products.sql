-- Free-standing gift products table (separate from store products & junction tables)
CREATE TABLE IF NOT EXISTS public.gift_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- New FK column on free_gifts — replaces gift_product_id (old products FK)
ALTER TABLE public.free_gifts
  ADD COLUMN IF NOT EXISTS gift_product_ref_id UUID REFERENCES public.gift_products(id) ON DELETE SET NULL;

CREATE INDEX idx_gift_products_active ON public.gift_products(is_active);
