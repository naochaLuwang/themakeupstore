"""Isolated fixture only; importing the baseline runs its rollback/concurrency checks."""
import json
from order_amendments import (
    admin, amendment, customer, js, line, order, query, scalar, settle, uid, race,
)


def discounted(o, amount, quantity=2, coupon=0, requested=None, reason='Service concession'):
    item = line(o, quantity)
    item['line_discount_amount'] = round(amount + coupon, 2)
    return amendment(o, [item], coupon=coupon, manual={
        'applied': amount, 'requested': amount if requested is None else requested, 'reason': reason,
    })


paid = order(paid=True)
stock = scalar(f"SELECT stock FROM product_variants WHERE id='{paid['variant']}'")
save = discounted(paid, 30)
query(save)
query(save)
state = json.loads(scalar(f"SELECT get_order_edit_context('{paid['id']}')"))
assert state['order']['total'] == 170
assert state['order']['edit_paid_amount'] == 200
assert state['order']['edit_refund_due'] == 30
assert state['order']['manual_discount_amount'] == 30
assert state['order']['promo_discount_amount'] == 0
assert len(state['history']) == 1
assert state['history'][0]['before_state']['manual_discount_amount'] == 0
assert state['history'][0]['after_state']['manual_discount_reason'] == 'Service concession'
assert scalar(f"SELECT stock FROM product_variants WHERE id='{paid['variant']}'") == stock
assert query(amendment(paid, [line(paid, 2)]), False).returncode != 0  # old tab cannot erase discount
receipt = json.loads(scalar(settle(paid, 'refund', 30)))
query(f"SELECT finish_order_edit_settlement('{receipt['id']}','{receipt['reference']}');")
query(discounted(paid, 0, reason='Concession withdrawn'))
assert scalar(f"SELECT edit_balance_due FROM orders WHERE id='{paid['id']}'") == '30.00'
print('PASS: discount-only save/replay, unchanged stock, audited reason, old-tab guard, refund and removal balance')

legacy = order(paid=True)
query(f"UPDATE orders SET total=170,promo_discount_amount=30 WHERE id='{legacy['id']}';")
query(discounted(legacy, 30, reason='Retained historical concession'))
assert scalar(f"SELECT promo_discount_amount FROM orders WHERE id='{legacy['id']}'") == '0'
assert scalar(f"SELECT manual_discount_amount FROM orders WHERE id='{legacy['id']}'") == '30'
assert scalar(f"SELECT total FROM orders WHERE id='{legacy['id']}'") == '170.00'
assert scalar(f"SELECT edit_refund_due FROM orders WHERE id='{legacy['id']}'") == '0'

capped = order()
query(discounted(capped, 200, requested=300))
assert scalar(f"SELECT manual_discount_requested FROM orders WHERE id='{capped['id']}'") == '300'
query(discounted(capped, 300, quantity=4, requested=300))
assert scalar(f"SELECT total FROM orders WHERE id='{capped['id']}'") == '100.00'
print('PASS: legacy discounts separate only on reviewed save; requested cap survives later basket increase')

coupon = order(paid=True)
query(f"UPDATE orders SET promo_code='SAVE20',promo_discount_amount=20,total=180 WHERE id='{coupon['id']}';")
query(discounted(coupon, 30.01, coupon=20))
assert scalar(f"SELECT total FROM orders WHERE id='{coupon['id']}'") == '149.99'
assert scalar(f"SELECT promo_discount_amount FROM orders WHERE id='{coupon['id']}'") == '20'
assert scalar(f"SELECT manual_discount_amount FROM orders WHERE id='{coupon['id']}'") == '30.01'
receipt = json.loads(scalar(settle(coupon, 'refund', 30.01)))
query(f"SELECT finish_order_edit_settlement('{receipt['id']}','{receipt['reference']}');")
for index in range(2):
    reserved = json.loads(scalar(f"SELECT reserve_promotion_refund('{coupon['id']}','{uid()}',{js([{'itemId': coupon['item'], 'quantity': 1}])},'gpay','{admin}','Partial return');"))
    query(f"SELECT finish_promotion_refund('{reserved['id']}','partial-discount-return-{uid()}');")
assert scalar(f"SELECT sum(amount) FROM order_refunds WHERE order_id='{coupon['id']}'") == '149.99'
assert scalar(f"SELECT edit_paid_amount FROM orders WHERE id='{coupon['id']}'") == '0.00'
print('PASS: coupon + manual discount remain separate; successive partial returns refund exact discounted paise')

invalid = order()
for values in [(-1, -1, 'Invalid'), (201, 201, 'Too large'), (1.001, 1.001, 'Fractional paise'), (10, 10, ''), (10, 10, 'x'*1001), (10, None, 'Missing amount')]:
    applied, requested, reason = values
    item = line(invalid, 2)
    item['line_discount_amount'] = max(0, applied)
    before = scalar(f"SELECT get_order_edit_context('{invalid['id']}')")
    result = query(amendment(invalid, [item], manual={'applied': applied, 'requested': requested, 'reason': reason}), False)
    assert result.returncode != 0, values
    assert scalar(f"SELECT get_order_edit_context('{invalid['id']}')") == before

late = order(quantity=3, gift=100, coins=100)
query("RESET ROLE; CREATE FUNCTION test_manual_late_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected late error'; END $$; CREATE TRIGGER test_manual_late_failure BEFORE INSERT ON order_amendments FOR EACH ROW EXECUTE FUNCTION test_manual_late_failure();")
before = scalar(f"SELECT get_order_edit_context('{late['id']}')")
balance = scalar(f"SELECT balance FROM loyalty_points WHERE user_id='{customer}'")
gift = scalar(f"SELECT remaining_balance FROM gift_cards WHERE id='{late['card']}'")
item = line(late, 3)
item['line_discount_amount'] = 300
assert query(amendment(late, [item], manual={'applied': 300, 'requested': 300, 'reason': 'Service concession'}), False).returncode != 0
assert scalar(f"SELECT get_order_edit_context('{late['id']}')") == before
assert scalar(f"SELECT balance FROM loyalty_points WHERE user_id='{customer}'") == balance
assert scalar(f"SELECT remaining_balance FROM gift_cards WHERE id='{late['card']}'") == gift
query('RESET ROLE; DROP TRIGGER test_manual_late_failure ON order_amendments; DROP FUNCTION test_manual_late_failure();')
query(amendment(late, [item], manual={'applied': 300, 'requested': 300, 'reason': 'Service concession'}))
assert scalar(f"SELECT balance FROM loyalty_points WHERE user_id='{customer}'") == str(int(balance)+100)
assert scalar(f"SELECT remaining_balance FROM gift_cards WHERE id='{late['card']}'") == str(int(gift)+100)
assert scalar(f"SELECT total FROM orders WHERE id='{late['id']}'") == '0.00'
query(f"SELECT cancel_amended_order('{late['id']}','{admin}','Customer cancelled');")
query(f"SELECT cancel_amended_order('{late['id']}','{admin}','Customer cancelled');")
assert scalar(f"SELECT balance FROM loyalty_points WHERE user_id='{customer}'") == str(int(balance)+100)
assert scalar(f"SELECT remaining_balance FROM gift_cards WHERE id='{late['card']}'") == str(int(gift)+100)
assert scalar(f"SELECT stock FROM product_variants WHERE id='{late['variant']}'") == '100'
print('PASS: invalid amounts/reasons rejected; late failure rolls back all credits/history; unused credits return once')

competing = order()
results = race(discounted(competing, 20), discounted(competing, 30))
assert sum(code == 0 for code, _, _ in results) == 1, results
same = order()
save = discounted(same, 10)
assert all(code == 0 for code, _, _ in race(save, save))
assert scalar(f"SELECT count(*) FROM order_amendments WHERE order_id='{same['id']}'") == '1'
print('PASS: concurrent discount drafts reject stale revisions; identical concurrent retry applies once')
