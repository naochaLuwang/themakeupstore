-- FCM-only push: drop legacy Web Push columns from push_subscriptions
-- Web Push (VAPID / service worker / endpoint) is no longer used.

ALTER TABLE public.push_subscriptions
  DROP COLUMN IF EXISTS endpoint,
  DROP COLUMN IF EXISTS subscription_json;

-- All remaining rows should be FCM (android). Clean out any orphaned web-only rows.
DELETE FROM public.push_subscriptions WHERE fcm_token IS NULL;

-- Platform is now always android for FCM-registered devices.
ALTER TABLE public.push_subscriptions
  ALTER COLUMN platform SET DEFAULT 'android';

-- Make fcm_token mandatory going forward.
ALTER TABLE public.push_subscriptions
  ALTER COLUMN fcm_token SET NOT NULL;