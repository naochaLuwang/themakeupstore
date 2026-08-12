-- ============================================================
-- Gift Products: Add brand_name and multiple images support
-- ============================================================

-- 1. Add brand_name column
ALTER TABLE public.gift_products
  ADD COLUMN IF NOT EXISTS brand_name TEXT;

-- 2. Rename image_url to images (JSONB array for multiple images)
-- Keep old column for backward compatibility, migrate data, then drop
ALTER TABLE public.gift_products
  ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- 3. Migrate existing image_url data to images array
UPDATE public.gift_products
SET images = CASE 
  WHEN image_url IS NOT NULL AND image_url != '' THEN jsonb_build_array(image_url)
  ELSE '[]'::jsonb
END
WHERE images = '[]'::jsonb;

-- 4. Drop old image_url column (data already migrated)
ALTER TABLE public.gift_products
  DROP COLUMN IF EXISTS image_url;

-- 5. Add index for brand filtering
CREATE INDEX IF NOT EXISTS idx_gift_products_brand ON public.gift_products(brand_name);
