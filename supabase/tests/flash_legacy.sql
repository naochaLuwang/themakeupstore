DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.flash_sales WHERE id='80000000-0000-4000-8000-000000000010' AND name='Legacy sale' AND is_active AND lifecycle='published' AND discount_value=20 AND target_config->'product_ids'='["80000000-0000-4000-8000-000000000001"]') THEN RAISE EXCEPTION 'Legacy live campaign changed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.flash_sales WHERE id='80000000-0000-4000-8000-000000000011' AND NOT is_active AND lifecycle='paused' AND discount_value=100) THEN RAISE EXCEPTION 'Legacy paused campaign changed'; END IF;
 RAISE NOTICE 'Legacy campaign targets, pricing, schedule and activation preserved';
END $$;
