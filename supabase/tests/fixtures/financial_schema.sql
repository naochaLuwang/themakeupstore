-- ISOLATED TEST DATABASE ONLY. Core schema fixture; never apply to production.
DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
CREATE TABLE public.profiles(id uuid PRIMARY KEY, is_admin boolean DEFAULT false, user_type text DEFAULT 'customer');
CREATE TABLE public.products(id uuid PRIMARY KEY,name text);
CREATE TABLE public.product_variants(id uuid PRIMARY KEY,product_id uuid REFERENCES products(id),stock integer CHECK(stock>=0),price numeric);
CREATE TABLE public.gift_products(id uuid PRIMARY KEY,stock integer CHECK(stock>=0));
CREATE TABLE public.orders(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES profiles(id),status text,order_type text,
  payment_status text,payment_method text,razorpay_payment_id text,total numeric,shipping_price numeric,
  shipping_label text,shipping_method_id uuid,shipping_address jsonb,promo_code text,promo_discount_amount numeric,
  bxgy_discount_amount numeric DEFAULT 0,gift_card_discount numeric DEFAULT 0,coin_discount_amount numeric DEFAULT 0
);
CREATE TABLE public.order_items(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid REFERENCES orders(id),product_id uuid REFERENCES products(id),
  product_variant_id uuid REFERENCES product_variants(id),product_name text,variant_title text,
  quantity integer CHECK(quantity>0),unit_price numeric,mrp numeric,is_gift boolean
);
CREATE TABLE public.buy_x_get_y(id uuid PRIMARY KEY,is_active boolean,starts_at timestamptz,expires_at timestamptz,usage_limit integer,used_count integer DEFAULT 0,once_per_user boolean DEFAULT false);
CREATE TABLE public.free_gifts(LIKE public.buy_x_get_y INCLUDING ALL);
CREATE TABLE public.promo_codes(id uuid PRIMARY KEY,code text UNIQUE,is_active boolean,starts_at timestamptz,expires_at timestamptz,usage_limit integer,used_count integer DEFAULT 0,once_per_user boolean DEFAULT false);
CREATE TABLE public.promo_redemptions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),promo_id uuid REFERENCES promo_codes(id),user_id uuid,order_id uuid REFERENCES orders(id));
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role;
