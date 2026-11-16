BEGIN;
DO $$ DECLARE actor uuid:='10000000-0000-0000-0000-000000000001'; po uuid:='60000000-0000-0000-0000-000000000001';
    v uuid:='40000000-0000-0000-0000-000000000001'; supplier uuid:='20000000-0000-0000-0000-000000000001';
    body jsonb; result jsonb; receipt jsonb; line_id uuid; previous_stock integer;
BEGIN
    ASSERT (SELECT legacy_receipt FROM purchase_orders WHERE reference_number='LEGACY');
    ASSERT (SELECT received_quantity FROM purchase_order_items WHERE purchase_order_id='50000000-0000-0000-0000-000000000001')=3;
    ASSERT (SELECT stock FROM product_variants WHERE id=v)=10;
    ASSERT jsonb_array_length(public.admin_purchase_catalog('LIP-ROSE'))=1;
    ASSERT (public.admin_purchase_catalog('LIP-ROSE')->0->>'last_cost')::numeric=100;
    ASSERT jsonb_array_length(public.admin_purchase_catalog('forever52'))=2;
    body:=jsonb_build_object('supplier_id',supplier,'reference_number','TEST','expected_on','','notes','Supplier note','items',jsonb_build_array(jsonb_build_object('variant_id',v,'quantity',10,'unit_cost',125.50)));
    result:=public.admin_purchase_save(po,0,body,actor);
    ASSERT (result->>'total_cost')::numeric=1255;
    PERFORM public.admin_purchase_save(po,0,body,actor);
    ASSERT (SELECT count(*) FROM purchase_orders WHERE id=po)=1;
    ASSERT (SELECT count(*) FROM purchase_order_items WHERE purchase_order_id=po)=1;
    BEGIN
        PERFORM public.admin_purchase_save(gen_random_uuid(),0,jsonb_set(body,'{items,0,quantity}','0'),actor);
        RAISE EXCEPTION 'Expected invalid quantity rejection';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM='Expected invalid quantity rejection' THEN RAISE; END IF; END;
    BEGIN
        PERFORM public.admin_purchase_save(gen_random_uuid(),0,jsonb_set(body,'{items,0,unit_cost}','-1'),actor);
        RAISE EXCEPTION 'Expected invalid cost rejection';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM='Expected invalid cost rejection' THEN RAISE; END IF; END;
    ASSERT (SELECT count(*) FROM purchase_orders)=2;
    body:=jsonb_set(body,'{items,0,quantity}','8');
    result:=public.admin_purchase_save(po,1,body,actor);
    ASSERT (result->>'total_cost')::numeric=1004;
    PERFORM public.admin_purchase_save(po,1,body,actor);
    ASSERT (SELECT version FROM purchase_orders WHERE id=po)=2;
    BEGIN
        PERFORM public.admin_purchase_save(po,1,jsonb_set(body,'{notes}','"Stale"'),actor);
        RAISE EXCEPTION 'Expected stale edit rejection';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM='Expected stale edit rejection' THEN RAISE; END IF; END;
    PERFORM public.admin_purchase_transition(po,2,'ordered',actor);
    PERFORM public.admin_purchase_transition(po,2,'ordered',actor);
    SELECT id INTO line_id FROM purchase_order_items WHERE purchase_order_id=po;
    receipt:=jsonb_build_object('received_on',(now() AT TIME ZONE 'Asia/Kolkata')::date,'notes','One damaged','lines',jsonb_build_array(jsonb_build_object('item_id',line_id,'accepted',3,'damaged',1)));
    result:=public.admin_purchase_receive(po,3,'70000000-0000-0000-0000-000000000001',receipt,actor);
    ASSERT result->>'status'='partial';
    ASSERT (SELECT stock FROM product_variants WHERE id=v)=13;
    ASSERT (SELECT change_amount FROM stock_ledger WHERE reference_id='70000000-0000-0000-0000-000000000001')=3;
    PERFORM public.admin_purchase_receive(po,3,'70000000-0000-0000-0000-000000000001',receipt,actor);
    ASSERT (SELECT stock FROM product_variants WHERE id=v)=13;
    ASSERT (SELECT count(*) FROM purchase_receipts WHERE purchase_order_id=po)=1;
    BEGIN
        PERFORM public.admin_purchase_receive(po,4,gen_random_uuid(),jsonb_set(receipt,'{lines,0,accepted}','7'),actor);
        RAISE EXCEPTION 'Expected excessive receipt rejection';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM='Expected excessive receipt rejection' THEN RAISE; END IF; END;
    BEGIN
        PERFORM public.admin_purchase_transition(po,4,'cancelled',actor);
        RAISE EXCEPTION 'Expected partial cancellation rejection';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM='Expected partial cancellation rejection' THEN RAISE; END IF; END;
    receipt:=jsonb_set(jsonb_set(receipt,'{lines,0,accepted}','4'),'{lines,0,damaged}','0');
    result:=public.admin_purchase_receive(po,4,'70000000-0000-0000-0000-000000000002',receipt,actor);
    ASSERT result->>'status'='received';
    ASSERT (result->>'received_units')::integer=7 AND (result->>'damaged_units')::integer=1;
    ASSERT (SELECT stock FROM product_variants WHERE id=v)=17;
    ASSERT (public.admin_purchase_list('TEST','received',NULL,NULL,1,25)->>'total')::integer=1;
    ASSERT (public.admin_purchase_list('TEST','ordered',NULL,NULL,1,25)->>'total')::integer=0;
    ASSERT (public.admin_purchase_list('Fixture Supplier','',NULL,NULL,99,1)->>'page')::integer=2;
    ASSERT (public.admin_purchase_detail(po)->'supplier'->>'address')='Test address';
    ASSERT NOT (public.admin_purchase_detail(po) ? 'create_request');
    UPDATE products SET name='Changed product' WHERE id='30000000-0000-0000-0000-000000000001';
    UPDATE product_variants SET title='Changed shade',sku='CHANGED' WHERE id=v;
    ASSERT (public.admin_purchase_detail(po)->'items'->0->>'name')='Lipstick';
    ASSERT (public.admin_purchase_detail(po)->'items'->0->>'title')='Rose';
    ASSERT (public.admin_purchase_detail(po)->'items'->0->>'sku')='LIP-ROSE';
END $$;
-- A failure in a late ledger write rolls back stock, receipt quantities and status.
CREATE FUNCTION public.test_purchase_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Simulated ledger failure'; END $$;
CREATE TRIGGER test_purchase_failure BEFORE INSERT ON stock_ledger FOR EACH ROW EXECUTE FUNCTION public.test_purchase_failure();
DO $$ DECLARE actor uuid:='10000000-0000-0000-0000-000000000001'; po uuid:=gen_random_uuid(); body jsonb; item uuid;
BEGIN
    body:=jsonb_build_object('supplier_id','20000000-0000-0000-0000-000000000001','items',jsonb_build_array(jsonb_build_object('variant_id','40000000-0000-0000-0000-000000000002','quantity',2,'unit_cost',50)));
    PERFORM admin_purchase_save(po,0,body,actor); PERFORM admin_purchase_transition(po,1,'ordered',actor);
    SELECT id INTO item FROM purchase_order_items WHERE purchase_order_id=po;
    BEGIN
        PERFORM admin_purchase_receive(po,2,gen_random_uuid(),jsonb_build_object('received_on',(now() AT TIME ZONE 'Asia/Kolkata')::date,'lines',jsonb_build_array(jsonb_build_object('item_id',item,'accepted',2,'damaged',0))),actor);
        RAISE EXCEPTION 'Expected ledger failure';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Simulated ledger failure' THEN RAISE; END IF; END;
    ASSERT (SELECT stock FROM product_variants WHERE id='40000000-0000-0000-0000-000000000002')=10;
    ASSERT (SELECT received_quantity FROM purchase_order_items WHERE id=item)=0;
    ASSERT (SELECT status FROM purchase_orders WHERE id=po)='ordered';
    ASSERT (SELECT count(*) FROM purchase_receipts WHERE purchase_order_id=po)=0;
END $$;
ROLLBACK;

-- Late line failures must undo the new header, or preserve the entire old draft.
BEGIN;
CREATE FUNCTION public.test_purchase_item_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.unit_cost=777 THEN RAISE EXCEPTION 'Simulated line failure'; END IF; RETURN NEW; END $$;
CREATE TRIGGER test_purchase_item_failure BEFORE INSERT ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION public.test_purchase_item_failure();
DO $$ DECLARE actor uuid:='10000000-0000-0000-0000-000000000001'; po uuid:=gen_random_uuid(); body jsonb;
BEGIN
    body:=jsonb_build_object('supplier_id','20000000-0000-0000-0000-000000000001','items',jsonb_build_array(jsonb_build_object('variant_id','40000000-0000-0000-0000-000000000002','quantity',2,'unit_cost',777)));
    BEGIN
        PERFORM admin_purchase_save(po,0,body,actor);
        RAISE EXCEPTION 'Expected line failure';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Simulated line failure' THEN RAISE; END IF; END;
    ASSERT NOT EXISTS(SELECT 1 FROM purchase_orders WHERE id=po);
    body:=jsonb_set(body,'{items,0,unit_cost}','50');
    PERFORM admin_purchase_save(po,0,body,actor);
    BEGIN
        PERFORM admin_purchase_save(po,1,jsonb_set(body,'{items,0,unit_cost}','777'),actor);
        RAISE EXCEPTION 'Expected edit line failure';
    EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Simulated line failure' THEN RAISE; END IF; END;
    ASSERT (SELECT total_cost FROM purchase_orders WHERE id=po)=100;
    ASSERT (SELECT version FROM purchase_orders WHERE id=po)=1;
    ASSERT (SELECT unit_cost FROM purchase_order_items WHERE purchase_order_id=po)=50;
END $$;
ROLLBACK;

BEGIN;
INSERT INTO products(id,name,brand) SELECT gen_random_uuid(),'Scale product '||n,'Scale brand' FROM generate_series(1,1005) n;
INSERT INTO product_variants(id,product_id,title,sku,stock,price) SELECT gen_random_uuid(),id,NULL,'SKU-SCALE-'||replace(name,'Scale product ',''),0,100 FROM products WHERE brand='Scale brand';
INSERT INTO purchase_orders(supplier_id,status,total_cost,reference_number) SELECT '20000000-0000-0000-0000-000000000001','draft',n,'SCALE-'||n FROM generate_series(1,1005) n;
INSERT INTO purchase_orders(supplier_id,status,total_cost,reference_number,created_at) VALUES
('20000000-0000-0000-0000-000000000001','draft',1,'ISTDATE-1','2026-11-12T18:29:59Z'),
('20000000-0000-0000-0000-000000000001','draft',1,'ISTDATE-2','2026-11-12T18:30:00Z'),
('20000000-0000-0000-0000-000000000001','draft',1,'ISTDATE-3','2026-11-13T18:29:59Z'),
('20000000-0000-0000-0000-000000000001','draft',1,'ISTDATE-4','2026-11-13T18:30:00Z');
DO $$ DECLARE report jsonb; BEGIN
    ASSERT jsonb_array_length(admin_purchase_catalog('SKU-SCALE-1005'))=1;
    report:=admin_purchase_list('SCALE-','',NULL,NULL,100,25);
    ASSERT (report->>'total')::integer=1005 AND (report->>'page')::integer=41;
    ASSERT jsonb_array_length(report->'orders')=5;
    ASSERT (report->'summary'->>'value')::numeric=505515;
    ASSERT jsonb_array_length(admin_purchase_list('SCALE-','',NULL,NULL,1,5001)->'orders')=1005;
    ASSERT (admin_purchase_list('ISTDATE-','','2026-11-13','2026-11-13',1,25)->>'total')::integer=2;
    ASSERT NOT EXISTS(SELECT 1 FROM pg_proc WHERE proname LIKE 'admin_purchase_%' AND (prosecdef OR NOT ('search_path=""'=ANY(proconfig))));
END $$;
ROLLBACK;
