CREATE TABLE IF NOT EXISTS flash_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'product' CHECK (scope IN ('product', 'category', 'brand', 'all')),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  brand TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value >= 0),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ends_after_starts CHECK (ends_at > starts_at),
  CONSTRAINT scope_has_target CHECK (
    (scope = 'product' AND product_id IS NOT NULL) OR
    (scope = 'category' AND category_id IS NOT NULL) OR
    (scope = 'brand' AND brand IS NOT NULL) OR
    (scope = 'all')
  )
);

CREATE INDEX idx_flash_sales_product ON flash_sales(product_id);
CREATE INDEX idx_flash_sales_category ON flash_sales(category_id);
CREATE INDEX idx_flash_sales_brand ON flash_sales(brand);
CREATE INDEX idx_flash_sales_active_range ON flash_sales(is_active, starts_at, ends_at);
