BEGIN;
INSERT INTO auth.users VALUES
 ('00000000-0000-0000-0000-000000000001','Anita@example.test'),
 ('00000000-0000-0000-0000-000000000002','repeat@example.test'),
 ('00000000-0000-0000-0000-000000000003',NULL),
 ('00000000-0000-0000-0000-000000000004','deleted@example.test');
INSERT INTO profiles(id,full_name,phone,created_at,deleted_at) VALUES
 ('00000000-0000-0000-0000-000000000001','Anita','+91 98765-43210','2026-11-11 18:30:00+00',NULL),
 ('00000000-0000-0000-0000-000000000002','Repeat buyer','12345','2026-11-12 18:29:59.999+00',NULL),
 ('00000000-0000-0000-0000-000000000003','No email',NULL,'2026-11-12 18:30:00+00',NULL),
 ('00000000-0000-0000-0000-000000000004','Deleted',NULL,now(),now());
INSERT INTO orders VALUES
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',500,'confirmed','paid',now()),
 ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001',900,'cancelled','paid',now()),
 ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003',900,'cancelled','paid',now());
INSERT INTO orders SELECT md5('order-'||s)::uuid,'00000000-0000-0000-0000-000000000002',10,'delivered','paid',now() FROM generate_series(1,1200) s;
INSERT INTO profiles(id,full_name,created_at) SELECT md5('profile-'||s)::uuid,'Extra '||s,now() - interval '100 days' FROM generate_series(1,1100) s;

DO $$ DECLARE r jsonb; BEGIN
  r := public.admin_customer_directory();
  ASSERT (r->>'total')::integer = 1103, 'Customers cannot be truncated by API row limits';
  ASSERT jsonb_array_length(r->'customers') = 25, 'Directory is paginated';
  ASSERT (r->>'active30d')::integer = 2, 'Active customer count deduplicates orders and excludes cancelled-only buyers';
  r := public.admin_customer_directory(p_search => 'ANITA@EXAMPLE');
  ASSERT (r->>'total')::integer = 1, 'Email search is case insensitive and uses Auth';
  ASSERT r->'customers'->0->>'email' = 'Anita@example.test';
  ASSERT (r->'customers'->0->>'order_count')::integer = 1;
  ASSERT (r->'customers'->0->>'order_value')::numeric = 500, 'Cancelled orders excluded';
  r := public.admin_customer_directory(p_search => '9876543210');
  ASSERT (r->>'total')::integer = 1, 'Phone search ignores stored formatting';
  r := public.admin_customer_directory(p_search => 'Repeat buyer');
  ASSERT (r->'customers'->0->>'order_count')::integer = 1200, 'Order totals cannot be truncated';
  ASSERT (r->'customers'->0->>'order_value')::numeric = 12000;
  r := public.admin_customer_directory(p_from => '2026-11-12 00:00+05:30', p_before => '2026-11-13 00:00+05:30');
  ASSERT (r->>'total')::integer = 2, 'IST range uses inclusive start and exclusive next midnight';
  r := public.admin_customer_directory(p_customer_id => '00000000-0000-0000-0000-000000000004');
  ASSERT (r->>'total')::integer = 0, 'Deleted customer cannot be viewed';
  r := public.admin_customer_directory(p_search => '%');
  ASSERT (r->>'total')::integer = 0, 'Search wildcards are literal';
  r := public.admin_customer_directory(p_page => 99999);
  ASSERT r->>'page' = r->>'totalPages', 'Out-of-range page clamps to last';
  ASSERT jsonb_array_length(r->'customers') = 3;
  r := public.admin_customer_directory(p_search => 'no match', p_page => 9);
  ASSERT (r->>'page')::integer = 1 AND (r->>'totalPages')::integer = 1 AND r->'customers' = '[]'::jsonb;
END $$;

INSERT INTO carts VALUES
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',now() - interval '2 hours',NULL),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',now() - interval '3 hours',now()),
 ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003',now() - interval '4 hours',NULL),
 ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000004',now() - interval '2 hours',NULL),
 ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001',now() - interval '5 hours',NULL),
 ('10000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001',now() - interval '6 hours',NULL);
INSERT INTO cart_items VALUES
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',3),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001',2),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002',1),
 ('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000003',1),
 ('20000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000004',1),
 ('20000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000006',0);
INSERT INTO carts SELECT md5('recent-cart-'||s)::uuid,'00000000-0000-0000-0000-000000000001',now(),NULL FROM generate_series(1,80) s;
INSERT INTO cart_items SELECT md5('recent-item-'||s)::uuid,md5('recent-cart-'||s)::uuid,1 FROM generate_series(1,80) s;

DO $$ DECLARE r jsonb; BEGIN
  r := public.admin_cart_recovery_directory();
  ASSERT (r->>'total')::integer = 3, 'Recent carts must not push abandoned carts out of the result';
  ASSERT (r->'stats'->>'recent')::integer = 80, 'Recent count covers actual recent non-empty carts';
  ASSERT (r->'stats'->>'pending')::integer = 2 AND (r->'stats'->>'sent')::integer = 1;
  ASSERT (r->'stats'->>'unreachable')::integer = 1;
  ASSERT (r->'carts'->0->>'item_count')::integer = 5, 'Counts units, rather than lines';
  ASSERT r->'carts'->0->>'email' = 'Anita@example.test';
  r := public.admin_cart_recovery_directory(p_status => 'sent');
  ASSERT (r->>'total')::integer = 1;
  ASSERT (r->'stats'->>'pending')::integer = 2, 'Cards are independent of table filter';
  r := public.admin_cart_recovery_directory(p_status => 'pending', p_page_size => 1, p_page => 99);
  ASSERT (r->>'total')::integer = 2 AND (r->>'page')::integer = 2;
  ASSERT jsonb_array_length(r->'carts') = 1;
  r := public.admin_cart_recovery_directory(p_status => 'pending', p_recoverable_only => true);
  ASSERT (r->>'total')::integer = 1, 'Unreachable carts cannot starve scheduled email batches';
  INSERT INTO carts VALUES ('10000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001',now() - interval '10 hours',NULL);
  INSERT INTO cart_items VALUES ('20000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000007',1);
  r := public.admin_cart_recovery_directory(p_status => 'pending', p_recoverable_only => true, p_page_size => 1);
  ASSERT r->'carts'->0->>'id' = '10000000-0000-0000-0000-000000000007', 'Scheduled batches start with oldest reachable carts';
  DELETE FROM cart_items WHERE id = '20000000-0000-0000-0000-000000000007';
  DELETE FROM carts WHERE id = '10000000-0000-0000-0000-000000000007';
END $$;

-- No public, authenticated or anonymous access to PII-reporting functions.
DO $$ DECLARE role_name text; signature text; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    FOREACH signature IN ARRAY ARRAY[
      'public.admin_customer_directory(text,timestamptz,timestamptz,integer,integer,uuid)',
      'private.admin_customer_directory(text,timestamptz,timestamptz,integer,integer,uuid)',
      'public.admin_cart_recovery_directory(integer,integer,text,boolean)',
      'private.admin_cart_recovery_directory(integer,integer,text,boolean)'
    ] LOOP
      ASSERT NOT has_function_privilege(role_name, signature, 'EXECUTE'), 'Report must be service-only';
    END LOOP;
  END LOOP;
  ASSERT NOT has_table_privilege('service_role','auth.users','SELECT'), 'No direct Auth-table grant was added';
END $$;
SET LOCAL ROLE service_role;
DO $$ BEGIN
  ASSERT (public.admin_customer_directory()->>'total')::integer = 1103;
  ASSERT (public.admin_cart_recovery_directory()->>'total')::integer = 3;
END $$;
RESET ROLE;
ROLLBACK;
