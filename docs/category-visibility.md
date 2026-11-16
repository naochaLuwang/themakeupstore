# Category visibility

Implemented in `/admin/categories` on 2026-11-16. Pending migration and web deployment.

Each category has an Active/Inactive badge and an Activate/Deactivate action on desktop and mobile. Deactivation requires confirmation and makes the category, all descendant categories, and their products inactive in one database transaction. Both `products.category_id` and `product_categories` assignments are covered. A product shared with another active category still becomes inactive. Stock, prices and existing orders remain unchanged.

Activation restores only the selected category. Products and subcategories remain inactive until explicitly activated; this avoids publishing products that were already inactive. A category cannot be activated while its parent is inactive. Products cannot be activated while any assigned category is inactive. New category/product assignments inherit inactivity, and cyclic category parenting is rejected. Removing an assignment never publishes the product automatically.

Customer category lookups and sitemap entries exclude inactive categories. Previously unfiltered homepage, search suggestions (including the public search API), product links and recommendation queries now respect product status. Canonical cart/payment quotes report inactive merchandise as unavailable, using the existing inline removal/recovery flow; inactive store products cannot be awarded as gifts.

`set_category_visibility` is service-only and reached through an authorized server action. Explicit desired/expected state rejects stale admin toggles. Catalog mutations are serialized so concurrent assignments/activation cannot escape deactivation. The confirmation stays open on errors and blocks repeat submissions while saving. A successful update invalidates catalog pages and promotion definitions.

## Deployment

Apply `supabase/migrations/20261116064250_category_visibility_controls.sql` after the earlier financial, promotion, BXGY, flash-sale, order-edit and reporting/security migrations, before deploying the matching web revision. Existing categories default to active; applying the migration does not deactivate products. No production data was changed during development.

The migration preserves the existing `commit_secure_checkout` implementation under the service-only `commit_secure_checkout_catalog_base` name and adds a visibility guard at the original RPC name. Product locks and a fresh status check reject a stale checkout that waits on deactivation. Existing completed checkout keys still replay their original financial result. Do not reapply an older migration that replaces `commit_secure_checkout` after this migration; future checkout migrations must preserve this guard.

## Verification

- All 544 tests across 57 files pass, including authorization, explicit/stale status requests, confirmation, cancel/pending/error handling, inactive-cart rejection and inactive-gift exclusion.
- Local PostgreSQL checks cover primary/junction/shared products, descendants, unchanged stock, safe reactivation, new assignments, cycle rejection, transaction rollback, checkout rejection/replay, denied public/customer RPC privileges, and migration reapplication. The preserved checkout body matches the pre-migration definition.
- Three concurrent database scenarios cover deactivation versus product activation, assignment versus activation, and checkout waiting on deactivation.
- Mocked browser checks at 320/390/1440px verify badges, confirmation/cancel, pending state, descendant deactivation, reactivation and visible errors, without overflow or page exceptions. No live catalog is used.

TypeScript and production build pass. New modules are lint-clean; existing touched files introduce no new lint findings.
