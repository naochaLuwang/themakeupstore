-- Extend the existing finance fixture; never apply to production.
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
ALTER TABLE public.profiles ADD COLUMN full_name text;
ALTER TABLE public.profiles ADD COLUMN phone text;
ALTER TABLE public.profiles ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN street text;
ALTER TABLE public.profiles ADD COLUMN pincode text;
ALTER TABLE public.profiles ADD COLUMN push_subscription text;
ALTER TABLE public.orders ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
INSERT INTO public.profiles(id,is_admin,user_type,full_name) VALUES('99999999-0000-4000-8000-000000000001',true,'admin','Fixture Administrator');
INSERT INTO auth.users VALUES('99999999-0000-4000-8000-000000000001','admin@example.test');
