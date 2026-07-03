CREATE TABLE public.showcase_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text NOT NULL,
  link_url text,
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT showcase_items_pkey PRIMARY KEY (id)
);

ALTER TABLE public.showcase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Showcase items are viewable by everyone" ON public.showcase_items
  FOR SELECT USING (true);

CREATE POLICY "Showcase items are manageable by admins only" ON public.showcase_items
  FOR ALL USING (auth.role() = 'authenticated');
