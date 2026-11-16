# Dashboard reporting and daily operations

Implemented on 2026-11-13. The connected database was confirmed to have the reporting function during the follow-up below; its Activity correction is a separate migration. No production migration, order/stock/payment write, actual email send or native change was performed by the agent.

## What changed

The dashboard now uses five independent, admin-authorized database reports: order metrics, live operations, inventory, customer/cart/traffic summaries and activity. Each report aggregates the full dataset in PostgreSQL; the browser receives summaries, daily chart points, eight recent orders and a 25-order queue page. A failed report shows its own error and unavailable state while successful sections remain visible.

The compact white/slate admin layout, direct Tailwind styling and existing component modules are retained. Broadcast, promos and other management routes remain available through the sidebar. Weekday totals, payment-method mix, coupon use, category rankings and recent activity are preserved with the corrected data source. New customer/cart links connect to the existing improved management pages.

## Metrics and shortcuts (2026-11-16)

The dashboard now displays eight headline cards: order value, payments retained, outstanding payments, refunds due, today's order value/count, selected-period order count, average order and fulfilment. The former chart-footer figures are promoted into the headline grid rather than repeated. Today's card uses the report's IST as-of date and opens that day's orders; the period order-count card clears operational filters while retaining its dates.

Twelve compact icon shortcuts open Orders, Inventory, Products, Customers, Purchases, Cart recovery, Promotions, Flash sales, Reward users, Broadcast, Sales reports and Shipping. Visible all-date status tiles open the existing single order table with preserved date parameters and reset pagination. The status dropdown and attention queues remain available.

Weekday, payment, product/category and traffic metrics are visible by default, replacing the collapsed insights section. Payment mix shows both order counts and percentages. Headings, metric values, concise scope labels and actions remain; explanatory copy is still omitted. No reporting query, database/native dependency or financial calculation changed.

Fifteen dashboard page/control tests, TypeScript, touched-page lint and production build pass. Browser checks at 320/390/1440px cover eight metrics, twelve shortcuts, status tiles, one order table, chart selection, queue/status clearing, quick view/focus, date/refresh controls, stock links and partial errors without overflow or page exceptions.

## Compact dashboard (2026-11-14)

The latest UI places four financial cards above an order-trend chart and a compact attention list, followed by one order table and stock/customer/activity summaries. The status grid is now a dropdown that preserves dates and resets queue/page filters. New product is the single primary shortcut; other management routes remain in the sidebar. Dates use a short readable format, and refresh is an accessible icon button with its timestamp available to assistive technology.

Explanatory paragraphs, duplicated date/comparison captions and unsupported conversion copy are removed. Headings, short scope labels, numbers and actions remain. Secondary payment/weekday/product/traffic figures sit in a closed-by-default More insights disclosure. Activity shows the latest three events and stock previews show four variants; their management links retain full access. Quick-view prices, financial definitions, date calculations, queues and database reports are unchanged. Metric definitions and rollout requirements remain documented below.

Thirteen dashboard page/control regression tests, TypeScript, changed-module lint and production build pass. Mocked browser checks at 320/390/1440px verify chart switching, the disclosure, one order table, queue/status/clear filters, date presets, refresh, inventory links, partial failures, quick view, Escape and focus restoration, without overflow or page exceptions. No new SQL or native change is required for this presentation pass; earlier pending migrations retain their deployment requirements.

## Layout consolidation (2026-11-13)

Quick actions and the selected-period figures now lead into compact attention queues and one order workspace. Stock alerts, customer/cart summaries and recent activity follow it; trend, payment, weekday and product analytics appear below the daily workload. Secondary financial figures use one compact strip instead of four separate cards.

The previous all-orders queue and recent-orders table repeated the same records. The dashboard now renders one table: eight recent orders from the selected date range by default, replaced by the live, all-date 25-row queue when a status or attention filter is selected. Clearing the filter restores recent orders. Filtered pagination, preserved date parameters, quick view and the full orders-page link remain available. Failed selected queues display an unavailable state instead of unrelated recent orders; a failed operations report still permits the default recent list when its report is healthy.

All six dashboard page regression tests, TypeScript and changed-page/test lint pass. Mocked browser checks at 320/390/1440px verify one table before/after queue and status selection, clearing filters, quick view/focus, chart selection, date presets, refresh, stock navigation and section failures, with no page overflow or JavaScript exceptions. This follow-up changes presentation only and adds no database or native requirement.

## Activity schema correction (2026-11-13)

A read-only check reproduced PostgreSQL `42703` in Activity: the deployed function selected `company_name`, while the actual wholesale application schema and registration/admin code use `business_name`. The other four reports succeeded. The initial disposable fixture incorrectly repeated `company_name`; it now models the real schema and tests Activity explicitly with message and wholesale records.

The original reporting SQL is corrected for fresh installations. For a database that already applied it, run `supabase/migrations/20261113102331_fix_dashboard_activity_business_name.sql`. This updates the existing function definition, preserves execution grants, changes no records and is safe to reapply. The regression runner reproduces the old failing definition before testing the correction twice.

The web action also has a narrowly scoped compatibility read for that exact `42703`/`company_name` failure. It reads the real business-name field and exact full counts, merges the latest six events, and preserves normal unavailable states if a fallback query fails. Its real queries were verified successfully against the connected database without printing report data. Once the correction is applied, the regular RPC path works again. Reloading the dashboard with the updated local code can therefore restore Activity before the database correction is applied.

Unexpected section failures now log a plain warning containing the section and a sanitized error code, rather than the opaque error object that triggered the reported development error overlay. Raw database messages, customer data and credentials are not logged. All 454 tests, TypeScript and changed-module lint pass for this correction; no production SQL was applied.

## Metric definitions

| Metric | Definition |
| --- | --- |
| Order value | Sum of saved `orders.total` for non-cancelled orders placed in the selected range. These are payable totals after offers/credits and including delivery/additional charges. |
| Payments retained | Remaining recorded cash for all orders placed in the range, including cancellations awaiting refunds. Amended orders use `edit_paid_amount`, which already reflects completed settlements and item refunds. Legacy paid/partially-refunded orders use their total less recorded refunds; legacy refunded/unpaid statuses indicate zero retained cash. Unknown statuses remain unknown and are excluded from payment sums with a visible count. |
| Outstanding payments | Positive difference between remaining liability and recorded retained cash. Cancelled orders and orders with cancellation started have zero remaining liability. |
| Refunds due | Positive retained cash above remaining liability. Includes paid cancellations and overpayments after amendments. |
| Recorded refunds | Recorded item refunds plus completed amendment refunds. A legacy full-refund status also represents the full saved total when its full cancellation was not recorded in the item-refund ledger. |
| Fulfilment | Delivered **or picked-up** orders divided by non-cancelled orders placed in the selected range. |
| Orders with refunds | Orders with a recorded refund amount or refunded/partially-refunded payment status, divided by all orders placed in the range, including cancellations. Comparison is an actual percentage-point difference. |
| First-time / returning | Ordering customers with no earlier non-cancelled order / at least one earlier non-cancelled order before the range. These count ordering customers, including customers whose first order is still being processed. |

Money cards describe current records for the cohort of orders placed in the chosen dates. They are not a cashbook of money collected/refunded on those dates or independent verification against Razorpay/bank statements. The current recorded balances may change after later refunds or order amendments. Gift-card issuance income, accounting profit and provider fees are outside these figures.

Dates use IST regardless of server/browser timezone. The default is exactly 30 calendar days including today; the preceding comparison covers the same number of complete calendar days. Filters use inclusive local starts and exclusive next-midnight boundaries. Zero comparison baselines show “New” or a dash rather than an invented growth percentage. Today/7-day/30-day presets preserve the order-queue filter and reset its page. The calendar applies a range only after Apply dates, and synchronizes when its incoming range changes.

Order-value/retained-payment chart points are aggregated once by IST date, zero-filled and aligned with the previous period. Weekday buckets also use IST. Product rankings exclude gift lines and use product IDs as well as saved names; multi-category products contribute units to one deterministically chosen category, avoiding multiplied totals. Payment method aliases differing only by case are grouped together.

## Live operations

The full status pipeline includes Confirmed, Out for Delivery, Failed Delivery, Ready for Pickup, No Show and Picked Up, alongside the previous statuses. Unknown legacy statuses remain visible. Counts and attention queues cover all dates, independently of the historical financial filter.

Attention links open the dashboard's order-review table with server-side filtering and 25-row pagination. This avoids relying on the separate orders page's currently loaded rows. Date filters are retained in the URL; queue/status changes reset pagination. Queues overlap and their counts should not be added together:

- Unconfirmed orders placed more than two hours ago.
- Confirmed/packed delivery orders placed more than 24 hours ago. This threshold uses order placement, not time since the latest status change, and the label states that explicitly.
- Failed deliveries and missed pickups.
- Outstanding payments and refunds due.
- Reserved amendment/item-refund settlements and unrecognised payment states needing review.

Money-card links explicitly open the live queue across all dates, while the amount shown on each card remains scoped to the selected order cohort. The queues lead to the existing full order/edit pages; no new direct status or financial mutation buttons were added.

## Quick view and stock navigation

The existing order sheet now shows exact saved shades, quantities, gift flags, line allocations, coupon/BXGY fields, delivery, extra charges, gift-card/coin credits, total and recorded payment balances. It uses saved values instead of deriving a discount from `subtotal - total`. Legacy lines without allocation data are labelled before order discounts. Open order / Edit order links use the existing guarded flows. Escape closes the sheet and restores focus to its opener. The selected record updates by ID when report data refreshes.

Stock counts read `product_variants.stock`, including default variants. Sold-out (`<= 0`) and low (`1–10`) counts are separate; the alert sample includes up to six of each. Links open inventory with the relevant stock filter and SKU/name search applied. The inventory loader now explicitly fetches successive API ranges until the exact product count is reached, so a linked shade beyond the server's first row cap remains discoverable. If any page fails, it shows a retry state instead of presenting a partial registry as complete. The existing client-side registry and stock-edit actions otherwise remain in place.

## Traffic and refresh

“Visitors” is now Page views (24h), with a separate count of distinct tracked browser identifiers. Existing tracking persists its identifier in local storage, so this is not presented as a measured session count or exact count of people. Admin/POS paths are excluded.

Purchase conversion is explicitly unavailable. Existing orders do not contain a reliable link to browsing sessions. Checkout/payment attribution was not changed in this reporting pass; a future attributable purchase event is required before displaying a real session conversion rate. No conversion percentage is inferred from unrelated order and browser counts.

Refresh retains the URL filters, disables itself while pending and shows the request timestamp with seconds in IST. The sections use one request clock for time windows but separate read requests; this is a current dashboard refresh, not a transactional historical snapshot across every table.

## Deployment

1. Apply `supabase/migrations/20261113094113_admin_dashboard_reporting.sql` after the earlier financial/promotion/BXGY/order-amendment and customer/cart reporting migrations, before deploying the matching web build.
2. Deploy the web build with its existing service-role server environment.
3. Verify a single-day date range, a pickup status, one pending refund, stock links and quick view read-only. Refresh a view to check that its filters remain.

The new SQL functions use a fixed empty search path, `STABLE` and `SECURITY INVOKER`, with execution revoked from PUBLIC/anon/authenticated and granted only to `service_role`. The server action checks `requireAdmin()` before requesting them. No table grants or public policies were broadened, and no payment/checkout mutation RPC was changed. Existing pending migrations and the prior customer/cart Edge Function rollout still need their previously documented deployment sequence; this dashboard change adds no Edge Function or native dependency.

## Validation

- The initial dashboard pass had 447 passing tests across 47 files, including 21 new dashboard/inventory-loader tests; its TypeScript and production build passed. The activity correction adds seven regression tests, bringing the passing suite to 454 tests across 48 files, and passes TypeScript and changed-module lint. The inventory registry retains its existing image-optimization warning with no lint errors.
- `python3 supabase/tests/admin_dashboard.py` creates and deletes its own disposable PostgreSQL database using synthetic records. It verifies full IST/equal-period boundaries, legacy and amended refunds without double subtraction, pickup fulfilment, current balances, queue filtering/page clamping, exact shade/credit fields, unique category units and data beyond the API row cap (1,200 orders and 1,203 variants). Reapplication succeeds; anonymous/authenticated calls are rejected and service-role reads work. `PG_BIN` selects a different local PostgreSQL binary directory. The runner accepts no remote database URL.
- Mocked browser checks at 320/390/1440px verify chart switching, queue links, date presets, refresh, stock links, partial-section errors, sheet bounds, Escape and opener focus. There is no page overflow or JavaScript exception; the initial Recharts size warning was resolved. Preview routes/files were removed.
- Only generated `.next/cache/webpack` output was cleared for build space. The final local build used network access for the project's existing Google fonts. No source, dependency or user files were removed.
