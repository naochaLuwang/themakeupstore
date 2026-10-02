-- Account deletion: atomic PII erasure + tombstone profile
--
-- Design:
--   * Orders, returns, refunds and gift cards are FINANCIAL RECORDS — they are kept.
--     The profile row is kept as an anonymized tombstone ("Deleted Account") so all
--     FKs to profiles (orders, return_requests, gift_cards.purchased_by, ...) stay
--     valid and admin/report joins keep working.
--   * All personal data (addresses, wishlist, push tokens, loyalty ledger, coupons,
--     reviews, wholesale/GST application, traffic history, back-in-stock requests)
--     is erased in ONE transaction by delete_account_data().
--   * The auth user itself is deleted afterwards by the server action via
--     auth.admin.deleteUser — which is why profiles_id_fkey must be dropped.
--
-- Run this in the Supabase SQL Editor BEFORE deploying the account deletion UI.

-- 1. Marker so admin lists can exclude deleted accounts
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. Allow a profile tombstone to outlive its auth user
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. Atomic erasure function
CREATE OR REPLACE FUNCTION public.delete_account_data(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_email    text;
    v_is_admin boolean;
    v_col      text;
BEGIN
    -- Only the signed-in owner may call this (service role has auth.uid() = NULL)
    IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Not authorized to delete this account';
    END IF;

    SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = p_user_id;
    IF v_is_admin IS TRUE THEN
        RAISE EXCEPTION 'Admin accounts cannot be deleted by the user';
    END IF;

    IF EXISTS (SELECT 1 FROM public.pos_sessions WHERE cashier_id = p_user_id) THEN
        RAISE EXCEPTION 'Account has POS register history and cannot be self-deleted';
    END IF;

    SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;

    -- Carts (cart_items has no ON DELETE CASCADE)
    DELETE FROM public.cart_items
      WHERE cart_id IN (SELECT id FROM public.carts WHERE user_id = p_user_id);
    DELETE FROM public.carts WHERE user_id = p_user_id;

    -- Personal data
    DELETE FROM public.user_addresses          WHERE user_id = p_user_id;
    DELETE FROM public.wishlist                WHERE user_id = p_user_id;
    DELETE FROM public.push_subscriptions      WHERE user_id = p_user_id;
    DELETE FROM public.promo_redemptions       WHERE user_id = p_user_id;
    DELETE FROM public.notification_log        WHERE user_id = p_user_id;
    DELETE FROM public.traffic_log             WHERE user_id = p_user_id;
    DELETE FROM public.visitor_history         WHERE user_id = p_user_id;
    DELETE FROM public.wholesale_applications  WHERE user_id = p_user_id;
    DELETE FROM public.product_reviews         WHERE user_id = p_user_id;

    -- Loyalty & coupons: void the ledger and revoke unused coupon liability
    DELETE FROM public.loyalty_transactions WHERE user_id = p_user_id;
    DELETE FROM public.loyalty_points        WHERE user_id = p_user_id;
    DELETE FROM public.reward_coupons        WHERE user_id = p_user_id;

    -- Back-in-stock requests hold name/email/phone but are not FK-linked
    IF v_email IS NOT NULL THEN
        DELETE FROM public.back_in_stock_notifications
          WHERE lower(email) = lower(v_email);
    END IF;

    -- Unlink system rows owned by this user
    UPDATE public.site_settings SET updated_by = NULL WHERE updated_by = p_user_id;
    UPDATE public.pos_orders     SET cashier_id = NULL WHERE cashier_id = p_user_id;

    -- Anonymize the profile tombstone (keeps orders/returns/gift cards intact)
    UPDATE public.profiles
       SET full_name         = 'Deleted Account',
           phone             = NULL,
           street            = NULL,
           pincode           = NULL,
           push_subscription = NULL,
           deleted_at        = now()
     WHERE id = p_user_id;

    -- Defensive: null any additional PII columns that may exist on the live
    -- table but not in db.sql (email, area_name, avatar_url, gst_number, ...)
    FOREACH v_col IN ARRAY ARRAY['email','area_name','avatar_url','image_url','gst_number','business_name']
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name   = 'profiles'
               AND column_name  = v_col
        ) THEN
            EXECUTE format('UPDATE public.profiles SET %I = NULL WHERE id = %L', v_col, p_user_id);
        END IF;
    END LOOP;
END;
$$;

-- Only the service-role server action may call it (never anon/authenticated directly)
REVOKE ALL ON FUNCTION public.delete_account_data(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_account_data(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.delete_account_data(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_account_data(uuid) TO service_role;
