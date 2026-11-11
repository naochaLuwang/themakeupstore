-- Apply AFTER the 20261030 financial, 20261031 promotion and 20261102 BXGY migrations.
-- No historical orders, stock or balances are rewritten. Service-only amendment RPCs.
BEGIN;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS edit_version integer NOT NULL DEFAULT 0 CHECK(edit_version>=0);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS edit_paid_amount numeric CHECK(edit_paid_amount>=0);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS edit_balance_due numeric NOT NULL DEFAULT 0 CHECK(edit_balance_due>=0);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS edit_refund_due numeric NOT NULL DEFAULT 0 CHECK(edit_refund_due>=0);

CREATE TABLE IF NOT EXISTS public.order_amendments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders(id),
 request_key uuid NOT NULL UNIQUE, request_hash text NOT NULL, actor_id uuid NOT NULL REFERENCES public.profiles(id),
 reason text NOT NULL CHECK(length(reason) BETWEEN 3 AND 1000), kind text NOT NULL DEFAULT 'edit' CHECK(kind IN ('edit','reopen','cancel')),
 before_state jsonb NOT NULL, after_state jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_amendments_order_idx ON public.order_amendments(order_id,created_at);
CREATE TABLE IF NOT EXISTS public.order_edit_settlements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders(id),
 request_key uuid NOT NULL UNIQUE, kind text NOT NULL CHECK(kind IN ('payment','refund')),
 method text NOT NULL CHECK(method IN ('cash','upi','bank','razorpay')), amount numeric NOT NULL CHECK(amount>0 AND amount=round(amount,2)),
 status text NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','complete')),
 reference text, actor_id uuid NOT NULL REFERENCES public.profiles(id), reason text NOT NULL CHECK(length(reason) BETWEEN 3 AND 1000),
 created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS order_edit_one_pending_settlement ON public.order_edit_settlements(order_id) WHERE status='reserved';
CREATE UNIQUE INDEX IF NOT EXISTS order_edit_receipt_unique ON public.order_edit_settlements(method,reference) WHERE reference IS NOT NULL;
ALTER TABLE public.order_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_edit_settlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_amendments,public.order_edit_settlements FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.order_amendments,public.order_edit_settlements TO service_role;

CREATE OR REPLACE FUNCTION public.order_edit_revision(p_order_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT md5(jsonb_build_object('order',to_jsonb(o),'items',coalesce((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.id) FROM public.order_items i WHERE i.order_id=o.id),'[]'))::text)
 FROM public.orders o WHERE o.id=p_order_id
$$;
CREATE OR REPLACE FUNCTION public.get_order_edit_context(p_order_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('order',to_jsonb(o)||jsonb_build_object('order_items',coalesce((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.id) FROM public.order_items i WHERE i.order_id=o.id),'[]')),
 'revision',public.order_edit_revision(o.id),
 'history',coalesce((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC,a.id) FROM public.order_amendments a WHERE a.order_id=o.id),'[]'),
 'settlements',coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.created_at DESC,s.id) FROM public.order_edit_settlements s WHERE s.order_id=o.id),'[]'),
 'hasRefunds',EXISTS(SELECT 1 FROM public.order_refunds r WHERE r.order_id=o.id) OR EXISTS(SELECT 1 FROM public.promotion_refund_requests r WHERE r.order_id=o.id AND r.status='reserved'))
 FROM public.orders o WHERE o.id=p_order_id
$$;

-- A catalog change between calculation and commit invalidates the review. Inventory
-- is excluded here and checked under row locks using the actual net stock delta.
CREATE OR REPLACE FUNCTION public.order_edit_catalog_revision(p_variants uuid[]) RETURNS text
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT md5(jsonb_build_object(
 'variants',(SELECT jsonb_agg(to_jsonb(v)-'stock'-'updated_at' ORDER BY v.id) FROM public.product_variants v WHERE v.id=ANY(p_variants) OR v.product_id IN (SELECT gift_product_id FROM public.free_gifts)),
 'products',(SELECT jsonb_agg(to_jsonb(p)-'updated_at' ORDER BY p.id) FROM public.products p WHERE p.id IN (SELECT product_id FROM public.product_variants WHERE id=ANY(p_variants)) OR p.id IN (SELECT gift_product_id FROM public.free_gifts)),
 'categories',(SELECT jsonb_agg(to_jsonb(c) ORDER BY c.product_id,c.category_id) FROM public.product_categories c WHERE c.product_id IN (SELECT product_id FROM public.product_variants WHERE id=ANY(p_variants))),
 'bxgy',(SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public.buy_x_get_y r),
 'bxgy_products',(SELECT jsonb_agg(to_jsonb(r) ORDER BY r.bxgy_id,r.product_id) FROM public.bxgy_buy_products r),
 'bxgy_categories',(SELECT jsonb_agg(to_jsonb(r) ORDER BY r.bxgy_id,r.category_id) FROM public.bxgy_buy_categories r),
 'bxgy_brands',(SELECT jsonb_agg(to_jsonb(r) ORDER BY r.bxgy_id,r.brand) FROM public.bxgy_buy_brands r),
 'gifts',(SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public.free_gifts r),
 'gift_products',(SELECT jsonb_agg(to_jsonb(r) ORDER BY r.free_gift_id,r.product_id) FROM public.free_gift_products r),
 'gift_categories',(SELECT jsonb_agg(to_jsonb(r) ORDER BY r.free_gift_id,r.category_id) FROM public.free_gift_categories r),
 'gift_brands',(SELECT jsonb_agg(to_jsonb(r) ORDER BY r.free_gift_id,r.brand) FROM public.free_gift_brands r),
 'gift_catalog',(SELECT jsonb_agg(to_jsonb(r)-'stock'-'updated_at' ORDER BY r.id) FROM public.gift_products r),
 'flash',(SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public.flash_sales r),
 'coupons',(SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public.promo_codes r),
 'coupon_products',(SELECT jsonb_agg(to_jsonb(r) ORDER BY r.promo_id,r.product_id) FROM public.promo_code_products r),
 'coupon_categories',(SELECT jsonb_agg(to_jsonb(r) ORDER BY r.promo_id,r.category_id) FROM public.promo_code_categories r),
 'shipping',(SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public.shipping_methods r),
 'zones',(SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public.shipping_zones r),
 'wholesale',(SELECT jsonb_agg(to_jsonb(r) ORDER BY r.category_id) FROM public.category_wholesale_rules r)
 )::text)
$$;

CREATE OR REPLACE FUNCTION public.commit_order_amendment(
 p_order_id uuid,p_key uuid,p_hash text,p_actor uuid,p_reason text,p_revision text,
 p_variants uuid[],p_catalog_revision text,p_quote jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE o public.orders%ROWTYPE; prior public.order_amendments%ROWTYPE; before_state jsonb; after_state jsonb;
 line jsonb; entry record; old_qty integer; new_qty integer; stock_now integer; new_id uuid; idx integer:=0;
 item_total numeric; discount_total numeric; total_new numeric; gift_new numeric; coins_new integer; cash_paid numeric;
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
 total_new:=round(item_total-discount_total+(p_quote->>'shippingPrice')::numeric+coalesce(o.additional_charges,0)-gift_new-coins_new,2);
 IF total_new<0 OR total_new<>(p_quote->>'total')::numeric OR gift_new NOT BETWEEN 0 AND old_gift OR coins_new NOT BETWEEN 0 AND old_coins OR
 discount_total<>(p_quote->>'promoDiscount')::numeric+(p_quote->>'bxgyDiscount')::numeric THEN RAISE EXCEPTION 'The reviewed totals are inconsistent'; END IF;
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
 UPDATE public.orders SET total=total_new,promo_discount_amount=(p_quote->>'promoDiscount')::numeric,bxgy_discount_amount=(p_quote->>'bxgyDiscount')::numeric,
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

CREATE OR REPLACE FUNCTION public.reopen_order_packing(p_order_id uuid,p_revision text,p_actor uuid,p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE o public.orders%ROWTYPE; before_state jsonb;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND OR o.status<>'packed' OR o.cancellation_started_at IS NOT NULL OR public.order_edit_revision(o.id) IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'Packing can no longer be reopened. Reload the order'; END IF;
 IF length(trim(p_reason)) NOT BETWEEN 3 AND 1000 OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND (is_admin OR user_type='admin')) THEN RAISE EXCEPTION 'An administrator and reason are required'; END IF;
 before_state:=public.get_order_edit_context(o.id)->'order';
 UPDATE public.orders SET status='confirmed',updated_at=now() WHERE id=o.id;
 INSERT INTO public.order_amendments(order_id,request_key,request_hash,actor_id,reason,kind,before_state,after_state) VALUES(o.id,gen_random_uuid(),md5(p_revision),p_actor,trim(p_reason),'reopen',before_state,public.get_order_edit_context(o.id)->'order');
END $$;

CREATE OR REPLACE FUNCTION public.reserve_order_edit_settlement(p_order_id uuid,p_key uuid,p_actor uuid,p_kind text,p_method text,p_amount numeric,p_reason text,p_reference text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE o public.orders%ROWTYPE; r public.order_edit_settlements%ROWTYPE; due numeric;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND OR o.edit_version=0 THEN RAISE EXCEPTION 'This order has no amendment balance'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND (is_admin OR user_type='admin')) AND
 NOT coalesce(o.user_id=p_actor AND o.status='cancelled' AND p_kind='refund' AND p_method='razorpay',false) THEN RAISE EXCEPTION 'An administrator is required'; END IF;
 SELECT * INTO r FROM public.order_edit_settlements WHERE request_key=p_key;
 IF FOUND THEN
   IF r.order_id<>o.id OR r.kind<>p_kind OR r.method<>p_method OR r.amount<>p_amount OR r.reason<>p_reason OR (r.method<>'razorpay' AND r.reference IS DISTINCT FROM nullif(trim(p_reference),'')) THEN RAISE EXCEPTION 'This receipt key was already used for different details'; END IF;
   RETURN to_jsonb(r)||jsonb_build_object('payment_id',o.razorpay_payment_id);
 END IF;
 IF EXISTS(SELECT 1 FROM public.order_edit_settlements WHERE order_id=o.id AND status='reserved') OR EXISTS(SELECT 1 FROM public.promotion_refund_requests WHERE order_id=o.id AND status='reserved') THEN RAISE EXCEPTION 'Finish the pending payment or refund first'; END IF;
 due:=CASE WHEN p_kind='payment' THEN o.edit_balance_due ELSE o.edit_refund_due END;
 IF p_kind NOT IN ('payment','refund') OR p_method NOT IN ('cash','upi','bank','razorpay') OR p_amount<=0 OR p_amount<>round(p_amount,2) OR p_amount>due OR length(trim(p_reason)) NOT BETWEEN 3 AND 1000 THEN RAISE EXCEPTION 'Invalid settlement amount or reason'; END IF;
 IF p_kind='payment' AND (p_method='razorpay' OR o.status='cancelled' OR o.cancellation_started_at IS NOT NULL) THEN RAISE EXCEPTION 'Record an actual cash, UPI or bank receipt for additional payments'; END IF;
 IF p_method='razorpay' AND o.razorpay_payment_id IS NULL THEN RAISE EXCEPTION 'No original Razorpay payment is attached'; END IF;
 IF p_method<>'razorpay' AND length(coalesce(trim(p_reference),'')) NOT BETWEEN 3 AND 200 THEN RAISE EXCEPTION 'Enter the transaction or cash receipt reference'; END IF;
 INSERT INTO public.order_edit_settlements(order_id,request_key,actor_id,kind,method,amount,reason,reference) VALUES(o.id,p_key,p_actor,p_kind,p_method,p_amount,trim(p_reason),CASE WHEN p_method='razorpay' THEN NULL ELSE trim(p_reference) END) RETURNING * INTO r;
 RETURN to_jsonb(r)||jsonb_build_object('payment_id',o.razorpay_payment_id);
END $$;
CREATE OR REPLACE FUNCTION public.finish_order_edit_settlement(p_id uuid,p_reference text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE r public.order_edit_settlements%ROWTYPE; o public.orders%ROWTYPE; next_cash numeric; liability numeric; refunded numeric;
BEGIN
 SELECT * INTO r FROM public.order_edit_settlements WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Settlement not found'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=r.order_id FOR UPDATE;
 SELECT * INTO r FROM public.order_edit_settlements WHERE id=p_id FOR UPDATE;
 IF r.status='complete' THEN RETURN; END IF;
 IF length(coalesce(trim(p_reference),'')) NOT BETWEEN 3 AND 200 OR (r.method<>'razorpay' AND r.reference IS DISTINCT FROM trim(p_reference)) THEN RAISE EXCEPTION 'A matching receipt or refund confirmation is required'; END IF;
 IF r.amount>(CASE WHEN r.kind='payment' THEN o.edit_balance_due ELSE o.edit_refund_due END) THEN RAISE EXCEPTION 'The outstanding balance changed'; END IF;
 next_cash:=o.edit_paid_amount+CASE WHEN r.kind='payment' THEN r.amount ELSE -r.amount END;
 SELECT coalesce(sum(amount),0) INTO refunded FROM public.order_refunds WHERE order_id=o.id;
 liability:=CASE WHEN o.status='cancelled' THEN 0 ELSE greatest(0,o.total-refunded) END;
 UPDATE public.orders SET edit_paid_amount=next_cash,edit_balance_due=greatest(0,liability-next_cash),edit_refund_due=greatest(0,next_cash-liability),
 payment_status=CASE WHEN o.status='cancelled' AND next_cash=0 THEN 'refunded' WHEN next_cash<liability THEN 'unpaid' WHEN refunded>0 THEN 'partially_refunded' ELSE 'paid' END,updated_at=now() WHERE id=o.id;
 UPDATE public.order_edit_settlements SET status='complete',reference=trim(p_reference),completed_at=now() WHERE id=r.id;
END $$;

-- Amended cancellation preserves payment receipts and returns only the currently
-- retained credits. Cash refunds remain an explicit, retryable settlement balance.
CREATE OR REPLACE FUNCTION public.cancel_amended_order(p_order_id uuid,p_actor uuid,p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE o public.orders%ROWTYPE; before_state jsonb; admin_actor boolean;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 SELECT coalesce(is_admin,false) OR user_type='admin' INTO admin_actor FROM public.profiles WHERE id=p_actor;
 IF NOT FOUND OR o.id IS NULL OR (o.user_id IS DISTINCT FROM p_actor AND NOT coalesce(admin_actor,false)) THEN RAISE EXCEPTION 'Not authorized to cancel this order'; END IF;
 IF o.edit_version=0 THEN RAISE EXCEPTION 'Use the original cancellation flow'; END IF;
 IF o.status='cancelled' THEN RETURN; END IF;
 IF o.status IN ('shipped','out_for_delivery','delivered','picked_up','dispatched') THEN RAISE EXCEPTION 'Order cannot be cancelled after dispatch or fulfillment'; END IF;
 IF EXISTS(SELECT 1 FROM public.order_edit_settlements WHERE order_id=o.id AND status='reserved') THEN RAISE EXCEPTION 'Finish the pending payment or refund before cancelling'; END IF;
 before_state:=public.get_order_edit_context(o.id)->'order';
 UPDATE public.orders SET status='cancelled',cancellation_started_at=now(),cancelled_by=CASE WHEN admin_actor THEN 'admin' ELSE 'user' END,cancellation_reason=p_reason,
 edit_balance_due=0,edit_refund_due=edit_paid_amount,payment_status=CASE WHEN edit_paid_amount=0 THEN 'refunded' ELSE 'partially_refunded' END,updated_at=now() WHERE id=o.id;
 PERFORM public.reconcile_cancelled_order(o.id);
 INSERT INTO public.order_amendments(order_id,request_key,request_hash,actor_id,reason,kind,before_state,after_state) VALUES(o.id,gen_random_uuid(),md5(o.id::text),p_actor,left(coalesce(nullif(trim(p_reason),''),'Order cancelled'),1000),'cancel',before_state,public.get_order_edit_context(o.id)->'order');
END $$;

-- Protect the legacy item-refund path against pending amendment balances and keep
-- net cash correct when a later return is completed. Existing refund RPCs remain.
CREATE OR REPLACE FUNCTION public.guard_amended_refund() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE o public.orders%ROWTYPE; gateway_available numeric;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=NEW.order_id FOR UPDATE;
 IF o.edit_version>0 THEN
   IF o.edit_balance_due>0 OR o.edit_refund_due>0 OR EXISTS(SELECT 1 FROM public.order_edit_settlements WHERE order_id=o.id AND status='reserved') THEN RAISE EXCEPTION 'Settle the order amendment balance before starting an item refund'; END IF;
   IF NEW.amount>o.edit_paid_amount THEN RAISE EXCEPTION 'Refund exceeds the remaining cash paid'; END IF;
   IF NEW.method='razorpay' AND NEW.amount>0 THEN
     SELECT CASE WHEN before_state->>'payment_status'='paid' AND before_state->>'payment_method'='razorpay' THEN (before_state->>'total')::numeric ELSE 0 END
     INTO gateway_available FROM public.order_amendments WHERE order_id=o.id AND kind='edit' ORDER BY created_at,id LIMIT 1;
     gateway_available:=coalesce(gateway_available,0)
       -coalesce((SELECT sum(amount) FROM public.order_edit_settlements WHERE order_id=o.id AND method='razorpay' AND kind='refund' AND status='complete'),0)
       -coalesce((SELECT sum(amount) FROM public.order_refunds WHERE order_id=o.id AND refund_method='razorpay'),0);
     IF o.razorpay_payment_id IS NULL OR NEW.amount>gateway_available THEN RAISE EXCEPTION 'The original Razorpay payment cannot cover this item refund. Record a manual refund for the additional cash or UPI receipt instead'; END IF;
   END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_amended_refund ON public.promotion_refund_requests;
CREATE TRIGGER guard_amended_refund BEFORE INSERT ON public.promotion_refund_requests FOR EACH ROW EXECUTE FUNCTION public.guard_amended_refund();
CREATE OR REPLACE FUNCTION public.reconcile_amended_item_refund() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 UPDATE public.orders SET edit_paid_amount=edit_paid_amount-NEW.amount WHERE id=NEW.order_id AND edit_version>0;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS reconcile_amended_item_refund ON public.order_refunds;
CREATE TRIGGER reconcile_amended_item_refund AFTER INSERT ON public.order_refunds FOR EACH ROW EXECUTE FUNCTION public.reconcile_amended_item_refund();
CREATE OR REPLACE FUNCTION public.guard_amended_fulfillment() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF OLD.edit_version>0 AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('shipped','out_for_delivery','ready_for_pickup','delivered','picked_up') AND
 (OLD.edit_refund_due>0 OR (OLD.edit_balance_due>0 AND (OLD.payment_method='razorpay' OR NEW.status IN ('delivered','picked_up')))) THEN RAISE EXCEPTION 'Settle the amendment payment or refund before proceeding'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_amended_fulfillment ON public.orders;
CREATE TRIGGER guard_amended_fulfillment BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.guard_amended_fulfillment();

REVOKE ALL ON FUNCTION public.order_edit_revision(uuid),public.get_order_edit_context(uuid),public.order_edit_catalog_revision(uuid[]),public.commit_order_amendment(uuid,uuid,text,uuid,text,text,uuid[],text,jsonb),public.reopen_order_packing(uuid,text,uuid,text),public.reserve_order_edit_settlement(uuid,uuid,uuid,text,text,numeric,text,text),public.finish_order_edit_settlement(uuid,text),public.cancel_amended_order(uuid,uuid,text),public.guard_amended_refund(),public.reconcile_amended_item_refund(),public.guard_amended_fulfillment() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.order_edit_revision(uuid),public.get_order_edit_context(uuid),public.order_edit_catalog_revision(uuid[]),public.commit_order_amendment(uuid,uuid,text,uuid,text,text,uuid[],text,jsonb),public.reopen_order_packing(uuid,text,uuid,text),public.reserve_order_edit_settlement(uuid,uuid,uuid,text,text,numeric,text,text),public.finish_order_edit_settlement(uuid,text),public.cancel_amended_order(uuid,uuid,text) TO service_role;
COMMIT;
