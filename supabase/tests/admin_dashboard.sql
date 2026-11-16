BEGIN;
-- Real schema: wholesale applications have business_name, never company_name.
INSERT INTO contact_messages VALUES ('90000000-0000-0000-0000-000000000001','Customer','Question','unread','2026-11-12 10:00+05:30');
INSERT INTO wholesale_applications VALUES ('90000000-0000-0000-0000-000000000002','Studio One','pending','2026-11-12 11:00+05:30');
DO $$ DECLARE r jsonb; BEGIN
 r:=admin_dashboard_section('activity','2026-11-12','2026-11-13');
 ASSERT (r->>'unread')::integer=1 AND (r->>'wholesale')::integer=1;
 ASSERT jsonb_array_length(r->'events')=2;
 ASSERT r->'events'->0->>'name'='Studio One' AND r->'events'->0->>'kind'='wholesale';
 ASSERT r->'events'->1->>'label'='Question';
END $$;
INSERT INTO profiles(id,full_name,created_at) VALUES
 ('00000000-0000-0000-0000-000000000001','Returning','2026-01-01'),
 ('00000000-0000-0000-0000-000000000002','First-time','2026-11-12 00:00+05:30');
INSERT INTO orders(id,user_id,total,status,payment_status,created_at) VALUES
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',100,'pending','unpaid','2026-11-12 00:00+05:30'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001',500,'delivered','paid','2026-11-12 12:00+05:30'),
 ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002',200,'picked_up','partially_refunded','2026-11-12 23:59:59.999+05:30'),
 ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002',300,'cancelled','refunded','2026-11-12 11:00+05:30'),
 ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001',150,'delivered','paid','2026-11-11 23:59:59.999+05:30'),
 ('10000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001',999,'confirmed','unpaid','2026-11-13 00:00+05:30'),
 ('10000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001',100,'cancelled','paid','2026-11-12 11:30+05:30');
UPDATE orders SET order_type='pickup' WHERE id='10000000-0000-0000-0000-000000000003';
INSERT INTO order_refunds VALUES('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003',50,now());

DO $$ DECLARE r jsonb; BEGIN
 r:=admin_dashboard_section('orders','2026-11-12 00:00+05:30','2026-11-13 00:00+05:30','2026-11-12 20:00+05:30');
 ASSERT (r->'current'->>'count')::int=3 AND (r->'current'->>'allCount')::int=5;
 ASSERT (r->'current'->>'orderValue')::numeric=800, 'Gross order value excludes cancellations';
 ASSERT (r->'current'->>'retained')::numeric=750, 'Retained payments include cash awaiting a cancellation refund, subtract partial refunds, exclude unpaid totals';
 ASSERT (r->'current'->>'outstanding')::numeric=100;
 ASSERT (r->'current'->>'refundDue')::numeric=100, 'Legacy cancelled paid COD still needs a refund';
 ASSERT (r->'current'->>'refunded')::numeric=350;
 ASSERT (r->'current'->>'refundOrders')::int=2;
 ASSERT (r->'current'->>'completed')::int=2, 'Pickup and delivery both fulfil orders';
 ASSERT (r->'previous'->>'orderValue')::numeric=150, 'Previous period includes its entire final day';
 ASSERT jsonb_array_length(r->'trend')=1;
 ASSERT jsonb_array_length(r->'weekday')=7;
 ASSERT (r->'weekday'->4->>'orderValue')::numeric=800, 'Weekday uses IST, including the last local hour';
 ASSERT (r->'payments'->0->>'count')::integer=3 AND r->'payments'->0->>'method'='cod';
 ASSERT (r->'trend'->0->>'orderValue')::numeric=800;
 ASSERT (r->'trend'->0->>'previousOrderValue')::numeric=150;
 ASSERT jsonb_array_length(r->'recent')=5;
 r:=admin_dashboard_section('audience','2026-11-12 00:00+05:30','2026-11-13 00:00+05:30');
 ASSERT (r->>'ordering')::int=2 AND (r->>'new')::int=1 AND (r->>'returning')::int=1;
END $$;

-- Amended-order balances: received cash already includes completed settlements.
INSERT INTO orders(id,total,status,payment_status,created_at,edit_version,edit_paid_amount) VALUES
 ('30000000-0000-0000-0000-000000000001',1700,'confirmed','paid','2026-10-01',1,2000),
 ('30000000-0000-0000-0000-000000000002',2000,'confirmed','unpaid','2026-10-01',1,1700),
 ('30000000-0000-0000-0000-000000000003',1000,'cancelled','partially_refunded','2026-10-01',1,400),
 ('30000000-0000-0000-0000-000000000004',1000,'delivered','partially_refunded','2026-10-01',1,800),
 ('30000000-0000-0000-0000-000000000005',1000,'pending',NULL,'2026-10-01',0,NULL);
INSERT INTO orders(id,total,status,payment_status,created_at) VALUES ('30000000-0000-0000-0000-000000000006',1000,'delivered','paid','2026-10-01');
INSERT INTO order_refunds VALUES('20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000004',200,now());
INSERT INTO order_refunds VALUES('20000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000006',200,now());
INSERT INTO order_edit_settlements VALUES('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000003','refund','complete',600);
INSERT INTO order_edit_settlements VALUES('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','refund','reserved',300);
DO $$ DECLARE f record; r jsonb; BEGIN
 SELECT * INTO f FROM admin_dashboard_order_facts('30000000-0000-0000-0000-000000000001'); ASSERT f.retained=2000 AND f.refund_due=300;
 SELECT * INTO f FROM admin_dashboard_order_facts('30000000-0000-0000-0000-000000000002'); ASSERT f.retained=1700 AND f.balance_due=300;
 SELECT * INTO f FROM admin_dashboard_order_facts('30000000-0000-0000-0000-000000000003'); ASSERT f.retained=400 AND f.refund_due=400 AND f.refunded=600;
 SELECT * INTO f FROM admin_dashboard_order_facts('30000000-0000-0000-0000-000000000004'); ASSERT f.retained=800 AND f.balance_due=0 AND f.refunded=200, 'Amended item refunds must not be subtracted twice';
 SELECT * INTO f FROM admin_dashboard_order_facts('30000000-0000-0000-0000-000000000006'); ASSERT f.retained=800 AND f.refund_due=0, 'Recorded refunds are honored even if the legacy payment status still says paid';
 r:=admin_dashboard_section('operations','2026-11-12','2026-11-13','2026-11-13');
 ASSERT (r->'attention'->>'settlement')::int=2, 'Reserved settlements and unknown payments need review';
 r:=admin_dashboard_section('operations','2026-11-12','2026-11-13','2026-11-13',p_queue=>'refund');
 ASSERT (r->>'total')::int=3;
 r:=admin_dashboard_section('operations','2026-11-12','2026-11-13','2026-11-13',p_status=>'picked_up');
 ASSERT (r->>'total')::int=1 AND r->'orders'->0->>'order_type'='pickup';
END $$;

INSERT INTO products VALUES('50000000-0000-0000-0000-000000000001','Lipstick');
INSERT INTO product_variants VALUES
 ('60000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001',0,'Rose','LIP-ROSE'),
 ('60000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001',10,'Nude','LIP-NUDE'),
 ('60000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000001',11,'Coral','LIP-CORAL');
INSERT INTO categories VALUES('70000000-0000-0000-0000-000000000001','Makeup'),('70000000-0000-0000-0000-000000000002','Lips');
INSERT INTO product_categories VALUES('50000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001'),('50000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000002');
INSERT INTO order_items(id,order_id,product_id,product_name,variant_title,quantity,unit_price,line_discount_amount) VALUES
 ('80000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001','Lipstick','Nude',2,300,100);
INSERT INTO order_items(id,order_id,product_name,quantity,unit_price,is_gift,line_discount_amount) VALUES
 ('80000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Free gift',1,0,true,0);
UPDATE orders SET promo_code='SAVE100',promo_discount_amount=100,shipping_price=50,gift_card_discount=25,coin_discount_amount=25,shipping_label='Local delivery' WHERE id='10000000-0000-0000-0000-000000000002';
DO $$ DECLARE r jsonb; BEGIN
 r:=admin_dashboard_section('inventory','2026-11-12','2026-11-13');
 ASSERT (r->>'out')::int=1 AND (r->>'low')::int=1 AND (r->>'available')::int=2;
 ASSERT r->'items'->0->>'title'='Rose';
 r:=admin_dashboard_section('orders','2026-11-12 00:00+05:30','2026-11-13 00:00+05:30');
 ASSERT jsonb_array_length(r->'products')=1 AND (r->'products'->0->>'quantity')::int=2, 'Gift units excluded';
 ASSERT (r->'current'->>'promoOrders')::integer=1;
 ASSERT (r->'categories'->0->>'quantity')::int=2, 'Multi-category products do not multiply units';
 r:=admin_dashboard_order_detail('10000000-0000-0000-0000-000000000002');
 ASSERT jsonb_array_length(r->'items')=2 AND r->'items'->0->>'variant_title'='Nude';
 ASSERT (r->>'promo_discount_amount')::numeric=100 AND (r->>'shipping_price')::numeric=50;
 ASSERT (r->>'gift_card_discount')::numeric=25 AND (r->>'coin_discount_amount')::numeric=25;
END $$;

-- More than the Data API row limit, including queue pages and stock counts.
INSERT INTO orders(id,total,status,payment_status,created_at) SELECT md5('dashboard-order-'||n)::uuid,10,'failed_delivery','unpaid','2026-09-01 12:00+05:30' FROM generate_series(1,1200) n;
INSERT INTO product_variants SELECT md5('dashboard-variant-'||n)::uuid,'50000000-0000-0000-0000-000000000001',5,'Extra',n::text FROM generate_series(1,1200) n;
INSERT INTO traffic_log SELECT md5('traffic-'||n)::uuid,CASE WHEN n%2=0 THEN 'browser-a' ELSE 'browser-b' END,'/shop','2026-11-12 12:00+05:30' FROM generate_series(1,1200) n;
INSERT INTO traffic_log VALUES(md5('admin-view')::uuid,'admin','/admin','2026-11-12 12:00+05:30');
DO $$ DECLARE r jsonb; signature text; role_name text; BEGIN
 r:=admin_dashboard_section('orders','2026-09-01 00:00Z','2026-09-02 00:00Z');
 ASSERT (r->'current'->>'count')::int=1200 AND (r->'current'->>'orderValue')::numeric=12000;
 r:=admin_dashboard_section('operations','2026-11-12','2026-11-13',p_status=>'failed_delivery',p_page=>999);
 ASSERT (r->>'total')::int=1200 AND (r->>'page')::int=48 AND jsonb_array_length(r->'orders')=25;
 r:=admin_dashboard_section('inventory','2026-11-12','2026-11-13');
 ASSERT (r->>'total')::int=1203 AND (r->>'low')::int=1201;
 r:=admin_dashboard_section('audience','2026-11-12','2026-11-13','2026-11-12 20:00+05:30');
 ASSERT (r->'traffic'->>'views')::int=1200 AND (r->'traffic'->>'browsers')::int=2;
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
   FOREACH signature IN ARRAY ARRAY['public.admin_dashboard_order_facts(uuid)','public.admin_dashboard_order_detail(uuid)','public.admin_dashboard_section(text,timestamptz,timestamptz,timestamptz,text,text,integer)'] LOOP
     ASSERT NOT has_function_privilege(role_name,signature,'EXECUTE');
   END LOOP;
 END LOOP;
END $$;
SET LOCAL ROLE service_role;
DO $$ BEGIN ASSERT (admin_dashboard_section('inventory','2026-11-12','2026-11-13')->>'total')::int=1203; END $$;
RESET ROLE;
ROLLBACK;
