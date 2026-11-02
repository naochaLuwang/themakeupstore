-- Run after the fixture, existing gift-card/loyalty migrations, and new migration
-- in an ISOLATED database. No production data or network is used.
SET ROLE service_role;
INSERT INTO profiles(id) VALUES('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
INSERT INTO products VALUES('00000000-0000-4000-8000-000000000010','Test product');
INSERT INTO product_variants VALUES('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000010',20,100);
INSERT INTO loyalty_points(user_id,balance,lifetime_earned,tier) VALUES('00000000-0000-4000-8000-000000000001',100,100,'bronze');
INSERT INTO gift_cards(id,code,original_balance,remaining_balance,purchased_by) VALUES('00000000-0000-4000-8000-000000000020','TEST-CARD',100,100,'00000000-0000-4000-8000-000000000001');

CREATE FUNCTION pg_temp.order_payload(total numeric,coins integer DEFAULT 0,gift numeric DEFAULT 0) RETURNS jsonb LANGUAGE sql AS $$
SELECT jsonb_build_object('total',total,'coin_discount_amount',coins,'gift_card_discount',gift,'promo_discount_amount',0,'bxgy_discount_amount',0,
 'payment_method','COD','payment_status','unpaid','shipping_price',0,'shipping_method_id','00000000-0000-4000-8000-000000000030','shipping_label','Test','shipping_address','{}'::jsonb)
$$;
CREATE FUNCTION pg_temp.items_payload() RETURNS jsonb LANGUAGE sql AS $$
SELECT '[{"product_id":"00000000-0000-4000-8000-000000000010","product_variant_id":"00000000-0000-4000-8000-000000000011","product_name":"Test product","quantity":1,"unit_price":100,"mrp":100,"is_gift":false}]'::jsonb
$$;
CREATE FUNCTION pg_temp.stock_payload(qty integer DEFAULT 1) RETURNS jsonb LANGUAGE sql AS $$
SELECT jsonb_build_array(jsonb_build_object('source','variant','id','00000000-0000-4000-8000-000000000011','quantity',qty))
$$;

DO $$ DECLARE result jsonb; again jsonb; order_id uuid; before_stock integer; count_before integer; BEGIN
  result:=commit_secure_checkout('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101',repeat('a',64),pg_temp.order_payload(0,50,50),pg_temp.items_payload(),pg_temp.stock_payload(),'[]','TEST-CARD');
  order_id:=(result->>'order_id')::uuid;
  IF (SELECT balance FROM loyalty_points WHERE user_id='00000000-0000-4000-8000-000000000001')<>50 THEN RAISE EXCEPTION 'Coin debit failed'; END IF;
  IF (SELECT remaining_balance FROM gift_cards WHERE code='TEST-CARD')<>50 THEN RAISE EXCEPTION 'Gift card debit failed'; END IF;
  IF (SELECT stock FROM product_variants WHERE id='00000000-0000-4000-8000-000000000011')<>19 THEN RAISE EXCEPTION 'Stock debit failed'; END IF;
  again:=commit_secure_checkout('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101',repeat('a',64),pg_temp.order_payload(0,50,50),pg_temp.items_payload(),pg_temp.stock_payload(),'[]','TEST-CARD');
  IF again->>'order_id'<>result->>'order_id' OR NOT (again->>'replayed')::boolean THEN RAISE EXCEPTION 'Retry duplicated checkout'; END IF;
  IF (SELECT balance FROM loyalty_points WHERE user_id='00000000-0000-4000-8000-000000000001')<>50 THEN RAISE EXCEPTION 'Retry spent coins twice'; END IF;
  BEGIN
    PERFORM commit_secure_checkout('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101',repeat('b',64),pg_temp.order_payload(0,50,50),pg_temp.items_payload(),pg_temp.stock_payload(),'[]','TEST-CARD');
    RAISE EXCEPTION 'TEST FAILED: reused checkout key accepted changed details';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'Checkout key was already used for different details' THEN RAISE; END IF; END;
  SELECT count(*) INTO count_before FROM orders;
  SELECT stock INTO before_stock FROM product_variants WHERE id='00000000-0000-4000-8000-000000000011';
  BEGIN
    PERFORM commit_secure_checkout('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000102',repeat('c',64),pg_temp.order_payload(0,75,25),pg_temp.items_payload(),pg_temp.stock_payload(),'[]','TEST-CARD');
    RAISE EXCEPTION 'TEST FAILED: overspent coins';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'Insufficient M Coins' THEN RAISE; END IF; END;
  BEGIN
    PERFORM commit_secure_checkout('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000103',repeat('d',64),pg_temp.order_payload(0,25,75),pg_temp.items_payload(),pg_temp.stock_payload(),'[]','TEST-CARD');
    RAISE EXCEPTION 'TEST FAILED: overspent gift card';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'Gift card balance is no longer available' THEN RAISE; END IF; END;
  BEGIN
    PERFORM commit_secure_checkout('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000104',repeat('e',64),pg_temp.order_payload(50,25,25),pg_temp.items_payload(),pg_temp.stock_payload(999),'[]','TEST-CARD');
    RAISE EXCEPTION 'TEST FAILED: insufficient inventory accepted';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'Insufficient product stock' THEN RAISE; END IF; END;
  IF (SELECT count(*) FROM orders)<>count_before OR (SELECT stock FROM product_variants WHERE id='00000000-0000-4000-8000-000000000011')<>before_stock THEN RAISE EXCEPTION 'Rejected checkout left partial writes'; END IF;
  BEGIN PERFORM release_fulfilled_order_points(order_id); RAISE EXCEPTION 'TEST FAILED: undelivered points released';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'Points can only be released for fulfilled orders' THEN RAISE; END IF; END;
END $$;

-- A ledger failure after stock/order writes must roll everything back.
CREATE FUNCTION pg_temp.reject_redemption() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected redemption failure'; END $$;
CREATE TRIGGER reject_redemption BEFORE INSERT ON public.gift_card_redemptions FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_redemption();
DO $$ DECLARE count_before integer; before_stock integer; BEGIN
 SELECT count(*) INTO count_before FROM orders;
 SELECT stock INTO before_stock FROM product_variants WHERE id='00000000-0000-4000-8000-000000000011';
 BEGIN
  PERFORM commit_secure_checkout('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000105',repeat('f',64),pg_temp.order_payload(0,50,50),pg_temp.items_payload(),pg_temp.stock_payload(),'[]','TEST-CARD');
  RAISE EXCEPTION 'TEST FAILED: injected failure was ignored';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'Injected redemption failure' THEN RAISE; END IF; END;
 IF (SELECT count(*) FROM orders)<>count_before OR (SELECT stock FROM product_variants WHERE id='00000000-0000-4000-8000-000000000011')<>before_stock OR (SELECT balance FROM loyalty_points WHERE user_id='00000000-0000-4000-8000-000000000001')<>50 THEN RAISE EXCEPTION 'Ledger failure left partial financial changes'; END IF;
END $$;
RESET ROLE;
DROP TRIGGER reject_redemption ON public.gift_card_redemptions;
SET ROLE service_role;

DO $$ DECLARE purchase uuid:='00000000-0000-4000-8000-000000000200'; first jsonb; again jsonb; BEGIN
 INSERT INTO gift_card_purchases(id,user_id,amount,provider_order_id) VALUES(purchase,'00000000-0000-4000-8000-000000000001',500,'order_test');
 IF EXISTS(SELECT 1 FROM gift_cards WHERE code='PAID-TEST') THEN RAISE EXCEPTION 'Pending purchase issued a card'; END IF;
 first:=activate_paid_gift_card(purchase,'00000000-0000-4000-8000-000000000001','pay_test','PAID-TEST');
 again:=activate_paid_gift_card(purchase,'00000000-0000-4000-8000-000000000001','pay_test','DUPLICATE');
 IF first<>again OR EXISTS(SELECT 1 FROM gift_cards WHERE code='DUPLICATE') THEN RAISE EXCEPTION 'Gift card confirmation not idempotent'; END IF;
END $$;

RESET ROLE;
DO $$ BEGIN
 IF has_table_privilege('authenticated','public.orders','INSERT,UPDATE,DELETE') OR has_table_privilege('anon','public.order_items','INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'Public order mutation grant remains'; END IF;
 IF has_table_privilege('authenticated','public.gift_cards','INSERT') OR has_table_privilege('anon','public.gift_cards','SELECT') OR has_table_privilege('authenticated','public.loyalty_points','UPDATE') OR has_table_privilege('authenticated','public.loyalty_transactions','INSERT') THEN RAISE EXCEPTION 'Public financial table mutation grant remains'; END IF;
 IF has_function_privilege('authenticated','public.commit_secure_checkout(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,text)','EXECUTE') OR has_function_privilege('anon','public.activate_paid_gift_card(uuid,uuid,text,text)','EXECUTE') OR has_function_privilege('authenticated','public.release_fulfilled_order_points(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Financial RPC is exposed'; END IF;
END $$;
SELECT 'financial SQL assertions passed' AS result;
