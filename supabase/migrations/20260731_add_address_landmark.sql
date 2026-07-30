ALTER TABLE public.user_addresses ADD COLUMN IF NOT EXISTS landmark text NOT NULL DEFAULT '';
