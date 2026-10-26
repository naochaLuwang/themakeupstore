-- ============================================================
-- back_in_stock_notifications: re-enable RLS (orphan policies fix)
-- Background:
--   20260726 enabled RLS + created policies on this table.
--   20260727 rolled back: DISABLE RLS + dropped those policies.
--   Later, two policies were created by hand in the Dashboard
--   ("Allow public insert", "Admins can view notifications") but
--   ENABLE ROW LEVEL SECURITY was never re-run → Supabase advisor:
--   "policies exist but RLS not enabled".
--   With RLS off, anon key can read/update/delete all rows (PII).
-- This migration is idempotent and covers every code path:
--   * submitStockNotification (back-in-stock.ts)  → public INSERT (anon+auth cookie client)
--   * notifyBackInStock (back-in-stock-notify.ts) → admin SELECT + UPDATE (cookie client)
--   * markNotified / demand page / products.ts    → service role (bypasses RLS, no policy needed)
--   * send-back-in-stock Edge Function            → service role (bypasses)
--   * delete_account_data RPC                     → SECURITY DEFINER (bypasses)
-- NOTE: do NOT restore 20260726's "Users can read own" policy —
--   its USING (auth.uid() IS NOT NULL) let ANY logged-in user
--   read everyone's email/phone. No user-facing "my notifications"
--   page exists, so no user SELECT policy is needed.
-- ============================================================

-- 1. Turn RLS on (the missing step)
ALTER TABLE public.back_in_stock_notifications ENABLE ROW LEVEL SECURITY;

-- 2. Public insert — notify-me form (rate-limited in app code)
DROP POLICY IF EXISTS "Allow public insert" ON public.back_in_stock_notifications;
CREATE POLICY "Allow public insert"
    ON public.back_in_stock_notifications FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 3. Admin select — demand page + notifyBackInStock fetch of pending rows
DROP POLICY IF EXISTS "Admins can view notifications" ON public.back_in_stock_notifications;
CREATE POLICY "Admins can view notifications"
    ON public.back_in_stock_notifications FOR SELECT
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 4. Admin update — notifyBackInStock / markNotified set is_notified=true
DROP POLICY IF EXISTS "Admins can update notifications" ON public.back_in_stock_notifications;
CREATE POLICY "Admins can update notifications"
    ON public.back_in_stock_notifications FOR UPDATE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 5. Admin delete — cleanup when product variants are removed
--    (today products.ts uses service role, kept for completeness)
DROP POLICY IF EXISTS "Admins can delete notifications" ON public.back_in_stock_notifications;
CREATE POLICY "Admins can delete notifications"
    ON public.back_in_stock_notifications FOR DELETE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- Rollback (if ever needed):
--   DROP POLICY IF EXISTS "Allow public insert" ON public.back_in_stock_notifications;
--   DROP POLICY IF EXISTS "Admins can view notifications" ON public.back_in_stock_notifications;
--   DROP POLICY IF EXISTS "Admins can update notifications" ON public.back_in_stock_notifications;
--   DROP POLICY IF EXISTS "Admins can delete notifications" ON public.back_in_stock_notifications;
--   ALTER TABLE public.back_in_stock_notifications DISABLE ROW LEVEL SECURITY;
-- ============================================================
