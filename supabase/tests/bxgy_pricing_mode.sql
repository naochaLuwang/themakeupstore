-- Disposable local fixture only. All rows and helper functions roll back.
BEGIN;
SET ROLE service_role;
INSERT INTO public.profiles(id) VALUES ('50000000-0000-4000-8000-000000000001');
INSERT INTO public.products(id,name) VALUES ('50000000-0000-4000-8000-000000000002','Milani test');
INSERT INTO public.product_variants(id,product_id,stock,price) VALUES
 ('50000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000002',10,1000);
DO $$
DECLARE
 u uuid:='50000000-0000-4000-8000-000000000001';
 p uuid:='50000000-0000-4000-8000-000000000002';
 v uuid:='50000000-0000-4000-8000-000000000003';
 rule jsonb; saved jsonb; rid uuid; result jsonb; oid uuid; items jsonb;
BEGIN
 rule:=jsonb_build_object('name','Cross-brand original-price offer','buy_type','specific_brands','buy_quantity',2,
 'get_type','cheapest_free','get_discount_type','free','get_discount_value',100,'starts_at',now()-interval '1 day',
 'is_active',true,'pricing_mode','replace_discounts');
 saved:=public.save_promotion_rule('bxgy',null,rule,'{}','{}',ARRAY['Milani','RELOVE']);
 rid:=(saved->>'id')::uuid;
 IF saved->>'pricing_mode'<>'replace_discounts' OR (SELECT count(*) FROM public.bxgy_buy_brands WHERE bxgy_id=rid)<>2 THEN
   RAISE EXCEPTION 'Replacement mode or cross-brand links not saved';
 END IF;
 saved:=public.save_promotion_rule('bxgy',rid,rule||'{"pricing_mode":"combine_discounts"}','{}','{}',ARRAY['Milani','FOREVER52']);
 IF saved->>'pricing_mode'<>'combine_discounts' OR EXISTS(SELECT 1 FROM public.bxgy_buy_brands WHERE bxgy_id=rid AND brand='RELOVE') THEN
   RAISE EXCEPTION 'Editing mode and brand links did not replace them atomically';
 END IF;
 BEGIN
   PERFORM public.save_promotion_rule('bxgy',rid,rule||'{"pricing_mode":"invalid"}','{}','{}',ARRAY['Milani']);
   RAISE EXCEPTION 'TEST FAILED: Invalid mode accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Invalid BXGY pricing mode' THEN RAISE; END IF; END;
 IF (SELECT pricing_mode FROM public.buy_x_get_y WHERE id=rid)<>'combine_discounts' THEN RAISE EXCEPTION 'Invalid edit changed rule'; END IF;
 saved:=public.save_promotion_rule('bxgy',rid,rule,'{}','{}',ARRAY['Milani','RELOVE']);
 -- Three original-price offer units + one normally discounted extra of the same variant.
 items:=jsonb_build_array(
 jsonb_build_object('product_id',p,'product_variant_id',v,'product_name','Offer units','quantity',3,'unit_price',1000,'mrp',1000,'is_gift',false,'line_discount_amount',1000),
 jsonb_build_object('product_id',p,'product_variant_id',v,'product_name','Discounted extra','quantity',1,'unit_price',800,'mrp',1000,'is_gift',false,'line_discount_amount',0));
 result:=public.commit_secure_checkout(u,'50000000-0000-4000-8000-000000000004',repeat('d',64),
 jsonb_build_object('total',2800,'coin_discount_amount',0,'gift_card_discount',0,'promo_discount_amount',0,'bxgy_discount_amount',1000,
 'payment_method','COD','payment_status','unpaid','shipping_price',0,'shipping_method_id','50000000-0000-4000-8000-000000000005',
 'shipping_label','Test','shipping_address','{}'::jsonb,'offer_snapshot','{"version":2}'::jsonb),items,
 jsonb_build_array(jsonb_build_object('source','variant','id',v,'quantity',4)),jsonb_build_array(jsonb_build_object('kind','bxgy','id',rid)),null);
 oid:=(result->>'order_id')::uuid;
 IF (SELECT sum(unit_price*quantity-line_discount_amount) FROM public.order_items WHERE order_id=oid)<>2800
 OR (SELECT count(*) FROM public.order_items WHERE order_id=oid)<>2
 OR (SELECT stock FROM public.product_variants WHERE id=v)<>6 THEN RAISE EXCEPTION 'Split prices or aggregated stock did not commit correctly'; END IF;
 UPDATE public.orders SET status='cancelled' WHERE id=oid;
 PERFORM public.reconcile_cancelled_order(oid); PERFORM public.reconcile_cancelled_order(oid);
 IF (SELECT stock FROM public.product_variants WHERE id=v)<>10 THEN RAISE EXCEPTION 'Cancellation did not restore split variant quantities exactly once'; END IF;
 IF has_function_privilege('anon','public.save_promotion_rule(text,uuid,jsonb,uuid[],uuid[],text[])','EXECUTE')
 OR has_function_privilege('authenticated','public.commit_secure_checkout(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,text)','EXECUTE') THEN RAISE EXCEPTION 'Financial functions exposed'; END IF;
 -- Legacy callers/defaulted records retain the old combination behavior.
 saved:=public.save_promotion_rule('bxgy',null,rule-'pricing_mode','{}','{}',ARRAY['Milani']);
 IF saved->>'pricing_mode'<>'combine_discounts' THEN RAISE EXCEPTION 'Default changed existing behavior'; END IF;
 RAISE NOTICE 'BXGY pricing modes, cross-brand save/edit, split checkout, cancellation and privileges passed';
END $$;
ROLLBACK;
