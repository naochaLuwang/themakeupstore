# Customer directory and abandoned-cart improvements

Implemented on 2026-11-12. Migration, Edge Functions and web deployment are pending. No production data was changed and no real recovery emails were sent during development.

## Customers

- Search names, Auth emails and phone numbers across the full directory. Search text is literal, case-insensitive for names/emails, and phone searches tolerate stored separators.
- Database pagination returns 25 customers at a time with full matching and active-in-30-days counts. Stable date/ID ordering and page clamping handle changing results.
- Joined-date filters use inclusive IST dates and an exclusive next-midnight upper bound. Search and both dates submit together, reset pagination, persist in page links and synchronize after browser navigation. Invalid date ranges show an error.
- Lead / First-time / Repeat correspond to zero / one / multiple non-cancelled orders. Counts and order values aggregate the complete order history, including accounts with more than the Data API row limit.
- Customer names and the existing View Order History action open `/admin/customers/[id]`, with real contact links, paginated orders and links to existing order detail pages. History includes cancelled orders; the summary excludes them.
- “Order value” sums current non-cancelled order totals. Individual order pages remain the source for payment/refund balances; this is not a new financial reconciliation report.

## Abandoned carts

- Only non-empty carts older than one hour appear in the table. Time filtering occurs in the database before pagination; recent activity cannot hide older abandoned carts.
- Full counts show pending recovery, emails already sent, active carts in the last hour and pending carts without email. All/Pending/Sent filters and 25-row pagination retain the selected view. Item counts use quantities, rather than distinct cart lines.
- Emails come from Auth, replacing invalid `from("auth.users")` and `profiles.email` lookups. Deleted profiles and empty/non-positive-quantity carts are excluded.
- The send button explicitly targets eligible pending carts on the current page, up to 25 unique IDs. Admin authorization, current contact details, inactivity, sent status and unchanged/non-empty cart state are checked again on the server. Browsers cannot supply recipients or email content.
- Individual outcomes distinguish sent, failed, skipped and unconfirmed requests. Refresh updates database counts and sent timestamps. Local feedback prevents immediate resubmission of accepted/unconfirmed rows; actual unknown outcomes provide an explicit retry control after checking. Controls recover after failures and repeated clicks are blocked.
- Provider acceptance is only reported as sent after the timestamp is saved. Lost responses, server failures or failed timestamp persistence are unconfirmed. Response summaries contain cart IDs and safe messages, without email debug payloads.

## Recovery email compatibility

The manual and scheduled paths share the same escaped HTML, canonical cart link, deterministic product ordering, quantity count and `cart-recovery/<cart UUID>` provider key. The live-cart email action retains its separate `live-cart/<UUID>/<cart timestamp>` key and now uses the correct Auth lookup and server credential.

`send-abandoned-cart` now requires the server service credential. The scheduler requires a configured `CRON_SECRET`, reads reachable recipients from the same reporting query, and processes the oldest 25 eligible carts. Missing-email carts cannot block the batch. Neither deployment nor diagnostics invoke a real send.

The provider key reduces duplicate requests within [Resend's 24-hour idempotency window](https://resend.com/changelog/idempotency-keys). It is not a durable exactly-once delivery ledger. A changed payload with the same key can be rejected. Unconfirmed sends, particularly after that window or after failed database persistence, require checking the provider and stored cart state before retrying. Successful API acceptance does not confirm inbox delivery. Existing once-per-cart sent-marker behaviour is preserved; saving a new basket does not reset that marker.

## Deployment order

1. Apply `supabase/migrations/20261112130924_admin_customer_cart_reporting.sql` before the matching web and scheduler revisions. Coordinate with the project's already-pending migration/deployment sequence.
2. Deploy `send-abandoned-cart` and `scheduled-abandoned-cart`, including the new `_shared/cart-recovery.ts` dependency. Keep the scheduler paused until the migration is available.
3. Confirm `RESEND_API_KEY` and `CRON_SECRET` are configured. The scheduler supports existing `SB_URL` / `SB_SERVICE_ROLE` settings and the built-in Supabase URL/service-role settings. The manual function uses the built-in service-role secret (or the legacy `SB_SERVICE_ROLE` fallback). Do not expose these server credentials to clients.
4. Deploy the web build with the matching service-role environment. Resume the existing scheduler. Its cron request uses `x-cron-secret`; preserve its existing gateway JWT-verification configuration so that request can reach the handler, which now fails closed without the secret.
5. Check directory search, a customer's history and abandoned-cart counts read-only. A real recovery send is a separate operator action; none was performed for this implementation.

The migration adds private, fixed-search-path read functions and service-only public invoker wrappers. It adds no contact columns, public read policies, table writes or direct Auth-table grants. Every admin web action still calls `requireAdmin()`.

## Validation

- All 426 Vitest tests pass, including 47 new customer/cart/provider/scheduler tests. The scheduler tests execute the real transpiled entry point with mocked Deno environment, database and email provider.
- TypeScript, touched-file ESLint and the production build pass. Edge handlers also pass a separate TypeScript check against the installed Supabase SDK and Deno environment declarations; no Deno runtime was available locally.
- `python3 supabase/tests/admin_directory.py` creates and deletes an isolated local PostgreSQL database. It verifies 1,103 customers, 1,200 orders for one account, literal/email/phone search, IST boundaries, pagination, deleted users, empty/recent carts, unit counts, missing-email eligibility, oldest-first scheduled selection and service-only privileges. Migration application and tests repeat successfully. `PG_BIN` can select a different local PostgreSQL binary directory. The runner never accepts a production connection string.
- Zero-row live read checks confirmed the existing fields/relationships and the absence of `profiles.email`. New report queries were tested only in the disposable database; production migration was not applied.
- Mocked browser checks at 320, 390 and 1440px verify combined search/date submission, retained pagination filters, customer history/order links, global cart counts, exact page recipient IDs, saved-status refresh and no page overflow or JavaScript errors. Table columns retain horizontal scrolling on small screens. Preview files were removed.

The first warm build passed with a generated-cache disk-space warning. Only `.next/cache` was cleared; the final successful build downloaded the existing Google fonts with network access. No source, dependencies or user files were deleted.
