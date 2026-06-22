CREATE TABLE IF NOT EXISTS public.concerns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT concerns_pkey PRIMARY KEY (id),
  CONSTRAINT concerns_slug_key UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS public.product_concerns (
  product_id uuid NOT NULL,
  concern_id uuid NOT NULL,
  CONSTRAINT product_concerns_pkey PRIMARY KEY (product_id, concern_id),
  CONSTRAINT product_concerns_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
  CONSTRAINT product_concerns_concern_id_fkey FOREIGN KEY (concern_id) REFERENCES public.concerns(id) ON DELETE CASCADE
);
