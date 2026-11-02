-- Requires 20261030072928_financial_checkout_security.sql and existing refund schema.
BEGIN;
-- Permit only the trusted service role or database table owner to mutate financial rows.
CREATE OR REPLACE FUNCTION public.protect_checkout_finances() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF current_user NOT IN ('postgres','service_role') AND current_user<>pg_catalog.pg_get_userbyid((SELECT relowner FROM pg_catalog.pg_class WHERE oid=TG_RELID)) THEN RAISE EXCEPTION 'Checkout writes require an authorized server operation'; END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.cancellation_started_at IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status<>'cancelled' THEN RAISE EXCEPTION 'Cancellation is in progress'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.protect_checkout_items() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF current_user NOT IN ('postgres','service_role') AND current_user<>pg_catalog.pg_get_userbyid((SELECT relowner FROM pg_catalog.pg_class WHERE oid=TG_RELID)) THEN RAISE EXCEPTION 'Checkout items require an authorized server operation'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
ALTER TABLE public.order_items ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS gift_product_id uuid REFERENCES public.gift_products(id);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS line_discount_amount numeric;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS promotion_allocations jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS stock_restored_quantity integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS offer_snapshot jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reconciled_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_started_at timestamptz;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='order_item_inventory_source' AND conrelid='public.order_items'::regclass) THEN
 ALTER TABLE public.order_items ADD CONSTRAINT order_item_inventory_source CHECK (
   (product_id IS NOT NULL AND gift_product_id IS NULL) OR
   (product_id IS NULL AND gift_product_id IS NOT NULL AND coalesce(is_gift,false) AND product_variant_id IS NULL));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='order_item_discount_valid' AND conrelid='public.order_items'::regclass) THEN
 ALTER TABLE public.order_items ADD CONSTRAINT order_item_discount_valid CHECK(line_discount_amount IS NULL OR (line_discount_amount>=0 AND line_discount_amount<=unit_price*quantity));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='order_item_restored_valid' AND conrelid='public.order_items'::regclass) THEN
 ALTER TABLE public.order_items ADD CONSTRAINT order_item_restored_valid CHECK(stock_restored_quantity>=0 AND stock_restored_quantity<=quantity);
 END IF;
END $$;
-- Preserve known prior restorations. Historical discounted allocations are not guessed.
UPDATE public.order_items i SET stock_restored_quantity=greatest(i.stock_restored_quantity,least(i.quantity,coalesce(i.refunded_quantity,0)),
 CASE WHEN o.status='cancelled' AND o.offer_snapshot IS NULL THEN i.quantity ELSE 0 END)
 FROM public.orders o WHERE o.id=i.order_id;
UPDATE public.orders SET cancellation_reconciled_at=now() WHERE status='cancelled' AND offer_snapshot IS NULL AND cancellation_reconciled_at IS NULL;
UPDATE public.order_items i SET line_discount_amount=0 FROM public.orders o WHERE o.id=i.order_id AND i.line_discount_amount IS NULL
 AND coalesce(o.bxgy_discount_amount,0)=0 AND coalesce(o.promo_discount_amount,0)=0 AND coalesce(o.coin_discount_amount,0)=0 AND coalesce(o.gift_card_discount,0)=0;

-- Preserve per-customer usage even if an administrator deletes a cancelled order.
ALTER TABLE public.checkout_promotion_uses ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.checkout_promotion_uses DROP CONSTRAINT IF EXISTS checkout_promotion_uses_pkey;
ALTER TABLE public.checkout_promotion_uses ADD CONSTRAINT checkout_promotion_uses_pkey PRIMARY KEY(id);
ALTER TABLE public.checkout_promotion_uses ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE public.checkout_promotion_uses DROP CONSTRAINT IF EXISTS checkout_promotion_uses_order_id_fkey;
ALTER TABLE public.checkout_promotion_uses ADD CONSTRAINT checkout_promotion_uses_order_id_fkey FOREIGN KEY(order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS checkout_promotion_order_unique ON public.checkout_promotion_uses(order_id,kind,promotion_id);

-- Campaign definitions are public read-only catalog data. Authorized actions use service_role.
DO $$ DECLARE t text; p record; BEGIN
 FOREACH t IN ARRAY ARRAY['buy_x_get_y','free_gifts','gift_products','bxgy_buy_products','bxgy_buy_categories','bxgy_buy_brands','bxgy_get_products','free_gift_products','free_gift_categories','free_gift_brands'] LOOP
   FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
     EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t);
   END LOOP;
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
   EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
   EXECUTE format('GRANT SELECT ON public.%I TO anon,authenticated',t);
   EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
   EXECUTE format('CREATE POLICY promotion_catalog_read ON public.%I FOR SELECT TO anon,authenticated USING (%s)',t,
     CASE WHEN t IN ('buy_x_get_y','free_gifts','gift_products') THEN 'is_active=true' ELSE 'true' END);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.commit_secure_checkout(p_user_id uuid,p_key uuid,p_hash text,p_order jsonb,p_items jsonb,p_stock jsonb,p_promotions jsonb,p_gift_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  existing public.orders%ROWTYPE; new_id uuid; entry record; stock_now integer;
  coins integer; gift_amount numeric; gc public.gift_cards%ROWTYPE; balance_now integer;
  rule_record record; payment_id text; item_total numeric; promo_record record;
BEGIN
  IF p_user_id IS NULL OR p_key IS NULL OR p_hash IS NULL OR length(p_hash)<>64 THEN RAISE EXCEPTION 'Invalid checkout identity'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('checkout-user:'||p_user_id::text,0));
  SELECT * INTO existing FROM public.orders WHERE user_id=p_user_id AND checkout_key=p_key;
  IF FOUND THEN
    IF existing.checkout_request_hash IS DISTINCT FROM p_hash THEN RAISE EXCEPTION 'Checkout key was already used for different details'; END IF;
    RETURN jsonb_build_object('order_id',existing.id,'replayed',true);
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)<1 OR jsonb_array_length(p_items)>200 THEN RAISE EXCEPTION 'Invalid checkout items'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) i WHERE (i->>'quantity')::integer<1 OR (i->>'quantity')::integer>1000 OR (i->>'unit_price')::numeric<0) THEN RAISE EXCEPTION 'Invalid checkout quantity or price'; END IF;
  coins:=COALESCE((p_order->>'coin_discount_amount')::integer,0);
  gift_amount:=COALESCE((p_order->>'gift_card_discount')::numeric,0);
  IF coins<0 OR gift_amount<0 OR (p_order->>'total')::numeric<0 THEN RAISE EXCEPTION 'Invalid checkout amounts'; END IF;
  SELECT COALESCE(sum(round((i->>'unit_price')::numeric*(i->>'quantity')::integer,2)),0) INTO item_total FROM jsonb_array_elements(p_items) i;
  IF (p_order->>'total')::numeric <> greatest(0,round(item_total-COALESCE((p_order->>'promo_discount_amount')::numeric,0)-COALESCE((p_order->>'bxgy_discount_amount')::numeric,0)-gift_amount-coins+COALESCE((p_order->>'shipping_price')::numeric,0),2)) THEN RAISE EXCEPTION 'Checkout total is inconsistent'; END IF;

  IF jsonb_array_length(p_promotions)>0 AND nullif(p_order->>'promo_code','') IS NOT NULL THEN RAISE EXCEPTION 'Coupons cannot be combined with automatic offers'; END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(p_items) i WHERE coalesce((i->>'is_gift')::boolean,false))>1 OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) i WHERE (i->>'is_gift')::boolean AND (i->>'quantity')::integer<>1) THEN RAISE EXCEPTION 'Only one fixed gift is allowed per order'; END IF;
  IF p_order->'offer_snapshot' IS NOT NULL AND (SELECT coalesce(sum((i->>'line_discount_amount')::numeric),0) FROM jsonb_array_elements(p_items) i)<>(p_order->>'promo_discount_amount')::numeric+(p_order->>'bxgy_discount_amount')::numeric THEN RAISE EXCEPTION 'Discount allocations do not match order savings'; END IF;

  payment_id:=nullif(p_order->>'razorpay_payment_id','');
  IF p_order->>'payment_method'='razorpay' THEN
    IF payment_id IS NULL OR p_order->>'payment_status'<>'paid' THEN RAISE EXCEPTION 'Verified payment required'; END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('payment:'||payment_id,0));
    IF EXISTS(SELECT 1 FROM public.orders WHERE razorpay_payment_id=payment_id) THEN RAISE EXCEPTION 'Payment already used'; END IF;
  ELSIF p_order->>'payment_method'<>'COD' OR p_order->>'payment_status'<>'unpaid' OR payment_id IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  IF coins>0 THEN
    SELECT balance INTO balance_now FROM public.loyalty_points WHERE user_id=p_user_id FOR UPDATE;
    IF NOT FOUND OR balance_now<coins THEN RAISE EXCEPTION 'Insufficient M Coins'; END IF;
  END IF;
  IF gift_amount>0 THEN
    SELECT * INTO gc FROM public.gift_cards WHERE code=upper(p_gift_code) FOR UPDATE;
    IF NOT FOUND OR gc.status<>'active' OR gc.remaining_balance<gift_amount OR (gc.expires_at IS NOT NULL AND gc.expires_at<=now()) THEN RAISE EXCEPTION 'Gift card balance is no longer available'; END IF;
  END IF;

  FOR entry IN SELECT DISTINCT value->>'kind' AS kind,(value->>'id')::uuid AS id FROM jsonb_array_elements(p_promotions) ORDER BY 1,2 LOOP
    IF entry.kind='bxgy' THEN
      SELECT is_active,starts_at,expires_at,usage_limit,used_count,once_per_user INTO rule_record FROM public.buy_x_get_y WHERE id=entry.id FOR UPDATE;
    ELSIF entry.kind='gift' THEN
      SELECT is_active,starts_at,expires_at,usage_limit,used_count,once_per_user INTO rule_record FROM public.free_gifts WHERE id=entry.id FOR UPDATE;
    ELSE RAISE EXCEPTION 'Invalid promotion'; END IF;
    IF NOT FOUND OR NOT rule_record.is_active OR rule_record.starts_at>now() OR rule_record.expires_at<=now() OR (rule_record.usage_limit IS NOT NULL AND rule_record.used_count>=rule_record.usage_limit) THEN RAISE EXCEPTION 'Promotion is no longer available'; END IF;
    IF rule_record.once_per_user AND EXISTS(SELECT 1 FROM public.checkout_promotion_uses WHERE user_id=p_user_id AND kind=entry.kind AND promotion_id=entry.id) THEN RAISE EXCEPTION 'Promotion already claimed'; END IF;
  END LOOP;

  IF nullif(p_order->>'promo_code','') IS NOT NULL THEN
    SELECT * INTO promo_record FROM public.promo_codes WHERE code=upper(p_order->>'promo_code') FOR UPDATE;
    IF NOT FOUND OR NOT promo_record.is_active OR (promo_record.starts_at IS NOT NULL AND promo_record.starts_at>now()) OR (promo_record.expires_at IS NOT NULL AND promo_record.expires_at<=now()) OR (promo_record.usage_limit IS NOT NULL AND promo_record.used_count>=promo_record.usage_limit) THEN RAISE EXCEPTION 'Promo code is no longer available'; END IF;
    IF promo_record.once_per_user AND EXISTS(SELECT 1 FROM public.promo_redemptions WHERE promo_id=promo_record.id AND user_id=p_user_id) THEN RAISE EXCEPTION 'Promo code already used'; END IF;
  END IF;

  FOR entry IN SELECT value->>'source' AS source,(value->>'id')::uuid AS id,sum((value->>'quantity')::integer)::integer AS quantity FROM jsonb_array_elements(p_stock) GROUP BY 1,2 ORDER BY 1,2 LOOP
    IF entry.quantity<1 THEN RAISE EXCEPTION 'Invalid stock quantity'; END IF;
    IF entry.source='variant' THEN
      SELECT stock INTO stock_now FROM public.product_variants WHERE id=entry.id FOR UPDATE;
      IF NOT FOUND OR stock_now<entry.quantity THEN RAISE EXCEPTION 'Insufficient product stock'; END IF;
      UPDATE public.product_variants SET stock=stock-entry.quantity WHERE id=entry.id;
    ELSIF entry.source='gift_products' THEN
      SELECT stock INTO stock_now FROM public.gift_products WHERE id=entry.id FOR UPDATE;
      IF NOT FOUND OR stock_now<entry.quantity THEN RAISE EXCEPTION 'Insufficient gift stock'; END IF;
      UPDATE public.gift_products SET stock=stock-entry.quantity WHERE id=entry.id;
    ELSE RAISE EXCEPTION 'Invalid stock source'; END IF;
  END LOOP;

  INSERT INTO public.orders(user_id,status,order_type,payment_status,payment_method,razorpay_payment_id,total,shipping_price,shipping_label,shipping_method_id,shipping_address,promo_code,promo_discount_amount,bxgy_discount_amount,gift_card_discount,coin_discount_amount,checkout_key,checkout_request_hash,offer_snapshot)
  VALUES(p_user_id,'pending','delivery',p_order->>'payment_status',p_order->>'payment_method',payment_id,(p_order->>'total')::numeric,(p_order->>'shipping_price')::numeric,p_order->>'shipping_label',(p_order->>'shipping_method_id')::uuid,p_order->'shipping_address',nullif(p_order->>'promo_code',''),(p_order->>'promo_discount_amount')::numeric,(p_order->>'bxgy_discount_amount')::numeric,gift_amount,coins,p_key,p_hash,p_order->'offer_snapshot')
  RETURNING id INTO new_id;
  INSERT INTO public.order_items(order_id,product_id,product_variant_id,gift_product_id,product_name,variant_title,quantity,unit_price,mrp,is_gift,line_discount_amount,promotion_allocations)
  SELECT new_id,(i->>'product_id')::uuid,(i->>'product_variant_id')::uuid,(i->>'gift_product_id')::uuid,i->>'product_name',i->>'variant_title',(i->>'quantity')::integer,(i->>'unit_price')::numeric,(i->>'mrp')::numeric,(i->>'is_gift')::boolean,(i->>'line_discount_amount')::numeric,coalesce(i->'promotion_allocations','[]'::jsonb) FROM jsonb_array_elements(p_items) i;
  IF payment_id IS NOT NULL THEN INSERT INTO public.financial_payment_uses VALUES(payment_id,p_user_id,'checkout',new_id,now()); END IF;
  IF gift_amount>0 THEN INSERT INTO public.gift_card_redemptions(gift_card_id,order_id,amount) VALUES(gc.id,new_id,gift_amount); END IF;
  IF coins>0 THEN
    INSERT INTO public.loyalty_transactions(user_id,type,amount,reference_type,reference_id,status,note)
    VALUES(p_user_id,'spend',coins,'order',new_id,'available','M Coins redeemed at checkout');
  END IF;
  INSERT INTO public.loyalty_points(user_id,balance,lifetime_earned,tier) VALUES(p_user_id,0,0,'bronze') ON CONFLICT(user_id) DO NOTHING;
  IF floor((p_order->>'total')::numeric/100)>0 THEN
    INSERT INTO public.loyalty_transactions(user_id,type,amount,reference_type,reference_id,status,note)
    VALUES(p_user_id,'earn',floor((p_order->>'total')::numeric/100)::integer,'order',new_id,'pending','M Coins pending order fulfillment');
  END IF;
  FOR entry IN SELECT DISTINCT value->>'kind' AS kind,(value->>'id')::uuid AS id FROM jsonb_array_elements(p_promotions) LOOP
    INSERT INTO public.checkout_promotion_uses(order_id,user_id,kind,promotion_id) VALUES(new_id,p_user_id,entry.kind,entry.id);
    IF entry.kind='bxgy' THEN UPDATE public.buy_x_get_y SET used_count=used_count+1 WHERE id=entry.id;
    ELSE UPDATE public.free_gifts SET used_count=used_count+1 WHERE id=entry.id; END IF;
  END LOOP;
  IF nullif(p_order->>'promo_code','') IS NOT NULL THEN
    UPDATE public.promo_codes SET used_count=used_count+1 WHERE id=promo_record.id;
    INSERT INTO public.promo_redemptions(promo_id,user_id,order_id) VALUES(promo_record.id,p_user_id,new_id);
  END IF;
  RETURN jsonb_build_object('order_id',new_id,'replayed',false);
END $$;

CREATE OR REPLACE FUNCTION public.save_promotion_rule(p_kind text,p_id uuid,p_rule jsonb,p_products uuid[],p_categories uuid[],p_brands text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE rid uuid; target text; result jsonb;
BEGIN
 rid:=coalesce(p_id,gen_random_uuid());
 IF length(trim(p_rule->>'name'))<1 OR (p_rule->>'expires_at')::timestamptz<=(p_rule->>'starts_at')::timestamptz THEN RAISE EXCEPTION 'Invalid campaign name or dates'; END IF;
 IF p_kind='bxgy' THEN
   IF p_rule->>'get_type'<>'cheapest_free' OR (p_rule->>'buy_quantity')::integer<>2 OR p_rule->>'get_discount_type'<>'free' OR (p_rule->>'get_discount_value')::numeric<>100 THEN RAISE EXCEPTION 'Only repeating Buy 2 Get 1 Free is supported'; END IF;
   target:=p_rule->>'buy_type';
 ELSIF p_kind='gift' THEN
   target:=p_rule->>'trigger_type';
   IF (p_rule->>'gift_quantity')::integer<>1 OR ((p_rule->>'gift_product_id') IS NULL)=((p_rule->>'gift_product_ref_id') IS NULL) THEN RAISE EXCEPTION 'Select one fixed gift source'; END IF;
   IF nullif(p_rule->>'gift_variant_id','') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.product_variants WHERE id=(p_rule->>'gift_variant_id')::uuid AND product_id=(p_rule->>'gift_product_id')::uuid) THEN RAISE EXCEPTION 'Gift variant does not match product'; END IF;
 ELSE RAISE EXCEPTION 'Invalid campaign kind'; END IF;
 IF target NOT IN ('cart_total','specific_products','specific_categories','specific_brands') OR
    (target='specific_products' AND coalesce(cardinality(p_products),0)=0) OR
    (target='specific_categories' AND coalesce(cardinality(p_categories),0)=0) OR
    (target='specific_brands' AND coalesce(cardinality(p_brands),0)=0) THEN RAISE EXCEPTION 'Select qualifying products, categories, or brands'; END IF;
 IF p_kind='bxgy' THEN
   IF p_id IS NOT NULL THEN PERFORM 1 FROM public.buy_x_get_y WHERE id=p_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF; END IF;
   INSERT INTO public.buy_x_get_y(id,name,description,buy_type,buy_quantity,get_type,get_product_id,get_variant_id,get_discount_type,get_discount_value,apply_to,usage_limit,once_per_user,max_per_order,starts_at,expires_at,is_active)
   VALUES(rid,p_rule->>'name',p_rule->>'description',target,2,'cheapest_free',null,null,'free',100,'all',(p_rule->>'usage_limit')::integer,coalesce((p_rule->>'once_per_user')::boolean,false),null,(p_rule->>'starts_at')::timestamptz,(p_rule->>'expires_at')::timestamptz,coalesce((p_rule->>'is_active')::boolean,true))
   ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,buy_type=excluded.buy_type,buy_quantity=2,get_type='cheapest_free',get_product_id=null,get_variant_id=null,get_discount_type='free',get_discount_value=100,apply_to='all',usage_limit=excluded.usage_limit,once_per_user=excluded.once_per_user,max_per_order=null,starts_at=excluded.starts_at,expires_at=excluded.expires_at,is_active=excluded.is_active,updated_at=now();
   DELETE FROM public.bxgy_buy_products WHERE bxgy_id=rid; DELETE FROM public.bxgy_buy_categories WHERE bxgy_id=rid; DELETE FROM public.bxgy_buy_brands WHERE bxgy_id=rid; DELETE FROM public.bxgy_get_products WHERE bxgy_id=rid;
   INSERT INTO public.bxgy_buy_products SELECT rid,unnest(p_products); INSERT INTO public.bxgy_buy_categories SELECT rid,unnest(p_categories); INSERT INTO public.bxgy_buy_brands SELECT rid,unnest(p_brands);
   SELECT to_jsonb(r) INTO result FROM public.buy_x_get_y r WHERE id=rid;
 ELSE
   IF p_id IS NOT NULL THEN PERFORM 1 FROM public.free_gifts WHERE id=p_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF; END IF;
   INSERT INTO public.free_gifts(id,name,description,gift_product_id,gift_product_ref_id,gift_variant_id,gift_quantity,trigger_type,trigger_threshold,min_cart_amount,apply_to,usage_limit,once_per_user,max_per_order,starts_at,expires_at,is_active)
   VALUES(rid,p_rule->>'name',p_rule->>'description',(p_rule->>'gift_product_id')::uuid,(p_rule->>'gift_product_ref_id')::uuid,(p_rule->>'gift_variant_id')::uuid,1,target,(p_rule->>'trigger_threshold')::numeric,(p_rule->>'min_cart_amount')::numeric,'all',(p_rule->>'usage_limit')::integer,coalesce((p_rule->>'once_per_user')::boolean,false),1,(p_rule->>'starts_at')::timestamptz,(p_rule->>'expires_at')::timestamptz,coalesce((p_rule->>'is_active')::boolean,true))
   ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,gift_product_id=excluded.gift_product_id,gift_product_ref_id=excluded.gift_product_ref_id,gift_variant_id=excluded.gift_variant_id,gift_quantity=1,trigger_type=excluded.trigger_type,trigger_threshold=excluded.trigger_threshold,min_cart_amount=excluded.min_cart_amount,apply_to='all',usage_limit=excluded.usage_limit,once_per_user=excluded.once_per_user,max_per_order=1,starts_at=excluded.starts_at,expires_at=excluded.expires_at,is_active=excluded.is_active,updated_at=now();
   DELETE FROM public.free_gift_products WHERE free_gift_id=rid; DELETE FROM public.free_gift_categories WHERE free_gift_id=rid; DELETE FROM public.free_gift_brands WHERE free_gift_id=rid;
   INSERT INTO public.free_gift_products SELECT rid,unnest(p_products); INSERT INTO public.free_gift_categories SELECT rid,unnest(p_categories); INSERT INTO public.free_gift_brands SELECT rid,unnest(p_brands);
   SELECT to_jsonb(r) INTO result FROM public.free_gifts r WHERE id=rid;
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.save_promotion_rule(text,uuid,jsonb,uuid[],uuid[],text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_promotion_rule(text,uuid,jsonb,uuid[],uuid[],text[]) TO service_role;

CREATE OR REPLACE FUNCTION public.restore_order_item_inventory(p_item_id uuid,p_target_quantity integer)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE item public.order_items%ROWTYPE; delta integer;
BEGIN
 SELECT * INTO item FROM public.order_items WHERE id=p_item_id FOR UPDATE;
 IF NOT FOUND OR p_target_quantity<0 OR p_target_quantity>item.quantity THEN RAISE EXCEPTION 'Invalid inventory restoration'; END IF;
 delta:=greatest(0,p_target_quantity-item.stock_restored_quantity);
 IF delta=0 THEN RETURN 0; END IF;
 IF item.gift_product_id IS NOT NULL THEN UPDATE public.gift_products SET stock=stock+delta WHERE id=item.gift_product_id;
 ELSIF item.product_variant_id IS NOT NULL THEN UPDATE public.product_variants SET stock=stock+delta WHERE id=item.product_variant_id; END IF;
 UPDATE public.order_items SET stock_restored_quantity=p_target_quantity WHERE id=p_item_id;
 RETURN delta;
END $$;
REVOKE ALL ON FUNCTION public.restore_order_item_inventory(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.restore_order_item_inventory(uuid,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.reconcile_cancelled_order(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE o public.orders%ROWTYPE; item record; debit record; earned integer; tx_ids uuid[];
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND OR o.status<>'cancelled' THEN RAISE EXCEPTION 'Order is not cancelled'; END IF;
 IF o.cancellation_reconciled_at IS NOT NULL THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM public.promotion_refund_requests WHERE order_id=p_order_id AND status='reserved') THEN RAISE EXCEPTION 'Finish the pending item refund before cancelling'; END IF;
 PERFORM 1 FROM public.loyalty_points WHERE user_id=o.user_id FOR UPDATE;
 SELECT coalesce(sum(amount) FILTER(WHERE status='available'),0),array_agg(id) INTO earned,tx_ids FROM public.loyalty_transactions WHERE reference_id=o.id AND reference_type='order' AND type IN ('earn','bonus') AND status IN ('pending','available');
 UPDATE public.loyalty_transactions SET status='cancelled' WHERE id=ANY(tx_ids);
 UPDATE public.loyalty_points SET balance=greatest(0,balance-earned),lifetime_earned=greatest(0,lifetime_earned-earned) WHERE user_id=o.user_id;
 PERFORM public.reverse_order_coin_redemption(o.id,false);
 FOR debit IN SELECT gift_card_id,sum(amount) AS amount FROM public.gift_card_redemptions WHERE order_id=o.id GROUP BY gift_card_id LOOP
   UPDATE public.gift_cards SET remaining_balance=least(original_balance,remaining_balance+debit.amount),status=CASE WHEN status='redeemed' THEN 'active' ELSE status END,updated_at=now() WHERE id=debit.gift_card_id;
 END LOOP;
 FOR item IN SELECT id,quantity FROM public.order_items WHERE order_id=o.id ORDER BY id LOOP PERFORM public.restore_order_item_inventory(item.id,item.quantity); END LOOP;
 UPDATE public.orders SET cancellation_reconciled_at=now() WHERE id=o.id;
END $$;
REVOKE ALL ON FUNCTION public.reconcile_cancelled_order(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_cancelled_order(uuid) TO service_role;

GRANT ALL ON public.order_refunds TO service_role;
REVOKE INSERT,UPDATE,DELETE ON public.order_refunds FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS public.promotion_refund_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL REFERENCES public.orders(id),request_key uuid NOT NULL UNIQUE,
 items jsonb NOT NULL,amount numeric NOT NULL CHECK(amount>=0),method text NOT NULL CHECK(method IN ('razorpay','gpay')),
 actor_id uuid NOT NULL,reason text,status text NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','complete')),
 transaction_id text,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.promotion_refund_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.promotion_refund_requests FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.promotion_refund_requests TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_promotion_refund ON public.promotion_refund_requests(order_id) WHERE status='reserved';
CREATE OR REPLACE FUNCTION public.reserve_promotion_refund(p_order_id uuid,p_key uuid,p_items jsonb,p_method text,p_actor uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE o public.orders%ROWTYPE; existing public.promotion_refund_requests%ROWTYPE; item public.order_items%ROWTYPE; selected jsonb; subtotal numeric:=0; net numeric; refund numeric; planned jsonb:='[]'; rid uuid;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 SELECT * INTO existing FROM public.promotion_refund_requests WHERE request_key=p_key;
 IF FOUND THEN
   IF existing.order_id<>p_order_id OR existing.items->'selection' IS DISTINCT FROM p_items OR existing.method<>p_method THEN RAISE EXCEPTION 'Refund key was already used for different items'; END IF;
   RETURN to_jsonb(existing)||jsonb_build_object('payment_id',o.razorpay_payment_id);
 END IF;
 IF o.cancellation_started_at IS NOT NULL THEN RAISE EXCEPTION 'Cancellation is in progress'; END IF;
 IF o.status='cancelled' OR o.payment_status NOT IN ('paid','partially_refunded') THEN RAISE EXCEPTION 'Order is not eligible for an item refund'; END IF;
 IF coalesce(o.coin_discount_amount,0)>0 OR coalesce(o.gift_card_discount,0)>0 THEN RAISE EXCEPTION 'Orders using coins or gift-card credit require a full cancellation or a reviewed credit refund'; END IF;
 IF EXISTS(SELECT 1 FROM public.promotion_refund_requests WHERE order_id=p_order_id AND status='reserved') THEN RAISE EXCEPTION 'A refund is awaiting confirmation. Retry the original refund before starting another.'; END IF;
 IF p_method NOT IN ('razorpay','gpay') OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)<1 OR jsonb_array_length(p_items)>200 OR
 (SELECT count(DISTINCT value->>'itemId') FROM jsonb_array_elements(p_items))<>jsonb_array_length(p_items) THEN RAISE EXCEPTION 'Invalid refund selection'; END IF;
 FOR selected IN SELECT value FROM jsonb_array_elements(p_items) LOOP
   SELECT * INTO item FROM public.order_items WHERE id=(selected->>'itemId')::uuid AND order_id=o.id FOR UPDATE;
   IF NOT FOUND OR selected->>'quantity' !~ '^[1-9][0-9]{0,3}$' OR (selected->>'quantity')::integer>item.quantity-item.refunded_quantity THEN RAISE EXCEPTION 'Invalid refund quantity'; END IF;
   IF item.line_discount_amount IS NULL THEN RAISE EXCEPTION 'This older discounted order needs its allocations reviewed before refunding'; END IF;
   net:=greatest(0,item.unit_price*item.quantity-item.line_discount_amount);
   refund:=round(net*(item.refunded_quantity+(selected->>'quantity')::integer)/item.quantity,2)-round(net*item.refunded_quantity/item.quantity,2);
   subtotal:=subtotal+refund;
   planned:=planned||jsonb_build_array(jsonb_build_object('itemId',item.id,'quantity',(selected->>'quantity')::integer,'amount',refund,'previous_quantity',item.refunded_quantity));
 END LOOP;
 IF subtotal+coalesce((SELECT sum(amount) FROM public.order_refunds WHERE order_id=o.id),0)>o.total THEN RAISE EXCEPTION 'Refund would exceed the amount paid'; END IF;
 INSERT INTO public.promotion_refund_requests(order_id,request_key,items,amount,method,actor_id,reason) VALUES(o.id,p_key,jsonb_build_object('selection',p_items,'plan',planned),subtotal,p_method,p_actor,p_reason) RETURNING id INTO rid;
 RETURN (SELECT to_jsonb(r)||jsonb_build_object('payment_id',o.razorpay_payment_id) FROM public.promotion_refund_requests r WHERE id=rid);
END $$;
CREATE OR REPLACE FUNCTION public.finish_promotion_refund(p_request_id uuid,p_transaction_id text)
RETURNS numeric LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE r public.promotion_refund_requests%ROWTYPE; line jsonb;
BEGIN
 PERFORM 1 FROM public.orders WHERE id=(SELECT order_id FROM public.promotion_refund_requests WHERE id=p_request_id) FOR UPDATE;
 SELECT * INTO r FROM public.promotion_refund_requests WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Refund not found'; END IF;
 IF r.status='complete' THEN RETURN r.amount; END IF;
 IF r.amount>0 AND nullif(p_transaction_id,'') IS NULL THEN RAISE EXCEPTION 'Refund confirmation is required'; END IF;
 FOR line IN SELECT value FROM jsonb_array_elements(r.items->'plan') LOOP
   UPDATE public.order_items SET refunded_quantity=refunded_quantity+(line->>'quantity')::integer,refunded_amount=refunded_amount+(line->>'amount')::numeric
   WHERE id=(line->>'itemId')::uuid AND refunded_quantity=(line->>'previous_quantity')::integer;
   IF NOT FOUND THEN RAISE EXCEPTION 'Refund allocation changed'; END IF;
   PERFORM public.restore_order_item_inventory((line->>'itemId')::uuid,(line->>'previous_quantity')::integer+(line->>'quantity')::integer);
 END LOOP;
 INSERT INTO public.order_refunds(order_id,amount,reason,refund_method,transaction_id,processed_by) VALUES(r.order_id,r.amount,r.reason,r.method,p_transaction_id,r.actor_id);
 UPDATE public.orders SET payment_status=CASE WHEN coalesce((SELECT sum(amount) FROM public.order_refunds WHERE order_id=r.order_id),0)>=(SELECT total FROM public.orders WHERE id=r.order_id) THEN 'refunded' ELSE 'partially_refunded' END,updated_at=now() WHERE id=r.order_id;
 UPDATE public.promotion_refund_requests SET status='complete',transaction_id=p_transaction_id WHERE id=r.id;
 RETURN r.amount;
END $$;
REVOKE ALL ON FUNCTION public.reserve_promotion_refund(uuid,uuid,jsonb,text,uuid,text),public.finish_promotion_refund(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_promotion_refund(uuid,uuid,jsonb,text,uuid,text),public.finish_promotion_refund(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.prepare_order_cancellation(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE o public.orders%ROWTYPE;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND OR o.status IN ('shipped','out_for_delivery','delivered','picked_up','dispatched') THEN RAISE EXCEPTION 'Order cannot be cancelled after dispatch or fulfillment'; END IF;
 IF EXISTS(SELECT 1 FROM public.promotion_refund_requests WHERE order_id=o.id AND status='reserved') THEN RAISE EXCEPTION 'Finish the pending item refund before cancelling'; END IF;
 UPDATE public.orders SET cancellation_started_at=coalesce(cancellation_started_at,now()) WHERE id=o.id;
END $$;
REVOKE ALL ON FUNCTION public.prepare_order_cancellation(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_order_cancellation(uuid) TO service_role;
COMMIT;
