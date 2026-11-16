-- Never execute against a real store. All fixtures are rolled back.
BEGIN;
SET LOCAL ROLE service_role;
INSERT INTO categories(id,name,parent_id) VALUES
 ('10000000-0000-4000-8000-000000000001','Root',null),
 ('10000000-0000-4000-8000-000000000002','Child','10000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000003','Grandchild','10000000-0000-4000-8000-000000000002'),
 ('10000000-0000-4000-8000-000000000004','Other',null);
INSERT INTO products(id,name,status,category_id) VALUES
 ('20000000-0000-4000-8000-000000000001','Primary only','active','10000000-0000-4000-8000-000000000001'),
 ('20000000-0000-4000-8000-000000000002','Shared product','active',null),
 ('20000000-0000-4000-8000-000000000003','Grandchild product','active',null),
 ('20000000-0000-4000-8000-000000000004','Already inactive','inactive',null),
 ('20000000-0000-4000-8000-000000000005','Unrelated','active','10000000-0000-4000-8000-000000000004');
INSERT INTO product_categories VALUES
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000004'),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003'),
 ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001');
INSERT INTO product_variants(id,product_id,stock,price) VALUES('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',50,100);
DO $$ DECLARE r jsonb; BEGIN
 r:=set_category_visibility('10000000-0000-4000-8000-000000000001',false,true);
 ASSERT (r->>'products')::integer=3 AND (r->>'categories')::integer=3;
 ASSERT (SELECT count(*) FROM categories WHERE NOT is_active)=3;
 ASSERT (SELECT count(*) FROM products WHERE status='inactive')=4;
 ASSERT (SELECT status FROM products WHERE name='Unrelated')='active';
 ASSERT (SELECT stock FROM product_variants WHERE id='30000000-0000-4000-8000-000000000001')=50;
 BEGIN PERFORM set_category_visibility('10000000-0000-4000-8000-000000000002',true,false); RAISE EXCEPTION 'Expected inactive parent';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Activate the parent category first.' THEN RAISE; END IF; END;
 BEGIN PERFORM set_category_visibility('10000000-0000-4000-8000-000000000001',true,true); RAISE EXCEPTION 'Expected stale update';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Category changed. Refresh before trying again.' THEN RAISE; END IF; END;
 r:=set_category_visibility('10000000-0000-4000-8000-000000000001',true,false);
 ASSERT (SELECT is_active FROM categories WHERE name='Root');
 ASSERT NOT (SELECT is_active FROM categories WHERE name='Child');
 ASSERT (SELECT count(*) FROM products WHERE status='inactive')=4;
 -- New assignments inherit inactivity; unlinking does not silently publish products.
 INSERT INTO product_categories VALUES('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000002');
 ASSERT (SELECT status FROM products WHERE name='Unrelated')='inactive';
 BEGIN UPDATE products SET status='active' WHERE name='Unrelated'; RAISE EXCEPTION 'Expected category blocker';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Activate the product categories first.' THEN RAISE; END IF; END;
 DELETE FROM product_categories WHERE product_id='20000000-0000-4000-8000-000000000005';
 ASSERT (SELECT status FROM products WHERE name='Unrelated')='inactive';
 UPDATE products SET status='active' WHERE name='Unrelated';
 -- Legacy primary category links and reparenting are covered too.
 UPDATE products SET category_id='10000000-0000-4000-8000-000000000003' WHERE name='Unrelated';
 ASSERT (SELECT status FROM products WHERE name='Unrelated')='inactive';
 INSERT INTO categories(id,name,parent_id) VALUES(gen_random_uuid(),'New child','10000000-0000-4000-8000-000000000003');
 ASSERT NOT (SELECT is_active FROM categories WHERE name='New child');
 UPDATE categories SET parent_id='10000000-0000-4000-8000-000000000003' WHERE name='Other';
 ASSERT NOT (SELECT is_active FROM categories WHERE name='Other');
 BEGIN UPDATE categories SET parent_id='10000000-0000-4000-8000-000000000003' WHERE name='Root'; RAISE EXCEPTION 'Expected cycle rejection';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'A category cannot be its own ancestor.' THEN RAISE; END IF; END;
END $$;
ROLLBACK;

-- An error halfway through the product cascade rolls back every category/product change.
BEGIN;
CREATE FUNCTION pg_temp.reject_product_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected failure'; END $$;
INSERT INTO categories(id,name) VALUES('10000000-0000-4000-8000-000000000001','Root');
INSERT INTO products(id,name,category_id) VALUES('20000000-0000-4000-8000-000000000001','Product','10000000-0000-4000-8000-000000000001');
CREATE TRIGGER fixture_failure BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_product_change();
DO $$ BEGIN
 BEGIN PERFORM set_category_visibility('10000000-0000-4000-8000-000000000001',false,true); RAISE EXCEPTION 'Expected failure';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Injected failure' THEN RAISE; END IF; END;
 ASSERT (SELECT is_active FROM categories WHERE name='Root');
 ASSERT (SELECT status FROM products WHERE name='Product')='active';
END $$;
ROLLBACK;

-- A stale checkout must fail transactionally. A completed checkout remains safely replayable.
BEGIN;
SET LOCAL ROLE service_role;
INSERT INTO profiles(id) VALUES('40000000-0000-4000-8000-000000000001');
INSERT INTO categories(id,name) VALUES('10000000-0000-4000-8000-000000000001','Root');
INSERT INTO products(id,name,category_id) VALUES('20000000-0000-4000-8000-000000000001','Product','10000000-0000-4000-8000-000000000001');
INSERT INTO product_variants(id,product_id,stock,price) VALUES('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',50,100);
DO $$ DECLARE
 payload jsonb:='{"total":100,"coin_discount_amount":0,"gift_card_discount":0,"promo_discount_amount":0,"bxgy_discount_amount":0,"payment_method":"COD","payment_status":"unpaid","shipping_price":0,"shipping_address":{}}';
 items jsonb:='[{"product_id":"20000000-0000-4000-8000-000000000001","product_variant_id":"30000000-0000-4000-8000-000000000001","product_name":"Product","quantity":1,"unit_price":100,"mrp":100,"is_gift":false}]';
 stock_payload jsonb:='[{"source":"variant","id":"30000000-0000-4000-8000-000000000001","quantity":1}]';
 r jsonb; again jsonb;
BEGIN
 PERFORM set_category_visibility('10000000-0000-4000-8000-000000000001',false,true);
 BEGIN PERFORM commit_secure_checkout('40000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001',repeat('a',64),payload,items,stock_payload,'[]',null); RAISE EXCEPTION 'Expected stale checkout rejection';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'A product is no longer available. Refresh your bag.' THEN RAISE; END IF; END;
 ASSERT (SELECT stock FROM product_variants WHERE id='30000000-0000-4000-8000-000000000001')=50;
 ASSERT NOT EXISTS(SELECT 1 FROM orders WHERE user_id='40000000-0000-4000-8000-000000000001');
 PERFORM set_category_visibility('10000000-0000-4000-8000-000000000001',true,false);
 UPDATE products SET status='active' WHERE id='20000000-0000-4000-8000-000000000001';
 r:=commit_secure_checkout('40000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001',repeat('a',64),payload,items,stock_payload,'[]',null);
 ASSERT (SELECT stock FROM product_variants WHERE id='30000000-0000-4000-8000-000000000001')=49;
 PERFORM set_category_visibility('10000000-0000-4000-8000-000000000001',false,true);
 again:=commit_secure_checkout('40000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001',repeat('a',64),payload,items,stock_payload,'[]',null);
 ASSERT r->>'order_id'=again->>'order_id' AND (again->>'replayed')::boolean;
 ASSERT (SELECT stock FROM product_variants WHERE id='30000000-0000-4000-8000-000000000001')=49;
END $$;
ROLLBACK;
