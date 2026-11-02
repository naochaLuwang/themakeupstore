"""Isolated local fixture tests only. Never point this runner at production."""
import json
import os
import shutil
import subprocess
import uuid

socket = os.environ["TMS_TEST_PG_SOCKET"]
if not socket.startswith("/private/tmp/tms-finance-pg."):
    raise SystemExit("Refusing a connection outside the isolated local test cluster")
psql = os.environ.get("TMS_TEST_PSQL") or shutil.which("psql")
connection = [psql, "-h", socket, "-p", os.environ.get("TMS_TEST_PG_PORT", "55435"), "-d", "postgres", "-qAt", "-v", "ON_ERROR_STOP=1"]


def query(sql, check=True):
    result = subprocess.run(connection, input="SET ROLE service_role;\n" + sql, text=True, capture_output=True)
    if check and result.returncode:
        raise AssertionError(result.stderr)
    return result


def scalar(sql):
    return query(sql).stdout.strip()


def race(first, second):
    processes = []
    for sql in [first, second]:
        process = subprocess.Popen(connection, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        process.stdin.write("SET ROLE service_role; SELECT pg_sleep(0.15); " + sql)
        process.stdin.close()
        processes.append(process)
    results = []
    for process in processes:
        process.wait(timeout=20)
        results.append((process.returncode, process.stdout.read().strip(), process.stderr.read()))
    return results


def as_json(value):
    return "'" + json.dumps(value).replace("'", "''") + "'::jsonb"


users = [str(uuid.uuid4()) for _ in range(4)]
product, variant, card, scarce = [str(uuid.uuid4()) for _ in range(4)]
card_code = "TEST-" + uuid.uuid4().hex.upper()
query("INSERT INTO profiles(id) VALUES " + ",".join("('%s')" % user for user in users) + ";")
query(f"INSERT INTO products VALUES('{product}','Concurrency fixture'); INSERT INTO product_variants VALUES('{variant}','{product}',100,100),('{scarce}','{product}',1,100);")
query(f"INSERT INTO loyalty_points(user_id,balance,lifetime_earned,tier) VALUES('{users[0]}',100,100,'bronze'),('{users[3]}',100,100,'bronze');")
query(f"INSERT INTO gift_cards(id,code,original_balance,remaining_balance,purchased_by) VALUES('{card}','{card_code}',100,100,'{users[0]}');")


def checkout(user, coins=0, gift=0, key=None, item_variant=None):
    item_variant = item_variant or variant
    order = {"total": 100 - coins - gift, "coin_discount_amount": coins, "gift_card_discount": gift,
             "promo_discount_amount": 0, "bxgy_discount_amount": 0, "payment_method": "COD", "payment_status": "unpaid",
             "shipping_price": 0, "shipping_method_id": str(uuid.UUID(int=30)), "shipping_label": "Fixture", "shipping_address": {}}
    items = [{"product_id": product, "product_variant_id": item_variant, "product_name": "Fixture", "quantity": 1,
              "unit_price": 100, "mrp": 100, "is_gift": False}]
    stock = [{"source": "variant", "id": item_variant, "quantity": 1}]
    return "SELECT public.commit_secure_checkout('%s','%s','%s',%s,%s,%s,'[]','%s');" % (
        user, key or uuid.uuid4(), "a" * 64, as_json(order), as_json(items), as_json(stock), card_code)


results = race(checkout(users[0], coins=80), checkout(users[0], coins=80))
assert sum(code == 0 for code, _, _ in results) == 1, results
assert scalar(f"SELECT balance FROM loyalty_points WHERE user_id='{users[0]}'") == "20"
assert scalar(f"SELECT count(*) FROM orders WHERE user_id='{users[0]}'") == "1"
print("PASS: concurrent coin spending allows only one discounted order")

results = race(checkout(users[1], gift=80), checkout(users[2], gift=80))
assert sum(code == 0 for code, _, _ in results) == 1, results
assert scalar(f"SELECT remaining_balance FROM gift_cards WHERE id='{card}'") == "20"
print("PASS: concurrent gift-card spending cannot exceed its balance")

retry_key = str(uuid.uuid4())
statement = checkout(users[0], coins=10, key=retry_key)
results = race(statement, statement)
assert all(code == 0 for code, _, _ in results), results
responses = [json.loads(out.splitlines()[-1]) for _, out, _ in results]
assert responses[0]["order_id"] == responses[1]["order_id"]
assert scalar(f"SELECT balance FROM loyalty_points WHERE user_id='{users[0]}'") == "10"
assert scalar(f"SELECT count(*) FROM orders WHERE user_id='{users[0]}' AND checkout_key='{retry_key}'") == "1"
print("PASS: concurrent duplicate confirmation spends once and returns one order")

results = race(checkout(users[1], item_variant=scarce), checkout(users[2], item_variant=scarce))
assert sum(code == 0 for code, _, _ in results) == 1, results
assert scalar(f"SELECT stock FROM product_variants WHERE id='{scarce}'") == "0"
print("PASS: concurrent checkouts cannot oversell the last stock unit")

earned = json.loads(scalar(checkout(users[3])))["order_id"]
spent = json.loads(scalar(checkout(users[3], coins=50)))["order_id"]
query(f"UPDATE orders SET status='delivered' WHERE id='{earned}';")
assert scalar(f"SELECT release_fulfilled_order_points('{earned}')") == "1"
assert scalar(f"SELECT balance FROM loyalty_points WHERE user_id='{users[3]}'") == "51"
assert scalar(f"SELECT release_fulfilled_order_points('{earned}')") == "0"
assert scalar(f"SELECT lifetime_earned FROM loyalty_points WHERE user_id='{users[3]}'") == "101"
query(f"UPDATE orders SET status='cancelled' WHERE id='{spent}';")
assert scalar(f"SELECT reverse_order_coin_redemption('{spent}')") == "50"
assert scalar(f"SELECT reverse_order_coin_redemption('{spent}')") == "0"
assert scalar(f"SELECT balance FROM loyalty_points WHERE user_id='{users[3]}'") == "101"
print("PASS: fulfilled points use the current balance and release/refund only once")

purchase = str(uuid.uuid4())
payment_id = "pay_" + uuid.uuid4().hex
query(f"INSERT INTO gift_card_purchases(id,user_id,amount,provider_order_id) VALUES('{purchase}','{users[0]}',500,'order_{uuid.uuid4().hex}');")
statement = f"SELECT activate_paid_gift_card('{purchase}','{users[0]}','{payment_id}','TEST-{uuid.uuid4().hex}');"
results = race(statement, statement)
assert all(code == 0 for code, _, _ in results), results
responses = [json.loads(out.splitlines()[-1]) for _, out, _ in results]
assert responses[0] == responses[1]
assert scalar(f"SELECT count(*) FROM gift_cards WHERE id='{responses[0]['id']}'") == "1"
print("PASS: concurrent gift-card activation issues one card")

other_purchase = str(uuid.uuid4())
query(f"INSERT INTO gift_card_purchases(id,user_id,amount,provider_order_id) VALUES('{other_purchase}','{users[1]}',500,'order_{uuid.uuid4().hex}');")
result = query(f"SELECT activate_paid_gift_card('{other_purchase}','{users[1]}','{payment_id}','TEST-REPLAY');", check=False)
assert result.returncode != 0
assert scalar(f"SELECT gift_card_id IS NULL FROM gift_card_purchases WHERE id='{other_purchase}'") == "t"
print("PASS: a payment cannot activate another purchase")
