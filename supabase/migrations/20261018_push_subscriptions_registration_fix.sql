-- =============================================================================
-- Push notification registration fix (2026-10-18)
-- Run this in the Supabase SQL Editor. Idempotent — safe to re-run.
--
-- Two defects were blocking device registration in the Capacitor app:
--
-- 1) push_subscriptions_fcm_token_idx (partial UNIQUE on fcm_token)
--    A phone signed into account A, then account B: the row holding the device
--    token belonged to A, B's DELETE could not remove it (or RLS blocked it),
--    and B's INSERT failed with 23505 → registration silently never happened.
--    Cross-account dedupe now happens in application code (delete by user_id +
--    by token before insert) and senders dedupe tokens before FCM fan-out,
--    so the DB-level unique constraint on the token is dropped.
--
-- 2) Row Level Security
--    Depending on which migration last ran live, the table was either
--    RLS-disabled (anyone holding the anon key could read AND delete every
--    customer's FCM token) or RLS-enabled with no policies (every INSERT was
--    silently denied). We now enable RLS with explicit policies.
-- =============================================================================

-- 1. Drop the token-level unique index (see above)
DROP INDEX IF EXISTS public.push_subscriptions_fcm_token_idx;

-- 2. Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Clean slate — both current and legacy policy names
DROP POLICY IF EXISTS push_subscriptions_select ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_insert ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_delete ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can read own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Admins can read push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Admins can delete push subscriptions" ON public.push_subscriptions;

-- 4. SELECT: own rows + admins (admin broadcast page / API need the full list)
CREATE POLICY push_subscriptions_select ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- 5. INSERT: a signed-in user may only register their own user_id
CREATE POLICY push_subscriptions_insert ON public.push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 6. DELETE: own rows (sign-out cleanup, invalid-token GC) + admins
--    (admin device management, cross-user invalid-token cleanup in API routes)
CREATE POLICY push_subscriptions_delete ON public.push_subscriptions
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- 7. Device-token claim trigger
--    Even with RLS, a login on a phone previously registered to another
--    account must be able to take the token over — otherwise the INSERT
--    would silently leave the stale row owning the token (and, pre-migration,
--    fail the unique index). SECURITY DEFINER → runs past RLS as owner.
CREATE OR REPLACE FUNCTION public.claim_fcm_token() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.fcm_token IS NOT NULL THEN
    DELETE FROM public.push_subscriptions WHERE fcm_token = NEW.fcm_token;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_subscriptions_claim_token ON public.push_subscriptions;
CREATE TRIGGER push_subscriptions_claim_token
  BEFORE INSERT ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.claim_fcm_token();

-- -----------------------------------------------------------------------------
-- Rollback (if needed):
--   DROP POLICY IF EXISTS push_subscriptions_select ON public.push_subscriptions;
--   DROP POLICY IF EXISTS push_subscriptions_insert ON public.push_subscriptions;
--   DROP POLICY IF EXISTS push_subscriptions_delete ON public.push_subscriptions;
--   ALTER TABLE public.push_subscriptions DISABLE ROW LEVEL SECURITY;
--   CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_fcm_token_idx
--     ON public.push_subscriptions (fcm_token) WHERE fcm_token IS NOT NULL;
-- -----------------------------------------------------------------------------
