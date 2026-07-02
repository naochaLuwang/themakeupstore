-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.back_in_stock_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  user_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  product_id uuid NOT NULL,
  product_variant_id uuid NOT NULL,
  is_notified boolean DEFAULT false,
  notified_at timestamp with time zone,
  CONSTRAINT back_in_stock_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT back_in_stock_notifications_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT back_in_stock_notifications_variant_id_fkey FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id)
);
CREATE TABLE public.cart_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_variant_id uuid,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cart_items_pkey PRIMARY KEY (id),
  CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id),
  CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT cart_items_product_variant_id_fkey FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id)
);
CREATE TABLE public.carts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  active_shipping_method_id uuid,
  CONSTRAINT carts_pkey PRIMARY KEY (id),
  CONSTRAINT carts_active_shipping_method_id_fkey FOREIGN KEY (active_shipping_method_id) REFERENCES public.shipping_methods(id),
  CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT carts_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  parent_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  image_url text,
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id)
);
CREATE TABLE public.category_wholesale_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL UNIQUE,
  discount_percentage numeric NOT NULL CHECK (discount_percentage >= 0::numeric AND discount_percentage <= 100::numeric),
  min_order_quantity integer DEFAULT 12,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT category_wholesale_rules_pkey PRIMARY KEY (id),
  CONSTRAINT category_wholesale_rules_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.contact_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'unread'::text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT contact_messages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.journal_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content jsonb NOT NULL,
  featured_media_url text NOT NULL,
  media_type text DEFAULT 'image'::text CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text, 'instagram'::text])),
  category text DEFAULT 'Beauty'::text,
  is_published boolean DEFAULT false,
  author_name text DEFAULT 'Admin'::text,
  CONSTRAINT journal_entries_pkey PRIMARY KEY (id)
);
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_variant_id uuid,
  product_name text NOT NULL,
  variant_title text,
  sku text,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR'::text,
  mrp numeric,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT order_items_product_variant_id_fkey FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  status text NOT NULL DEFAULT 'pending'::text,
  total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR'::text,
  shipping_method_id uuid,
  shipping_price numeric NOT NULL DEFAULT 0,
  shipping_label text,
  shipping_address jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  payment_status text NOT NULL DEFAULT 'unpaid'::text CHECK (payment_status = ANY (ARRAY['paid'::text, 'unpaid'::text, 'refunded'::text])),
  payment_method text NOT NULL DEFAULT 'COD'::text,
  promo_code text,
  promo_discount_amount numeric DEFAULT 0,
  additional_charges numeric DEFAULT 0,
  additional_charges_label text DEFAULT 'Extra Charges'::text,
  discount_remark text,
  delivered_at timestamp with time zone,
  cancelled_by text CHECK (cancelled_by = ANY (ARRAY['user'::text, 'admin'::text])),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_shipping_method_id_fkey FOREIGN KEY (shipping_method_id) REFERENCES public.shipping_methods(id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- Order status migration: add fulfillment tracking columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'delivery' CHECK (order_type IN ('delivery', 'pickup'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ready_for_pickup_at timestamp with time zone;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS picked_up_at timestamp with time zone;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS failed_delivery_at timestamp with time zone;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS out_for_delivery_at timestamp with time zone;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS no_show_at timestamp with time zone;

CREATE TABLE public.product_categories (
  product_id uuid NOT NULL,
  category_id uuid NOT NULL,
  CONSTRAINT product_categories_pkey PRIMARY KEY (product_id, category_id),
  CONSTRAINT product_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT product_categories_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.product_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  url text NOT NULL,
  alt text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_images_pkey PRIMARY KEY (id),
  CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.product_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  user_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  comment text,
  user_name text NOT NULL,
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_approved boolean DEFAULT false,
  CONSTRAINT product_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT product_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.product_variant_values (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_variant_id uuid NOT NULL,
  variant_option_id uuid NOT NULL,
  variant_option_value_id uuid NOT NULL,
  CONSTRAINT product_variant_values_pkey PRIMARY KEY (id),
  CONSTRAINT product_variant_values_product_variant_id_fkey FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id),
  CONSTRAINT product_variant_values_variant_option_id_fkey FOREIGN KEY (variant_option_id) REFERENCES public.variant_options(id),
  CONSTRAINT product_variant_values_variant_option_value_id_fkey FOREIGN KEY (variant_option_value_id) REFERENCES public.variant_option_values(id)
);
CREATE TABLE public.product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  sku text NOT NULL UNIQUE,
  title text,
  price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR'::text,
  stock integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  discount_type text DEFAULT 'none'::text CHECK (discount_type = ANY (ARRAY['percentage'::text, 'amount'::text, 'none'::text])),
  discount_value numeric DEFAULT 0,
  hex_code text,
  CONSTRAINT product_variants_pkey PRIMARY KEY (id),
  CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  brand text,
  category_id uuid,
  has_variants boolean NOT NULL DEFAULT false,
  base_price numeric,
  currency text NOT NULL DEFAULT 'INR'::text,
  thumbnail_url text,
  status text NOT NULL DEFAULT 'active'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  discount_type text DEFAULT 'none'::text CHECK (discount_type = ANY (ARRAY['percentage'::text, 'amount'::text, 'none'::text])),
  discount_value numeric DEFAULT 0,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(description,''))
  ) STORED,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE INDEX products_search_idx ON products USING GIN (search_vector);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  phone text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  pincode text,
  street text,
  user_type text DEFAULT 'retail'::text CHECK (user_type = ANY (ARRAY['retail'::text, 'wholesale'::text, 'admin'::text])),
  push_subscription text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.promo_code_categories (
  promo_id uuid NOT NULL,
  category_id uuid NOT NULL,
  CONSTRAINT promo_code_categories_pkey PRIMARY KEY (promo_id, category_id),
  CONSTRAINT promo_code_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT promo_code_categories_promo_id_fkey FOREIGN KEY (promo_id) REFERENCES public.promo_codes(id)
);
CREATE TABLE public.promo_code_products (
  promo_id uuid NOT NULL,
  product_id uuid NOT NULL,
  CONSTRAINT promo_code_products_pkey PRIMARY KEY (promo_id, product_id),
  CONSTRAINT promo_code_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT promo_code_products_promo_id_fkey FOREIGN KEY (promo_id) REFERENCES public.promo_codes(id)
);
CREATE TABLE public.promo_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text])),
  discount_value numeric NOT NULL,
  min_order_amount numeric DEFAULT 0,
  max_discount_amount numeric,
  usage_limit integer,
  used_count integer DEFAULT 0,
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  apply_to text DEFAULT 'all'::text CHECK (apply_to = ANY (ARRAY['all'::text, 'specific_products'::text, 'specific_categories'::text])),
  once_per_user boolean DEFAULT false,
  starts_at timestamp with time zone DEFAULT now(),
  CONSTRAINT promo_codes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.promo_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  promo_id uuid,
  user_id uuid,
  order_id uuid,
  redeemed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT promo_redemptions_pkey PRIMARY KEY (id),
  CONSTRAINT promo_redemptions_promo_id_fkey FOREIGN KEY (promo_id) REFERENCES public.promo_codes(id),
  CONSTRAINT promo_redemptions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT promo_redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.purchase_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_order_id uuid,
  product_id uuid,
  variant_id uuid,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost numeric NOT NULL,
  mrp numeric,
  CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id),
  CONSTRAINT purchase_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT purchase_order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id)
);
CREATE TABLE public.purchase_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  supplier_id uuid,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'ordered'::text, 'received'::text, 'cancelled'::text])),
  total_cost numeric DEFAULT 0,
  reference_number text UNIQUE,
  received_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT purchase_orders_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id)
);
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  endpoint text NOT NULL UNIQUE,
  subscription_json jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  last_notified_at timestamp with time zone,
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT fk_push_subs_profiles FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.shipping_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  zone_id uuid,
  name text NOT NULL,
  price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR'::text,
  delivery_time_label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT shipping_methods_pkey PRIMARY KEY (id),
  CONSTRAINT shipping_methods_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.shipping_zones(id)
);
CREATE TABLE public.shipping_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  pincode text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  area_name text,
  base_price numeric DEFAULT 99,
  CONSTRAINT shipping_zones_pkey PRIMARY KEY (id)
);
CREATE TABLE public.site_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  key text NOT NULL UNIQUE,
  content text NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_by uuid,
  CONSTRAINT site_settings_pkey PRIMARY KEY (id),
  CONSTRAINT site_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
CREATE TABLE public.stock_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  variant_id uuid,
  change_amount integer NOT NULL,
  entry_type text NOT NULL CHECK (entry_type = ANY (ARRAY['purchase'::text, 'sale'::text, 'return'::text, 'adjustment'::text, 'initial'::text])),
  reference_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stock_ledger_pkey PRIMARY KEY (id),
  CONSTRAINT stock_ledger_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id)
);
CREATE TABLE public.suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT suppliers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.traffic_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  session_id text NOT NULL,
  user_id uuid,
  user_name text DEFAULT 'Anonymous Guest'::text,
  path text NOT NULL,
  device text,
  duration_seconds integer DEFAULT 0,
  CONSTRAINT traffic_log_pkey PRIMARY KEY (id),
  CONSTRAINT traffic_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text DEFAULT 'Home'::text,
  full_name text NOT NULL,
  phone text NOT NULL,
  street text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  area_name text,
  shipping_method_id uuid,
  CONSTRAINT user_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT user_addresses_shipping_method_id_fkey FOREIGN KEY (shipping_method_id) REFERENCES public.shipping_methods(id),
  CONSTRAINT user_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.variant_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_variant_id uuid NOT NULL,
  url text NOT NULL,
  alt text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT variant_images_pkey PRIMARY KEY (id),
  CONSTRAINT variant_images_product_variant_id_fkey FOREIGN KEY (product_variant_id) REFERENCES public.product_variants(id)
);
CREATE TABLE public.variant_option_values (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  variant_option_id uuid NOT NULL,
  value text NOT NULL,
  slug text NOT NULL,
  hex_code text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT variant_option_values_pkey PRIMARY KEY (id),
  CONSTRAINT variant_option_values_variant_option_id_fkey FOREIGN KEY (variant_option_id) REFERENCES public.variant_options(id)
);
CREATE TABLE public.variant_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT variant_options_pkey PRIMARY KEY (id)
);
CREATE TABLE public.visitor_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  visitor_id text NOT NULL,
  session_id text NOT NULL,
  user_id uuid,
  user_name text DEFAULT 'Guest'::text,
  path text NOT NULL,
  device text,
  referrer text,
  CONSTRAINT visitor_history_pkey PRIMARY KEY (id),
  CONSTRAINT visitor_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT waitlist_pkey PRIMARY KEY (id)
);
CREATE TABLE public.wholesale_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  business_name text NOT NULL,
  gst_number text NOT NULL,
  business_type text NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT wholesale_applications_pkey PRIMARY KEY (id),
  CONSTRAINT wholesale_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.wholesale_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  variant_id uuid UNIQUE,
  wholesale_price numeric NOT NULL,
  min_order_quantity integer DEFAULT 12,
  is_active boolean DEFAULT true,
  CONSTRAINT wholesale_configs_pkey PRIMARY KEY (id),
  CONSTRAINT wholesale_configs_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT wholesale_configs_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id)
);
CREATE TABLE public.wishlist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT wishlist_pkey PRIMARY KEY (id),
  CONSTRAINT wishlist_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT wishlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.concerns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT concerns_pkey PRIMARY KEY (id),
  CONSTRAINT concerns_slug_key UNIQUE (slug)
);
CREATE TABLE public.product_concerns (
  product_id uuid NOT NULL,
  concern_id uuid NOT NULL,
  CONSTRAINT product_concerns_pkey PRIMARY KEY (product_id, concern_id),
  CONSTRAINT product_concerns_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
  CONSTRAINT product_concerns_concern_id_fkey FOREIGN KEY (concern_id) REFERENCES public.concerns(id) ON DELETE CASCADE
);

-- ============================================================
-- POS (Point of Sale) — standalone system, not tied to admin
-- ============================================================

CREATE TABLE public.pos_customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  name text,
  email text,
  total_visits integer NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  last_visit timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pos_customers_pkey PRIMARY KEY (id),
  CONSTRAINT pos_customers_phone_key UNIQUE (phone)
);

CREATE TABLE public.pos_token_sequences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  counter integer NOT NULL DEFAULT 0,
  CONSTRAINT pos_token_sequences_pkey PRIMARY KEY (id),
  CONSTRAINT pos_token_sequences_date_key UNIQUE (date)
);

CREATE TABLE public.pos_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  token_number text NOT NULL,
  token_prefix text NOT NULL DEFAULT 'K'::text,
  customer_id uuid,
  cashier_id uuid,
  order_type text NOT NULL DEFAULT 'kiosk'::text CHECK (order_type = ANY (ARRAY['kiosk'::text, 'counter'::text])),
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'preparing'::text, 'ready'::text, 'delivered'::text, 'completed'::text, 'refunded'::text, 'voided'::text, 'on_hold'::text])),
  payment_status text NOT NULL DEFAULT 'pending'::text CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'refunded'::text])),
  customer_name text,
  customer_phone text,
  subtotal numeric NOT NULL DEFAULT 0,
  discount_type text CHECK (discount_type = ANY (ARRAY['percentage'::text, 'amount'::text, 'none'::text])),
  discount_value numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'cash'::text,
  tendered_amount numeric,
  change_amount numeric DEFAULT 0,
  prepared_at timestamp with time zone,
  ready_at timestamp with time zone,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pos_orders_pkey PRIMARY KEY (id),
  CONSTRAINT pos_orders_order_number_key UNIQUE (order_number),
  CONSTRAINT pos_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.pos_customers(id),
  CONSTRAINT pos_orders_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES auth.users(id)
);

CREATE TABLE public.pos_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pos_order_id uuid NOT NULL,
  product_id uuid,
  variant_id uuid,
  product_name text NOT NULL,
  variant_title text,
  sku text,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL,
  mrp numeric,
  total_price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pos_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT pos_order_items_pos_order_id_fkey FOREIGN KEY (pos_order_id) REFERENCES public.pos_orders(id) ON DELETE CASCADE,
  CONSTRAINT pos_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT pos_order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id)
);

CREATE TABLE public.pos_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cashier_id uuid NOT NULL,
  opened_at timestamp with time zone DEFAULT now(),
  closed_at timestamp with time zone,
  opening_balance numeric DEFAULT 0,
  closing_balance numeric,
  status text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'closed'::text])),
  notes text,
  CONSTRAINT pos_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT pos_sessions_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES auth.users(id)
);

-- Token sequence atomic counter
CREATE OR REPLACE FUNCTION public.get_next_pos_token(today date DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  next_val integer;
BEGIN
  INSERT INTO public.pos_token_sequences (date, counter)
  VALUES (today, 1)
  ON CONFLICT (date) DO UPDATE SET counter = pos_token_sequences.counter + 1
  RETURNING counter INTO next_val;
  RETURN next_val;
END;
$$;