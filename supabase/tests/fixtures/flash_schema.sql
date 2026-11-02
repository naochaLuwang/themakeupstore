-- Disposable local test database only.
DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE public.products(id uuid PRIMARY KEY,name text);
CREATE TABLE public.categories(id uuid PRIMARY KEY,name text);
CREATE TABLE public.product_variants(id uuid PRIMARY KEY,product_id uuid REFERENCES public.products(id),price numeric,stock integer);
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
