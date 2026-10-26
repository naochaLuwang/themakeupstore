-- ============================================================
-- ROLLBACK: disable RLS on all tables touched by the
-- 20261024 RLS fixes (master + back_in_stock_notifications)
-- ============================================================
-- Why: enabling RLS broke the live app. This restores the
-- exact pre-fix state (RLS off = policies inert, full anon
-- access via REST — same as before 20261024).
--
-- The 20261024 migrations dropped the old hand-created
-- dashboard policies and created new ones; with RLS disabled
-- those policies are inert either way, so no policy
-- recreation is needed to restore behavior.
--
-- Note: app/track/[id]/page.tsx stays on createAdminClient()
-- — it bypasses RLS and works with RLS on or off.
--
-- Run in Supabase SQL Editor. Idempotent.
--
-- To re-attempt later: re-enable RLS per table and re-create
-- policies (see 20261024_master_enable_rls_all_orphan_tables.sql
-- + 20261024_back_in_stock_notifications_rls_fix.sql), after
-- diagnosing which table(s) actually failed.
-- ============================================================

ALTER TABLE IF EXISTS public.carts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cart_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.category_wholesale_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hero_banners DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promo_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promo_code_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promo_code_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.return_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.waitlist DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wholesale_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wholesale_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wishlist DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.back_in_stock_notifications DISABLE ROW LEVEL SECURITY;
