-- Add UNIQUE constraint to products.slug
-- Duplicate slugs must be resolved first
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique_idx ON public.products (slug);
