# Instant cart offers — 2 November 2026

The [flash-sale follow-up](flash-sales.md) adds scheduled flash definitions, regular-price baselines, and sale-boundary repricing to this shared lifecycle.

Cart mutations now calculate offer prices synchronously from preloaded campaign rules. Quantity, free units, discounted extras, fixed gifts, and totals publish together in one store update. Network verification happens afterward. The browser and checkout share `evaluatePromotionSnapshot`, preserving both BXGY pricing modes and normal selling-price gift thresholds.

The storefront badge provider starts one shared promotion lifecycle while customers browse. Badges, cart, and checkout reuse its customer-scoped snapshot. Product listings include brand and category metadata in existing queries, and newly viewed products preserve those fields. Legacy stored cart items receive complete metadata from their first server quote.

The first verification starts immediately. There is no browser `getUser()` request before it and no initial 250 ms delay. Rapid quantity changes coalesce only the background requests for 120 ms; the local calculation runs on every click. Fresh quotes survive page navigation, and focus does not trigger another request while the quote remains fresh. A single timer refreshes at offer boundaries or within 30 seconds. Failures retain an available preview and allow retry. Requests, listeners, subscriptions, and timers are cleaned up when the last consumer leaves.

`POST /api/cart/quote` handles both empty-cart preloading and basket verification. Its handler authenticates the session once; middleware skips its duplicate authentication. The route is available to guests, accepts no customer identity argument, writes nothing, and sends `private, no-store` plus `Vary: Cookie`. Its `Server-Timing: offers` header makes the verification duration visible in browser network tools.

Shared server caching is limited to public campaign definitions and target links for 30 seconds. Successful authorized campaign saves, status changes, and deletions expire that cache. Customer usage, owner IDs, gift stock, and availability are read separately. Authoritative merchandise quotes, checkout quotes, payment creation, and order placement always read current definitions, prices, stock, and eligibility; they do not use the shared definitions cache.

Account changes discard customer eligibility and invalidate pending work. Request revisions and basket keys reject stale responses. A separate quote revision also prevents an older background response from overwriting a newer checkout quote for an unchanged basket. Neither customer snapshots nor derived price groups persist in browser cart storage.

Customers can navigate to checkout immediately and enter an address while verification finishes. Pressing the order/payment button always obtains a fresh server checkout quote. An amount, gift, or selling-price change requires review before continuing. Existing payment signatures, amount fingerprints, inventory transactions, and order idempotency remain enforced.

## Verification and rollout

131 focused tests pass, covering immediate atomic totals, both BXGY pricing modes, preview/server agreement, fixed gifts and shared stock, rapid clicks, deduplicated consumers, navigation, offer expiry, account switches, stale responses, checkout races, network failures, private-cache headers, and existing payment/refund protections. TypeScript, the production build, and lint on the new runtime/data/preview/route modules pass. Existing page-level lint findings remain.

Deploy the web build; this change adds no migration or native plugin. The earlier financial, promotion-allocation, and BXGY pricing-mode migrations described in [bxgy-pricing.md](bxgy-pricing.md) must still be present before deploying this working tree. No production data or settings were changed during implementation.

An unwarmed first visit still needs one network fetch for rules or a canonical quote. Browsing starts that work before the cart opens. Once rules and item metadata are available, local offer updates require no network response. Production phone/network latency has not been benchmarked; local tests establish that quantity changes publish the new offer totals synchronously.
