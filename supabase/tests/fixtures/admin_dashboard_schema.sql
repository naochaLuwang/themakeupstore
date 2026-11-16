-- Extends admin_directory_schema.sql in a disposable database only.
ALTER TABLE public.orders
 ADD COLUMN order_type text DEFAULT 'delivery', ADD COLUMN payment_method text DEFAULT 'COD',
 ADD COLUMN promo_code text,
 ADD COLUMN edit_version integer DEFAULT 0, ADD COLUMN edit_paid_amount numeric,
 ADD COLUMN cancellation_started_at timestamptz, ADD COLUMN shipping_address jsonb DEFAULT '{}',
 ADD COLUMN shipping_price numeric DEFAULT 0, ADD COLUMN shipping_label text,
 ADD COLUMN promo_discount_amount numeric DEFAULT 0, ADD COLUMN bxgy_discount_amount numeric DEFAULT 0,
 ADD COLUMN gift_card_discount numeric DEFAULT 0, ADD COLUMN coin_discount_amount numeric DEFAULT 0,
 ADD COLUMN additional_charges numeric DEFAULT 0, ADD COLUMN additional_charges_label text;
CREATE TABLE public.products(id uuid PRIMARY KEY,name text);
CREATE TABLE public.categories(id uuid PRIMARY KEY,name text);
CREATE TABLE public.product_categories(product_id uuid,category_id uuid);
CREATE TABLE public.product_variants(id uuid PRIMARY KEY,product_id uuid,stock integer,title text,sku text);
CREATE TABLE public.order_items(id uuid PRIMARY KEY,order_id uuid,product_id uuid,product_name text,variant_title text,
 quantity integer,unit_price numeric,is_gift boolean DEFAULT false,line_discount_amount numeric,refunded_quantity integer DEFAULT 0);
CREATE TABLE public.order_refunds(id uuid PRIMARY KEY,order_id uuid,amount numeric,created_at timestamptz DEFAULT now());
CREATE TABLE public.order_edit_settlements(id uuid PRIMARY KEY,order_id uuid,kind text,status text,amount numeric);
CREATE TABLE public.promotion_refund_requests(id uuid PRIMARY KEY,order_id uuid,status text);
CREATE TABLE public.traffic_log(id uuid PRIMARY KEY,session_id text,path text,created_at timestamptz);
CREATE TABLE public.contact_messages(id uuid PRIMARY KEY,name text,subject text,status text,created_at timestamptz);
CREATE TABLE public.wholesale_applications(id uuid PRIMARY KEY,business_name text,status text,created_at timestamptz);
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['products','categories','product_categories','product_variants','order_items','order_refunds','order_edit_settlements','promotion_refund_requests','traffic_log','contact_messages','wholesale_applications'] LOOP
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 END LOOP;
END $$;
