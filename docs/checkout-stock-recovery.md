# Checkout stock recovery — 3 November 2026

Scope: checkout recovery only. This change introduces no stock reservations, database migration, native changes or automatic refunds.

## Customer flow

The existing shared background verifier updates current variant stock while checkout is open. Each unavailable paid item shows **Just sold out** or **Only N available** next to the product, with **Remove item** and, when appropriate, **Use N**. Pay/Place order is disabled while stock is insufficient or verification is unresolved. Stock messages are shown at the affected row rather than repeated in the global error banner. General verification failures retain their retry banner.

Removing or reducing a line keeps the customer on checkout. Address, payment method, applied gift-card selection and coin preference remain in component state. Existing cart logic recalculates automatic gifts, BXGY, coupon eligibility, delivery charges and credit limits. Checkout then requires **Confirm updated total**, which obtains a fresh canonical checkout quote without starting payment. If that quote changes the displayed total, paid lines or gift rules, the customer must review the updated amount again. Pay becomes available only after confirmation. Removing the last paid item displays an empty-bag state with **Continue shopping**.

Keyboard focus moves from a removed/corrected row to the next affected item, the updated-total confirmation, or the empty-bag action. No unavailable product is removed automatically.

## Last-moment failures and payments

- `getCheckoutQuote` returns the structured stock report when a final preflight fails. The UI applies it after checking the current basket key and quote revision, so an older result cannot overwrite a newer background inventory report.
- `/api/create-order` returns HTTP 409 and current stock when inventory fails between preflight and payment-order creation. No gateway order is created in that case; checkout updates the affected rows and remains open.
- COD order failures trigger a fresh background verification and require total review before another attempt. Server-side canonical pricing and transactional inventory checks remain enforced.
- A previously captured payment uses the existing saved confirmation details and **Confirm Paid Order** path. Stock recovery actions are hidden for that paid attempt; the stock/review guards do not prevent confirmation retries or initiate another payment.

There is still no reservation while a gateway payment is in progress. A captured payment whose order cannot be committed retains the reconciliation/refund limitations described in [financial-security-deployment.md](financial-security-deployment.md). This recovery change does not alter payment verification, capture, order idempotency, refunds or the financial transaction.

## Verification and deployment

The full suite passes 320 tests, including rendered checkout tests for in-page sellout detection, removal and reduced quantity, address/COD/gift-card preservation, shipping recalculation, explicit total confirmation, a second review after price changes, empty baskets, stale preflights, payment-init stock conflicts, COD races and captured-payment confirmation retries. New/changed server helpers and tests are lint-clean; checkout's pre-existing 32 lint errors and 8 warnings are unchanged.

Local browser fixtures at 390px and 1440px verify disabled payment, inline removal, total changing from ₹3,100 with free delivery to ₹1,650 after removal, focus on the review action, retained address/COD selection, enabled payment after confirmation, no horizontal overflow and no browser exceptions. Payment scripts/server actions were mocked; no production stock, orders or payments were changed.

Deploy the web build. No new SQL migration or native rebuild is required for this change; previously required financial/promotion migrations still apply.
