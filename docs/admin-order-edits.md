# Admin order edits

Implemented locally on 10 November 2026. Requires the migration below and a matching web deployment. No production orders, stock, balances or payments were changed during development.

## Manual discounts — 21 November 2026

Implemented locally; migration and matching web deployment remain pending.

- **Review totals → Manual discount · ₹** accepts a fixed amount with up to two decimal places, from zero to ₹100,000,000. Add, change or remove it independently of item quantities. A discount reason (3–1,000 characters) and the existing amendment reason/review/save are required. Removing a discount also records its reason.
- Manual savings can combine with coupons and BXGY. They apply to paid merchandise after those offers, before delivery, extra charges and redeemed credits. They do not change campaign/gift qualification thresholds or discount delivery, extra charges or free units.
- The applied amount is capped at remaining merchandise. The requested amount is retained separately and shown in review when capped, so a later basket increase can restore the agreed amount. Previously returned credits are never spent again automatically.
- Dedicated `manual_discount_amount`, `manual_discount_requested` and `manual_discount_reason` fields separate the concession from `promo_discount_amount`. Historical no-code discounts remain readable in their original column and are separated only during the next reviewed amendment; migration does not backfill rows. Where a legacy reason was absent, review labels it “Retained existing manual discount”.
- The server calculates exact per-line allocations after coupon/BXGY savings; partial refunds use those net line amounts. Requested/applied discount and reason participate in the review hash and before/after audit. Stock/payment/credit/retry/revision guards remain part of the same transaction. Old tabs cannot erase a dedicated discount by omitting the new quote fields.
- Invoice/thermal invoice, customer order history, checkout receipt, UUID tracking and dashboard quick view show manual savings separately. The internal reason is displayed in the admin invoice/history, not public tracking/customer summaries. The checkout receipt also includes existing extra charges and gift-card credit in its fetched breakdown.
- Save changes updates the amount to collect/refund; payment recording and actual Razorpay/manual refunds still use the separate settlement workflow.

### Rollout

Apply `supabase/migrations/20261121090717_admin_order_manual_discounts.sql` **after all earlier pending migrations**, including order amendments and reporting, before deploying this web revision in the existing checkout maintenance window. Do not reapply the older order-amendment/reporting function definitions afterward. The migration adds fields and replaces the service-only amendment RPC; if dashboard reporting is installed, it also extends its existing private detail projection while preserving grants. No new environment variable or native build is required.

### Verification

- All 605 web tests, TypeScript and the production web build pass. Changed core/editor modules are lint-clean; existing invoice/customer lint debt is unchanged.
- Isolated PostgreSQL checks cover the earlier amendment suite plus discount-only save/removal/replay, unchanged stock, legacy conversion, caps across later increases, coupon coexistence, exact successive partial refunds, invalid inputs, credit rollback/return/cancellation, competing discount drafts and duplicate concurrent saves. Migration reapplication preserves every order; dashboard amounts and service-only/fixed-search-path invoker privileges are checked.
- Run `TMS_ORDER_EDIT_PG_SOCKET=/private/tmp/tms-order-edit-pg.<test-directory>/socket python3 supabase/tests/order_manual_discounts.py` after preparing the original isolated amendment fixture and applying the new migration. It imports/runs the baseline amendment suite first; it refuses non-fixture connections. It does not exercise real Razorpay transfers.
- Security advisors ran against the disposable fixture. Findings are limited to its legacy trigger search paths and intentionally incomplete base-table RLS setup; neither changed function is flagged. This is not a production security-advisor result.
- Browser checks mount the actual editor with intercepted/mock actions at 320/390/1440px: a ₹200.25 discount alongside a ₹100 coupon gives ₹1,699.75 from ₹2,000 merchandise, with ₹200.25 due back against ₹1,900 received. Explicit review/save, removal/discard, dialog bounds and no page overflow/errors pass. No production SQL, orders, stock, credit, payment, email or native files were changed.

## Admin workflow

Open **Orders → Edit** or **Order invoice → Edit order**. Both desktop and mobile lists have the action again.

- Remove a product, change its quantity, or search by product name/SKU and add the exact shade. Search returns up to 100 variants; refine by name or SKU for larger matches. Sold-out and fully allocated choices are disabled.
- All changes stay in a draft. Removing an item does not write to the database. Discard restores the saved items.
- The server automatically calculates merchandise, BXGY, coupons, gifts, delivery, existing extra charges, gift-card credit, M Coins, the total and the amount to collect/refund.
- Enter a reason, select **Review changes**, then **Save changes**. A fresh calculation must match the reviewed financial breakdown. A changed order, changed catalog, insufficient inventory or expired review rejects the save.
- Removing every paid item offers cancellation rather than creating an empty order. Cancellation affects the saved order and uses its existing cancellation/refund checks.
- Pending and confirmed orders are editable. Packed orders require an explicit, audited reopening. Dispatched/completed orders and orders with returns/item refunds remain protected.

The invoice's former immediate-remove/discount panel and the old nontransactional POS save path are retired. Compatibility actions authorize the admin and direct old tabs to the reviewed editor.

## Pricing policy

**Keep existing prices and original offers** is the default. Existing quantities retain their original normal-price basis. Added quantities use the current selling price. The shared promotion engine reevaluates the original campaign's scope, quantities and thresholds, including replacement/combination BXGY and coupon allocations. Existing campaign contracts are not disqualified solely because their dates or global usage caps have since expired.

New checkout orders now save the campaign definitions, coupon definition and original normal-price bases needed for that calculation. Each amendment saves the bases for its resulting item IDs. Unchanged price groups retain their item IDs; removed/replaced rows remain in the audit's complete before/after snapshots.

Older orders that used offers but lack those definitions require the explicit **Use current prices and offers** choice. Historical rules and allocations are not guessed. That choice recalculates every item using current prices and available campaigns. The order's own previous promotion claims are excluded from once-per-customer checks and claim counters are not incremented twice. Claim history is retained even when an offer stops applying.

Retail additions use the same normal/flash-price selection and promotion engine as checkout. Wholesale additions use the configured primary-category wholesale rate, matching existing wholesale order creation; retail automatic campaigns are not newly awarded to wholesale orders. The catalog search displays retail prices and the review explains the wholesale amounts.

Delivery is recalculated against the original active method/address and the store's free-delivery threshold. If the original method is inactive, deleted or no longer belongs to the address, the saved delivery charge is retained with a review warning. Manual discounts can be changed in the reviewed draft and are capped at revised merchandise after other offers; existing extra charges remain unchanged. This editor does not accept arbitrary browser-supplied unit prices or introduce new credit spending.

## Payments, credits and cancellation

`orders.total` is the revised cash price after credits. `edit_paid_amount` is the cash actually received, net of completed refunds. `edit_balance_due` and `edit_refund_due` track the difference. The original Razorpay payment ID, payment-use ledger and checkout request identity remain intact.

- Unpaid COD/invoice orders receive a revised amount to collect.
- Additional payments are recorded after receipt by cash, UPI or bank transfer, with an amount, reference and reason. The editor does not create a payment link or charge a saved payment method.
- Refunds can be issued against the remaining original Razorpay payment, or recorded after a manual refund. Gateway refunds use a durable reserved request and the same provider idempotency key after a timeout. A retry never starts a second refund.
- A reserved settlement blocks further edits and item refunds until reconciled. Another authorized admin can resume the same pending settlement without changing its amount/method/details.
- Previously redeemed credit can be retained or returned, never silently increased. Unused M Coins are returned under a balance lock and the retained spend is recorded. Gift-card balances and retained redemption amounts are updated together, so cancellation only returns what remains redeemed.
- Historical credit amounts must match their original debit ledgers before editing. The private before/after audit includes debit records and gift-card identities, including when an unused redemption is completely returned.
- Pending earned coins are recalculated without releasing available coins. Later supported item refunds update net cash and preserve the refunded item history. An item refund cannot draw more than the remaining original gateway allocation; additional cash/UPI receipts require a recorded manual refund.
- Amended cancellation returns stock/retained credits once. It attempts the remaining original Razorpay refund; additional/manual receipts remain explicitly refundable in the editor. Cancellation can succeed while a gateway refund needs retry, and the result reports the outstanding refund.

Edited online orders cannot proceed to dispatch with an unpaid amendment balance. Outstanding refunds also block further fulfillment. Edited COD orders can dispatch unpaid, but delivery/collection completion requires recording the received payment. Payment dropdowns no longer bypass receipt tracking. Delivery-type changes require an order before packing. Orders with amendment/packing history cannot be deleted.

Invoice details, customer order receipts and public UUID tracking show amendment balances. Shipping labels show only the outstanding amount to collect, so partially prepaid orders are not labelled for collection of their entire revised total.

## Database guarantees

The service-only `commit_order_amendment` RPC locks the order, balances, campaign definitions and inventory; validates the order/catalog revisions; applies net variant/gift-stock deltas; writes item/discount allocations and credit adjustments; recalculates pending earnings; and appends the audit record in one transaction. Any failure rolls everything back. Saved request keys make successful retries return the existing result. A competing draft must reload rather than overwrite another admin's changes.

The new history and settlement tables have RLS enabled and no public/authenticated privileges. All actions check administrative access. Original-order cancellation still verifies the authenticated owner/admin before using the privileged amendment cancellation path. No stock is held or mutated during search or preview.

PostgreSQL transactions do not include an external payment provider. Refund requests are reserved before sending, remain retryable on uncertainty and finalize the cash ledger only after provider acceptance. A refund changed outside the application may require operator reconciliation; its pending request must not be discarded and replaced blindly. Production testing of real payment/refund credentials remains a deployment smoke check.

## Deployment

1. Apply the earlier financial/promotion/BXGY migrations and flash campaign controls if still pending. See [financial checkout rollout](financial-security-deployment.md), [BXGY pricing](bxgy-pricing.md) and [flash sales](flash-sales.md).
2. Verify the migration against a staging copy, including the live gift-card and loyalty triggers. Existing store tables, including `category_wholesale_rules`, are dependencies.
3. During the checkout maintenance window, apply **`supabase/migrations/20261110173320_admin_order_amendments.sql`** in Supabase SQL Editor before deploying this web build. It adds amendment fields/tables/functions and does not rewrite historical rows or balances. It can be reapplied.
4. Deploy the matching web revision, then smoke-test an unpaid COD edit, a paid increase/decrease, an order using credits, a lost-response retry and cancellation. Use Razorpay test credentials for external-payment tests.

No new environment variables or native app rebuild are required. Do not deploy the web revision first: order editing and the updated cancellation/payment controls depend on the new fields/RPCs.

## Verification

All 356 tests, TypeScript and the production build pass.

- The unit/rendered suites cover draft removal/discard, review-before-save, stale previews, pricing preservation/current repricing, historical-offer fallback, BXGY lots, fixed-gift stock, coupon thresholds, credit caps, cash differences, action authorization, duplicate/stale saves and refund retry behavior.
- `supabase/tests/order_amendments.py` refuses connections outside the disposable `/private/tmp/tms-order-edit-pg.*/socket` or `/private/tmp/tms-reward-users-pg.*/socket` fixtures. Run after the disposable financial fixture, gift-card/loyalty migrations, financial migration, partial-refund migration, promotion fixture/migration, BXGY migration, `fixtures/order_edit_schema.sql`, and the new migration. It verifies transaction rollback after an injected late failure, credit/cancellation idempotency, foreign-item rejection, stale/expired reviews, pending settlements, later item refunds, audited reopening, concurrent final-unit edits, duplicate saves, competing drafts and public privileges. It never connects to production.
- Local mocked browser checks at 320/390/1440px exercise removal, replacement-shade search/add, ₹2,000 → ₹1,700 review, save, a ₹300 manual refund receipt and expanded history, with no page/card overflow or page errors. Order and payment actions were intercepted; no live writes occurred.
- New modules/tests are lint-clean. Existing touched admin/customer files retain unrelated lint debt; their baseline was compared separately.
