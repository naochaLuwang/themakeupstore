# Security review — 30 October 2026

Reviewed revision: `77b1fdc`. This is a targeted source, dependency, and read-only production review, not an exhaustive penetration test. Application code, dependencies, and database state were left unchanged. No orders, payments, balances, roles, files in remote storage, or notifications were created or modified.

**Implementation follow-up:** S02, S03, S06, S07, and S08 now have source fixes and a financial database migration, pending production migration/deployment. The Razorpay portion of S10 and financial-write restrictions from S05 are included. The original evidence below describes the reviewed revision; it is retained as the audit record. See [the deployment guide](financial-security-deployment.md) for scope, verification, rollout, and remaining limitations. Other findings remain open.

Evidence labels:

- **Live confirmed**: anonymous HEAD requests or public response headers verified the behavior without downloading customer records.
- **Code confirmed**: the relevant source/migration or installed dependency contains the issue; harmful requests were not executed against production.
- **Needs deployment verification**: actual database grants, triggers, deployed function versions, or hosting conditions could affect exploitability.

## Priority findings

| ID | Priority | Finding | Evidence |
| --- | --- | --- | --- |
| S01 | Critical | Sensitive database tables are publicly readable | Live confirmed |
| S02 | Critical | Checkout accepts client payment status; payment verification is incomplete | Code confirmed |
| S03 | Critical | Gift-card purchase creates spendable value without payment verification | Code confirmed; creation not exercised live |
| S04 | Critical dependency risk | Vulnerable Next.js/image stack and Android Capacitor versions | Lockfile, npm audit, maintainer advisories |
| S05 | High | RLS repair policies still allow sensitive field changes | Migration confirmed; live write restrictions not tested |
| S06 | High | Exposed loyalty actions bypass authorization and order-state validation | Source and local production action manifest confirmed |
| S07 | High | Checkout accepts the client’s BXGY discount amount | Code confirmed |
| S08 | High | Orders can retain discounts after coin/gift-card redemption fails | Code confirmed |
| S09 | High | Stock-changing SQL function lacks caller and input checks | Migration confirmed; live execute grants not verified |
| S10 | High reliability risk | Payment/WhatsApp webhooks redirect to login | Live headers and middleware confirmed |
| S11 | High, conditional | Stored HTML is rendered without application sanitization | Source confirmed; no malicious content inserted |
| S12 | Medium | Return requests do not verify item/order/customer consistency | Source confirmed; live RLS may constrain the path |

## S01 — Public access to customer and financial data

With only `NEXT_PUBLIC_SUPABASE_ANON_KEY`, HEAD requests selecting the following columns succeeded and reported these row counts:

| Table | Anonymous visible rows | Selected columns checked |
| --- | ---: | --- |
| `profiles` | 1,682 | `id, phone, is_admin, user_type` |
| `orders` | 284 | `id, user_id, shipping_address, total, payment_status` |
| `order_items` | 515 | `id, order_id` |
| `user_addresses` | 266 | `id, user_id` |
| `carts` | 1,598 | `id, user_id` |
| `cart_items` | 954 | `id, cart_id` |
| `back_in_stock_notifications` | 140 | `id, email` |
| `waitlist` | 6 | `id, email` |
| `gift_cards` | 2 | `id, code, remaining_balance` |
| `job_applications` | 21 | `id, resume_url` |

These are metadata-only checks, not a downloaded dataset. The order shipping-address and profile-phone fields are selectable anonymously. Gift-card codes and balances are selectable too. Application resume object paths are exposed; this review did not test downloading private resume files.

`supabase/migrations/20261024_rollback_disable_rls.sql:25` explicitly disables RLS on many of these tables. The live reads are consistent with the rollback, but SQL catalog access was not used to establish every table's exact policy state. Other tables outside that rollback are exposed as well, so do not restrict the repair to its table list.

`push_subscriptions`, `loyalty_points`, `loyalty_transactions`, and `return_requests` returned zero anonymous rows for the queries checked. That observation alone is not a full policy audit. WhatsApp configuration/log queries returned 404; this does not establish their deployed schema or access rules.

**Impact:** unauthenticated disclosure of customer contact/shipping data and gift-card credentials. Site middleware cannot protect direct Supabase REST requests.

**Improvement:** inventory every exposed table, grant only required operations, and apply restrictive per-role/per-owner policies. Keep role assignment, catalog writes, payment-state changes, and balance changes behind authorized server operations. Test with anonymous, customer A, customer B, and admin sessions before rollout. Audit access logs for possible prior access; this review does not establish whether anyone exploited the exposure. Supabase documents the required combination of [table grants and RLS policies](https://supabase.com/docs/guides/database/postgres/row-level-security).

## S02 — Payment state is supplied by the customer

Evidence: `app/actions/orders.ts:656`, `app/actions/orders.ts:683`, `app/api/verify-payment/route.ts:5`, `supabase/migrations/20260710_add_razorpay_payment_id.sql:1`.

`placeOrder` fetches a Razorpay payment only when the supplied method is exactly `razorpay` **and** a payment ID is present. It then persists the caller's `paymentDetails.status` and method. A supplied paid status can therefore reach the insert without a required payment-verification step. Fetching a payment checks its rounded amount, but does not verify captured status, currency, ownership/binding to the server-created Razorpay order, or prior use in this function. The separate signature-verification endpoint does not make verification mandatory inside `placeOrder`. No unique payment-ID constraint was found in the repository; live constraints were not inspected.

**Impact:** forged paid orders and payment-reuse risks. This was not exercised against production.

**Improvement:** accept an allowlisted payment method; derive payment state on the server. For Razorpay, bind a server-created payment order to the authenticated customer and canonical cart, verify signature and captured payment/currency/exact paise amount, and consume payment IDs once with a database uniqueness constraint. COD should be persisted unpaid by the server. See [Razorpay's server integration guidance](https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps/).

## S03 — Gift cards are issued before payment

Evidence: `app/actions/gift-cards.ts:22`, `supabase/migrations/20260706_create_gift_cards.sql:14`, `app/(store)/gift-cards/page.tsx:113`.

The purchase action accepts an amount from a signed-in user, inserts that amount as both original and remaining balance, and immediately returns the card code. It performs no payment verification. The table migration defaults the status to `active`; the purchase UI calls this action and displays the code without a payment step. The deployed table default and insert triggers should be verified, but the application has no payment requirement here.

**Impact:** repeated issuance of spendable gift cards without collecting their value, if the deployed table accepts these inserts.

**Improvement:** issue a pending/inactive purchase reference, collect payment, and activate a card only from a trusted verified-payment flow. Restrict active-card inserts to the service role, use cryptographic randomness for codes, and make activation idempotent. Temporarily disable purchase until this flow is implemented if no independent payment guard exists.

## S04 — Critical dependency exposure

`npm audit --omit=dev --json` reported **31 affected dependency entries: 3 critical, 20 high, 8 moderate**. These include transitive/metavulnerability entries; they are not 31 independently proven application exploits.

| Package | Installed | Action |
| --- | --- | --- |
| `next` | `16.1.1` | Audit recommends `16.4.3`; upgrade and validate checkout/actions/images |
| `@capacitor/android` | `8.4.2` | Upgrade to a compatible patched release; `8.4.3` fixes the cited 8.4.x issue |
| `sharp` | `0.35.3` | Upgrade to at least `0.35.5` for the cited image-library issue, alongside the framework fix |
| `dompurify` | `3.4.12` | Resolve critical transitive advisories through the dependency tree; usage conditions matter |
| `@tiptap/core` | `3.20.0` | Update the compatible Tiptap/ProseMirror family |
| `zod` | `4.4.3` | Resolve the reported constrained-collection resource-exhaustion advisory |
| `xlsx` | `0.18.5` | npm audit reports no fix on this package line; replace or use a maintained distribution |

The [Capacitor maintainer advisory](https://github.com/ionic-team/capacitor/security/advisories/GHSA-rvm3-566m-v7fv) describes malicious link navigation that can cause remote content to run with app-origin access, including native plugin capabilities. Installed Android `8.4.2` is in the affected range. This fix requires rebuilding and distributing the Android APK/AAB. Installed iOS `8.5.1` is a patched version for that specific advisory; this is not a full iOS dependency audit.

The [Next.js maintainer advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) describes an image-library RCE risk on glibc Linux. The installed Next.js/sharp pair is affected by version; the production host's runtime/library combination was not inspected. The project enables image optimization with remote images. Treat the version exposure as urgent, without claiming an RCE was demonstrated.

`xlsx` is currently used for report export, so advisories involving hostile spreadsheet parsing have less direct application reachability here. No application imports of the standalone `firebase`/`firebase-admin` SDKs were found in the reviewed source; consider removing unused SDKs after validating native FCM, which uses the Capacitor plugin and custom HTTP sender. This may reduce vulnerable transitive dependencies. Avoid blindly applying audit's suggested major downgrades for Firebase-related packages.

## S05 — The existing RLS repair is not a safe final policy model

Evidence: `supabase/migrations/20261024_master_enable_rls_all_orphan_tables.sql:186`, `:239`, `:278`, `:280`, `:282`; role use at `lib/admin.ts:16`.

- Own-profile INSERT/UPDATE checks only the row ID. There is no column restriction in the repository preventing changes to `is_admin` or `user_type`, which `requireAdmin` trusts. A live takeover was not attempted; live column grants and independent guard triggers remain unverified.
- The authenticated variant UPDATE policy allows all signed-in users to update all variant rows. It does not restrict the write to stock or require an authorized checkout; price/discount changes can be permitted under this design.
- The own-order policy covers all operations, allowing modification of authoritative fields if table/column grants permit it. It does not limit the caller to a cancellation transition or prevent changing totals/payment status.
- The admin SELECT policy on `profiles` queries `profiles` from within that table's own policy. This is a recursive-policy pattern. It is a plausible contributor to the previous RLS rollout failure, not a confirmed reconstruction of that incident. [Supabase's RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) discusses recursive policy failures.

**Improvement:** protect role and financial columns with explicit grants or server-only mutations, retain customer updates only for a narrow allowlist of personal fields, and move checkout stock changes into a checked transaction. Use a properly restricted nonrecursive role-check helper/private role table. Test migration policies and column privileges together. Do not simply rerun the old master migration or disable RLS again as the normal recovery plan.

## S06 — Loyalty Server Actions bypass the intended trust boundary

Evidence: `app/actions/loyalty.ts:86`, `:124`, `:154`. The existing `.next/server/server-reference-manifest.json` lists `earnOrderPoints`, `releasePendingPoints`, and `getAvailableBalance` as compiled actions, including checkout workers.

`releasePendingPoints(orderId)` uses the service role, checks neither caller authorization nor the actual order status, and changes pending points into available points. Calling it as an action bypasses the intended delivered/picked-up prerequisite. `getAvailableBalance(userId)` uses the service role to read an arbitrary supplied user ID without ownership checks. `earnOrderPoints` accepts the user ID, order ID, and total from arguments without verifying those facts against the order; applicable live RLS may limit its writes.

**Impact:** premature spendable loyalty credit and cross-account balance disclosure. Real balances were not changed during this review.

**Improvement:** move internal financial helpers out of `use server` action modules into server-only code. Authenticate/authorize any externally callable wrapper, derive the user and amount from stored orders, require eligible fulfillment state, and make earning/release idempotent in a transaction. Return only the authenticated customer's balance. [Next.js data-security guidance](https://nextjs.org/docs/app/guides/data-security) requires authorization at the server operation itself.

## S07 — BXGY discount amount remains customer-controlled

Evidence: `app/api/create-order/route.ts:120`, `app/actions/orders.ts:349`, `app/actions/orders.ts:371`.

The payment-order endpoint accepts the numeric BXGY discount from the client. `placeOrder` checks that referenced rules are active and that some qualifying quantity exists, but ultimately assigns `verifiedBXGYDiscount = bxgyDetails.discount`. It does not recompute the allowed amount from canonical prices, reward quantities, rule caps, and reward type. Rule-ID lookup completeness also needs checking. Cart product IDs/brands/free-item flags/quantities are not fully canonicalized against variant records in this flow.

**Impact:** inflated discounts can reduce payment below the legitimate total, potentially to zero. Checking that a rule qualifies does not validate the monetary amount.

**Improvement:** use one server-only pricing engine for both payment creation and final order placement. Build product IDs, prices, eligible quantities, and gift entitlement from database records; compute the discount entirely server-side. Validate bounded positive integer quantities and reject unexpected/free-item claims.

## S08 — Financial redemption failures do not invalidate discounted orders

Evidence: `app/actions/orders.ts:803`, `:810`, `app/actions/loyalty.ts:167`.

The order discount is committed before gift-card/coin consumption. Gift-card inserts ignore their returned error. Coin redemption's `{ success: false }` result is ignored, and both blocks swallow exceptions. Concurrent checkouts can both observe the same balance and receive a discount; if only one redemption succeeds, the other order can still remain discounted. JavaScript compensation across separate requests is not an atomic checkout transaction.

**Improvement:** reserve/consume balances under row locks in the same database transaction that commits the priced order and stock changes, with idempotency keys and explicit failure propagation. Coordinate the external payment with a durable payment/order state machine. Verify final balance/order invariants under concurrent requests.

## S09 — Privileged inventory SQL functions are insufficiently constrained

Evidence: `supabase/migrations/20260808_fix_live_carts_realtime.sql:39` and its `get_or_create_cart` definition at line 7.

`decrement_stock` is SECURITY DEFINER and accepts any variant and integer amount. It checks stock availability but not authentication, order authorization, or a positive amount; subtracting a negative amount increases stock. `get_or_create_cart` similarly accepts an arbitrary user ID without binding it to `auth.uid()`. No execution revocation for these functions was found in the repository. Live execute grants/function definitions were not inspected or exercised.

**Improvement:** inspect live execute privileges, revoke broad execution, validate positive bounded inputs, and bind inventory/cart mutations to the authenticated owner and a legitimate transaction. A fixed `search_path` does not provide authorization. [Supabase documents SECURITY DEFINER and default execution privileges](https://supabase.com/docs/guides/database/functions).

## S10 — Incoming webhooks cannot pass the login middleware

Evidence: `utils/supabase/middleware.ts:89`, `proxy.ts:8`, `app/api/webhooks/razorpay/route.ts:30`.

Anonymous HEAD checks against `/api/webhooks/razorpay` and `/api/whatsapp/webhook` both returned **307 → `/login`**. The middleware has no public exception for these endpoints, and external providers do not carry a customer session. The Razorpay handler also uses the cookie/anonymous Supabase client; after RLS is repaired, its updates would require a trusted privileged path. It acknowledges update errors with success, which can suppress useful retries.

**Improvement:** allow only the exact webhook routes through login middleware, require their independent provider signatures, then perform narrowly scoped updates through a server-only service-role client. Store processed event IDs, verify the payment/order mapping, and handle retryable failures correctly. For WhatsApp, require a configured signature secret rather than conditionally skipping verification when it is absent.

## S11 — Raw stored HTML can execute if an attacker can influence it

Evidence: `app/(store)/products/[id]/product-client.tsx:881`, `:1283`, `app/(store)/careers/[id]/page.tsx:91`, `next.config.ts:42`.

Product/job descriptions go into `dangerouslySetInnerHTML` without an application-level allowlist sanitizer in the reviewed rendering/save paths. CSP allows inline script and eval. An attacker needs a content-write path, such as compromised admin access or exposed database writes; this review did not insert malicious HTML or prove anonymous content modification.

**Improvement:** sanitize stored rich text with a maintained server-compatible sanitizer and a small tag/attribute/URL allowlist. Strip event handlers and unsafe links. Tighten CSP using the framework's nonce/hash strategy and remove production eval where feasible. Do not rely solely on the editor's normal UI to constrain arbitrary HTML submitted outside it.

## S12 — Return requests trust unrelated identifiers

Evidence: `app/actions/customer-return.ts:30`, `:52`.

The action verifies a signed-in user and loads an item by supplied item ID, but does not verify that the item belongs to the supplied order, or that the order belongs to the caller, before uploading proof images and inserting the request. Live RLS may reject some combinations, but the application authorization is incomplete and the current public order/item reads make identifiers discoverable.

**Improvement:** join item → order and require both order-ID equality and ownership before uploading files. Check fulfillment state, return window, quantities, and duplicate requests. Ensure RLS enforces the same relationship. Restrict proof uploads and clean up unreferenced objects on insertion failure.

## Additional improvements

- **Signing credentials:** `package.json:19` contains a literal Android signing password in the release command. Values were not printed in this review. Move signing secrets to protected environment/CI secrets and remove literals from scripts/history. Rotate the credential as appropriate; if the keystore has also been exposed, assess the upload/signing-key rotation process. Changing a password does not replace a compromised signing key.
- **Rate limits:** the shared limiter in `lib/rate-limit.ts` is process-local and retains keys indefinitely. Career applications (`app/actions/careers.ts:110`), waitlist, and stock alerts key anonymous limits by caller-supplied email, so varying email bypasses the intended limit. Add trusted edge/IP limits, authenticated account quotas where applicable, expiring shared counters, payload bounds, and upload quotas.
- **Label PIN gate:** `app/api/labels-verify/route.ts:13` and `app/labels/page.tsx:12` use a deterministic hash of a 4–6 digit PIN as the authentication cookie. Candidate cookies can be generated and tested on the page outside the PIN endpoint's attempt limiter. Replace this with a random session or server-secret-authenticated token plus expiry, and rate-limit authentication consistently. Impact here is limited to the manual label tool, which does not save customer data.
- **Email Edge Functions:** `supabase/functions/send-abandoned-cart/index.ts:5` accepts recipient and message/link inputs without an application role check; `app/actions/cart.ts` calls it with the public anon key. Gateway JWT verification alone is insufficient when a public anon JWT is accepted. Require an internal secret or authenticated admin authorization, validate links/recipients, and escape HTML. Deployment status/behavior was not exercised because doing so could send mail.
- **Sensitive mutation rules:** protect payment status, balances, stock, prices, and role fields with database grants/invariants in addition to action-level checks. Public clients should have the smallest required capabilities.
- **Operational headers and boundaries:** live root response has CSP but no HSTS header. Configure HSTS after confirming HTTPS coverage. Allowlist OAuth callback origins instead of trusting arbitrary forwarded host/protocol input in `app/auth/callback/route.ts`. Open external social/WhatsApp sites outside the privileged WebView where possible.
- **Durable workflows:** use an outbox/queue for push/email jobs after order commit, unique event IDs for payment/refund operations, a consistent audit trail, and explicit partial-failure states. Avoid swallowed financial errors and fire-and-forget work tied to request lifetimes.

## Suggested implementation order

1. **Contain public data access.** Audit the live grants/policies for every sensitive table, preserve legitimate checkout/auth flows, fix recursive profile policies and protected columns, test on staging, then roll out and repeat anonymous/cross-user checks. Inspect access logs for possible prior exposure.
2. **Close money-creation paths.** Gate gift-card activation on verified payment, enforce server-derived payment state, recompute all discounts, and make order/balance/stock operations atomic and idempotent.
3. **Restrict privileged actions/functions.** Separate internal financial code from public Server Actions, authorize every operation, and restrict SQL execution/column privileges.
4. **Patch dependencies.** Upgrade framework/image dependencies and the native Capacitor stack deliberately; produce a new Android release for the native security fix. Remove unused SDKs and re-audit the resolved lockfile.
5. **Repair integrations and harden inputs.** Fix signed webhooks, return ownership validation, rich-text sanitization, shared rate limiting, signing secrets, and audit/outbox behavior.

## Verification required for fixes

- Anonymous access returns no protected profiles/orders/addresses/applications/gift-card codes; customers A/B cannot read or write each other's data.
- Customers cannot change role, price, inventory, balance, payment status, or order totals through direct REST access.
- Gift cards cannot become active before a captured verified payment; duplicate payment events do not issue multiple cards.
- Missing, failed, reused, foreign, or wrong-currency payments cannot create a paid order.
- Inflated BXGY values, false product/free-item IDs, and invalid quantities are rejected or ignored in favor of canonical server calculation.
- Parallel checkouts cannot overspend coins/gift cards or oversell stock; failed redemption does not retain the discount.
- Direct loyalty action calls cannot release another customer's points or release undelivered-order points.
- Inventory RPCs reject anonymous/unauthorized/negative-quantity calls.
- Exact webhook routes reach signature verification without login redirects; invalid signatures fail, valid events process once, and retryable failures are observable.
- Rich text does not retain executable attributes/links; protected UI and native WebView navigation tests pass after the dependency upgrades.

No new exploit tests were run against production, and no full test/build run was needed for this report-only change. The npm audit result, source checks, compiled action registrations, anonymous metadata counts, and live webhook/header responses form the evidence above. Current live write policies, database catalog/trigger state, Edge Function deployment configuration, historical compromise, and production OS/image-library details remain outside what this review verified.
