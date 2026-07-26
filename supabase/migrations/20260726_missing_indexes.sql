-- Missing indexes for frequently queried columns
-- Identified via codebase query pattern analysis

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON public.orders(order_type);

-- Order items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_variant_id ON public.order_items(product_variant_id);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
-- Not UNIQUE because duplicate slugs exist in production data
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);

-- Product variants
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_stock ON public.product_variants(stock);

-- Product images
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_position ON public.product_images(product_id, position);

-- Product reviews
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON public.product_reviews(product_id, rating);

-- Product categories (join)
CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON public.product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON public.product_categories(category_id);

-- Cart
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);

-- User addresses
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);

-- Wishlist
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON public.wishlist(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlist_user_product ON public.wishlist(user_id, product_id);

-- Return requests
CREATE INDEX IF NOT EXISTS idx_return_requests_order_id ON public.return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_user_id ON public.return_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON public.return_requests(status);
CREATE INDEX IF NOT EXISTS idx_return_requests_created_at ON public.return_requests(created_at DESC);

-- Hero banners
CREATE INDEX IF NOT EXISTS idx_hero_banners_is_active ON public.hero_banners(is_active);
CREATE INDEX IF NOT EXISTS idx_hero_banners_position ON public.hero_banners(position);

-- Push subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- Stock ledger
CREATE INDEX IF NOT EXISTS idx_stock_ledger_variant_id ON public.stock_ledger(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_created_at ON public.stock_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_entry_type ON public.stock_ledger(entry_type);

-- Traffic / Visitor logs
CREATE INDEX IF NOT EXISTS idx_traffic_log_session_id ON public.traffic_log(session_id);
CREATE INDEX IF NOT EXISTS idx_traffic_log_created_at ON public.traffic_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_history_visitor_id ON public.visitor_history(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_history_created_at ON public.visitor_history(created_at DESC);

-- Promo codes
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_active ON public.promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_promo_codes_expires_at ON public.promo_codes(expires_at);

-- Promo redemptions
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_promo_id ON public.promo_redemptions(promo_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user_id ON public.promo_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_order_id ON public.promo_redemptions(order_id);


-- Purchase orders
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);

-- Purchase order items
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order_id ON public.purchase_order_items(purchase_order_id);

-- Product variants (variant values join)
CREATE INDEX IF NOT EXISTS idx_product_variant_values_variant_id ON public.product_variant_values(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_product_variant_values_option_id ON public.product_variant_values(variant_option_id);

-- Category wholesale rules
CREATE INDEX IF NOT EXISTS idx_category_wholesale_rules_category_id ON public.category_wholesale_rules(category_id);

-- Wholesale configs
CREATE INDEX IF NOT EXISTS idx_wholesale_configs_product_id ON public.wholesale_configs(product_id);


-- Contact messages
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at DESC);

-- Wholesale applications
CREATE INDEX IF NOT EXISTS idx_wholesale_applications_user_id ON public.wholesale_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_applications_status ON public.wholesale_applications(status);

-- Site settings
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON public.site_settings(key);

-- Back in stock notifications
CREATE INDEX IF NOT EXISTS idx_back_in_stock_notifications_product_id ON public.back_in_stock_notifications(product_id);
CREATE INDEX IF NOT EXISTS idx_back_in_stock_notifications_email ON public.back_in_stock_notifications(email);
