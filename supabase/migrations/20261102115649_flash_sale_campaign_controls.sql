-- Apply during the checkout maintenance window, before deploying the matching web build.
-- Existing campaigns retain their target, schedule, discount and activation flag.
BEGIN;
ALTER TABLE public.flash_sales ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';
ALTER TABLE public.flash_sales ADD COLUMN IF NOT EXISTS target_config jsonb NOT NULL DEFAULT '{}';
ALTER TABLE public.flash_sales ADD COLUMN IF NOT EXISTS lifecycle text NOT NULL DEFAULT 'published';
ALTER TABLE public.flash_sales ADD COLUMN IF NOT EXISTS ended_at timestamptz;
UPDATE public.flash_sales SET name=left(coalesce(nullif(label,''),'Flash sale'),120) WHERE name='';
UPDATE public.flash_sales SET lifecycle='paused' WHERE lifecycle='published' AND NOT is_active;
UPDATE public.flash_sales SET target_config=jsonb_build_object(
 'product_ids',CASE WHEN scope='product' AND product_id IS NOT NULL THEN jsonb_build_array(product_id) ELSE '[]'::jsonb END,
 'variant_ids','[]'::jsonb,
 'category_ids',CASE WHEN scope='category' AND category_id IS NOT NULL THEN jsonb_build_array(category_id) ELSE '[]'::jsonb END,
 'brands',CASE WHEN scope='brand' AND brand IS NOT NULL THEN jsonb_build_array(brand) ELSE '[]'::jsonb END,
 'exclude_product_ids','[]'::jsonb,'exclude_variant_ids','[]'::jsonb,'exclude_category_ids','[]'::jsonb,'exclude_brands','[]'::jsonb)
 WHERE target_config='{}'::jsonb;
ALTER TABLE public.flash_sales DROP CONSTRAINT IF EXISTS scope_has_target;
ALTER TABLE public.flash_sales ADD CONSTRAINT scope_has_target CHECK (
 (scope='product' AND (jsonb_array_length(target_config->'product_ids')>0 OR jsonb_array_length(target_config->'variant_ids')>0)) OR
 (scope='category' AND jsonb_array_length(target_config->'category_ids')>0) OR
 (scope='brand' AND jsonb_array_length(target_config->'brands')>0) OR scope='all');
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.flash_sales WHERE discount_value>100000000 OR (discount_type='percentage' AND discount_value>100)) THEN
  RAISE EXCEPTION 'Review invalid flash-sale discounts before applying this migration';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.flash_sales'::regclass AND conname='flash_lifecycle_valid') THEN
  ALTER TABLE public.flash_sales ADD CONSTRAINT flash_lifecycle_valid CHECK (lifecycle IN ('draft','published','paused','ended') AND is_active=(lifecycle='published'));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.flash_sales'::regclass AND conname='flash_discount_valid') THEN
  ALTER TABLE public.flash_sales ADD CONSTRAINT flash_discount_valid CHECK (discount_value>=0 AND discount_value<=100000000 AND (discount_type<>'percentage' OR discount_value<=100));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.flash_sales'::regclass AND conname='flash_name_valid') THEN
  ALTER TABLE public.flash_sales ADD CONSTRAINT flash_name_valid CHECK (length(trim(name)) BETWEEN 1 AND 120);
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.validate_flash_campaign_targets() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE k text; config jsonb:=NEW.target_config;
BEGIN
 IF TG_OP='UPDATE' AND NEW.target_config IS NOT DISTINCT FROM OLD.target_config THEN RETURN NEW; END IF;
 IF jsonb_typeof(config)<>'object' THEN RAISE EXCEPTION 'Invalid flash sale targets'; END IF;
 FOREACH k IN ARRAY ARRAY['product_ids','variant_ids','category_ids','brands','exclude_product_ids','exclude_variant_ids','exclude_category_ids','exclude_brands'] LOOP
   IF jsonb_typeof(config->k) IS DISTINCT FROM 'array' OR jsonb_array_length(config->k)>1000 THEN RAISE EXCEPTION 'Invalid flash sale target array'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text((config->'product_ids')||(config->'exclude_product_ids')) x WHERE NOT EXISTS(SELECT 1 FROM public.products p WHERE p.id=x.value::uuid)) THEN RAISE EXCEPTION 'Target product not found'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text((config->'category_ids')||(config->'exclude_category_ids')) x WHERE NOT EXISTS(SELECT 1 FROM public.categories c WHERE c.id=x.value::uuid)) THEN RAISE EXCEPTION 'Target category not found'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(config->'variant_ids') x WHERE NOT EXISTS(SELECT 1 FROM public.product_variants v WHERE v.id=(x->>'variant_id')::uuid AND v.product_id=(x->>'product_id')::uuid)) THEN RAISE EXCEPTION 'Variant does not belong to selected product'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(config->'exclude_variant_ids') x WHERE NOT EXISTS(SELECT 1 FROM public.product_variants v WHERE v.id=x.value::uuid)) THEN RAISE EXCEPTION 'Excluded variant not found'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text((config->'brands')||(config->'exclude_brands')) x WHERE length(trim(x.value)) NOT BETWEEN 1 AND 100) THEN RAISE EXCEPTION 'Invalid brand'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_flash_campaign_targets ON public.flash_sales;
CREATE TRIGGER validate_flash_campaign_targets BEFORE INSERT OR UPDATE OF target_config ON public.flash_sales FOR EACH ROW EXECUTE FUNCTION public.validate_flash_campaign_targets();
REVOKE ALL ON FUNCTION public.validate_flash_campaign_targets() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.validate_flash_campaign_targets() TO service_role;
-- Campaign writes use requireAdmin() and a service-role client; public clients may only read published definitions.
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='flash_sales' LOOP
  EXECUTE format('DROP POLICY %I ON public.flash_sales',p.policyname);
 END LOOP;
END $$;
CREATE POLICY flash_published_read ON public.flash_sales FOR SELECT TO anon,authenticated USING (is_active AND lifecycle='published');
REVOKE INSERT,UPDATE,DELETE ON public.flash_sales FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.flash_sales TO anon,authenticated;
GRANT ALL ON public.flash_sales TO service_role;
COMMIT;
