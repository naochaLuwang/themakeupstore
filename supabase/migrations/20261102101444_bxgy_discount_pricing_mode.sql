-- Apply after the 20261030 financial and 20261031 promotion migrations, before the web build.
-- Existing campaigns keep their current combination behavior. New campaigns choose explicitly.
BEGIN;
ALTER TABLE public.buy_x_get_y ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'combine_discounts'
  CONSTRAINT buy_x_get_y_pricing_mode_check CHECK (pricing_mode IN ('replace_discounts','combine_discounts'));
COMMENT ON COLUMN public.buy_x_get_y.pricing_mode IS 'Replace markdowns/sale prices only on consumed BXGY units, or combine with current selling prices.';

CREATE OR REPLACE FUNCTION public.save_promotion_rule(p_kind text,p_id uuid,p_rule jsonb,p_products uuid[],p_categories uuid[],p_brands text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE rid uuid; target text; result jsonb;
BEGIN
 rid:=coalesce(p_id,gen_random_uuid());
 IF length(trim(p_rule->>'name'))<1 OR (p_rule->>'expires_at')::timestamptz<=(p_rule->>'starts_at')::timestamptz THEN RAISE EXCEPTION 'Invalid campaign name or dates'; END IF;
 IF p_kind='bxgy' THEN
   IF p_rule->>'get_type'<>'cheapest_free' OR (p_rule->>'buy_quantity')::integer<>2 OR p_rule->>'get_discount_type'<>'free' OR (p_rule->>'get_discount_value')::numeric<>100 THEN RAISE EXCEPTION 'Only repeating Buy 2 Get 1 Free is supported'; END IF;
   IF coalesce(p_rule->>'pricing_mode','combine_discounts') NOT IN ('replace_discounts','combine_discounts') THEN RAISE EXCEPTION 'Invalid BXGY pricing mode'; END IF;
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
   INSERT INTO public.buy_x_get_y(id,name,description,buy_type,buy_quantity,get_type,get_product_id,get_variant_id,get_discount_type,get_discount_value,apply_to,usage_limit,once_per_user,max_per_order,starts_at,expires_at,is_active,pricing_mode)
   VALUES(rid,p_rule->>'name',p_rule->>'description',target,2,'cheapest_free',null,null,'free',100,'all',(p_rule->>'usage_limit')::integer,coalesce((p_rule->>'once_per_user')::boolean,false),null,(p_rule->>'starts_at')::timestamptz,(p_rule->>'expires_at')::timestamptz,coalesce((p_rule->>'is_active')::boolean,true),coalesce(p_rule->>'pricing_mode','combine_discounts'))
   ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,buy_type=excluded.buy_type,buy_quantity=2,get_type='cheapest_free',get_product_id=null,get_variant_id=null,get_discount_type='free',get_discount_value=100,apply_to='all',usage_limit=excluded.usage_limit,once_per_user=excluded.once_per_user,max_per_order=null,starts_at=excluded.starts_at,expires_at=excluded.expires_at,is_active=excluded.is_active,pricing_mode=excluded.pricing_mode,updated_at=now();
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
  IF p_items IS NULL OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)<1 OR jsonb_array_length(p_items)>201 THEN RAISE EXCEPTION 'Invalid checkout items'; END IF;
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

-- At most two price groups per cart variant (original / selling), plus one fixed gift.
REVOKE ALL ON FUNCTION public.commit_secure_checkout(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.commit_secure_checkout(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,text) TO service_role;
COMMIT;
