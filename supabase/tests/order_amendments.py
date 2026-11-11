"""Run only against the disposable order-edit fixture; never production."""
import json
import os
import shutil
import subprocess
import uuid

socket = os.environ['TMS_ORDER_EDIT_PG_SOCKET']
if not socket.startswith('/private/tmp/tms-order-edit-pg.') or not socket.endswith('/socket'):
    raise SystemExit('Refusing a connection outside the isolated order-edit cluster')
connection = [shutil.which('psql'), '-h', socket, '-p', '55439', '-d', 'postgres', '-qAt', '-v', 'ON_ERROR_STOP=1']


def query(sql, check=True):
    result = subprocess.run(connection, input='SET ROLE service_role;\n' + sql, text=True, capture_output=True)
    if check and result.returncode:
        raise AssertionError(result.stderr + '\n' + sql)
    return result


def scalar(sql):
    return query(sql).stdout.strip().splitlines()[-1]


def uid():
    return str(uuid.uuid4())


def js(value):
    return "'" + json.dumps(value).replace("'", "''") + "'::jsonb"


def race(first, second):
    processes = []
    for sql in [first, second]:
        process = subprocess.Popen(connection, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        process.stdin.write('SET ROLE service_role; SELECT pg_sleep(0.1); ' + sql)
        process.stdin.close()
        processes.append(process)
    results = []
    for process in processes:
        process.wait(timeout=25)
        results.append((process.returncode, process.stdout.read(), process.stderr.read()))
    return results


admin, customer, other = uid(), uid(), uid()
query(f"INSERT INTO profiles(id,is_admin) VALUES('{admin}',true),('{customer}',false),('{other}',false);")
query(f"INSERT INTO loyalty_points(user_id,balance) VALUES('{customer}',500);")


def variant(stock=100, price=100):
    product, variant_id = uid(), uid()
    query(f"INSERT INTO products(id,name) VALUES('{product}','Test product'); INSERT INTO product_variants(id,product_id,stock,price) VALUES('{variant_id}','{product}',{stock},{price});")
    return product, variant_id


def order(quantity=2, price=100, paid=False, coins=0, gift=0):
    product, variant_id = variant(price=price)
    order_id, item_id = uid(), uid()
    total = quantity * price - coins - gift
    query(f"INSERT INTO orders(id,user_id,status,order_type,payment_status,payment_method,razorpay_payment_id,total,shipping_price,promo_discount_amount,bxgy_discount_amount,gift_card_discount,coin_discount_amount,checkout_key) VALUES('{order_id}','{customer}','pending','delivery','{'paid' if paid else 'unpaid'}','{'razorpay' if paid else 'COD'}',{'NULL' if not paid else chr(39)+'pay_'+uuid.uuid4().hex+chr(39)},{total},0,0,0,{gift},{coins},'{uid()}');")
    query(f"INSERT INTO order_items(id,order_id,product_id,product_variant_id,product_name,variant_title,quantity,unit_price,mrp,is_gift,line_discount_amount) VALUES('{item_id}','{order_id}','{product}','{variant_id}','Test product','Rose',{quantity},{price},{price},false,0); UPDATE product_variants SET stock=stock-{quantity} WHERE id='{variant_id}';")
    if coins:
        query(f"INSERT INTO loyalty_transactions(user_id,type,amount,reference_type,reference_id,status) VALUES('{customer}','spend',{coins},'order','{order_id}','available');")
    card = None
    if gift:
        card = uid()
        query(f"INSERT INTO gift_cards(id,code,original_balance,remaining_balance,purchased_by) VALUES('{card}','TEST-{card}',500,500,'{customer}'); INSERT INTO gift_card_redemptions(gift_card_id,order_id,amount) VALUES('{card}','{order_id}',{gift});")
    return {'id': order_id, 'item': item_id, 'product': product, 'variant': variant_id, 'card': card}


def line(o, quantity=1, price=100, source=True):
    return {'source_item_id': o['item'] if source else None, 'product_id': o['product'], 'product_variant_id': o['variant'], 'gift_product_id': None,
            'product_name': 'Test product', 'variant_title': 'Rose', 'quantity': quantity, 'unit_price': price, 'mrp': price,
            'is_gift': False, 'line_discount_amount': 0, 'promotion_allocations': []}


def amendment(o, lines, gift=0, coins=0, key=None, request_hash='a'*64, revision=None, catalog=None, reason='Customer replacement'):
    revision = revision or scalar(f"SELECT order_edit_revision('{o['id']}')")
    variants = sorted(set([o['variant']] + [i['product_variant_id'] for i in lines if i['product_variant_id']]))
    array = 'ARRAY[' + ','.join("'%s'::uuid" % v for v in variants) + ']'
    catalog = catalog or scalar(f'SELECT order_edit_catalog_revision({array})')
    quote = {'lines': lines, 'promoDiscount': 0, 'bxgyDiscount': 0, 'shippingPrice': 0, 'giftCardDiscount': gift, 'coinDiscount': coins,
             'total': sum(i['quantity']*i['unit_price']-i['line_discount_amount'] for i in lines)-gift-coins,
             'validUntil': 4102444800000, 'priceContext': {'snapshot': {}, 'coupon': None, 'bases': {str(n): {'price': l['unit_price'], 'mrp': l['mrp'], 'categoryIds': [], 'brand': ''} for n,l in enumerate(lines)}}, 'promotions': [], 'pricingMode': 'preserve'}
    return f"SELECT commit_order_amendment('{o['id']}','{key or uid()}','{request_hash}','{admin}','{reason}','{revision}',{array},'{catalog}',{js(quote)});"


def settle(o, kind, amount, method='upi', key=None, reference=None, actor=None):
    return f"SELECT reserve_order_edit_settlement('{o['id']}','{key or uid()}','{actor or admin}','{kind}','{method}',{amount},'Test receipt','{reference or uid()}');"


o = order()
p, v = variant(price=150)
replacement = {'item': None, 'product': p, 'variant': v}
save = amendment(o, [line(o), line(replacement, 2, 150, False)])
query(save)
assert scalar(f"SELECT stock FROM product_variants WHERE id='{o['variant']}'") == '99'
assert scalar(f"SELECT stock FROM product_variants WHERE id='{v}'") == '98'
assert scalar(f"SELECT total FROM orders WHERE id='{o['id']}'") == '400.00'
assert scalar(f"SELECT count(*) FROM order_items WHERE id='{o['item']}'") == '1'
assert scalar(f"SELECT before_state->'order_items'->0->>'quantity' FROM order_amendments WHERE order_id='{o['id']}'") == '2'
query(save)
assert scalar(f"SELECT count(*) FROM order_amendments WHERE order_id='{o['id']}'") == '1'
assert query(save.replace('a'*64, 'b'*64), False).returncode != 0
print('PASS: add/remove, net stock, stable IDs, history and save replay')

before = scalar(f"SELECT get_order_edit_context('{o['id']}')")
bad = amendment(o, [line(o, 1000)])
assert query(bad, False).returncode != 0
assert scalar(f"SELECT get_order_edit_context('{o['id']}')") == before
foreign = order()
wrong = line(o); wrong['source_item_id'] = foreign['item']
assert query(amendment(o, [wrong]), False).returncode != 0
assert scalar(f"SELECT get_order_edit_context('{o['id']}')") == before
stale = amendment(o, [line(o)])
query(f"UPDATE orders SET updated_at=clock_timestamp() WHERE id='{o['id']}';")
assert query(stale, False).returncode != 0
expired = amendment(o, [line(o)]).replace('4102444800000', '1')
assert query(expired, False).returncode != 0
catalog_save = amendment(o, [line(o)])
query(f"UPDATE product_variants SET price=price+1 WHERE id='{o['variant']}';")
assert query(catalog_save, False).returncode != 0
print('PASS: insufficient stock, foreign item, stale order, expired quote and catalog change all reject safely')

zero = order(); query(f"UPDATE product_variants SET stock=0 WHERE id='{zero['variant']}';")
query(amendment(zero, [line(zero, 2)]))
assert scalar(f"SELECT stock FROM product_variants WHERE id='{zero['variant']}'") == '0'
print('PASS: own deducted stock is reusable without transient restocking')

credit = order(quantity=3, paid=True, gift=100, coins=100)
balance = int(scalar(f"SELECT balance FROM loyalty_points WHERE user_id='{customer}'"))
query(amendment(credit, [line(credit, 1, 50)], gift=50))
assert int(scalar(f"SELECT balance FROM loyalty_points WHERE user_id='{customer}'")) == balance+100
assert scalar(f"SELECT remaining_balance FROM gift_cards WHERE id='{credit['card']}'") == '450'
assert scalar(f"SELECT amount FROM gift_card_redemptions WHERE order_id='{credit['id']}'") == '50'
assert scalar(f"SELECT before_state->'gift_card_redemptions'->0->>'gift_card_id' FROM order_amendments WHERE order_id='{credit['id']}'") == credit['card']
assert scalar(f"SELECT after_state->'gift_card_redemptions'->0->>'amount' FROM order_amendments WHERE order_id='{credit['id']}'") == '50'
assert scalar(f"SELECT edit_refund_due FROM orders WHERE id='{credit['id']}'") == '100.00'
query(f"SELECT cancel_amended_order('{credit['id']}','{customer}','Customer cancelled');")
query(f"SELECT cancel_amended_order('{credit['id']}','{customer}','Customer cancelled');")
assert scalar(f"SELECT remaining_balance FROM gift_cards WHERE id='{credit['card']}'") == '500'
assert scalar(f"SELECT stock FROM product_variants WHERE id='{credit['variant']}'") == '100'
assert int(scalar(f"SELECT balance FROM loyalty_points WHERE user_id='{customer}'")) == balance+100
assert query(settle(credit, 'refund', 100, 'razorpay', actor=other), False).returncode != 0
credit_key = uid()
assert query(settle(credit, 'refund', 100, 'razorpay', key=credit_key, actor=customer), False).returncode == 0
assert query(settle(credit, 'refund', 100, 'razorpay', key=credit_key, actor=admin), False).returncode == 0
print('PASS: unused coins/gift credit returned once; cancellation returns only retained credits; refund owner checked')

late = order(quantity=3, gift=100, coins=100)
query("RESET ROLE; CREATE OR REPLACE FUNCTION test_late_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.reason='Fail late' THEN RAISE EXCEPTION 'Injected late error'; END IF; RETURN NEW; END $$; CREATE TRIGGER test_late_failure BEFORE INSERT ON order_amendments FOR EACH ROW EXECUTE FUNCTION test_late_failure();")
before = scalar(f"SELECT get_order_edit_context('{late['id']}')")
stock_before = scalar(f"SELECT stock FROM product_variants WHERE id='{late['variant']}'")
balance_before = scalar(f"SELECT balance FROM loyalty_points WHERE user_id='{customer}'")
gift_before = scalar(f"SELECT remaining_balance FROM gift_cards WHERE id='{late['card']}'")
assert query(amendment(late, [line(late, 1, 50)], gift=50, reason='Fail late'), False).returncode != 0
assert scalar(f"SELECT get_order_edit_context('{late['id']}')") == before
assert scalar(f"SELECT stock FROM product_variants WHERE id='{late['variant']}'") == stock_before
assert scalar(f"SELECT balance FROM loyalty_points WHERE user_id='{customer}'") == balance_before
assert scalar(f"SELECT remaining_balance FROM gift_cards WHERE id='{late['card']}'") == gift_before
query('RESET ROLE; DROP TRIGGER test_late_failure ON order_amendments; DROP FUNCTION test_late_failure();')
print('PASS: late failure rolls back items, inventory, money, credit ledgers and history together')

paid = order(paid=True)
query(amendment(paid, [line(paid, 3)]))
assert query(f"UPDATE orders SET status='shipped' WHERE id='{paid['id']}';", False).returncode != 0
record = json.loads(scalar(settle(paid, 'payment', 100)))
assert query(amendment(paid, [line(paid)]), False).returncode != 0
finish = f"SELECT finish_order_edit_settlement('{record['id']}','{record['reference']}');"
query(finish); query(finish)
assert scalar(f"SELECT edit_paid_amount FROM orders WHERE id='{paid['id']}'") == '300'
query(amendment(paid, [line(paid)]))
assert scalar(f"SELECT edit_refund_due FROM orders WHERE id='{paid['id']}'") == '200.00'
assert query(settle(paid, 'refund', 201), False).returncode != 0
record = json.loads(scalar(settle(paid, 'refund', 200, 'razorpay')))
query(f"SELECT finish_order_edit_settlement('{record['id']}','rfnd_test_{uid()}');")
assert scalar(f"SELECT edit_paid_amount FROM orders WHERE id='{paid['id']}'") == '100'
assert scalar(f"SELECT edit_refund_due FROM orders WHERE id='{paid['id']}'") == '0'
selection = [{'itemId': paid['item'], 'quantity': 1}]
return_key = uid()
assert query(f"SELECT reserve_promotion_refund('{paid['id']}','{return_key}',{js(selection)},'razorpay','{admin}','Return manual top-up');", False).returncode != 0
assert scalar(f"SELECT count(*) FROM promotion_refund_requests WHERE order_id='{paid['id']}'") == '0'
manual_return = json.loads(scalar(f"SELECT reserve_promotion_refund('{paid['id']}','{return_key}',{js(selection)},'gpay','{admin}','Return manual top-up');"))
query(f"SELECT finish_promotion_refund('{manual_return['id']}','UPI-top-up-return');")
assert scalar(f"SELECT edit_paid_amount FROM orders WHERE id='{paid['id']}'") == '0.00'
print('PASS: additional receipts, refund differences, pending-settlement guard, fulfillment guard and settlement replay')

returned = order(paid=True)
query(amendment(returned, [line(returned, 2)]))
request_id = uid()
selection = [{'itemId': returned['item'], 'quantity': 1}]
reserved = json.loads(scalar(f"SELECT reserve_promotion_refund('{returned['id']}','{request_id}',{js(selection)},'razorpay','{admin}','Return one');"))
query(f"SELECT finish_promotion_refund('{reserved['id']}','rfnd_return_test');")
assert scalar(f"SELECT edit_paid_amount FROM orders WHERE id='{returned['id']}'") == '100.00'
assert query(amendment(returned, [line(returned)]), False).returncode != 0
print('PASS: later item refunds reconcile amended cash and prevent rewriting returned items')

packed = order(); query(f"UPDATE orders SET status='packed' WHERE id='{packed['id']}';")
assert query(amendment(packed, [line(packed)]), False).returncode != 0
rev = scalar(f"SELECT order_edit_revision('{packed['id']}')")
query(f"SELECT reopen_order_packing('{packed['id']}','{rev}','{admin}','Customer replacement');")
query(amendment(packed, [line(packed)]))
assert scalar(f"SELECT status FROM orders WHERE id='{packed['id']}'") == 'confirmed'
assert scalar(f"SELECT count(*) FROM order_amendments WHERE order_id='{packed['id']}'") == '2'
print('PASS: packed orders require explicit audited reopening')

one, two = order(), order()
product, scarce = variant(stock=1)
target = {'product': product, 'variant': scarce, 'item': None}
results = race(amendment(one, [line(one), line(target, source=False)]), amendment(two, [line(two), line(target, source=False)]))
assert sum(code == 0 for code, _, _ in results) == 1, results
assert scalar(f"SELECT stock FROM product_variants WHERE id='{scarce}'") == '0'
print('PASS: competing order edits cannot oversell the final unit')

same = order(); save = amendment(same, [line(same)])
results = race(save, save)
assert all(code == 0 for code, _, _ in results), results
assert scalar(f"SELECT count(*) FROM order_amendments WHERE order_id='{same['id']}'") == '1'
assert scalar(f"SELECT stock FROM product_variants WHERE id='{same['variant']}'") == '99'
different = order(); results = race(amendment(different, [line(different)]), amendment(different, [line(different)]))
assert sum(code == 0 for code, _, _ in results) == 1, results
print('PASS: concurrent save replay applies once; competing drafts reject stale revisions')

assert scalar("SELECT has_table_privilege('anon','public.order_amendments','SELECT') OR has_table_privilege('authenticated','public.order_edit_settlements','INSERT')") == 'f'
for function in ['get_order_edit_context(uuid)', 'order_edit_catalog_revision(uuid[])', 'commit_order_amendment(uuid,uuid,text,uuid,text,text,uuid[],text,jsonb)', 'reserve_order_edit_settlement(uuid,uuid,uuid,text,text,numeric,text,text)', 'finish_order_edit_settlement(uuid,text)', 'cancel_amended_order(uuid,uuid,text)']:
    assert scalar(f"SELECT has_function_privilege('anon','public.{function}','EXECUTE') OR has_function_privilege('authenticated','public.{function}','EXECUTE')") == 'f'
print('PASS: amendment history, settlements and financial RPCs are service-only')
