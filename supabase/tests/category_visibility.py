#!/usr/bin/env python3
"""Category visibility checks in a disposable local PostgreSQL cluster only."""
import os
import pathlib
import shutil
import subprocess
import tempfile

repo = pathlib.Path(__file__).resolve().parents[2]
binary = pathlib.Path(os.environ.get('PG_BIN', '/opt/homebrew/opt/postgresql@17/bin'))
base = pathlib.Path(tempfile.mkdtemp(prefix='tms-category-pg.', dir='/private/tmp'))
socket = base / 'socket'
socket.mkdir()
started = False


def run(args):
    result = subprocess.run([str(arg) for arg in args], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr[-5000:] + result.stdout[-1000:])
    return result.stdout


try:
    run([binary / 'initdb', '-D', base / 'data', '-A', 'trust', '--no-locale'])
    run([binary / 'pg_ctl', '-D', base / 'data', '-l', base / 'postgres.log',
         '-o', f"-k {socket} -h '' -p 55447", '-w', 'start'])
    started = True
    psql = [binary / 'psql', '-h', socket, '-p', '55447', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1']
    for file in [
        'supabase/tests/fixtures/financial_schema.sql',
        'supabase/migrations/20260706_create_loyalty_rewards.sql',
        'supabase/migrations/20260901_fix_loyalty_pending_balance.sql',
        'supabase/migrations/20260706_create_gift_cards.sql',
        'supabase/migrations/20261030072928_financial_checkout_security.sql',
        'supabase/migrations/20260716_add_partial_refund.sql',
        'supabase/tests/fixtures/promotion_schema.sql',
        'supabase/migrations/20261031083633_promotion_rules_and_order_allocations.sql',
        'supabase/migrations/20261102101444_bxgy_discount_pricing_mode.sql',
        'supabase/tests/fixtures/category_visibility_schema.sql',
    ]:
        run(psql + ['-f', repo / file])
    migration = repo / 'supabase/migrations/20261116064250_category_visibility_controls.sql'
    original_checkout = run(psql + ['-Atc', "SELECT prosrc FROM pg_proc WHERE oid='public.commit_secure_checkout(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,text)'::regprocedure"])
    for attempt in range(2):
        run(psql + ['-f', migration])
        assert original_checkout == run(psql + ['-Atc', "SELECT prosrc FROM pg_proc WHERE oid='public.commit_secure_checkout_catalog_base(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,text)'::regprocedure"])
        run(psql + ['-f', repo / 'supabase/tests/category_visibility.sql'])
        print(f'PASS {attempt + 1}: subtree/primary/shared products, safe reactivation, assignment guards, cycles, rollback, stale checkout and replay')
    for role in ['anon', 'authenticated']:
        for function in ['set_category_visibility(uuid,boolean,boolean)',
                         'commit_secure_checkout(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,text)',
                         'commit_secure_checkout_catalog_base(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,text)']:
            assert run(psql + ['-Atc', f"SELECT has_function_privilege('{role}','public.{function}','EXECUTE')"]).strip() == 'f'
    assert run(psql + ['-Atc', "SELECT count(*) FROM pg_proc WHERE proname IN ('set_category_visibility','commit_secure_checkout','commit_secure_checkout_catalog_base') AND prosecdef"]).strip() == '0'
    print('PASS: customer/public execution denied; no security-definer functions introduced')
    # A product activation or assignment started during deactivation cannot escape the cascade.
    category = '10000000-0000-4000-8000-000000000001'
    product = '20000000-0000-4000-8000-000000000001'
    run(psql + ['-c', f"INSERT INTO categories(id,name) VALUES('{category}','Concurrent category'); INSERT INTO products(id,name,category_id) VALUES('{product}','Concurrent product','{category}');"])
    def concurrent(first, second):
        process = subprocess.Popen([str(arg) for arg in psql], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        process.stdin.write("SET ROLE service_role; BEGIN; " + first + " SELECT pg_sleep(0.4); COMMIT;")
        process.stdin.close()
        # Wait for the first transaction to hold the catalog lock, without a timing assumption.
        import time
        for _ in range(100):
            held = run(psql + ['-Atc', "SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND classid=81736 AND objid=1 AND granted"])
            if held.strip() != '0':
                break
            time.sleep(0.01)
        else:
            raise AssertionError('First transaction did not acquire the catalog lock')
        other = subprocess.run([str(arg) for arg in psql], input='SET ROLE service_role; ' + second, text=True, capture_output=True)
        process.wait(timeout=10)
        assert process.returncode == 0, process.stderr.read()
        return other

    conflict = concurrent(f"SELECT set_category_visibility('{category}',false,true);", f"UPDATE products SET status='active' WHERE id='{product}';")
    assert conflict.returncode != 0 and 'Activate the product categories first.' in conflict.stderr
    assert run(psql + ['-Atc', f"SELECT status FROM products WHERE id='{product}'"]).strip() == 'inactive'
    run(psql + ['-c', f"UPDATE products SET category_id=null WHERE id='{product}'; UPDATE products SET status='active' WHERE id='{product}';"])
    conflict = concurrent(f"INSERT INTO product_categories VALUES('{product}','{category}');", f"UPDATE products SET status='active' WHERE id='{product}';")
    assert conflict.returncode != 0 and 'Activate the product categories first.' in conflict.stderr
    assert run(psql + ['-Atc', f"SELECT status FROM products WHERE id='{product}'"]).strip() == 'inactive'
    print('PASS: concurrent category deactivation/activation and inactive-category assignment/activation stay inactive')
    import json
    user = '40000000-0000-4000-8000-000000000001'
    variant = '30000000-0000-4000-8000-000000000001'
    run(psql + ['-c', f"SELECT set_category_visibility('{category}',true,false); UPDATE products SET status='active' WHERE id='{product}'; INSERT INTO profiles(id) VALUES('{user}'); INSERT INTO product_variants(id,product_id,stock,price) VALUES('{variant}','{product}',50,100);"])
    def json_sql(value):
        return "'" + json.dumps(value).replace("'", "''") + "'::jsonb"
    payload = json_sql({'total': 100, 'coin_discount_amount': 0, 'gift_card_discount': 0, 'promo_discount_amount': 0, 'bxgy_discount_amount': 0, 'payment_method': 'COD', 'payment_status': 'unpaid', 'shipping_price': 0, 'shipping_address': {}})
    items = json_sql([{'product_id': product, 'product_variant_id': variant, 'product_name': 'Concurrent product', 'quantity': 1, 'unit_price': 100, 'mrp': 100, 'is_gift': False}])
    stock_payload = json_sql([{'source': 'variant', 'id': variant, 'quantity': 1}])
    conflict = concurrent(f"SELECT set_category_visibility('{category}',false,true);", f"SELECT commit_secure_checkout('{user}','50000000-0000-4000-8000-000000000001',repeat('a',64),{payload},{items},{stock_payload},'[]',null);")
    assert conflict.returncode != 0 and 'A product is no longer available.' in conflict.stderr
    assert run(psql + ['-Atc', f"SELECT stock FROM product_variants WHERE id='{variant}'"]).strip() == '50'
    assert run(psql + ['-Atc', f"SELECT count(*) FROM orders WHERE user_id='{user}'"]).strip() == '0'
    print('PASS: checkout waiting on concurrent deactivation rechecks visibility and leaves orders/stock untouched')
finally:
    if started:
        subprocess.run([str(binary / 'pg_ctl'), '-D', str(base / 'data'), '-m', 'immediate', '-w', 'stop'], capture_output=True)
    shutil.rmtree(base)
