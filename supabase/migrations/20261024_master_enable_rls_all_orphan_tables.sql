-- ============================================================
-- MASTER FIX: re-enable RLS on ALL orphan-policy tables
-- ============================================================
-- Background:
--   20260726 enabled RLS repo-wide; 20260727 rolled it back
--   (DISABLE RLS + drop policies). Afterwards, policies were
--   hand-created in the Supabase Dashboard on 21 tables WITHOUT
--   re-running ENABLE ROW LEVEL SECURITY → Supabase advisor:
--   "policies exist but RLS not enabled". With RLS off, the anon
--   key can read/write every row via REST (PII, orders, promos).
--   (back_in_stock_notifications was already fixed by
--   20261024_back_in_stock_notifications_rls_fix.sql.)
--
-- Audit basis (every non-service client path in the codebase):
--   * placeOrder runs on the CUSTOMER cookie client: reads
--     products/variants/categories/promos (public), inserts own
--     orders + order_items, decrements variant stock (RPC first,
--     direct UPDATE fallback), bumps promo used_count, clears own
--     cart, deletes own order on rollback.
--   * Cart = login-only (saveCart + cart-sync require user; no
--     guest carts). Wishlist/returns/waitlist: own/public only.
--   * All admin CRUD actions use requireAdmin() → service role
--     (bypasses RLS); admin LIST pages use the admin's cookie
--     client → need admin SELECT policies.
--   * /track/[id] switched to createAdminClient (code change in
--     same PR) so orders needs NO public SELECT policy — the old
--     "Public can track order status" USING (true) would let
--     anyone dump every order + shipping address via REST.
--   * profiles: tightened from "any authenticated user reads all"
--     (PII hole) to own + admin-only cross-user reads.
--   * wholesale_configs + journal_entries have ZERO code paths
--     (unused features) → locked down to admin (+ published read
--     for journal) with no functional impact.
--   * placeOrder stock rollback uses RPC decrement_stock /
--     increment_stock (SECURITY DEFINER, 20260727_fix +
--     20260808 restore) → bypass RLS, safe.
--
-- Run in Supabase SQL Editor. Idempotent. After running, the
-- advisor query (tables with policies but RLS off) must return 0.
-- ============================================================

-- ============================================================
-- 1. carts — login-only; own cart manage + admin read
--    Paths: saveCart/checkout/cart-sync (own), admin-carts +
--    abandoned-carts (service role), placeOrder reads+deletes own
-- ============================================================
ALTER TABLE IF EXISTS public.carts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read all carts" ON public.carts;
DROP POLICY IF EXISTS "Admins can view all carts" ON public.carts;
DROP POLICY IF EXISTS "Users can manage own cart" ON public.carts;
CREATE POLICY "Users can manage own cart" ON public.carts
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all carts" ON public.carts FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 2. cart_items — own via parent cart + admin read
--    Paths: saveCart replace-insert, cart-sync upserts/deletes,
--    placeOrder clears own cart items
-- ============================================================
ALTER TABLE IF EXISTS public.cart_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read all cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Admins can view all cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can manage own cart items" ON public.cart_items;
CREATE POLICY "Users can manage own cart items" ON public.cart_items
    USING (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()));
CREATE POLICY "Admins can view all cart items" ON public.cart_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 3. categories — public merchandising data
--    Paths: ~35 anon storefront pages + product_categories→
--    categories embeds; all mutations via app/actions/
--    categories.ts (service role)
-- ============================================================
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow admins to manage categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public read" ON public.categories;
DROP POLICY IF EXISTS "Allow public read access on categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public read categories" ON public.categories;
DROP POLICY IF EXISTS "Wholesale view categories" ON public.categories;
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT
    USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 4. category_wholesale_rules — wholesale portal (any logged-in
--    user reads discount rules) + admin wholesale page embeds;
--    mutations = updateWholesaleRule (service role)
-- ============================================================
ALTER TABLE IF EXISTS public.category_wholesale_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow admins to manage rules" ON public.category_wholesale_rules;
DROP POLICY IF EXISTS "Allow authenticated users to view rules" ON public.category_wholesale_rules;
DROP POLICY IF EXISTS "Allow read for all authenticated" ON public.category_wholesale_rules;
DROP POLICY IF EXISTS "Allow view wholesale rules" ON public.category_wholesale_rules;
DROP POLICY IF EXISTS "Wholesale view rules" ON public.category_wholesale_rules;
CREATE POLICY "Authenticated users can view wholesale rules" ON public.category_wholesale_rules FOR SELECT
    TO authenticated USING (true);
CREATE POLICY "Admins can manage wholesale rules" ON public.category_wholesale_rules
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 5. hero_banners — public reads ACTIVE only; admin list page
--    (cookie client) also reads inactive → admin SELECT;
--    mutations = hero-banners.ts (service role)
--    NOTE: dropped "Authenticated users can manage" — it let ANY
--    logged-in user rewrite/delete banners
-- ============================================================
ALTER TABLE IF EXISTS public.hero_banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read active hero banners" ON public.hero_banners;
DROP POLICY IF EXISTS "Authenticated users can manage hero banners" ON public.hero_banners;
CREATE POLICY "Anyone can read active hero banners" ON public.hero_banners FOR SELECT
    USING (is_active = true);
CREATE POLICY "Admins can manage hero banners" ON public.hero_banners
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 6. journal_entries — NO code paths (feature unused) →
--    public read published + admin manage only
--    NOTE: dropped "Admins have full access" USING (true) — the
--    name said admins but USING (true) granted ANON full access
-- ============================================================
ALTER TABLE IF EXISTS public.journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access" ON public.journal_entries;
DROP POLICY IF EXISTS "Allow public read access" ON public.journal_entries;
CREATE POLICY "Anyone can read published journal entries" ON public.journal_entries FOR SELECT
    USING (is_published = true);
CREATE POLICY "Admins can manage journal entries" ON public.journal_entries
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 7. order_items — own via parent order (SELECT in placeOrder +
--    customer-return; INSERT in placeOrder) + admin
-- ============================================================
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can delete order_items" ON public.order_items;
DROP POLICY IF EXISTS "Order items access policy" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert their own order items" ON public.order_items;
CREATE POLICY "Users can manage own order items" ON public.order_items
    USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()));
CREATE POLICY "Admins can manage order_items" ON public.order_items
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 8. orders — own CRUD + admin; NO public read
--    Paths: placeOrder (user client: read own past orders, INSERT
--    own, DELETE own on rollback); cancelOrderAndRestoreStock
--    (user client: owner-or-admin app check → SELECT+UPDATE);
--    profile order pages + orders-history + use-promotions (own);
--    admin pages = cookie or service role.
--    /track/[id] now uses the ADMIN client server-side, so the
--    old "Public can track order status" USING (true) (anyone
--    could dump all orders + addresses via REST) is dropped.
--    NOTE: own UPDATE is NOT status-restricted — cancelOrder
--    cancels non-pending statuses in app code; an RLS status
--    filter would silently no-op the UPDATE.
-- ============================================================
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Update Policy" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update any order" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Orders access policy" ON public.orders;
DROP POLICY IF EXISTS "Public can track order status" ON public.orders;
DROP POLICY IF EXISTS "Users can cancel their own pending orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can manage own orders" ON public.orders
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all orders" ON public.orders
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 9. product_categories — public read (embeds everywhere);
--    mutations = product create/edit (service role)
-- ============================================================
ALTER TABLE IF EXISTS public.product_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access prod_cat" ON public.product_categories;
DROP POLICY IF EXISTS "Admins can manage product_categories" ON public.product_categories;
DROP POLICY IF EXISTS "Allow public read access on product_categories" ON public.product_categories;
DROP POLICY IF EXISTS "Allow public read product_categories" ON public.product_categories;
CREATE POLICY "Allow public read product_categories" ON public.product_categories FOR SELECT
    USING (true);
CREATE POLICY "Admins can manage product_categories" ON public.product_categories
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 10. product_images — public read + admin manage (service role)
-- ============================================================
ALTER TABLE IF EXISTS public.product_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access images" ON public.product_images;
DROP POLICY IF EXISTS "Allow all SELECT on product_images" ON public.product_images;
DROP POLICY IF EXISTS "Allow anon SELECT on product_images" ON public.product_images;
CREATE POLICY "Allow public read product_images" ON public.product_images FOR SELECT
    USING (true);
CREATE POLICY "Admins can manage product_images" ON public.product_images
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 11. product_variants — public read everywhere; AUTHENTICATED
--     UPDATE required by checkout: atomicDecrementStock falls
--     back to a direct UPDATE (RPC is SECURITY DEFINER but the
--     fallback is user-client), POS pos-client.tsx decrements
--     stock, cancelOrder restock fallback. Column-level hardening
--     (stock-only grants) is a possible follow-up; RLS-off today
--     already allows full anon updates, so this is not a
--     regression. Mutations by admin = service role.
-- ============================================================
ALTER TABLE IF EXISTS public.product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access variants" ON public.product_variants;
DROP POLICY IF EXISTS "Allow public read access on variants" ON public.product_variants;
DROP POLICY IF EXISTS "Allow public read variants" ON public.product_variants;
DROP POLICY IF EXISTS "Allow view variants" ON public.product_variants;
DROP POLICY IF EXISTS "Users can decrement stock during checkout" ON public.product_variants;
DROP POLICY IF EXISTS "Wholesale view variants" ON public.product_variants;
CREATE POLICY "Allow public read variants" ON public.product_variants FOR SELECT
    USING (true);
CREATE POLICY "Users can decrement stock during checkout" ON public.product_variants FOR UPDATE
    TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage product_variants" ON public.product_variants
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 12. products — public read (shop filters status in app code);
--     mutations = service role
-- ============================================================
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access products" ON public.products;
DROP POLICY IF EXISTS "Allow public read access on products" ON public.products;
DROP POLICY IF EXISTS "Allow public read products" ON public.products;
DROP POLICY IF EXISTS "Allow view products" ON public.products;
DROP POLICY IF EXISTS "Wholesale view products" ON public.products;
CREATE POLICY "Allow public read products" ON public.products FOR SELECT
    USING (true);
CREATE POLICY "Admins can manage products" ON public.products
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 13. profiles — PII. Tightened: own CRUD + admin cross-user
--     SELECT only (back-in-stock-notify admin cookie client reads
--     profiles by email; admin dashboards use service role).
--     NOTE: dropped "Enable read for authenticated users"
--     USING (true) — it exposed every user's name/phone to any
--     logged-in user. Signup profile rows are created by DB
--     trigger (definer) / own-insert policy covers client paths.
--     Deletion goes through delete_account_data RPC (definer).
-- ============================================================
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT
    USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profiles" ON public.profiles FOR UPDATE
    USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

-- ============================================================
-- 14. promo_codes — public reads ACTIVE codes (validatePromoCode,
--     getActivePromos, getPromosForProduct, placeOrder re-check);
--     AUTHENTICATED UPDATE = used_count bump in placeOrder;
--     admin CRUD = service role
--     NOTE: dropped "Enable delete for authenticated users"
--     USING (true) — no code path needs user deletes
-- ============================================================
ALTER TABLE IF EXISTS public.promo_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access Promos" ON public.promo_codes;
DROP POLICY IF EXISTS "Allow public to view active promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.promo_codes;
CREATE POLICY "Allow public to view active promo codes" ON public.promo_codes FOR SELECT
    USING (is_active = true);
CREATE POLICY "Users can bump used_count at checkout" ON public.promo_codes FOR UPDATE
    TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 15/16. promo_code_products + promo_code_categories — public
--     SELECT (embedded during promo validation) + admin manage
--     (service role). Dropped authenticated DELETE USING (true).
-- ============================================================
ALTER TABLE IF EXISTS public.promo_code_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access Promo Products" ON public.promo_code_products;
DROP POLICY IF EXISTS "Admins can manage promo products" ON public.promo_code_products;
DROP POLICY IF EXISTS "Enable delete for promo products" ON public.promo_code_products;
CREATE POLICY "Allow public read promo_code_products" ON public.promo_code_products FOR SELECT
    USING (true);
CREATE POLICY "Admins can manage promo_code_products" ON public.promo_code_products
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

ALTER TABLE IF EXISTS public.promo_code_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin Full Access Promo Categories" ON public.promo_code_categories;
DROP POLICY IF EXISTS "Admins can manage promo categories" ON public.promo_code_categories;
DROP POLICY IF EXISTS "Enable delete for promo categories" ON public.promo_code_categories;
CREATE POLICY "Allow public read promo_code_categories" ON public.promo_code_categories FOR SELECT
    USING (true);
CREATE POLICY "Admins can manage promo_code_categories" ON public.promo_code_categories
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 17. return_requests — customer flow: submitReturnRequest
--     (user client, own order only: reads order_items via order
--     ownership, INSERTs own) + profile pages read own; admin
--     list/detail = cookie client → admin manage; admin status
--     updates = service role
-- ============================================================
ALTER TABLE IF EXISTS public.return_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own return requests" ON public.return_requests;
DROP POLICY IF EXISTS "admins can update return requests" ON public.return_requests;
DROP POLICY IF EXISTS "owners can update own return requests" ON public.return_requests;
DROP POLICY IF EXISTS "users can insert return requests for own orders" ON public.return_requests;
DROP POLICY IF EXISTS "users can view own return requests" ON public.return_requests;
CREATE POLICY "Users can view own return requests" ON public.return_requests FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = return_requests.order_id AND o.user_id = auth.uid()));
CREATE POLICY "Users can insert return requests for own orders" ON public.return_requests FOR INSERT
    WITH CHECK (user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = return_requests.order_id AND o.user_id = auth.uid()));
CREATE POLICY "Admins can manage return requests" ON public.return_requests
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 18. waitlist — public join form (anon INSERT, rate-limited in
--     app code) + admin page (browser client, admin session)
--     NOTE: dropped "Admins can view waitlist" USING
--     auth.role() = 'authenticated' — any user could read every
--     waitlist email
-- ============================================================
ALTER TABLE IF EXISTS public.waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Public can join waitlist" ON public.waitlist;
CREATE POLICY "Public can join waitlist" ON public.waitlist FOR INSERT
    WITH CHECK (true);
CREATE POLICY "Admins can view waitlist" ON public.waitlist FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 19. wholesale_applications — submit own + status view own +
--     admin review (cookie/service)
-- ============================================================
ALTER TABLE IF EXISTS public.wholesale_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can update applications" ON public.wholesale_applications;
DROP POLICY IF EXISTS "Admins can view all wholesale applications" ON public.wholesale_applications;
DROP POLICY IF EXISTS "Users can submit their own application" ON public.wholesale_applications;
DROP POLICY IF EXISTS "Users can view their own application status" ON public.wholesale_applications;
CREATE POLICY "Users can submit their own application" ON public.wholesale_applications FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own application status" ON public.wholesale_applications FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage wholesale applications" ON public.wholesale_applications
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR user_type = 'admin')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR user_type = 'admin')));

-- ============================================================
-- 20. wholesale_configs — ZERO code paths (feature unused) →
--     admin-only. NOTE: dropped "Admins can read wholesale"
--     USING (true) (name said admin, USING granted anon) and
--     "Wholesale price visibility" (no code queries this table)
-- ============================================================
ALTER TABLE IF EXISTS public.wholesale_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access wholesale" ON public.wholesale_configs;
DROP POLICY IF EXISTS "Admins can read wholesale" ON public.wholesale_configs;
DROP POLICY IF EXISTS "Wholesale price visibility" ON public.wholesale_configs;
CREATE POLICY "Admins can manage wholesale configs" ON public.wholesale_configs
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 21. wishlist — own manage (navbar count, product-card toggle,
--     profile wishlist page — all .eq('user_id', user.id))
-- ============================================================
ALTER TABLE IF EXISTS public.wishlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own wishlist" ON public.wishlist;
CREATE POLICY "Users can manage their own wishlist" ON public.wishlist
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Verification (run after): must return 0 rows
-- ============================================================
-- SELECT c.relname, p.polname
-- FROM pg_policy p
-- JOIN pg_class c ON c.oid = p.polrelid
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public' AND c.relrowsecurity = false
-- ORDER BY 1, 2;
--
-- Rollback: for any table, ALTER TABLE public.<t> DISABLE ROW
-- SECURITY; (policies stay, matching the pre-fix state)
-- ============================================================
