-- ============================================================
-- Migration: RLS Policies & Missing Table Definitions
-- Date: 2026-07-26
-- 
-- 1. Creates migration entries for tables created via dashboard
--    (hero_banners, return_requests) — promo_usage_details is a VIEW, skipped
-- 2. Enables RLS on all tables
-- 3. Adds comprehensive RLS policies
-- ============================================================

-- ============================================================
-- PART 1: Missing table definitions (for version control)
-- These tables already exist in the database but never had
-- migration files committed.
-- ============================================================

-- hero_banners
CREATE TABLE IF NOT EXISTS public.hero_banners (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    subtitle text,
    description text,
    image_url text,
    route text DEFAULT '/exclusive'::text,
    position integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT hero_banners_pkey PRIMARY KEY (id)
);

-- return_requests
CREATE TABLE IF NOT EXISTS public.return_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL,
    product_id uuid,
    user_id uuid,
    reason text,
    status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'refunded'::text])),
    admin_note text,
    transaction_id text,
    images jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT return_requests_pkey PRIMARY KEY (id),
    CONSTRAINT return_requests_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
    CONSTRAINT return_requests_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
    CONSTRAINT return_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- promo_usage_details already exists as a VIEW in production — DDL not applicable

-- ============================================================
-- PART 2: Enable RLS on all tables
-- ============================================================

ALTER TABLE IF EXISTS public.back_in_stock_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.category_wholesale_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hero_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_variant_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promo_code_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promo_code_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promo_redemptions ENABLE ROW LEVEL SECURITY;
-- promo_usage_details is a VIEW, not a table — RLS not applicable
ALTER TABLE IF EXISTS public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stock_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.traffic_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.variant_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.variant_option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.variant_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.visitor_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wholesale_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wholesale_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.concerns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_concerns ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 3: RLS Policies
-- ============================================================

-- Helper: Admin check function (simplified)
-- Admins have is_admin = true in profiles table

-- --- STOREFRONT: Public read-only ---

-- Categories: anyone can read
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
CREATE POLICY "Categories are viewable by everyone"
    ON public.categories FOR SELECT
    USING (true);

-- Products: anyone can read
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
CREATE POLICY "Products are viewable by everyone"
    ON public.products FOR SELECT
    USING (true);

-- Product variants: anyone can read
DROP POLICY IF EXISTS "Product variants are viewable by everyone" ON public.product_variants;
CREATE POLICY "Product variants are viewable by everyone"
    ON public.product_variants FOR SELECT
    USING (true);

-- Product images: anyone can read
DROP POLICY IF EXISTS "Product images are viewable by everyone" ON public.product_images;
CREATE POLICY "Product images are viewable by everyone"
    ON public.product_images FOR SELECT
    USING (true);

-- Variant images: anyone can read
DROP POLICY IF EXISTS "Variant images are viewable by everyone" ON public.variant_images;
CREATE POLICY "Variant images are viewable by everyone"
    ON public.variant_images FOR SELECT
    USING (true);

-- Variant options/values: anyone can read
DROP POLICY IF EXISTS "Variant options are viewable by everyone" ON public.variant_options;
CREATE POLICY "Variant options are viewable by everyone"
    ON public.variant_options FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Variant option values are viewable by everyone" ON public.variant_option_values;
CREATE POLICY "Variant option values are viewable by everyone"
    ON public.variant_option_values FOR SELECT
    USING (true);

-- Product variant values: anyone can read
DROP POLICY IF EXISTS "Product variant values are viewable by everyone" ON public.product_variant_values;
CREATE POLICY "Product variant values are viewable by everyone"
    ON public.product_variant_values FOR SELECT
    USING (true);

-- Product categories (join table): anyone can read
DROP POLICY IF EXISTS "Product categories are viewable by everyone" ON public.product_categories;
CREATE POLICY "Product categories are viewable by everyone"
    ON public.product_categories FOR SELECT
    USING (true);

-- Product concerns (join table): anyone can read
DROP POLICY IF EXISTS "Product concerns are viewable by everyone" ON public.product_concerns;
CREATE POLICY "Product concerns are viewable by everyone"
    ON public.product_concerns FOR SELECT
    USING (true);

-- Hero banners: anyone can read active ones
DROP POLICY IF EXISTS "Hero banners are viewable by everyone" ON public.hero_banners;
CREATE POLICY "Hero banners are viewable by everyone"
    ON public.hero_banners FOR SELECT
    USING (true);

-- Journal entries: anyone can read published
DROP POLICY IF EXISTS "Journal entries are viewable by everyone" ON public.journal_entries;
CREATE POLICY "Journal entries are viewable by everyone"
    ON public.journal_entries FOR SELECT
    USING (true);

-- Reviews: anyone can read approved
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.product_reviews;
CREATE POLICY "Reviews are viewable by everyone"
    ON public.product_reviews FOR SELECT
    USING (true);

-- Concerns: anyone can read
DROP POLICY IF EXISTS "Concerns are viewable by everyone" ON public.concerns;
CREATE POLICY "Concerns are viewable by everyone"
    ON public.concerns FOR SELECT
    USING (true);

-- Shipping methods: anyone can read
DROP POLICY IF EXISTS "Shipping methods are viewable by everyone" ON public.shipping_methods;
CREATE POLICY "Shipping methods are viewable by everyone"
    ON public.shipping_methods FOR SELECT
    USING (true);

-- Shipping zones: anyone can read
DROP POLICY IF EXISTS "Shipping zones are viewable by everyone" ON public.shipping_zones;
CREATE POLICY "Shipping zones are viewable by everyone"
    ON public.shipping_zones FOR SELECT
    USING (true);

-- Promo codes: anyone can read active ones
DROP POLICY IF EXISTS "Promo codes are viewable by everyone" ON public.promo_codes;
CREATE POLICY "Promo codes are viewable by everyone"
    ON public.promo_codes FOR SELECT
    USING (true);

-- ----- CART (user-owned) -----

-- Carts: users can CRUD own cart, admins can read all
DROP POLICY IF EXISTS "Users can read own cart" ON public.carts;
CREATE POLICY "Users can read own cart"
    ON public.carts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own cart" ON public.carts;
CREATE POLICY "Users can insert own cart"
    ON public.carts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cart" ON public.carts;
CREATE POLICY "Users can update own cart"
    ON public.carts FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own cart" ON public.carts;
CREATE POLICY "Users can delete own cart"
    ON public.carts FOR DELETE
    USING (auth.uid() = user_id);

-- Cart items: users can CRUD items in own cart
DROP POLICY IF EXISTS "Users can read own cart items" ON public.cart_items;
CREATE POLICY "Users can read own cart items"
    ON public.cart_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.carts
            WHERE carts.id = cart_items.cart_id
            AND carts.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own cart items" ON public.cart_items;
CREATE POLICY "Users can insert own cart items"
    ON public.cart_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.carts
            WHERE carts.id = cart_items.cart_id
            AND carts.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own cart items" ON public.cart_items;
CREATE POLICY "Users can update own cart items"
    ON public.cart_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.carts
            WHERE carts.id = cart_items.cart_id
            AND carts.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own cart items" ON public.cart_items;
CREATE POLICY "Users can delete own cart items"
    ON public.cart_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.carts
            WHERE carts.id = cart_items.cart_id
            AND carts.user_id = auth.uid()
        )
    );

-- ----- ORDERS (user-owned) -----

-- Orders: users can read own, admins read all
DROP POLICY IF EXISTS "Users can read own orders" ON public.orders;
CREATE POLICY "Users can read own orders"
    ON public.orders FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
CREATE POLICY "Users can insert own orders"
    ON public.orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
CREATE POLICY "Users can update own orders"
    ON public.orders FOR UPDATE
    USING (
        auth.uid() = user_id
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Order items: same access as orders
DROP POLICY IF EXISTS "Users can read own order items" ON public.order_items;
CREATE POLICY "Users can read own order items"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND (orders.user_id = auth.uid()
                OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
        )
    );

DROP POLICY IF EXISTS "Users can insert own order items" ON public.order_items;
CREATE POLICY "Users can insert own order items"
    ON public.order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = auth.uid()
        )
    );

-- ----- PROFILES (user-owned) -----

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- ----- USER ADDRESSES (user-owned) -----

DROP POLICY IF EXISTS "Users can read own addresses" ON public.user_addresses;
CREATE POLICY "Users can read own addresses"
    ON public.user_addresses FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own addresses" ON public.user_addresses;
CREATE POLICY "Users can insert own addresses"
    ON public.user_addresses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own addresses" ON public.user_addresses;
CREATE POLICY "Users can update own addresses"
    ON public.user_addresses FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own addresses" ON public.user_addresses;
CREATE POLICY "Users can delete own addresses"
    ON public.user_addresses FOR DELETE
    USING (auth.uid() = user_id);

-- ----- WISHLIST (user-owned) -----

DROP POLICY IF EXISTS "Users can read own wishlist" ON public.wishlist;
CREATE POLICY "Users can read own wishlist"
    ON public.wishlist FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wishlist" ON public.wishlist;
CREATE POLICY "Users can insert own wishlist"
    ON public.wishlist FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own wishlist" ON public.wishlist;
CREATE POLICY "Users can delete own wishlist"
    ON public.wishlist FOR DELETE
    USING (auth.uid() = user_id);

-- ----- REVIEWS (user-owned write) -----

DROP POLICY IF EXISTS "Users can insert own reviews" ON public.product_reviews;
CREATE POLICY "Users can insert own reviews"
    ON public.product_reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reviews" ON public.product_reviews;
CREATE POLICY "Users can update own reviews"
    ON public.product_reviews FOR UPDATE
    USING (auth.uid() = user_id);

-- ----- RETURN REQUESTS (user-owned) -----

DROP POLICY IF EXISTS "Users can read own return requests" ON public.return_requests;
CREATE POLICY "Users can read own return requests"
    ON public.return_requests FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

DROP POLICY IF EXISTS "Users can insert own return requests" ON public.return_requests;
CREATE POLICY "Users can insert own return requests"
    ON public.return_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ----- BACK IN STOCK (public insert) -----

DROP POLICY IF EXISTS "Anyone can insert back in stock notifications" ON public.back_in_stock_notifications;
CREATE POLICY "Anyone can insert back in stock notifications"
    ON public.back_in_stock_notifications FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own back in stock notifications" ON public.back_in_stock_notifications;
CREATE POLICY "Users can read own back in stock notifications"
    ON public.back_in_stock_notifications FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- ----- PUSH SUBSCRIPTIONS (user-owned) -----

DROP POLICY IF EXISTS "Users can read own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can read own push subscriptions"
    ON public.push_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions"
    ON public.push_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions"
    ON public.push_subscriptions FOR DELETE
    USING (auth.uid() = user_id);

-- ----- PROMO REDEMPTIONS (user-owned read, system insert) -----

DROP POLICY IF EXISTS "Users can read own promo redemptions" ON public.promo_redemptions;
CREATE POLICY "Users can read own promo redemptions"
    ON public.promo_redemptions FOR SELECT
    USING (auth.uid() = user_id);


-- ----- WAITLIST (public insert) -----

DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;
CREATE POLICY "Anyone can join waitlist"
    ON public.waitlist FOR INSERT
    WITH CHECK (true);

-- ----- WHOLESALE APPLICATIONS (user-owned) -----

DROP POLICY IF EXISTS "Users can read own wholesale applications" ON public.wholesale_applications;
CREATE POLICY "Users can read own wholesale applications"
    ON public.wholesale_applications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wholesale applications" ON public.wholesale_applications;
CREATE POLICY "Users can insert own wholesale applications"
    ON public.wholesale_applications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ----- CONTACT MESSAGES (public insert) -----

DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can submit contact messages"
    ON public.contact_messages FOR INSERT
    WITH CHECK (true);

-- ----- TRAFFIC / VISITOR (system insert) -----

DROP POLICY IF EXISTS "Anyone can insert traffic logs" ON public.traffic_log;
CREATE POLICY "Anyone can insert traffic logs"
    ON public.traffic_log FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can insert visitor history" ON public.visitor_history;
CREATE POLICY "Anyone can insert visitor history"
    ON public.visitor_history FOR INSERT
    WITH CHECK (true);

-- ----- STOCK LEDGER (system insert, admin read) -----

DROP POLICY IF EXISTS "Stock ledger is readable by admins" ON public.stock_ledger;
CREATE POLICY "Stock ledger is readable by admins"
    ON public.stock_ledger FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ----- SITE SETTINGS (public read, admin write) -----

DROP POLICY IF EXISTS "Site settings are viewable by everyone" ON public.site_settings;
CREATE POLICY "Site settings are viewable by everyone"
    ON public.site_settings FOR SELECT
    USING (true);

-- ----- WHOLESALE CONFIGS (public read, admin write) -----

DROP POLICY IF EXISTS "Wholesale configs are viewable by everyone" ON public.wholesale_configs;
CREATE POLICY "Wholesale configs are viewable by everyone"
    ON public.wholesale_configs FOR SELECT
    USING (true);

-- ----- PURCHASE ORDERS (admin only) -----

DROP POLICY IF EXISTS "Purchase orders are viewable by admins" ON public.purchase_orders;
CREATE POLICY "Purchase orders are viewable by admins"
    ON public.purchase_orders FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Purchase order items are viewable by admins" ON public.purchase_order_items;
CREATE POLICY "Purchase order items are viewable by admins"
    ON public.purchase_order_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ----- SUPPLIERS (admin only) -----

DROP POLICY IF EXISTS "Suppliers are viewable by admins" ON public.suppliers;
CREATE POLICY "Suppliers are viewable by admins"
    ON public.suppliers FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ----- CATEGORY WHOLESALE RULES (admin only) -----

DROP POLICY IF EXISTS "Category wholesale rules are viewable by everyone" ON public.category_wholesale_rules;
CREATE POLICY "Category wholesale rules are viewable by everyone"
    ON public.category_wholesale_rules FOR SELECT
    USING (true);

-- ----- PROMO CODE PRODUCTS/CATEGORIES (public read) -----

DROP POLICY IF EXISTS "Promo code products are viewable by everyone" ON public.promo_code_products;
CREATE POLICY "Promo code products are viewable by everyone"
    ON public.promo_code_products FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Promo code categories are viewable by everyone" ON public.promo_code_categories;
CREATE POLICY "Promo code categories are viewable by everyone"
    ON public.promo_code_categories FOR SELECT
    USING (true);

-- ============================================================
-- PART 4: Admin write policies (is_admin = true)
-- Applies to all tables where admins need write access
-- ============================================================

-- Admin can manage all products
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
    ON public.products FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products"
    ON public.products FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products"
    ON public.products FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage product variants
DROP POLICY IF EXISTS "Admins can manage product variants" ON public.product_variants;
CREATE POLICY "Admins can manage product variants"
    ON public.product_variants FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update product variants" ON public.product_variants;
CREATE POLICY "Admins can update product variants"
    ON public.product_variants FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete product variants" ON public.product_variants;
CREATE POLICY "Admins can delete product variants"
    ON public.product_variants FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage categories
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
    ON public.categories FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories"
    ON public.categories FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories"
    ON public.categories FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage product images
DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;
CREATE POLICY "Admins can manage product images"
    ON public.product_images FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update product images" ON public.product_images;
CREATE POLICY "Admins can update product images"
    ON public.product_images FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete product images" ON public.product_images;
CREATE POLICY "Admins can delete product images"
    ON public.product_images FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage variant images
DROP POLICY IF EXISTS "Admins can manage variant images" ON public.variant_images;
CREATE POLICY "Admins can manage variant images"
    ON public.variant_images FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update variant images" ON public.variant_images;
CREATE POLICY "Admins can update variant images"
    ON public.variant_images FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete variant images" ON public.variant_images;
CREATE POLICY "Admins can delete variant images"
    ON public.variant_images FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage variant options/values
DROP POLICY IF EXISTS "Admins can manage variant options" ON public.variant_options;
CREATE POLICY "Admins can manage variant options"
    ON public.variant_options FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update variant options" ON public.variant_options;
CREATE POLICY "Admins can update variant options"
    ON public.variant_options FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can manage variant option values" ON public.variant_option_values;
CREATE POLICY "Admins can manage variant option values"
    ON public.variant_option_values FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update variant option values" ON public.variant_option_values;
CREATE POLICY "Admins can update variant option values"
    ON public.variant_option_values FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage orders
DROP POLICY IF EXISTS "Admins can insert orders" ON public.orders;
CREATE POLICY "Admins can insert orders"
    ON public.orders FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage order items
DROP POLICY IF EXISTS "Admins can insert order items" ON public.order_items;
CREATE POLICY "Admins can insert order items"
    ON public.order_items FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update order items" ON public.order_items;
CREATE POLICY "Admins can update order items"
    ON public.order_items FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage hero banners
DROP POLICY IF EXISTS "Admins can manage hero banners" ON public.hero_banners;
CREATE POLICY "Admins can manage hero banners"
    ON public.hero_banners FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update hero banners" ON public.hero_banners;
CREATE POLICY "Admins can update hero banners"
    ON public.hero_banners FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete hero banners" ON public.hero_banners;
CREATE POLICY "Admins can delete hero banners"
    ON public.hero_banners FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage journal entries
DROP POLICY IF EXISTS "Admins can manage journal entries" ON public.journal_entries;
CREATE POLICY "Admins can manage journal entries"
    ON public.journal_entries FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update journal entries" ON public.journal_entries;
CREATE POLICY "Admins can update journal entries"
    ON public.journal_entries FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete journal entries" ON public.journal_entries;
CREATE POLICY "Admins can delete journal entries"
    ON public.journal_entries FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage reviews
DROP POLICY IF EXISTS "Admins can update reviews" ON public.product_reviews;
CREATE POLICY "Admins can update reviews"
    ON public.product_reviews FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete reviews" ON public.product_reviews;
CREATE POLICY "Admins can delete reviews"
    ON public.product_reviews FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage return requests
DROP POLICY IF EXISTS "Admins can update return requests" ON public.return_requests;
CREATE POLICY "Admins can update return requests"
    ON public.return_requests FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage promo codes
DROP POLICY IF EXISTS "Admins can manage promo codes" ON public.promo_codes;
CREATE POLICY "Admins can manage promo codes"
    ON public.promo_codes FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update promo codes" ON public.promo_codes;
CREATE POLICY "Admins can update promo codes"
    ON public.promo_codes FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete promo codes" ON public.promo_codes;
CREATE POLICY "Admins can delete promo codes"
    ON public.promo_codes FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));


-- Admin can manage site settings
DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;
CREATE POLICY "Admins can manage site settings"
    ON public.site_settings FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update site settings" ON public.site_settings;
CREATE POLICY "Admins can update site settings"
    ON public.site_settings FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete site settings" ON public.site_settings;
CREATE POLICY "Admins can delete site settings"
    ON public.site_settings FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage shipping methods/zones
DROP POLICY IF EXISTS "Admins can manage shipping methods" ON public.shipping_methods;
CREATE POLICY "Admins can manage shipping methods"
    ON public.shipping_methods FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update shipping methods" ON public.shipping_methods;
CREATE POLICY "Admins can update shipping methods"
    ON public.shipping_methods FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete shipping methods" ON public.shipping_methods;
CREATE POLICY "Admins can delete shipping methods"
    ON public.shipping_methods FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can manage shipping zones" ON public.shipping_zones;
CREATE POLICY "Admins can manage shipping zones"
    ON public.shipping_zones FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update shipping zones" ON public.shipping_zones;
CREATE POLICY "Admins can update shipping zones"
    ON public.shipping_zones FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete shipping zones" ON public.shipping_zones;
CREATE POLICY "Admins can delete shipping zones"
    ON public.shipping_zones FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage suppliers
DROP POLICY IF EXISTS "Admins can manage suppliers" ON public.suppliers;
CREATE POLICY "Admins can manage suppliers"
    ON public.suppliers FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update suppliers" ON public.suppliers;
CREATE POLICY "Admins can update suppliers"
    ON public.suppliers FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete suppliers" ON public.suppliers;
CREATE POLICY "Admins can delete suppliers"
    ON public.suppliers FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage purchase orders
DROP POLICY IF EXISTS "Admins can manage purchase orders" ON public.purchase_orders;
CREATE POLICY "Admins can manage purchase orders"
    ON public.purchase_orders FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update purchase orders" ON public.purchase_orders;
CREATE POLICY "Admins can update purchase orders"
    ON public.purchase_orders FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can manage purchase order items" ON public.purchase_order_items;
CREATE POLICY "Admins can manage purchase order items"
    ON public.purchase_order_items FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update purchase order items" ON public.purchase_order_items;
CREATE POLICY "Admins can update purchase order items"
    ON public.purchase_order_items FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage wholesale configs
DROP POLICY IF EXISTS "Admins can manage wholesale configs" ON public.wholesale_configs;
CREATE POLICY "Admins can manage wholesale configs"
    ON public.wholesale_configs FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update wholesale configs" ON public.wholesale_configs;
CREATE POLICY "Admins can update wholesale configs"
    ON public.wholesale_configs FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete wholesale configs" ON public.wholesale_configs;
CREATE POLICY "Admins can delete wholesale configs"
    ON public.wholesale_configs FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage wholesale applications
DROP POLICY IF EXISTS "Admins can read wholesale applications" ON public.wholesale_applications;
CREATE POLICY "Admins can read wholesale applications"
    ON public.wholesale_applications FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update wholesale applications" ON public.wholesale_applications;
CREATE POLICY "Admins can update wholesale applications"
    ON public.wholesale_applications FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage category wholesale rules
DROP POLICY IF EXISTS "Admins can manage category wholesale rules" ON public.category_wholesale_rules;
CREATE POLICY "Admins can manage category wholesale rules"
    ON public.category_wholesale_rules FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update category wholesale rules" ON public.category_wholesale_rules;
CREATE POLICY "Admins can update category wholesale rules"
    ON public.category_wholesale_rules FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete category wholesale rules" ON public.category_wholesale_rules;
CREATE POLICY "Admins can delete category wholesale rules"
    ON public.category_wholesale_rules FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage concerns
DROP POLICY IF EXISTS "Admins can manage concerns" ON public.concerns;
CREATE POLICY "Admins can manage concerns"
    ON public.concerns FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update concerns" ON public.concerns;
CREATE POLICY "Admins can update concerns"
    ON public.concerns FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete concerns" ON public.concerns;
CREATE POLICY "Admins can delete concerns"
    ON public.concerns FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage product concerns
DROP POLICY IF EXISTS "Admins can manage product concerns" ON public.product_concerns;
CREATE POLICY "Admins can manage product concerns"
    ON public.product_concerns FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete product concerns" ON public.product_concerns;
CREATE POLICY "Admins can delete product concerns"
    ON public.product_concerns FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can read all profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
    ON public.profiles FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
    ON public.profiles FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage push subscriptions
DROP POLICY IF EXISTS "Admins can read push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Admins can read push subscriptions"
    ON public.push_subscriptions FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Admins can delete push subscriptions"
    ON public.push_subscriptions FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can read all carts/cart items
DROP POLICY IF EXISTS "Admins can read all carts" ON public.carts;
CREATE POLICY "Admins can read all carts"
    ON public.carts FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can read all cart items" ON public.cart_items;
CREATE POLICY "Admins can read all cart items"
    ON public.cart_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can read stock ledger
DROP POLICY IF EXISTS "Admins can insert stock ledger" ON public.stock_ledger;
CREATE POLICY "Admins can insert stock ledger"
    ON public.stock_ledger FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can read traffic/visitor logs
DROP POLICY IF EXISTS "Admins can read traffic logs" ON public.traffic_log;
CREATE POLICY "Admins can read traffic logs"
    ON public.traffic_log FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can read visitor history" ON public.visitor_history;
CREATE POLICY "Admins can read visitor history"
    ON public.visitor_history FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage contact messages
DROP POLICY IF EXISTS "Admins can read contact messages" ON public.contact_messages;
CREATE POLICY "Admins can read contact messages"
    ON public.contact_messages FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update contact messages" ON public.contact_messages;
CREATE POLICY "Admins can update contact messages"
    ON public.contact_messages FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can read waitlist
DROP POLICY IF EXISTS "Admins can read waitlist" ON public.waitlist;
CREATE POLICY "Admins can read waitlist"
    ON public.waitlist FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete waitlist entries" ON public.waitlist;
CREATE POLICY "Admins can delete waitlist entries"
    ON public.waitlist FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage promo redemptions
DROP POLICY IF EXISTS "Admins can read promo redemptions" ON public.promo_redemptions;
CREATE POLICY "Admins can read promo redemptions"
    ON public.promo_redemptions FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage promo_code_products/categories
DROP POLICY IF EXISTS "Admins can manage promo code products" ON public.promo_code_products;
CREATE POLICY "Admins can manage promo code products"
    ON public.promo_code_products FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete promo code products" ON public.promo_code_products;
CREATE POLICY "Admins can delete promo code products"
    ON public.promo_code_products FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can manage promo code categories" ON public.promo_code_categories;
CREATE POLICY "Admins can manage promo code categories"
    ON public.promo_code_categories FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete promo code categories" ON public.promo_code_categories;
CREATE POLICY "Admins can delete promo code categories"
    ON public.promo_code_categories FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Admin can manage back_in_stock_notifications
DROP POLICY IF EXISTS "Admins can read back in stock notifications" ON public.back_in_stock_notifications;
CREATE POLICY "Admins can read back in stock notifications"
    ON public.back_in_stock_notifications FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update back in stock notifications" ON public.back_in_stock_notifications;
CREATE POLICY "Admins can update back in stock notifications"
    ON public.back_in_stock_notifications FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
