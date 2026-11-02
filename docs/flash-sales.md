# Flash-sale campaigns — 2 November 2026

`/admin/flash-sales` now manages named campaigns with searchable lists, scope/status filters, 25-row pagination, and Draft, Scheduled, Live, Paused, and Ended states. Drafts must be explicitly published. Scheduled campaigns can start now; active campaigns can pause or end; any campaign can be duplicated into a draft. Actions refresh the page data without a full browser reload. Ending a scheduled campaign preserves its original schedule rather than creating an invalid end-before-start interval. Concurrent edits are checked against `updated_at`.

Each campaign chooses one scope and supports multiple targets within that scope: whole products, individual variants, categories, brands, or the whole store. Selecting a product includes all its variants; selecting individual variants includes only those variants. Product, variant, category, and brand exclusions always take precedence. Target names and variant selections are restored when editing. Removed catalog targets remain removable in the editor. Campaign names are separate from optional storefront labels.

The editor uses real catalog data for its price preview: original prices, normal selling prices, proposed final prices, affected product/variant counts, stock totals, better existing markdowns, overlapping campaigns, zero-price warnings, and three-unit BXGY examples. The preview is a setup-time simulation, not a reservation of future stock or prices. Overlapping schedules can change later. BXGY examples assume customer eligibility and show the behavior of the configured replacement or combination mode.

## Pricing and timing

`variantFlashPricing` is the common calculation for storefront cards, shade selectors, product pages, cart synchronization, admin previews, and authoritative quotes. Competing flash campaigns are compared by their actual rupee prices for each variant. A ₹1,000 product eligible for 40% off and ₹100 off correctly costs ₹600. Normal markdowns remain when they give the lower price. Discount calculations use the store's whole-rupee selling-price convention. A variant explicitly configured with a zero discount retains that setting; `none` inherits the product discount.

`productFlashPricing` selects the cheapest available variant for product cards and price filters. Shop, category, essential, exclusive, search, and new-arrival grids use the same calculation for their price ordering/ranges. Price-boundary updates recompute from already fetched products rather than refetching product lists. Sold-out variants do not advertise a cheaper starting price when another variant remains available.

All campaign dates are entered, edited, and displayed in IST with explicit UTC conversion. The active interval includes the start and excludes the exact end. Draft, paused, and manually ended campaigns never supply a selling price. Storefront pricing clocks update at schedule boundaries and on focus after sleep. The preloaded promotion snapshot includes active/upcoming flash definitions, and cart items retain their normal price so the instant preview can revert immediately at expiry. BXGY original-price replacement and discounted extra units retain their agreed behavior.

Flash definitions use a 30-second public server cache for browsing; successful admin mutations invalidate it. Same-device and same-origin tab changes request an immediate refresh. The shared storefront promotion lifecycle supplies flash data, removing separate provider and Shop polling requests. Authoritative checkout/payment/order quotes continue to read fresh campaign definitions, prices, stock, and eligibility and require review when the payable amount changes.

## Migration and deployment

During the checkout maintenance window, apply:

1. The previously required financial, promotion-allocation, and BXGY-pricing migrations from [bxgy-pricing.md](bxgy-pricing.md), if not already applied.
2. `supabase/migrations/20261102115649_flash_sale_campaign_controls.sql`.
3. Deploy the matching web build and reopen checkout/admin campaign writes.

No native rebuild is needed. No production campaigns, orders, or payments were changed during implementation.

The new migration adds `name`, `target_config`, `lifecycle`, and `ended_at`. It backfills existing single-target definitions without changing their prices, schedules, labels, or activation flags; inactive legacy campaigns become paused. Existing zero-discount placeholders remain valid, while new admin submissions require positive discounts. Out-of-range legacy discounts cause the migration to fail atomically for review rather than being silently changed.

The migration enables RLS, permits public reads of published definitions, and revokes anonymous/authenticated campaign writes. All admin reads and writes use `requireAdmin()` and its service-role client. A database trigger validates target arrays, referenced IDs, and variant/product relationships. Related-row lookups are batched and paginated to avoid URL limits and silent result truncation.

Run the migration before the web revision: the old admin writer does not supply the new target format. If a code rollback becomes necessary, first pause campaigns created/edited with multiple targets, variants, or exclusions; old code cannot interpret them correctly. Keep the restrictive write permissions.

## Verification

195 focused Vitest tests pass across flash pricing/validation/preview/actions, rendered editor controls, exact schedule boundaries, instant cart behavior, canonical quote consistency, checkout security, payments, and refunds. TypeScript and production build pass. New flash-sale modules/admin controls are lint-clean; existing unrelated storefront lint findings remain.

The PostgreSQL migration was applied to disposable local databases with legacy published/paused campaigns, then safely reapplied. Rollback assertions verified target ownership, percentage limits, lifecycle/activation consistency, schedule preservation, private draft visibility, and public write revocation.

To reproduce against a **disposable database only**, apply `supabase/tests/fixtures/flash_schema.sql`, the original `20260721_flash_sales.sql`, and `supabase/tests/fixtures/flash_legacy.sql`; then apply the new migration, run `supabase/tests/flash_legacy.sql` and `supabase/tests/flash_sales.sql`, and reapply the migration plus legacy checks. The campaign test data is rolled back. Production phone/browser timing has not been benchmarked.
