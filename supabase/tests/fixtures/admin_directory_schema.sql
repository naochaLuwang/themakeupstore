-- Disposable local PostgreSQL only. No real users, orders or messages.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY, email text);
CREATE TABLE public.profiles(id uuid PRIMARY KEY, full_name text, phone text, created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz);
CREATE TABLE public.orders(id uuid PRIMARY KEY, user_id uuid, total numeric, status text, payment_status text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.carts(id uuid PRIMARY KEY, user_id uuid, updated_at timestamptz NOT NULL, abandoned_email_sent_at timestamptz);
CREATE TABLE public.cart_items(id uuid PRIMARY KEY, cart_id uuid REFERENCES public.carts(id), quantity integer);
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
