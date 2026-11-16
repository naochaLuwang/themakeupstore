-- Disposable local database only, extending financial/promotion fixtures.
ALTER TABLE public.categories ADD COLUMN name text;
ALTER TABLE public.categories ADD COLUMN parent_id uuid REFERENCES public.categories(id);
ALTER TABLE public.products ADD COLUMN status text NOT NULL DEFAULT 'active';
ALTER TABLE public.products ADD COLUMN category_id uuid REFERENCES public.categories(id);
CREATE TABLE public.product_categories(product_id uuid REFERENCES public.products(id),category_id uuid REFERENCES public.categories(id),PRIMARY KEY(product_id,category_id));
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
