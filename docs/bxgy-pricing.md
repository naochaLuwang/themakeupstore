# Buy 2 Get 1 pricing — 2 November 2026

Cart performance follow-up: [instant-cart.md](instant-cart.md) describes preloaded rules, synchronous previews, background verification, and final checkout checks.

Each campaign selects **Replace existing discounts** or **Combine with existing discounts** in `/admin/bxgy`.

Replacement uses original variant prices for the units consumed by the offer, including units previously discounted by a product, variant, or flash sale. For every three eligible units, the cheapest original-price unit is free. Six units make the two cheapest free; nine make the three cheapest free. Repeated units of one product count. The offer applies even when normal discounts would give a lower total.

Any selected brands form one combined eligibility pool. One Milani, one RELOVE, and one FOREVER52 product qualify together if all three brands belong to the campaign. Categories and selected products also pool their eligible quantities. Brand/category intersections are not an additional targeting mode.

For incomplete sets, the cheapest units become free and the highest original-price units fill the paid positions. Extra units retain their ordinary selling prices. Stable variant IDs break equal-price ties. For original prices ₹100, ₹200, ₹300, ₹400, each normally 20% off, the ₹100 unit is free, ₹300 and ₹400 are paid at original prices, and the ₹200 extra remains ₹160: merchandise payable ₹860.

For identical products originally ₹1,000 and normally ₹800:

| Quantity | Original-price offer units | Normally discounted extras | Merchandise payable |
| --- | --- | --- | --- |
| 2 | 0 | 2 | ₹1,600 |
| 3 | 3, including 1 free | 0 | ₹2,000 |
| 4 | 3, including 1 free | 1 | ₹2,800 |
| 5 | 3, including 1 free | 2 | ₹3,600 |
| 6 | 6, including 2 free | 0 | ₹4,000 |

Combination mode retains current selling prices and selects the cheapest selling-price units as free. Existing campaigns keep this behavior after migration; the new-campaign form initially selects replacement. The administrator can change either selection.

Each unit participates in at most one BXGY campaign. Overlapping campaigns use the existing deterministic selection policy, ranked by net savings after repricing; even a replacement with negative savings still applies when it is the eligible campaign. Disjoint campaigns can apply together. Coupons cannot combine with automatic offers. Fixed-gift thresholds continue to use normal selling prices before BXGY. Shipping continues to use the merchandise subtotal before the BXGY deduction, which now includes any original-price offer units.

The cart, checkout, payment creation, and order placement share the same server quote. Mixed prices for one variant are stored as separate order-item rows with exact unit prices, preserving discounted extras for receipts and refunds. The offer snapshot records paid/free quantities, price basis, rule, and mode. The payment fingerprint includes those allocations. Derived pricing is cleared when the cart changes and is not persisted to browser storage.

## Deployment

Apply migrations in this order during the checkout maintenance window described in [financial-security-deployment.md](financial-security-deployment.md):

1. `20261030072928_financial_checkout_security.sql` if not already applied.
2. `20261031083633_promotion_rules_and_order_allocations.sql` if not already applied.
3. `20261102101444_bxgy_discount_pricing_mode.sql`.
4. Deploy the web build. No native app rebuild is required.

The new migration adds a checked, non-null `pricing_mode`, extends the service-only atomic campaign save, and allows up to 201 stored checkout lines: two price groups for each of 100 cart variants plus one fixed gift. Existing financial privileges remain restricted. No production data or configuration was changed during implementation.

## Verification

Verified: 113 focused Vitest tests pass across pricing, cart-store, rendered admin-form, quote, checkout-security, payment, and refund suites. TypeScript and the production build pass. New pricing helpers are lint-clean; existing page-level lint findings remain. Against a disposable PostgreSQL cluster, apply the financial fixture and its migration dependencies, the partial-refund migration, the promotion fixture, then the three migrations above. Run `supabase/tests/promotion_checkout.sql` and `supabase/tests/bxgy_pricing_mode.sql`; both roll their test data back.
