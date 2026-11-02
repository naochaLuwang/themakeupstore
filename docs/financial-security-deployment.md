# Financial checkout security — 30 October 2026

The 2 November BXGY pricing update also requires `20261102101444_bxgy_discount_pricing_mode.sql` after the financial and promotion migrations. See [bxgy-pricing.md](bxgy-pricing.md) for the current offer rules and deployment order.

Implemented in source; **the production database has not been migrated and the web app has not been deployed by this change**.

## What changed

- Gift-card purchase creates a private purchase reference and a Razorpay order. It creates no card or balance. Confirmation verifies the HMAC signature and fetches both provider records to check captured status, INR, exact paise amount, ownership, purchase binding, and refunds before activating a card. Repeated confirmation returns the original card.
- Payment creation and order placement share `lib/checkout-pricing.ts`. Variant prices, product/category/brand membership, BXGY reward quantities, discount type/value, caps, dates, and eligibility come from database records. Client prices, shipping amounts, BXGY monetary amounts, and claimed BXGY rewards cannot set the order price.
- `commit_secure_checkout` locks balances, promotions, and inventory and commits the order, items, stock changes, gift-card/coin debits, pending earned coins, and usage ledgers in one PostgreSQL transaction. A failure rolls all these writes back. A per-customer checkout UUID makes retries return the same order, and a global payment-use ledger prevents reuse across checkout and gift-card activation.
- Loyalty release requires an authorized admin and a stored `delivered` or `picked_up` order. It releases only that customer's pending order earnings, once, using the current locked balance. Balance reads require the authenticated owner. Unused public earning and standalone redemption actions were removed; legacy balance RPC execution is revoked for public roles.
- Public clients cannot write financial tables, orders, or order items. Admin payment/type controls use authorized server actions. Customer cancellation retains its ownership checks and performs privileged writes only after authorization.
- The exact Razorpay webhook path passes login middleware and independently requires a valid signature. Database failures return an error for provider retry.

The payment checks follow [Razorpay's server integration requirements](https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/). The transaction uses [PostgreSQL row locks](https://www.postgresql.org/docs/17/explicit-locking.html) to serialize competing balance and inventory changes.

## Deployment

1. Take a database backup and verify the change against a staging copy, including existing gift-card and loyalty triggers. Local tests use the repository's gift-card and loyalty migrations; they do not establish the exact deployed trigger definitions.
2. Use a short checkout maintenance window. In Supabase SQL Editor, run the entire file `supabase/migrations/20261030072928_financial_checkout_security.sql` as the database owner. It is transactional and can be reapplied. It adds tables/columns/functions and tightens grants; it does not rewrite existing balances or issue cards.
3. Deploy this web revision immediately after the migration and reopen checkout after the smoke checks. Old checkout code cannot write through the new grants, so do not leave the old deployment serving purchases. Old open checkout tabs should refresh.
4. Confirm the existing server environment has `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and the configured `RAZORPAY_WEBHOOK_SECRET`. Server secrets must remain server-only. Razorpay must capture payments before the app can confirm them.
5. With Razorpay test credentials in staging, check gift-card payment/cancel/retry, COD checkout, captured online checkout, BXGY free/percentage/fixed offers, combined gift-card and coin redemption, admin status/type changes, customer cancellation, and fulfilled loyalty release. Verify balances, stock, and ledger entries after each scenario.

These are web and database changes. The existing Capacitor wrapper that loads the deployed site does not need a native rebuild for these fixes.

Do not roll back by restoring public financial write grants or disabling RLS. If rollout fails, pause purchases and correct the migration/application pairing before reopening.

## Verification and limits

- TypeScript and the production build pass. The 39 focused regression tests pass. The full suite reports 86 passing and 11 failing tests; all 11 failures were reproduced using the original `77b1fdc` promo sources/tests in a separate temporary baseline checkout. They involve stale promotion mocks and remain outside this patch. Focused lint on the new financial helpers/tests, gift purchase page, payment endpoint, and webhook passes; older modified action/admin files retain existing lint issues.
- The focused financial regression tests cover canonical discounts, forged/foreign/uncaptured payments, signature checks, ownership, failed commits, and confirmation replay.
- Isolated PostgreSQL tests cover rollback after a deliberately injected redemption error, insufficient balances/stock, public table/function privileges, fulfilled-only release, and idempotent activation.
- Independent simultaneous database sessions test coin/gift-card overspending, duplicate checkout confirmation, last-unit stock, current-balance loyalty release/refund, duplicate card activation, and payment reuse across purchases.
- No live payment was charged, no production financial rows were changed, and no production migration was applied during this implementation.

Razorpay capture and a database commit cannot form one database transaction. If capture succeeds but the app loses connectivity or the database rejects changed stock/balances, the checkout and gift-card screens retain confirmation details in per-account session storage and offer confirmation retry without a new charge. If the page closes before receiving a callback, storage is unavailable, or eligibility changes permanently, an operator must reconcile the captured payment using its Razorpay order/payment IDs and resolve or refund it. The webhook does not reconstruct an uncommitted cart or automatically activate pending gift purchases. Durable reservation/reconciliation jobs remain a future improvement.

Existing gift cards were deliberately preserved. Review cards issued by the old unverified purchase flow before treating their balances as paid. Historical BXGY usage has no reliable per-rule ledger to backfill; the new promotion-use table records new checkouts.

The broader findings in `security-review-2026-10-30.md` remain separate work, especially public customer-data reads, profile role-field protection, catalog/inventory write restrictions, and dependency updates. This patch restricts financial writes; it is not a complete RLS repair for the project.

## Local database tests

Use only a disposable local PostgreSQL cluster with the fixture schema, never the production database:

1. Apply `supabase/tests/fixtures/financial_schema.sql`.
2. Apply `20260706_create_gift_cards.sql`, `20260706_create_loyalty_rewards.sql`, and `20260901_fix_loyalty_pending_balance.sql` from `supabase/migrations`.
3. Apply the new financial migration, then run `supabase/tests/financial_checkout_security.sql` once against the fixture.
4. Run `TMS_TEST_PG_SOCKET=/private/tmp/tms-finance-pg.<test-directory> python3 supabase/tests/financial_concurrency.py`. The runner refuses connections outside that local test-directory pattern; it uses fresh fixture UUIDs on each run.

The fixture intentionally omits unrelated application tables. It verifies the financial transaction logic and repository triggers, not every constraint or integration in the deployed schema.
