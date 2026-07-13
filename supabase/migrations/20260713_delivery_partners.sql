-- Create delivery_partners table
CREATE TABLE public.delivery_partners (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT delivery_partners_pkey PRIMARY KEY (id)
);

ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Delivery partners are viewable by everyone" ON public.delivery_partners
  FOR SELECT USING (true);

CREATE POLICY "Delivery partners are manageable by admins" ON public.delivery_partners
  FOR ALL USING (auth.role() = 'authenticated');

-- Add delivery partner and tracking columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_partner_id uuid REFERENCES public.delivery_partners(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number text;

-- Migrate existing 'processing' orders to 'packed'
UPDATE public.orders SET status = 'packed' WHERE status = 'processing';
