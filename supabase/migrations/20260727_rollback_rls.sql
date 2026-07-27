-- ============================================================
-- Rollback: Remove RLS from all tables that had it enabled by
-- 20260726_rls_policies_and_missing_tables.sql and related
-- migrations. This restores pre-RLS behavior where the anon key
-- has unrestricted access to all tables.
-- ============================================================

-- ============================================================
-- PART 1: Drop functions created by 20260727
-- ============================================================
DROP FUNCTION IF EXISTS public.decrement_stock(uuid, integer);
DROP FUNCTION IF EXISTS public.get_or_create_cart(uuid);

-- ============================================================
-- PART 2: Drop all policies from 20260726 (ordered by table)
-- ============================================================

-- Products
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

-- Product variants
DROP POLICY IF EXISTS "Product variants are viewable by everyone" ON public.product_variants;
DROP POLICY IF EXISTS "Admins can manage product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Admins can update product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Admins can delete product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Users can decrement stock during checkout" ON public.product_variants;

-- Categories
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;

-- Product images
DROP POLICY IF EXISTS "Product images are viewable by everyone" ON public.product_images;
DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;
DROP POLICY IF EXISTS "Admins can update product images" ON public.product_images;
DROP POLICY IF EXISTS "Admins can delete product images" ON public.product_images;

-- Variant images
DROP POLICY IF EXISTS "Variant images are viewable by everyone" ON public.variant_images;
DROP POLICY IF EXISTS "Admins can manage variant images" ON public.variant_images;
DROP POLICY IF EXISTS "Admins can update variant images" ON public.variant_images;
DROP POLICY IF EXISTS "Admins can delete variant images" ON public.variant_images;

-- Variant options
DROP POLICY IF EXISTS "Variant options are viewable by everyone" ON public.variant_options;
DROP POLICY IF EXISTS "Admins can manage variant options" ON public.variant_options;
DROP POLICY IF EXISTS "Admins can update variant options" ON public.variant_options;

-- Variant option values
DROP POLICY IF EXISTS "Variant option values are viewable by everyone" ON public.variant_option_values;
DROP POLICY IF EXISTS "Admins can manage variant option values" ON public.variant_option_values;
DROP POLICY IF EXISTS "Admins can update variant option values" ON public.variant_option_values;

-- Product variant values
DROP POLICY IF EXISTS "Product variant values are viewable by everyone" ON public.product_variant_values;

-- Product categories
DROP POLICY IF EXISTS "Product categories are viewable by everyone" ON public.product_categories;

-- Product concerns
DROP POLICY IF EXISTS "Product concerns are viewable by everyone" ON public.product_concerns;

-- Concerns
DROP POLICY IF EXISTS "Concerns are viewable by everyone" ON public.concerns;
DROP POLICY IF EXISTS "Admins can manage concerns" ON public.concerns;
DROP POLICY IF EXISTS "Admins can update concerns" ON public.concerns;
DROP POLICY IF EXISTS "Admins can delete concerns" ON public.concerns;
DROP POLICY IF EXISTS "Admins can manage product concerns" ON public.product_concerns;
DROP POLICY IF EXISTS "Admins can delete product concerns" ON public.product_concerns;

-- Hero banners
DROP POLICY IF EXISTS "Hero banners are viewable by everyone" ON public.hero_banners;
DROP POLICY IF EXISTS "Admins can manage hero banners" ON public.hero_banners;
DROP POLICY IF EXISTS "Admins can update hero banners" ON public.hero_banners;
DROP POLICY IF EXISTS "Admins can delete hero banners" ON public.hero_banners;

-- Journal entries
DROP POLICY IF EXISTS "Journal entries are viewable by everyone" ON public.journal_entries;
DROP POLICY IF EXISTS "Admins can manage journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Admins can update journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Admins can delete journal entries" ON public.journal_entries;

-- Product reviews
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can insert own reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Admins can update reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Admins can delete reviews" ON public.product_reviews;

-- Shipping methods
DROP POLICY IF EXISTS "Shipping methods are viewable by everyone" ON public.shipping_methods;
DROP POLICY IF EXISTS "Admins can manage shipping methods" ON public.shipping_methods;
DROP POLICY IF EXISTS "Admins can update shipping methods" ON public.shipping_methods;
DROP POLICY IF EXISTS "Admins can delete shipping methods" ON public.shipping_methods;

-- Shipping zones
DROP POLICY IF EXISTS "Shipping zones are viewable by everyone" ON public.shipping_zones;
DROP POLICY IF EXISTS "Admins can manage shipping zones" ON public.shipping_zones;
DROP POLICY IF EXISTS "Admins can update shipping zones" ON public.shipping_zones;
DROP POLICY IF EXISTS "Admins can delete shipping zones" ON public.shipping_zones;

-- Promo codes
DROP POLICY IF EXISTS "Promo codes are viewable by everyone" ON public.promo_codes;
DROP POLICY IF EXISTS "Admins can manage promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Admins can update promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Admins can delete promo codes" ON public.promo_codes;

-- Promo code products
DROP POLICY IF EXISTS "Promo code products are viewable by everyone" ON public.promo_code_products;
DROP POLICY IF EXISTS "Admins can manage promo code products" ON public.promo_code_products;
DROP POLICY IF EXISTS "Admins can delete promo code products" ON public.promo_code_products;

-- Promo code categories
DROP POLICY IF EXISTS "Promo code categories are viewable by everyone" ON public.promo_code_categories;
DROP POLICY IF EXISTS "Admins can manage promo code categories" ON public.promo_code_categories;
DROP POLICY IF EXISTS "Admins can delete promo code categories" ON public.promo_code_categories;

-- Promo redemptions
DROP POLICY IF EXISTS "Users can read own promo redemptions" ON public.promo_redemptions;
DROP POLICY IF EXISTS "Admins can read promo redemptions" ON public.promo_redemptions;
DROP POLICY IF EXISTS "Users can insert own promo redemptions" ON public.promo_redemptions;

-- Site settings
DROP POLICY IF EXISTS "Site settings are viewable by everyone" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can update site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can delete site settings" ON public.site_settings;

-- Profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

-- Carts
DROP POLICY IF EXISTS "Users can read own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can insert own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can update own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can delete own cart" ON public.carts;
DROP POLICY IF EXISTS "Admins can read all carts" ON public.carts;

-- Cart items
DROP POLICY IF EXISTS "Users can read own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can insert own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Admins can read all cart items" ON public.cart_items;

-- Orders
DROP POLICY IF EXISTS "Users can read own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can insert orders" ON public.orders;

-- Order items
DROP POLICY IF EXISTS "Users can read own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert own order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can update order items" ON public.order_items;

-- User addresses
DROP POLICY IF EXISTS "Users can read own addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Users can insert own addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Users can delete own addresses" ON public.user_addresses;

-- Wishlist
DROP POLICY IF EXISTS "Users can read own wishlist" ON public.wishlist;
DROP POLICY IF EXISTS "Users can insert own wishlist" ON public.wishlist;
DROP POLICY IF EXISTS "Users can delete own wishlist" ON public.wishlist;

-- Return requests
DROP POLICY IF EXISTS "Users can read own return requests" ON public.return_requests;
DROP POLICY IF EXISTS "Users can insert own return requests" ON public.return_requests;
DROP POLICY IF EXISTS "Admins can update return requests" ON public.return_requests;

-- Back in stock notifications
DROP POLICY IF EXISTS "Anyone can insert back in stock notifications" ON public.back_in_stock_notifications;
DROP POLICY IF EXISTS "Users can read own back in stock notifications" ON public.back_in_stock_notifications;
DROP POLICY IF EXISTS "Admins can read back in stock notifications" ON public.back_in_stock_notifications;
DROP POLICY IF EXISTS "Admins can update back in stock notifications" ON public.back_in_stock_notifications;

-- Push subscriptions
DROP POLICY IF EXISTS "Users can read own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Admins can read push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Admins can delete push subscriptions" ON public.push_subscriptions;

-- Waitlist
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Admins can read waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Admins can delete waitlist entries" ON public.waitlist;

-- Wholesale applications
DROP POLICY IF EXISTS "Users can read own wholesale applications" ON public.wholesale_applications;
DROP POLICY IF EXISTS "Users can insert own wholesale applications" ON public.wholesale_applications;
DROP POLICY IF EXISTS "Admins can read wholesale applications" ON public.wholesale_applications;
DROP POLICY IF EXISTS "Admins can update wholesale applications" ON public.wholesale_applications;

-- Wholesale configs
DROP POLICY IF EXISTS "Wholesale configs are viewable by everyone" ON public.wholesale_configs;
DROP POLICY IF EXISTS "Admins can manage wholesale configs" ON public.wholesale_configs;
DROP POLICY IF EXISTS "Admins can update wholesale configs" ON public.wholesale_configs;
DROP POLICY IF EXISTS "Admins can delete wholesale configs" ON public.wholesale_configs;

-- Contact messages
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can read contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can update contact messages" ON public.contact_messages;

-- Traffic / Visitor
DROP POLICY IF EXISTS "Anyone can insert traffic logs" ON public.traffic_log;
DROP POLICY IF EXISTS "Admins can read traffic logs" ON public.traffic_log;
DROP POLICY IF EXISTS "Anyone can insert visitor history" ON public.visitor_history;
DROP POLICY IF EXISTS "Admins can read visitor history" ON public.visitor_history;

-- Stock ledger
DROP POLICY IF EXISTS "Stock ledger is readable by admins" ON public.stock_ledger;
DROP POLICY IF EXISTS "Admins can insert stock ledger" ON public.stock_ledger;

-- Purchase orders
DROP POLICY IF EXISTS "Purchase orders are viewable by admins" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admins can manage purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admins can update purchase orders" ON public.purchase_orders;

-- Purchase order items
DROP POLICY IF EXISTS "Purchase order items are viewable by admins" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Admins can manage purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Admins can update purchase order items" ON public.purchase_order_items;

-- Suppliers
DROP POLICY IF EXISTS "Suppliers are viewable by admins" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can delete suppliers" ON public.suppliers;

-- Category wholesale rules
DROP POLICY IF EXISTS "Category wholesale rules are viewable by everyone" ON public.category_wholesale_rules;
DROP POLICY IF EXISTS "Admins can manage category wholesale rules" ON public.category_wholesale_rules;
DROP POLICY IF EXISTS "Admins can update category wholesale rules" ON public.category_wholesale_rules;
DROP POLICY IF EXISTS "Admins can delete category wholesale rules" ON public.category_wholesale_rules;

-- ============================================================
-- PART 3: Drop policies from 20260727 additions
-- (flash_sales, gift_cards, gift_card_redemptions, showcase_items,
--  delivery_partners, gift_products)
-- ============================================================

-- flash_sales
DROP POLICY IF EXISTS "Flash sales are viewable by everyone" ON public.flash_sales;
DROP POLICY IF EXISTS "Admins can manage flash sales" ON public.flash_sales;
DROP POLICY IF EXISTS "Admins can update flash sales" ON public.flash_sales;
DROP POLICY IF EXISTS "Admins can delete flash sales" ON public.flash_sales;

-- gift_cards
DROP POLICY IF EXISTS "Users can read own gift cards" ON public.gift_cards;
DROP POLICY IF EXISTS "Admins can read all gift cards" ON public.gift_cards;
DROP POLICY IF EXISTS "Users can purchase gift cards" ON public.gift_cards;
DROP POLICY IF EXISTS "Admins can update gift cards" ON public.gift_cards;

-- gift_card_redemptions
DROP POLICY IF EXISTS "Users can read own gift card redemptions" ON public.gift_card_redemptions;
DROP POLICY IF EXISTS "Anyone can insert gift card redemptions" ON public.gift_card_redemptions;

-- showcase_items (restore original policy)
DROP POLICY IF EXISTS "Showcase items are manageable by admins only" ON public.showcase_items;
-- Note: original policy "Showcase items are viewable by everyone" was NOT dropped by 20260727

-- delivery_partners (restore original policy)
DROP POLICY IF EXISTS "Delivery partners are manageable by admins" ON public.delivery_partners;
-- Note: original policy "Delivery partners are viewable by everyone" was NOT dropped by 20260727

-- gift_products (restore original policy)
DROP POLICY IF EXISTS "Gift products are manageable by admins" ON public.gift_products;
-- Note: original policy "Gift products are viewable by everyone" was NOT dropped by 20260727

-- ============================================================
-- PART 4: Disable RLS on all tables from 20260726 migration
-- ============================================================
ALTER TABLE IF EXISTS public.back_in_stock_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cart_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.carts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.category_wholesale_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contact_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hero_banners DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_variant_values DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promo_code_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promo_code_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promo_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promo_redemptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.push_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.return_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shipping_methods DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shipping_zones DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stock_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.traffic_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_addresses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.variant_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.variant_option_values DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.variant_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.visitor_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.waitlist DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wholesale_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wholesale_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wishlist DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.concerns DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_concerns DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 5: Disable RLS on tables added by 20260727
-- (flash_sales, gift_cards, gift_card_redemptions)
-- These previously had no RLS — restore that state.
-- ============================================================
ALTER TABLE IF EXISTS public.flash_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gift_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gift_card_redemptions DISABLE ROW LEVEL SECURITY;
