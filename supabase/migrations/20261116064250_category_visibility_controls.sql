-- Apply after the existing financial/promotion/BXGY/order-edit migrations, before the web build.
-- Existing categories remain active. No stock, prices or historical orders are changed.
BEGIN;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Serialize visibility writes, assignments and hierarchy edits. Stock-only writes do not take this lock.
CREATE OR REPLACE FUNCTION public.lock_catalog_visibility() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(81736, 1);
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS category_visibility_lock ON public.categories;
CREATE TRIGGER category_visibility_lock BEFORE INSERT OR UPDATE OR DELETE ON public.categories
FOR EACH STATEMENT EXECUTE FUNCTION public.lock_catalog_visibility();
DROP TRIGGER IF EXISTS category_assignment_lock ON public.product_categories;
CREATE TRIGGER category_assignment_lock BEFORE INSERT OR UPDATE OR DELETE ON public.product_categories
FOR EACH STATEMENT EXECUTE FUNCTION public.lock_catalog_visibility();
DROP TRIGGER IF EXISTS product_visibility_lock ON public.products;
CREATE TRIGGER product_visibility_lock BEFORE INSERT OR UPDATE OF status,category_id ON public.products
FOR EACH STATEMENT EXECUTE FUNCTION public.lock_catalog_visibility();

CREATE OR REPLACE FUNCTION public.guard_category_visibility() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NEW.parent_id IS NOT NULL THEN
   IF EXISTS(WITH RECURSIVE ancestors AS (
     SELECT id,parent_id FROM public.categories WHERE id=NEW.parent_id
     UNION SELECT c.id,c.parent_id FROM public.categories c JOIN ancestors a ON c.id=a.parent_id
   ) SELECT 1 FROM ancestors WHERE id=NEW.id) THEN RAISE EXCEPTION 'A category cannot be its own ancestor.'; END IF;
   IF EXISTS(SELECT 1 FROM public.categories WHERE id=NEW.parent_id AND NOT is_active) THEN
     IF TG_OP='UPDATE' AND NEW.is_active AND NOT OLD.is_active THEN
       RAISE EXCEPTION 'Activate the parent category first.';
     END IF;
     NEW.is_active:=false;
   END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS category_visibility_guard ON public.categories;
CREATE TRIGGER category_visibility_guard BEFORE INSERT OR UPDATE OF is_active,parent_id ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.guard_category_visibility();

CREATE OR REPLACE FUNCTION public.cascade_category_inactive() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NOT NEW.is_active THEN
   UPDATE public.categories SET is_active=false WHERE parent_id=NEW.id AND is_active;
   UPDATE public.products p SET status='inactive'
   WHERE p.status IS DISTINCT FROM 'inactive' AND (p.category_id=NEW.id OR
     EXISTS(SELECT 1 FROM public.product_categories pc WHERE pc.product_id=p.id AND pc.category_id=NEW.id));
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS category_visibility_cascade ON public.categories;
CREATE TRIGGER category_visibility_cascade AFTER INSERT OR UPDATE OF is_active,parent_id ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.cascade_category_inactive();

CREATE OR REPLACE FUNCTION public.guard_product_category_visibility() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.categories c WHERE NOT c.is_active AND (c.id=NEW.category_id OR
   EXISTS(SELECT 1 FROM public.product_categories pc WHERE pc.product_id=NEW.id AND pc.category_id=c.id))) THEN
   IF TG_OP='UPDATE' AND NEW.status='active' AND OLD.status IS DISTINCT FROM 'active' THEN
     RAISE EXCEPTION 'Activate the product categories first.';
   END IF;
   NEW.status:='inactive';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS product_category_visibility_guard ON public.products;
CREATE TRIGGER product_category_visibility_guard BEFORE INSERT OR UPDATE OF status,category_id ON public.products
FOR EACH ROW EXECUTE FUNCTION public.guard_product_category_visibility();

CREATE OR REPLACE FUNCTION public.deactivate_new_category_assignment() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.categories WHERE id=NEW.category_id AND NOT is_active) THEN
   UPDATE public.products SET status='inactive' WHERE id=NEW.product_id AND status IS DISTINCT FROM 'inactive';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS inactive_category_assignment ON public.product_categories;
CREATE TRIGGER inactive_category_assignment AFTER INSERT OR UPDATE OF product_id,category_id ON public.product_categories
FOR EACH ROW EXECUTE FUNCTION public.deactivate_new_category_assignment();

CREATE OR REPLACE FUNCTION public.set_category_visibility(p_category uuid,p_active boolean,p_expected_active boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE current_active boolean; category_ids uuid[]; product_count integer:=0; category_count integer:=0;
BEGIN
 PERFORM pg_advisory_xact_lock(81736, 1);
 SELECT is_active INTO current_active FROM public.categories WHERE id=p_category FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Category not found.'; END IF;
 IF p_active IS NULL OR p_expected_active IS NULL THEN RAISE EXCEPTION 'Invalid category status.'; END IF;
 IF current_active IS DISTINCT FROM p_expected_active THEN RAISE EXCEPTION 'Category changed. Refresh before trying again.'; END IF;
 IF NOT p_active THEN
   WITH RECURSIVE descendants AS (
     SELECT id FROM public.categories WHERE id=p_category
     UNION SELECT c.id FROM public.categories c JOIN descendants d ON c.parent_id=d.id
   ) SELECT array_agg(id) INTO category_ids FROM descendants;
   SELECT count(*) INTO product_count FROM public.products p WHERE p.status IS DISTINCT FROM 'inactive'
     AND (p.category_id=ANY(category_ids) OR EXISTS(SELECT 1 FROM public.product_categories pc WHERE pc.product_id=p.id AND pc.category_id=ANY(category_ids)));
   SELECT count(*) INTO category_count FROM public.categories WHERE id=ANY(category_ids) AND is_active;
 ELSE
   category_count:=(current_active IS DISTINCT FROM p_active)::integer;
 END IF;
 UPDATE public.categories SET is_active=p_active WHERE id=p_category;
 RETURN jsonb_build_object('products',product_count,'categories',category_count,'active',p_active);
END $$;
REVOKE ALL ON FUNCTION public.set_category_visibility(uuid,boolean,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_category_visibility(uuid,boolean,boolean) TO service_role;

-- Preserve the deployed financial transaction. The wrapper also checks catalog visibility under
-- product locks, so a stale quote cannot commit after deactivation. Replays keep their original result.
DO $$ BEGIN
 IF to_regprocedure('public.commit_secure_checkout_catalog_base(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,text)') IS NULL THEN
   ALTER FUNCTION public.commit_secure_checkout(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,text) RENAME TO commit_secure_checkout_catalog_base;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.commit_secure_checkout(p_user_id uuid,p_key uuid,p_hash text,p_order jsonb,p_items jsonb,p_stock jsonb,p_promotions jsonb,p_gift_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.orders WHERE user_id=p_user_id AND checkout_key=p_key) THEN
   PERFORM 1 FROM public.products WHERE id IN (
     SELECT (i->>'product_id')::uuid FROM jsonb_array_elements(p_items) i
     UNION SELECT v.product_id FROM public.product_variants v JOIN jsonb_array_elements(p_stock) s ON v.id=(s->>'id')::uuid WHERE s->>'source'='variant'
   ) ORDER BY id FOR SHARE;
   IF EXISTS(SELECT 1 FROM public.products p WHERE p.status IS DISTINCT FROM 'active' AND p.id IN (
     SELECT (i->>'product_id')::uuid FROM jsonb_array_elements(p_items) i
     UNION SELECT v.product_id FROM public.product_variants v JOIN jsonb_array_elements(p_stock) s ON v.id=(s->>'id')::uuid WHERE s->>'source'='variant'
   )) THEN RAISE EXCEPTION 'A product is no longer available. Refresh your bag.'; END IF;
 END IF;
 RETURN public.commit_secure_checkout_catalog_base(p_user_id,p_key,p_hash,p_order,p_items,p_stock,p_promotions,p_gift_code);
END $$;
REVOKE ALL ON FUNCTION public.commit_secure_checkout(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,text), public.commit_secure_checkout_catalog_base(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.commit_secure_checkout(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,text), public.commit_secure_checkout_catalog_base(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,text) TO service_role;

REVOKE ALL ON FUNCTION public.lock_catalog_visibility(),public.guard_category_visibility(),public.cascade_category_inactive(),public.guard_product_category_visibility(),public.deactivate_new_category_assignment() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.lock_catalog_visibility(),public.guard_category_visibility(),public.cascade_category_inactive(),public.guard_product_category_visibility(),public.deactivate_new_category_assignment() TO service_role;
COMMIT;
