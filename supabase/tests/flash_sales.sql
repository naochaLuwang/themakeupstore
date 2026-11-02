-- Apply only to the isolated flash fixture; all test rows roll back.
BEGIN;
SET ROLE service_role;
INSERT INTO public.products VALUES ('60000000-0000-4000-8000-000000000001','Milani test'),('60000000-0000-4000-8000-000000000002','RELOVE test');
INSERT INTO public.categories VALUES ('60000000-0000-4000-8000-000000000003','Lipsticks');
INSERT INTO public.product_variants VALUES ('60000000-0000-4000-8000-000000000004','60000000-0000-4000-8000-000000000001',1000,10),('60000000-0000-4000-8000-000000000005','60000000-0000-4000-8000-000000000002',500,10);
DO $$ DECLARE sale_id uuid; config jsonb; BEGIN
 config:=jsonb_build_object('product_ids','[]'::jsonb,'category_ids','[]'::jsonb,'brands','[]'::jsonb,
 'variant_ids',jsonb_build_array(jsonb_build_object('product_id','60000000-0000-4000-8000-000000000001','variant_id','60000000-0000-4000-8000-000000000004')),
 'exclude_product_ids','[]'::jsonb,'exclude_variant_ids','[]'::jsonb,'exclude_category_ids','[]'::jsonb,'exclude_brands','[]'::jsonb);
 INSERT INTO public.flash_sales(id,name,scope,discount_type,discount_value,starts_at,ends_at,lifecycle,is_active,target_config)
 VALUES('60000000-0000-4000-8000-000000000010','Specific shade','product','percentage',40,now()-interval '1 day',now()+interval '1 day','published',true,config) RETURNING id INTO sale_id;
 IF (SELECT target_config->'variant_ids'->0->>'variant_id' FROM public.flash_sales WHERE id=sale_id)<>'60000000-0000-4000-8000-000000000004' THEN RAISE EXCEPTION 'Variant target not saved'; END IF;
 BEGIN
   UPDATE public.flash_sales SET target_config=jsonb_set(config,'{variant_ids,0,variant_id}','"60000000-0000-4000-8000-000000000005"') WHERE id=sale_id;
   RAISE EXCEPTION 'TEST FAILED: cross-product variant accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Variant does not belong to selected product' THEN RAISE; END IF; END;
 BEGIN
   UPDATE public.flash_sales SET discount_value=101 WHERE id=sale_id;
   RAISE EXCEPTION 'TEST FAILED: percentage above 100 accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
   UPDATE public.flash_sales SET target_config='{}' WHERE id=sale_id;
   RAISE EXCEPTION 'TEST FAILED: malformed target object accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Invalid flash sale target array' THEN RAISE; END IF; END;
 BEGIN
   UPDATE public.flash_sales SET lifecycle='draft',is_active=true WHERE id=sale_id;
   RAISE EXCEPTION 'TEST FAILED: draft activated';
 EXCEPTION WHEN check_violation THEN NULL; END;
 UPDATE public.flash_sales SET lifecycle='paused',is_active=false WHERE id=sale_id;
 IF (SELECT ends_at<=starts_at FROM public.flash_sales WHERE id=sale_id) THEN RAISE EXCEPTION 'Pause changed dates'; END IF;
 UPDATE public.flash_sales SET lifecycle='ended',is_active=false,ended_at=now() WHERE id=sale_id;
 INSERT INTO public.flash_sales(id,name,scope,discount_type,discount_value,starts_at,ends_at,lifecycle,is_active,target_config)
 VALUES('60000000-0000-4000-8000-000000000011','Private draft','all','fixed',100,now(),now()+interval '1 day','draft',false,config);
 IF has_table_privilege('anon','public.flash_sales','INSERT') OR has_table_privilege('authenticated','public.flash_sales','UPDATE') OR has_table_privilege('authenticated','public.flash_sales','DELETE') THEN RAISE EXCEPTION 'Public campaign write privilege exposed'; END IF;
 RAISE NOTICE 'Flash target relationships, discount/state checks and write permissions passed';
END $$;
SET ROLE anon;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.flash_sales WHERE id IN ('60000000-0000-4000-8000-000000000010','60000000-0000-4000-8000-000000000011')) THEN RAISE EXCEPTION 'Draft/ended campaign exposed to public reads'; END IF; END $$;
ROLLBACK;
