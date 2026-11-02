-- Isolated fixture only; all test data is rolled back.
BEGIN;
SET ROLE service_role;
INSERT INTO public.profiles(id) VALUES('40000000-0000-4000-8000-000000000001');
INSERT INTO public.products(id,name) VALUES('40000000-0000-4000-8000-000000000010','Test product');
INSERT INTO public.product_variants(id,product_id,stock,price) VALUES('40000000-0000-4000-8000-000000000011','40000000-0000-4000-8000-000000000010',10,800);
INSERT INTO public.gift_products(id,stock) VALUES('40000000-0000-4000-8000-000000000020',5);
INSERT INTO public.loyalty_points(user_id,balance,lifetime_earned,tier) VALUES('40000000-0000-4000-8000-000000000001',2000,2000,'bronze');
INSERT INTO public.gift_cards(id,code,original_balance,remaining_balance,purchased_by) VALUES('40000000-0000-4000-8000-000000000021','PROMOTION-TEST-CARD',800,800,'40000000-0000-4000-8000-000000000001');
CREATE FUNCTION pg_temp.promotion_header(total numeric,bxgy numeric,coins integer DEFAULT 0,gift numeric DEFAULT 0) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('total',total,'coin_discount_amount',coins,'gift_card_discount',gift,'promo_discount_amount',0,'bxgy_discount_amount',bxgy,
 'payment_method','COD','payment_status','unpaid','shipping_price',0,'shipping_method_id','40000000-0000-4000-8000-000000000030','shipping_label','Test','shipping_address','{}'::jsonb,'offer_snapshot','{"version":1}'::jsonb)
$$;
DO $$ DECLARE
 u uuid:='40000000-0000-4000-8000-000000000001'; p uuid:='40000000-0000-4000-8000-000000000010'; v uuid:='40000000-0000-4000-8000-000000000011'; g uuid:='40000000-0000-4000-8000-000000000020';
 bx uuid; gr uuid; result jsonb; replay jsonb; oid uuid; credit_order uuid; item_id uuid; request jsonb; refunded numeric; before_stock integer; rule jsonb;
 items jsonb; stock_payload jsonb; uses jsonb;
BEGIN
 rule:=jsonb_build_object('name','Repeat B2G1','buy_type','specific_products','buy_quantity',2,'get_type','cheapest_free','get_discount_type','free','get_discount_value',100,'starts_at',now()-interval '1 day','is_active',true);
 bx:=(public.save_promotion_rule('bxgy',null,rule,ARRAY[p],'{}','{}')->>'id')::uuid;
 gr:=(public.save_promotion_rule('gift',null,jsonb_build_object('name','Fixed Gift','gift_product_ref_id',g,'gift_quantity',1,'trigger_type','cart_total','trigger_threshold',2000,'starts_at',now()-interval '1 day','is_active',true),'{}','{}','{}')->>'id')::uuid;
 BEGIN
   PERFORM public.save_promotion_rule('bxgy',bx,rule||'{"name":"Should roll back"}',ARRAY['40000000-0000-4000-8000-000000000099'::uuid],'{}','{}');
   RAISE EXCEPTION 'TEST FAILED: invalid targeting accepted';
 EXCEPTION WHEN foreign_key_violation THEN NULL; END;
 IF (SELECT name FROM public.buy_x_get_y WHERE id=bx)<>'Repeat B2G1' OR NOT EXISTS(SELECT 1 FROM public.bxgy_buy_products WHERE bxgy_id=bx AND product_id=p) THEN RAISE EXCEPTION 'Campaign save was not atomic'; END IF;
 items:=jsonb_build_array(jsonb_build_object('product_id',p,'product_variant_id',v,'product_name','Test product','quantity',6,'unit_price',800,'mrp',1000,'is_gift',false,'line_discount_amount',1600),
 jsonb_build_object('product_id',null,'product_variant_id',null,'gift_product_id',g,'product_name','Dedicated gift','quantity',1,'unit_price',0,'mrp',500,'is_gift',true,'line_discount_amount',0));
 stock_payload:=jsonb_build_array(jsonb_build_object('source','variant','id',v,'quantity',6),jsonb_build_object('source','gift_products','id',g,'quantity',1));
 uses:=jsonb_build_array(jsonb_build_object('kind','bxgy','id',bx),jsonb_build_object('kind','gift','id',gr));
 result:=public.commit_secure_checkout(u,'40000000-0000-4000-8000-000000000101',repeat('a',64),pg_temp.promotion_header(3200,1600),items,stock_payload,uses,null);
 oid:=(result->>'order_id')::uuid;
 replay:=public.commit_secure_checkout(u,'40000000-0000-4000-8000-000000000101',repeat('a',64),pg_temp.promotion_header(3200,1600),items,stock_payload,uses,null);
 IF replay->>'order_id'<>result->>'order_id' OR NOT (replay->>'replayed')::boolean OR (SELECT stock FROM public.product_variants WHERE id=v)<>4 OR (SELECT stock FROM public.gift_products WHERE id=g)<>4 THEN RAISE EXCEPTION 'Repeating checkout or dedicated gift reservation failed'; END IF;
 IF (SELECT count(*) FROM public.order_items WHERE order_id=oid AND gift_product_id=g AND product_id IS NULL)<>1 THEN RAISE EXCEPTION 'Dedicated gift source not recorded'; END IF;
 IF (SELECT count(*) FROM public.checkout_promotion_uses WHERE order_id=oid)<>2 THEN RAISE EXCEPTION 'Both automatic offers were not committed'; END IF;
 BEGIN
   PERFORM public.commit_secure_checkout(u,'40000000-0000-4000-8000-000000000102',repeat('b',64),pg_temp.promotion_header(3200,1600)||'{"promo_code":"NO-STACK"}',items,stock_payload,uses,null);
   RAISE EXCEPTION 'TEST FAILED: combined coupon accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Coupons cannot be combined with automatic offers' THEN RAISE; END IF; END;
 -- Credit-funded orders cancel atomically and return each balance once.
 credit_order:=(public.commit_secure_checkout(u,'40000000-0000-4000-8000-000000000103',repeat('c',64),pg_temp.promotion_header(0,0,400,400),
 jsonb_build_array(jsonb_build_object('product_id',p,'product_variant_id',v,'product_name','Credit order','quantity',1,'unit_price',800,'mrp',1000,'is_gift',false,'line_discount_amount',0)),
 jsonb_build_array(jsonb_build_object('source','variant','id',v,'quantity',1)),'[]','PROMOTION-TEST-CARD')->>'order_id')::uuid;
 UPDATE public.orders SET status='cancelled' WHERE id=credit_order;
 PERFORM public.reconcile_cancelled_order(credit_order);PERFORM public.reconcile_cancelled_order(credit_order);
 IF (SELECT balance FROM public.loyalty_points WHERE user_id=u)<>2000 OR (SELECT remaining_balance FROM public.gift_cards WHERE code='PROMOTION-TEST-CARD')<>800 OR (SELECT stock FROM public.product_variants WHERE id=v)<>4 THEN RAISE EXCEPTION 'Cancellation did not restore credit/stock once'; END IF;
 -- A returned unit shares only the paid amount, not full pre-offer price.
 UPDATE public.orders SET payment_status='paid' WHERE id=oid;
 SELECT id INTO item_id FROM public.order_items WHERE order_id=oid AND product_variant_id=v;
 request:=public.reserve_promotion_refund(oid,'40000000-0000-4000-8000-000000000104',jsonb_build_array(jsonb_build_object('itemId',item_id,'quantity',3)),'gpay',u,'Test refund');
 IF (request->>'amount')::numeric<>1600 THEN RAISE EXCEPTION 'Refund used original price instead of discounted paid value'; END IF;
 BEGIN
   PERFORM public.reserve_promotion_refund(oid,'40000000-0000-4000-8000-000000000105',jsonb_build_array(jsonb_build_object('itemId',item_id,'quantity',1)),'gpay',u,'Conflict');
   RAISE EXCEPTION 'TEST FAILED: simultaneous refund reservation accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'A refund is awaiting confirmation. Retry the original refund before starting another.' THEN RAISE; END IF; END;
 BEGIN
   PERFORM public.prepare_order_cancellation(oid);RAISE EXCEPTION 'TEST FAILED: cancellation started over a pending refund';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Finish the pending item refund before cancelling' THEN RAISE; END IF; END;
 refunded:=public.finish_promotion_refund((request->>'id')::uuid,'manual-test');
 PERFORM public.finish_promotion_refund((request->>'id')::uuid,'manual-test');
 IF refunded<>1600 OR (SELECT stock FROM public.product_variants WHERE id=v)<>7 OR (SELECT refunded_quantity FROM public.order_items WHERE id=item_id)<>3 OR (SELECT count(*) FROM public.order_refunds WHERE order_id=oid)<>1 THEN RAISE EXCEPTION 'Refund confirmation was not idempotent'; END IF;
 PERFORM public.prepare_order_cancellation(oid);
 BEGIN
   PERFORM public.reserve_promotion_refund(oid,'40000000-0000-4000-8000-000000000106',jsonb_build_array(jsonb_build_object('itemId',item_id,'quantity',1)),'gpay',u,'Conflict');
   RAISE EXCEPTION 'TEST FAILED: refund started during cancellation';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Cancellation is in progress' THEN RAISE; END IF; END;
 BEGIN UPDATE public.orders SET status='shipped' WHERE id=oid;RAISE EXCEPTION 'TEST FAILED: cancelling order shipped';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'Cancellation is in progress' THEN RAISE; END IF; END;
 -- Cancel after a partial return: restore only the remaining units and the fixed gift.
 UPDATE public.orders SET status='cancelled' WHERE id=oid;
 PERFORM public.reconcile_cancelled_order(oid);PERFORM public.reconcile_cancelled_order(oid);
 IF (SELECT stock FROM public.product_variants WHERE id=v)<>10 OR (SELECT stock FROM public.gift_products WHERE id=g)<>5 OR (SELECT balance FROM public.loyalty_points WHERE user_id=u)<>2000 THEN RAISE EXCEPTION 'Cancellation double-restored returned stock or deducted pending points'; END IF;
 -- Cancellation/deletion must not make a once-per-customer campaign claimable again.
 items:=jsonb_set(items,'{0,quantity}','3');items:=jsonb_set(items,'{0,line_discount_amount}','800');
 stock_payload:=jsonb_set(stock_payload,'{0,quantity}','3');
 credit_order:=(public.commit_secure_checkout(u,'40000000-0000-4000-8000-000000000107',repeat('d',64),pg_temp.promotion_header(1600,800),items,stock_payload,uses,null)->>'order_id')::uuid;
 UPDATE public.orders SET status='cancelled' WHERE id=credit_order;PERFORM public.reconcile_cancelled_order(credit_order);
 DELETE FROM public.order_items WHERE order_id=credit_order;DELETE FROM public.orders WHERE id=credit_order;
 IF (SELECT count(*) FROM public.checkout_promotion_uses WHERE user_id=u AND order_id IS NULL)<>2 THEN RAISE EXCEPTION 'Deleting order erased campaign usage'; END IF;
 -- Paise survive the same transactional amount invariant as the server quote.
 credit_order:=(public.commit_secure_checkout(u,'40000000-0000-4000-8000-000000000108',repeat('e',64),pg_temp.promotion_header(100.25,0),
 jsonb_build_array(jsonb_build_object('product_id',p,'product_variant_id',v,'product_name','Paise example','quantity',1,'unit_price',100.25,'mrp',1000,'is_gift',false,'line_discount_amount',0)),
 jsonb_build_array(jsonb_build_object('source','variant','id',v,'quantity',1)),'[]',null)->>'order_id')::uuid;
 IF (SELECT total FROM public.orders WHERE id=credit_order)<>100.25 THEN RAISE EXCEPTION 'Checkout rounded away paise'; END IF;

END $$;
RESET ROLE;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['buy_x_get_y','free_gifts','gift_products','bxgy_buy_products','free_gift_products'] LOOP
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=('public.'||t)::regclass) OR has_table_privilege('authenticated','public.'||t,'INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'Promotion write permissions remain public'; END IF;
 END LOOP;
 IF has_function_privilege('authenticated','public.reserve_promotion_refund(uuid,uuid,jsonb,text,uuid,text)','EXECUTE') OR has_function_privilege('anon','public.save_promotion_rule(text,uuid,jsonb,uuid[],uuid[],text[])','EXECUTE') THEN RAISE EXCEPTION 'Financial campaign RPC is exposed'; END IF;
END $$;
ROLLBACK;
SELECT 'promotion checkout, gift inventory, atomic administration, refund and cancellation assertions passed' AS result;
