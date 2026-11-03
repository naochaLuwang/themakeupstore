# Instant cart offers — 2 November 2026

The [flash-sale follow-up](flash-sales.md) adds scheduled flash definitions, regular-price baselines, and sale-boundary repricing to this shared lifecycle.

Cart mutations now calculate offer prices synchronously from preloaded campaign rules. Quantity, free units, discounted extras, fixed gifts, and totals publish together in one store update. Network verification happens afterward. The browser and checkout share `evaluatePromotionSnapshot`, preserving both BXGY pricing modes and normal selling-price gift thresholds.

The storefront badge provider starts one shared promotion lifecycle while customers browse. Badges, cart, and checkout reuse its customer-scoped snapshot. Product listings include brand and category metadata in existing queries, and newly viewed products preserve those fields. Legacy stored cart items receive complete metadata from their first server quote.

The first verification starts immediately. There is no browser `getUser()` request before it and no initial 250 ms delay. Rapid quantity changes coalesce only the background requests for 120 ms; the local calculation runs on every click. Fresh quotes survive page navigation, and focus does not trigger another request while the quote remains fresh. A single timer refreshes at offer boundaries or within 30 seconds. Failures retain an available preview and allow retry. Requests, listeners, subscriptions, and timers are cleaned up when the last consumer leaves.

`POST /api/cart/quote` handles both empty-cart preloading and basket verification. Its handler authenticates the session once; middleware skips its duplicate authentication. The route is available to guests, accepts no customer identity argument, writes nothing, and sends `private, no-store` plus `Vary: Cookie`. Its `Server-Timing: offers` header makes the verification duration visible in browser network tools.

Shared server caching is limited to public campaign definitions and target links for 30 seconds. Successful authorized campaign saves, status changes, and deletions expire that cache. Customer usage, owner IDs, gift stock, and availability are read separately. Authoritative merchandise quotes, checkout quotes, payment creation, and order placement always read current definitions, prices, stock, and eligibility; they do not use the shared definitions cache.

Account changes discard customer eligibility and invalidate pending work. Request revisions and basket keys reject stale responses. A separate quote revision also prevents an older background response from overwriting a newer checkout quote for an unchanged basket. Neither customer snapshots nor derived price groups persist in browser cart storage.

Customers with a usable current quote can navigate to checkout immediately. A cold, unverified cart waits for the first availability check, and a failed verification blocks checkout until retry succeeds. Local offer totals still update instantly. Pressing the order/payment button always obtains a fresh server checkout quote. An amount, gift, or selling-price change requires review before continuing. Existing payment signatures, amount fingerprints, inventory transactions, and order idempotency remain enforced.

## Stock synchronization — 3 November 2026

The [checkout recovery follow-up](checkout-stock-recovery.md) adds inline removal/quantity correction, preserved checkout selections and explicit confirmation of updated totals.

Previously, an unavailable variant caused the server quote to throw before sending any item data. The browser retained its saved positive stock count, so neither the Out of Stock badge nor checkout blocking activated. The server still rejected checkout/order pricing; the cart presentation and navigation were stale.

`CartStockError` now carries current `product_variants.stock` for every requested paid variant when any line is unavailable or exceeds stock. Missing variants are reported as zero. Inventory is checked before handling promotion-definition failures, using the same existing parallel reads; this adds no stock-fetch request. `getOfferQuote` serializes the report as a failed quote, and the shared runtime applies it only after its basket/request/quote-revision guards pass.

The store updates stock without silently reducing quantities and clears gifts, discounts and price groups derived from an invalid cart. Local previews cannot re-award those rewards while a line remains unavailable. Both cart layouts show **Out of Stock**, **Only N available**, or **Stock unavailable** and render disabled checkout buttons. The duplicate top-of-cart error sentence and Try again row are hidden when item-level stock problems already explain the block; generic verification/network failures retain their retry banner and also block navigation. Reducing/removing the affected item or restocking followed by a successful quote restores checkout. Healthy warmed carts retain immediate navigation. Canonical checkout/payment/order quotes continue to reject insufficient inventory.

Regression coverage includes zero/reduced/deleted stock, complete stock reports, simultaneous promotion lookup errors, failed-response serialization, stale-response protection, restocking, reward clearing, cold/network-error navigation, rendered desktop/mobile buttons, and immediate warm-cart checkout. Local browser fixtures at 390px and 1440px verify saved stock 20 changing to zero, no checkout links, disabled controls, and recovery after a simulated restock; no production inventory was changed.

## Verification and rollout

131 focused tests pass, covering immediate atomic totals, both BXGY pricing modes, preview/server agreement, fixed gifts and shared stock, rapid clicks, deduplicated consumers, navigation, offer expiry, account switches, stale responses, checkout races, network failures, private-cache headers, and existing payment/refund protections. TypeScript, the production build, and lint on the new runtime/data/preview/route modules pass. Existing page-level lint findings remain.

Deploy the web build; this change adds no migration or native plugin. The earlier financial, promotion-allocation, and BXGY pricing-mode migrations described in [bxgy-pricing.md](bxgy-pricing.md) must still be present before deploying this working tree. No production data or settings were changed during implementation.

An unwarmed first visit still needs one network fetch for rules or a canonical quote. Browsing starts that work before the cart opens. Once rules and item metadata are available, local offer updates require no network response. Production phone/network latency has not been benchmarked; local tests establish that quantity changes publish the new offer totals synchronously.
