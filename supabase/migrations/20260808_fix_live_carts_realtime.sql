-- ============================================================
-- Fix live-carts: restore dropped functions + enable Realtime
-- + admin RLS policies + trigger
-- ============================================================

-- 1. Restore get_or_create_cart (dropped by 20260727_rollback_rls)
CREATE OR REPLACE FUNCTION public.get_or_create_cart(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
  new_id uuid;
BEGIN
  SELECT id INTO existing_id
  FROM public.carts
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE public.carts
    SET updated_at = now()
    WHERE id = existing_id;
    RETURN existing_id;
  END IF;

  INSERT INTO public.carts (user_id)
  VALUES (p_user_id)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- 2. Restore decrement_stock (dropped by 20260727_rollback_rls)
CREATE OR REPLACE FUNCTION public.decrement_stock(row_id uuid, amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stock integer;
BEGIN
  SELECT stock INTO current_stock
  FROM public.product_variants
  WHERE id = row_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF current_stock < amount THEN
    RETURN false;
  END IF;

  UPDATE public.product_variants
  SET stock = stock - amount
  WHERE id = row_id;

  RETURN true;
END;
$$;

-- 3. Enable Realtime on carts and cart_items
DO $$
BEGIN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.carts; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.cart_items; EXCEPTION WHEN OTHERS THEN NULL; END;
END
$$;

-- 4. Restore admin read policies (dropped by 20260727_rollback_rls)
DROP POLICY IF EXISTS "Admins can read all carts" ON public.carts;
CREATE POLICY "Admins can read all carts"
    ON public.carts FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can read all cart items" ON public.cart_items;
CREATE POLICY "Admins can read all cart items"
    ON public.cart_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 5. Add foreign key so PostgREST can join carts -> profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'carts_user_id_fkey'
        AND conrelid = 'public.carts'::regclass
    ) THEN
        ALTER TABLE public.carts
            ADD CONSTRAINT carts_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.profiles(id)
            ON DELETE CASCADE;
    END IF;
END
$$;

-- 6. Trigger: update carts.updated_at when cart_items change
CREATE OR REPLACE FUNCTION public.touch_cart_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.carts SET updated_at = now() WHERE id = COALESCE(NEW.cart_id, OLD.cart_id);
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS touch_cart_on_item_change ON public.cart_items;
CREATE TRIGGER touch_cart_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON public.cart_items
    FOR EACH ROW EXECUTE FUNCTION public.touch_cart_updated_at();

-- 7. Restore user stock decrement policy (needed for checkout)
DROP POLICY IF EXISTS "Users can decrement stock during checkout" ON public.product_variants;
CREATE POLICY "Users can decrement stock during checkout"
    ON public.product_variants FOR UPDATE
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
