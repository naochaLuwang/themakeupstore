-- Extend the disposable financial/promotion fixture only. Never run on production.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS additional_charges numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS additional_charges_label text;
CREATE TABLE public.product_categories(product_id uuid REFERENCES public.products(id),category_id uuid REFERENCES public.categories(id));
CREATE TABLE public.flash_sales(id uuid PRIMARY KEY,starts_at timestamptz,ends_at timestamptz,is_active boolean);
CREATE TABLE public.promo_code_products(promo_id uuid REFERENCES public.promo_codes(id),product_id uuid REFERENCES public.products(id));
CREATE TABLE public.promo_code_categories(promo_id uuid REFERENCES public.promo_codes(id),category_id uuid REFERENCES public.categories(id));
CREATE TABLE public.shipping_zones(id uuid PRIMARY KEY,pincode text);
CREATE TABLE public.shipping_methods(id uuid PRIMARY KEY,zone_id uuid REFERENCES public.shipping_zones(id),price numeric,is_active boolean);
CREATE TABLE public.category_wholesale_rules(category_id uuid PRIMARY KEY REFERENCES public.categories(id),discount_percentage numeric,is_active boolean);
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
