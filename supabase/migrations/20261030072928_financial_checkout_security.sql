-- Deploy with the financial checkout code. Service-role RPCs are the only writers.
-- No changes to existing balances, gift cards, or historical orders are performed.
BEGIN;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS checkout_key uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS checkout_request_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_key_unique ON public.orders(user_id, checkout_key) WHERE checkout_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.financial_payment_uses (
  payment_id text PRIMARY KEY,
  user_id uuid NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('checkout','gift_card')),
  reference_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.gift_card_purchases (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 100 AND amount <= 25000),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  provider_order_id text NOT NULL UNIQUE,
  provider_payment_id text UNIQUE,
  recipient_email text,
  recipient_name text,
  message text,
  gift_card_id uuid REFERENCES public.gift_cards(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.checkout_promotion_uses (
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('bxgy','gift')),
  promotion_id uuid NOT NULL,
  PRIMARY KEY(order_id,kind,promotion_id)
);
CREATE INDEX IF NOT EXISTS checkout_promotion_user_idx ON public.checkout_promotion_uses(user_id,kind,promotion_id);

ALTER TABLE public.financial_payment_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_promotion_uses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.financial_payment_uses, public.gift_card_purchases, public.checkout_promotion_uses FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.financial_payment_uses, public.gift_card_purchases, public.checkout_promotion_uses TO service_role;

-- Financial records must not be mintable or editable through the public REST key.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT schemaname,tablename,policyname FROM pg_policies
    WHERE schemaname='public' AND tablename IN ('gift_cards','gift_card_redemptions','loyalty_points','loyalty_transactions')
  LOOP EXECUTE format('DROP POLICY %I ON %I.%I',p.policyname,p.schemaname,p.tablename); END LOOP;
END $$;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gift_cards,public.gift_card_redemptions,public.loyalty_points,public.loyalty_transactions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.gift_cards,public.gift_card_redemptions,public.loyalty_points,public.loyalty_transactions TO authenticated;
GRANT ALL ON public.gift_cards,public.gift_card_redemptions,public.loyalty_points,public.loyalty_transactions TO service_role;
CREATE POLICY financial_cards_select_own ON public.gift_cards FOR SELECT TO authenticated USING (purchased_by=(SELECT auth.uid()));
CREATE POLICY financial_redemptions_select_own ON public.gift_card_redemptions FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.user_id=(SELECT auth.uid()))
  OR EXISTS(SELECT 1 FROM public.gift_cards g WHERE g.id=gift_card_id AND g.purchased_by=(SELECT auth.uid()))
);
CREATE POLICY financial_points_select_own ON public.loyalty_points FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
CREATE POLICY financial_transactions_select_own ON public.loyalty_transactions FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
-- New checkouts insert orders/items through the transaction below, not cookie clients.
REVOKE INSERT,UPDATE,DELETE ON public.orders,public.order_items FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.protect_checkout_finances() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF current_user IN ('postgres','service_role') THEN
    IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  IF TG_OP IN ('INSERT','DELETE') THEN RAISE EXCEPTION 'Checkout writes require an authorized server operation'; END IF;
    IF ROW(NEW.status,NEW.order_type,NEW.checkout_key,NEW.checkout_request_hash,NEW.user_id,NEW.total,NEW.payment_status,NEW.payment_method,NEW.razorpay_payment_id,
           NEW.promo_discount_amount,NEW.bxgy_discount_amount,NEW.gift_card_discount,NEW.coin_discount_amount,NEW.shipping_price)
       IS DISTINCT FROM
       ROW(OLD.status,OLD.order_type,OLD.checkout_key,OLD.checkout_request_hash,OLD.user_id,OLD.total,OLD.payment_status,OLD.payment_method,OLD.razorpay_payment_id,
           OLD.promo_discount_amount,OLD.bxgy_discount_amount,OLD.gift_card_discount,OLD.coin_discount_amount,OLD.shipping_price)
    THEN RAISE EXCEPTION 'Checkout financial fields require an authorized server operation'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
DROP TRIGGER IF EXISTS protect_checkout_finances ON public.orders;
CREATE TRIGGER protect_checkout_finances BEFORE INSERT OR UPDATE OR DELETE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.protect_checkout_finances();

CREATE OR REPLACE FUNCTION public.protect_checkout_items() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF current_user NOT IN ('postgres','service_role') THEN RAISE EXCEPTION 'Checkout items require an authorized server operation'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
DROP TRIGGER IF EXISTS protect_checkout_items ON public.order_items;
CREATE TRIGGER protect_checkout_items BEFORE INSERT OR UPDATE OR DELETE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.protect_checkout_items();

-- Every statement below participates in the same transaction. Any error rolls back
-- order/items, inventory, balances, redemption ledgers, promotion usage, and payment use.
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
  SELECT COALESCE(sum(round((i->>'unit_price')::numeric*(i->>'quantity')::integer)),0) INTO item_total FROM jsonb_array_elements(p_items) i;
  IF (p_order->>'total')::numeric <> greatest(0,round(item_total-COALESCE((p_order->>'promo_discount_amount')::numeric,0)-COALESCE((p_order->>'bxgy_discount_amount')::numeric,0)-gift_amount-coins+COALESCE((p_order->>'shipping_price')::numeric,0))) THEN RAISE EXCEPTION 'Checkout total is inconsistent'; END IF;

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

  INSERT INTO public.orders(user_id,status,order_type,payment_status,payment_method,razorpay_payment_id,total,shipping_price,shipping_label,shipping_method_id,shipping_address,promo_code,promo_discount_amount,bxgy_discount_amount,gift_card_discount,coin_discount_amount,checkout_key,checkout_request_hash)
  VALUES(p_user_id,'pending','delivery',p_order->>'payment_status',p_order->>'payment_method',payment_id,(p_order->>'total')::numeric,(p_order->>'shipping_price')::numeric,p_order->>'shipping_label',(p_order->>'shipping_method_id')::uuid,p_order->'shipping_address',nullif(p_order->>'promo_code',''),(p_order->>'promo_discount_amount')::numeric,(p_order->>'bxgy_discount_amount')::numeric,gift_amount,coins,p_key,p_hash)
  RETURNING id INTO new_id;
  INSERT INTO public.order_items(order_id,product_id,product_variant_id,product_name,variant_title,quantity,unit_price,mrp,is_gift)
  SELECT new_id,(i->>'product_id')::uuid,(i->>'product_variant_id')::uuid,i->>'product_name',i->>'variant_title',(i->>'quantity')::integer,(i->>'unit_price')::numeric,(i->>'mrp')::numeric,(i->>'is_gift')::boolean FROM jsonb_array_elements(p_items) i;
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
    INSERT INTO public.checkout_promotion_uses VALUES(new_id,p_user_id,entry.kind,entry.id);
    IF entry.kind='bxgy' THEN UPDATE public.buy_x_get_y SET used_count=used_count+1 WHERE id=entry.id;
    ELSE UPDATE public.free_gifts SET used_count=used_count+1 WHERE id=entry.id; END IF;
  END LOOP;
  IF nullif(p_order->>'promo_code','') IS NOT NULL THEN
    UPDATE public.promo_codes SET used_count=used_count+1 WHERE id=promo_record.id;
    INSERT INTO public.promo_redemptions(promo_id,user_id,order_id) VALUES(promo_record.id,p_user_id,new_id);
  END IF;
  RETURN jsonb_build_object('order_id',new_id,'replayed',false);
END $$;

CREATE OR REPLACE FUNCTION public.activate_paid_gift_card(p_purchase_id uuid,p_user_id uuid,p_payment_id text,p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE purchase public.gift_card_purchases%ROWTYPE; card_id uuid; card_code text;
BEGIN
  SELECT * INTO purchase FROM public.gift_card_purchases WHERE id=p_purchase_id AND user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Gift card purchase not found'; END IF;
  IF purchase.gift_card_id IS NOT NULL THEN
    IF purchase.provider_payment_id IS DISTINCT FROM p_payment_id THEN RAISE EXCEPTION 'Purchase already paid with another payment'; END IF;
    SELECT code INTO card_code FROM public.gift_cards WHERE id=purchase.gift_card_id;
    RETURN jsonb_build_object('id',purchase.gift_card_id,'code',card_code);
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('payment:'||p_payment_id,0));
  IF EXISTS(SELECT 1 FROM public.orders WHERE razorpay_payment_id=p_payment_id) THEN RAISE EXCEPTION 'Payment already used'; END IF;
  INSERT INTO public.financial_payment_uses VALUES(p_payment_id,p_user_id,'gift_card',p_purchase_id,now());
  INSERT INTO public.gift_cards(code,original_balance,remaining_balance,purchased_by,recipient_email,recipient_name,message,status,expires_at)
  VALUES(p_code,purchase.amount,purchase.amount,p_user_id,purchase.recipient_email,purchase.recipient_name,purchase.message,'active',now()+interval '1 year') RETURNING id INTO card_id;
  UPDATE public.gift_card_purchases SET gift_card_id=card_id,provider_payment_id=p_payment_id WHERE id=p_purchase_id;
  RETURN jsonb_build_object('id',card_id,'code',p_code);
END $$;

CREATE OR REPLACE FUNCTION public.release_fulfilled_order_points(p_order_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE owner_id uuid; order_state text; tx record; balance_now integer; released integer:=0;
BEGIN
  SELECT user_id,status INTO owner_id,order_state FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND OR order_state NOT IN ('delivered','picked_up') THEN RAISE EXCEPTION 'Points can only be released for fulfilled orders'; END IF;
  SELECT balance INTO balance_now FROM public.loyalty_points WHERE user_id=owner_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Loyalty account not found'; END IF;
  FOR tx IN SELECT id,amount FROM public.loyalty_transactions WHERE user_id=owner_id AND reference_id=p_order_id AND reference_type='order' AND type='earn' AND status='pending' ORDER BY id FOR UPDATE LOOP
    -- Pending transactions contain an old snapshot; rebase it under the balance lock.
    UPDATE public.loyalty_transactions SET balance_before=balance_now,balance_after=balance_now+tx.amount,status='available',order_delivered_at=now() WHERE id=tx.id;
    balance_now:=balance_now+tx.amount;
    released:=released+tx.amount;
  END LOOP;
  RETURN released;
END $$;

CREATE OR REPLACE FUNCTION public.reverse_order_coin_redemption(p_order_id uuid,p_allow_active boolean DEFAULT false)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE owner_id uuid; order_state text; tx record; refunded integer:=0;
BEGIN
  SELECT user_id,status INTO owner_id,order_state FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND OR (order_state<>'cancelled' AND NOT p_allow_active) THEN RAISE EXCEPTION 'Order is not cancelled'; END IF;
  PERFORM 1 FROM public.loyalty_points WHERE user_id=owner_id FOR UPDATE;
  FOR tx IN SELECT id,amount FROM public.loyalty_transactions WHERE user_id=owner_id AND reference_id=p_order_id AND type='spend' AND reference_type='order' AND status='available' FOR UPDATE LOOP
    UPDATE public.loyalty_transactions SET status='cancelled',note='Coins refunded on order cancellation' WHERE id=tx.id;
    UPDATE public.loyalty_points SET balance=balance+tx.amount,updated_at=now() WHERE user_id=owner_id;
    refunded:=refunded+tx.amount;
  END LOOP;
  RETURN refunded;
END $$;
REVOKE ALL ON FUNCTION public.reverse_order_coin_redemption(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_order_coin_redemption(uuid,boolean) TO service_role;

-- Remove public access to legacy balance-changing RPCs; financial writes are internal.
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT oid::regprocedure AS signature FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('atomic_redeem_coins','atomic_reverse_coins') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.commit_secure_checkout(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.activate_paid_gift_card(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.release_fulfilled_order_points(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.commit_secure_checkout(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_paid_gift_card(uuid,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_fulfilled_order_points(uuid) TO service_role;

COMMIT;
