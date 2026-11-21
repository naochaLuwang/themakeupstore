-- Apply after the existing order-amendment migration and other pending migrations.
-- No historical orders/balances are rewritten. Legacy manual discounts move only
-- when an administrator explicitly reviews and saves an amendment.
BEGIN;
ALTER TABLE public.orders
 ADD COLUMN IF NOT EXISTS manual_discount_amount numeric NOT NULL DEFAULT 0 CHECK(manual_discount_amount BETWEEN 0 AND 100000000 AND manual_discount_amount=round(manual_discount_amount,2)),
 ADD COLUMN IF NOT EXISTS manual_discount_requested numeric NOT NULL DEFAULT 0 CHECK(manual_discount_requested BETWEEN 0 AND 100000000 AND manual_discount_requested=round(manual_discount_requested,2)),
 ADD COLUMN IF NOT EXISTS manual_discount_reason text CHECK(length(manual_discount_reason)<=1000);

CREATE OR REPLACE FUNCTION public.commit_order_amendment(
 p_order_id uuid,p_key uuid,p_hash text,p_actor uuid,p_reason text,p_revision text,
 p_variants uuid[],p_catalog_revision text,p_quote jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE o public.orders%ROWTYPE; prior public.order_amendments%ROWTYPE; before_state jsonb; after_state jsonb;
 line jsonb; entry record; old_qty integer; new_qty integer; stock_now integer; new_id uuid; idx integer:=0;
 item_total numeric; discount_total numeric; total_new numeric; gift_new numeric; coins_new integer; cash_paid numeric;
 manual_new numeric; manual_requested numeric; manual_reason text; has_manual boolean;
 old_gift numeric; old_coins integer; gc record; coin_spent integer; points_now integer; base_map jsonb:='{}'; ids uuid[]:='{}';
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 SELECT * INTO prior FROM public.order_amendments WHERE request_key=p_key;
 IF FOUND THEN
   IF prior.order_id<>o.id OR prior.request_hash<>p_hash OR prior.actor_id<>p_actor THEN RAISE EXCEPTION 'This save key was already used for a different change'; END IF;
   RETURN jsonb_build_object('order_id',o.id,'replayed',true);
 END IF;
 IF p_hash IS NULL OR length(p_hash)<>64 OR length(trim(p_reason)) NOT BETWEEN 3 AND 1000 OR
 NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND (is_admin OR user_type='admin')) THEN RAISE EXCEPTION 'Invalid administrator or edit reason'; END IF;
 IF o.status NOT IN ('pending','confirmed') OR o.payment_status NOT IN ('paid','unpaid') OR o.cancellation_started_at IS NOT NULL THEN RAISE EXCEPTION 'This order can no longer be edited'; END IF;
 IF public.order_edit_revision(o.id) IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'The order changed. Reload it and review your changes again'; END IF;
 IF EXISTS(SELECT 1 FROM public.order_items WHERE order_id=o.id AND (refunded_quantity>0 OR stock_restored_quantity>0)) OR
 EXISTS(SELECT 1 FROM public.order_refunds WHERE order_id=o.id) OR
 EXISTS(SELECT 1 FROM public.promotion_refund_requests WHERE order_id=o.id AND status='reserved') OR
 EXISTS(SELECT 1 FROM public.order_edit_settlements WHERE order_id=o.id AND status='reserved') THEN RAISE EXCEPTION 'Finish the pending payment/refund or review the existing return before editing'; END IF;
 IF (p_quote->>'validUntil')::numeric/1000<=extract(epoch FROM clock_timestamp()) THEN RAISE EXCEPTION 'The review expired. Review the total again'; END IF;
 -- Match checkout's balance -> gift card -> campaign -> inventory lock order.
 PERFORM 1 FROM public.loyalty_points WHERE user_id=o.user_id FOR UPDATE;
 PERFORM 1 FROM public.gift_cards WHERE id IN (SELECT gift_card_id FROM public.gift_card_redemptions WHERE order_id=o.id) ORDER BY id FOR UPDATE;
 PERFORM 1 FROM public.buy_x_get_y ORDER BY id FOR UPDATE;
 PERFORM 1 FROM public.free_gifts ORDER BY id FOR UPDATE;
 PERFORM 1 FROM public.promo_codes ORDER BY id FOR UPDATE;
 PERFORM 1 FROM public.flash_sales ORDER BY id FOR SHARE;
 PERFORM 1 FROM public.products WHERE id IN (SELECT product_id FROM public.product_variants WHERE id=ANY(p_variants)) OR id IN (SELECT gift_product_id FROM public.free_gifts) ORDER BY id FOR SHARE;
 PERFORM 1 FROM public.shipping_methods ORDER BY id FOR SHARE;
 PERFORM 1 FROM public.shipping_zones ORDER BY id FOR SHARE;
 PERFORM 1 FROM public.category_wholesale_rules ORDER BY category_id FOR SHARE;
 LOCK TABLE public.product_categories,public.bxgy_buy_products,public.bxgy_buy_categories,public.bxgy_buy_brands,public.free_gift_products,public.free_gift_categories,public.free_gift_brands,public.promo_code_products,public.promo_code_categories IN SHARE MODE;
 IF jsonb_typeof(p_quote->'lines')<>'array' OR jsonb_array_length(p_quote->'lines') NOT BETWEEN 1 AND 401 OR
 NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_quote->'lines') i WHERE NOT (i->>'is_gift')::boolean) THEN RAISE EXCEPTION 'Use cancellation to remove every item'; END IF;
 FOR line IN SELECT value FROM jsonb_array_elements(p_quote->'lines') LOOP
   IF (line->>'quantity')::integer NOT BETWEEN 1 AND 1000 OR (line->>'unit_price')::numeric<0 OR (line->>'mrp')::numeric<0 OR
      (line->>'line_discount_amount')::numeric NOT BETWEEN 0 AND (line->>'quantity')::integer*(line->>'unit_price')::numeric THEN RAISE EXCEPTION 'Invalid item amount'; END IF;
   IF nullif(line->>'source_item_id','') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.order_items WHERE id=(line->>'source_item_id')::uuid AND order_id=o.id AND product_variant_id IS NOT DISTINCT FROM (line->>'product_variant_id')::uuid AND gift_product_id IS NOT DISTINCT FROM (line->>'gift_product_id')::uuid) THEN RAISE EXCEPTION 'An edited item does not belong to this order'; END IF;
   IF line->>'product_variant_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.product_variants WHERE id=(line->>'product_variant_id')::uuid AND product_id=(line->>'product_id')::uuid) THEN RAISE EXCEPTION 'Product and shade do not match'; END IF;
 END LOOP;
 IF (SELECT count(*) FROM jsonb_array_elements(p_quote->'lines') i WHERE i->>'source_item_id' IS NOT NULL) <>
 (SELECT count(DISTINCT i->>'source_item_id') FROM jsonb_array_elements(p_quote->'lines') i WHERE i->>'source_item_id' IS NOT NULL) THEN RAISE EXCEPTION 'Duplicate item identity'; END IF;
 SELECT sum((i->>'unit_price')::numeric*(i->>'quantity')::integer),sum((i->>'line_discount_amount')::numeric) INTO item_total,discount_total FROM jsonb_array_elements(p_quote->'lines') i;
 gift_new:=(p_quote->>'giftCardDiscount')::numeric; coins_new:=(p_quote->>'coinDiscount')::integer;
 old_gift:=coalesce(o.gift_card_discount,0); old_coins:=coalesce(o.coin_discount_amount,0);
 IF old_coins>0 THEN
   SELECT balance INTO points_now FROM public.loyalty_points WHERE user_id=o.user_id;
   SELECT coalesce(sum(amount),0) INTO coin_spent FROM public.loyalty_transactions WHERE user_id=o.user_id AND reference_id=o.id AND reference_type='order' AND type='spend' AND status='available';
   IF points_now IS NULL OR coin_spent<>old_coins THEN RAISE EXCEPTION 'The original M Coin debit needs review before editing'; END IF;
 END IF;
 IF old_gift>0 AND ((SELECT count(*) FROM public.gift_card_redemptions WHERE order_id=o.id)<>1 OR (SELECT coalesce(sum(amount),0) FROM public.gift_card_redemptions WHERE order_id=o.id)<>old_gift) THEN RAISE EXCEPTION 'The original gift-card debit needs review before editing'; END IF;
 -- New quotes separate coupon and manual amounts. Old tabs must reload before
 -- touching an order that already has a dedicated manual discount.
 has_manual:=p_quote ? 'manualDiscount' AND p_quote ? 'manualDiscountRequested' AND p_quote ? 'manualDiscountReason';
 IF NOT has_manual AND (o.manual_discount_requested>0 OR o.manual_discount_amount>0) THEN
   RAISE EXCEPTION 'Reload the order editor to preserve its manual discount';
 END IF;
 manual_new:=CASE WHEN has_manual THEN (p_quote->>'manualDiscount')::numeric ELSE 0 END;
 manual_requested:=CASE WHEN has_manual THEN (p_quote->>'manualDiscountRequested')::numeric ELSE 0 END;
 manual_reason:=CASE WHEN has_manual THEN trim(p_quote->>'manualDiscountReason') ELSE '' END;
 IF manual_requested IS NULL OR manual_new IS NULL OR manual_reason IS NULL OR
    manual_requested NOT BETWEEN 0 AND 100000000 OR manual_requested<>round(manual_requested,2) OR
    manual_new<>least(manual_requested,greatest(0,round(item_total-(p_quote->>'promoDiscount')::numeric-(p_quote->>'bxgyDiscount')::numeric,2))) OR
    ((manual_requested>0 OR o.manual_discount_requested>0 OR
      (has_manual AND nullif(o.promo_code,'') IS NULL AND coalesce(o.promo_discount_amount,0)>0)) AND length(manual_reason) NOT BETWEEN 3 AND 1000) OR
    length(manual_reason)>1000 THEN RAISE EXCEPTION 'Invalid manual discount amount or reason'; END IF;
 total_new:=round(item_total-discount_total+(p_quote->>'shippingPrice')::numeric+coalesce(o.additional_charges,0)-gift_new-coins_new,2);
 IF total_new<0 OR total_new<>(p_quote->>'total')::numeric OR gift_new NOT BETWEEN 0 AND old_gift OR coins_new NOT BETWEEN 0 AND old_coins OR
 discount_total<>(p_quote->>'promoDiscount')::numeric+(p_quote->>'bxgyDiscount')::numeric+manual_new THEN RAISE EXCEPTION 'The reviewed totals are inconsistent'; END IF;
 before_state:=(public.get_order_edit_context(o.id)->'order')||jsonb_build_object(
   'gift_card_redemptions',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public.gift_card_redemptions r WHERE r.order_id=o.id),'[]'),
   'coin_spends',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public.loyalty_transactions r WHERE r.reference_id=o.id AND r.reference_type='order' AND r.type='spend' AND r.status='available'),'[]'));
 -- Lock and change only net inventory deltas, in a stable order shared with checkout.
 FOR entry IN
   SELECT source,id,sum(old_quantity)::integer AS old_quantity,sum(new_quantity)::integer AS new_quantity FROM (
     SELECT CASE WHEN gift_product_id IS NOT NULL THEN 'gift_products' ELSE 'variant' END AS source,coalesce(gift_product_id,product_variant_id) AS id,quantity AS old_quantity,0 AS new_quantity FROM public.order_items WHERE order_id=o.id
     UNION ALL SELECT CASE WHEN i->>'gift_product_id' IS NOT NULL THEN 'gift_products' ELSE 'variant' END,coalesce(i->>'gift_product_id',i->>'product_variant_id')::uuid,0,(i->>'quantity')::integer FROM jsonb_array_elements(p_quote->'lines') i
   ) d GROUP BY source,id ORDER BY source,id
 LOOP
   IF entry.id IS NULL THEN RAISE EXCEPTION 'This older order has an item without an inventory variant. Review it before editing'; END IF;
   old_qty:=entry.old_quantity; new_qty:=entry.new_quantity;
   IF entry.source='variant' THEN
     SELECT stock INTO stock_now FROM public.product_variants WHERE id=entry.id FOR UPDATE;
     IF NOT FOUND OR stock_now+old_qty<new_qty THEN RAISE EXCEPTION 'A selected shade no longer has sufficient stock'; END IF;
     UPDATE public.product_variants SET stock=stock+old_qty-new_qty WHERE id=entry.id;
   ELSE
     SELECT stock INTO stock_now FROM public.gift_products WHERE id=entry.id FOR UPDATE;
     IF NOT FOUND OR stock_now+old_qty<new_qty THEN RAISE EXCEPTION 'The selected free gift is no longer in stock'; END IF;
     UPDATE public.gift_products SET stock=stock+old_qty-new_qty WHERE id=entry.id;
   END IF;
 END LOOP;
 IF public.order_edit_catalog_revision(p_variants) IS DISTINCT FROM p_catalog_revision OR (p_quote->>'validUntil')::numeric/1000<=extract(epoch FROM clock_timestamp()) THEN RAISE EXCEPTION 'Prices or offers changed or the review expired. Review the updated total again'; END IF;
 -- Credits already redeemed can be retained or returned; an edit never silently
 -- spends more of the customer's balance. Cancellation sees only retained debits.
 IF coins_new<old_coins THEN
   SELECT balance INTO points_now FROM public.loyalty_points WHERE user_id=o.user_id FOR UPDATE;
   SELECT coalesce(sum(amount),0) INTO coin_spent FROM public.loyalty_transactions WHERE user_id=o.user_id AND reference_id=o.id AND reference_type='order' AND type='spend' AND status='available';
   IF points_now IS NULL OR coin_spent<>old_coins THEN RAISE EXCEPTION 'The original M Coin debit needs review before editing'; END IF;
   UPDATE public.loyalty_transactions SET status='cancelled',note='Replaced by reviewed order amendment' WHERE user_id=o.user_id AND reference_id=o.id AND reference_type='order' AND type='spend' AND status='available';
   UPDATE public.loyalty_points SET balance=balance+old_coins WHERE user_id=o.user_id;
   IF coins_new>0 THEN INSERT INTO public.loyalty_transactions(user_id,type,amount,reference_type,reference_id,status,note) VALUES(o.user_id,'spend',coins_new,'order',o.id,'available','M Coins retained after order amendment'); END IF;
 END IF;
 IF gift_new<old_gift THEN
   IF (SELECT count(*) FROM public.gift_card_redemptions WHERE order_id=o.id)<>1 THEN RAISE EXCEPTION 'The original gift-card debits need review before editing'; END IF;
   SELECT r.id,r.amount,r.gift_card_id INTO gc FROM public.gift_card_redemptions r WHERE r.order_id=o.id FOR UPDATE;
   IF gc.amount<>old_gift THEN RAISE EXCEPTION 'The gift-card debit does not match this order'; END IF;
   PERFORM 1 FROM public.gift_cards WHERE id=gc.gift_card_id FOR UPDATE;
   UPDATE public.gift_cards SET remaining_balance=remaining_balance+old_gift-gift_new,status=CASE WHEN status='redeemed' THEN 'active' ELSE status END,updated_at=now() WHERE id=gc.gift_card_id AND remaining_balance+old_gift-gift_new<=original_balance;
   IF NOT FOUND THEN RAISE EXCEPTION 'Gift-card credit could not be returned safely'; END IF;
   IF gift_new=0 THEN DELETE FROM public.gift_card_redemptions WHERE id=gc.id;
   ELSE UPDATE public.gift_card_redemptions SET amount=gift_new WHERE id=gc.id; END IF;
 END IF;
 FOR line IN SELECT value FROM jsonb_array_elements(p_quote->'lines') LOOP
   new_id:=coalesce((line->>'source_item_id')::uuid,gen_random_uuid());
   ids:=array_append(ids,new_id);
   INSERT INTO public.order_items(id,order_id,product_id,product_variant_id,gift_product_id,product_name,variant_title,quantity,unit_price,mrp,is_gift,line_discount_amount,promotion_allocations)
   VALUES(new_id,o.id,(line->>'product_id')::uuid,(line->>'product_variant_id')::uuid,(line->>'gift_product_id')::uuid,line->>'product_name',line->>'variant_title',(line->>'quantity')::integer,(line->>'unit_price')::numeric,(line->>'mrp')::numeric,(line->>'is_gift')::boolean,(line->>'line_discount_amount')::numeric,line->'promotion_allocations')
   ON CONFLICT(id) DO UPDATE SET quantity=EXCLUDED.quantity,unit_price=EXCLUDED.unit_price,mrp=EXCLUDED.mrp,product_name=EXCLUDED.product_name,variant_title=EXCLUDED.variant_title,line_discount_amount=EXCLUDED.line_discount_amount,promotion_allocations=EXCLUDED.promotion_allocations;
   IF NOT (line->>'is_gift')::boolean THEN base_map:=base_map||jsonb_build_object(new_id::text,p_quote->'priceContext'->'bases'->idx::text); END IF;
   idx:=idx+1;
 END LOOP;
 -- Removed rows live permanently in the immutable before_state audit snapshot.
 DELETE FROM public.order_items WHERE order_id=o.id AND NOT(id=ANY(ids));
 cash_paid:=coalesce(o.edit_paid_amount,CASE WHEN o.payment_status='paid' THEN o.total ELSE 0 END);
 UPDATE public.orders SET manual_discount_amount=manual_new,manual_discount_requested=manual_requested,manual_discount_reason=nullif(manual_reason,''),
 total=total_new,promo_discount_amount=(p_quote->>'promoDiscount')::numeric,bxgy_discount_amount=(p_quote->>'bxgyDiscount')::numeric,
 shipping_price=(p_quote->>'shippingPrice')::numeric,gift_card_discount=gift_new,coin_discount_amount=coins_new,
 edit_version=edit_version+1,edit_paid_amount=cash_paid,edit_balance_due=greatest(0,total_new-cash_paid),edit_refund_due=greatest(0,cash_paid-total_new),
 payment_status=CASE WHEN cash_paid>=total_new THEN 'paid' ELSE 'unpaid' END,
 offer_snapshot=coalesce(offer_snapshot,'{}')||jsonb_build_object('edit_context',jsonb_set(p_quote->'priceContext','{bases}',base_map),'last_edit_pricing_mode',p_quote->>'pricingMode'),updated_at=now() WHERE id=o.id;
 -- Rebase pending earnings; no available coins are awarded by an edit.
 UPDATE public.loyalty_transactions SET status='cancelled',note='Recalculated after order amendment' WHERE reference_id=o.id AND reference_type='order' AND type='earn' AND status='pending';
 IF floor(total_new/100)>0 AND o.user_id IS NOT NULL THEN
   INSERT INTO public.loyalty_points(user_id) VALUES(o.user_id) ON CONFLICT(user_id) DO NOTHING;
   INSERT INTO public.loyalty_transactions(user_id,type,amount,reference_type,reference_id,status,note) VALUES(o.user_id,'earn',floor(total_new/100)::integer,'order',o.id,'pending','M Coins pending amended order fulfillment');
 END IF;
 -- Existing claim ledgers remain historical. Only newly acquired campaigns consume
 -- another claim, and own claims are never counted twice by repricing.
 FOR entry IN SELECT value->>'kind' AS kind,(value->>'id')::uuid AS id FROM jsonb_array_elements(p_quote->'promotions') ORDER BY 1,2 LOOP
   IF NOT EXISTS(SELECT 1 FROM public.checkout_promotion_uses WHERE order_id=o.id AND kind=entry.kind AND promotion_id=entry.id) THEN
     IF entry.kind='bxgy' THEN UPDATE public.buy_x_get_y SET used_count=used_count+1 WHERE id=entry.id AND is_active AND (starts_at IS NULL OR starts_at<=now()) AND (expires_at IS NULL OR expires_at>now()) AND (usage_limit IS NULL OR used_count<usage_limit);
     ELSE UPDATE public.free_gifts SET used_count=used_count+1 WHERE id=entry.id AND is_active AND (starts_at IS NULL OR starts_at<=now()) AND (expires_at IS NULL OR expires_at>now()) AND (usage_limit IS NULL OR used_count<usage_limit); END IF;
     IF NOT FOUND THEN RAISE EXCEPTION 'A new promotion is no longer available'; END IF;
     INSERT INTO public.checkout_promotion_uses(order_id,user_id,kind,promotion_id) VALUES(o.id,o.user_id,entry.kind,entry.id);
   END IF;
 END LOOP;
 after_state:=(public.get_order_edit_context(o.id)->'order')||jsonb_build_object(
   'gift_card_redemptions',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public.gift_card_redemptions r WHERE r.order_id=o.id),'[]'),
   'coin_spends',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public.loyalty_transactions r WHERE r.reference_id=o.id AND r.reference_type='order' AND r.type='spend' AND r.status='available'),'[]'));
 INSERT INTO public.order_amendments(order_id,request_key,request_hash,actor_id,reason,before_state,after_state) VALUES(o.id,p_key,p_hash,p_actor,trim(p_reason),before_state,after_state);
 RETURN jsonb_build_object('order_id',o.id,'replayed',false);
END $$;

REVOKE ALL ON FUNCTION public.commit_order_amendment(uuid,uuid,text,uuid,text,text,uuid[],text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.commit_order_amendment(uuid,uuid,text,uuid,text,text,uuid[],text,jsonb) TO service_role;

-- Reporting can be installed independently. Preserve its existing permissions.
DO $migration$ BEGIN
 IF to_regprocedure('public.admin_dashboard_order_detail(uuid)') IS NOT NULL THEN
 EXECUTE $definition$
CREATE OR REPLACE FUNCTION public.admin_dashboard_order_detail(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT to_jsonb(f)||jsonb_build_object(
   'customer_name',coalesce(nullif(p.full_name,''),nullif(o.shipping_address->>'full_name',''),'Guest'),
   'payment_method',o.payment_method,'shipping_price',coalesce(o.shipping_price,0),'shipping_label',o.shipping_label,
   'manual_discount_amount',o.manual_discount_amount,'manual_discount_requested',o.manual_discount_requested,
   'manual_discount_reason',o.manual_discount_reason,
   'promo_discount_amount',coalesce(o.promo_discount_amount,0),'bxgy_discount_amount',coalesce(o.bxgy_discount_amount,0),
   'gift_card_discount',coalesce(o.gift_card_discount,0),'coin_discount_amount',coalesce(o.coin_discount_amount,0),
   'additional_charges',coalesce(o.additional_charges,0),'additional_charges_label',o.additional_charges_label,
   'edit_version',coalesce(o.edit_version,0),
   'items',coalesce((SELECT jsonb_agg(jsonb_build_object(
     'id',i.id,'product_name',i.product_name,'variant_title',i.variant_title,'quantity',i.quantity,
     'unit_price',i.unit_price,'is_gift',coalesce(i.is_gift,false),'line_discount_amount',i.line_discount_amount,
     'refunded_quantity',coalesce(i.refunded_quantity,0)) ORDER BY i.id) FROM public.order_items i WHERE i.order_id=o.id),'[]'::jsonb)
 ) FROM public.orders o JOIN public.admin_dashboard_order_facts(p_id) f ON f.id=o.id
 LEFT JOIN public.profiles p ON p.id=o.user_id WHERE o.id=p_id;
$$;

$definition$;
 END IF;
END $migration$;
COMMIT;
