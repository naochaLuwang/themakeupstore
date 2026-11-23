# Customer storefront search and navigation

Implemented locally on 22 November 2026. Web deployment is pending.

## Customer behavior

- The header accepts Enter, supports arrow-key suggestions and Escape, and sends View all to a results page that reads the query. Search remains accessible on phones, tablets and desktops.
- Search terms and recently viewed products use separate validated storage. Existing mixed `recent_searches` data migrates safely; malformed or unavailable storage does not interrupt browsing.
- Search, Shop, New Arrivals, category, brand, concern, Fun Size and skincare/accessory listings use the same filtering, pricing, sorting and pagination behavior. Product names, brands, shades and category names receive stronger relevance than description text. Prefixes, common single-character mistakes, punctuation and joined brand numbers are supported.
- URLs retain query, selected brands/categories, price, availability, sort and page. Product links record the actual `#app-scroller` position. Browser Back and the product's contextual Back link restore the listing; category expansion also survives return navigation.
- Filters open at every breakpoint, use an accessible modal, and apply after Show results. Selected filters have removable chips and Clear all. Loading, no matches and service failure have separate states; Retry keeps the customer's choices. Cancelled and outdated requests cannot replace newer results.
- The previous storefront presentation is retained: a separate mobile search screen with a gray pill field, recent-search chips and Iconic Beauty Brands rows; three-column Exclusive/Essentials brand sections; collection image circles and bottom filter/sort controls; the original New Arrivals typography, Fun Size banner and skincare editorial/routine finder. Search behavior is shared underneath these distinct layouts.
- The desktop header uses equal side columns to keep the original wordmark centered. Mobile retains its wordmark, search, wishlist and bag arrangement. Tablet navigation/search remain reachable, desktop navigation identifies the active area, and collection pages use their original bottom controls instead of mobile tabs. Icon controls have labels and browser zoom is enabled.
- Guests can browse New Arrivals, Contact, policy pages and their bag. Checkout/account authorization remains enforced. Password, web OAuth and native callback completion use a validated internal return destination, including query parameters. The existing OAuth callback URL is retained, using a short-lived return-path cookie for the web handoff.
- Brand tiles include readable names and searchable multiword labels. Collections include parent/sibling links, Shop all and breadcrumbs. Existing Fun Size imagery and skincare concern navigation are retained.

## Data, pricing and caching

`lib/storefront-catalog-server.ts` performs anonymous catalog-only reads using the public Supabase key and existing RLS. It pages through the complete active product set, categories, concerns and flash campaigns. It selects explicit public fields; no customer, order, payment or privileged session data enters this cache. A failed page rejects the catalog rather than returning a misleading partial result.

Each 100-row database page is cached independently for 30 seconds, avoiding Next's 2 MB per-entry limit. Search/filter/sort happens across the complete catalog before returning 24 products. Suggestions use the same pipeline with five products. Visibility checks include assigned categories and their ancestors. Stock comes only from `product_variants`, including default variants. Displayed prices, price filters and sorting share the existing flash pricing helper.

Product/category/visibility/flash mutations invalidate the public catalog tag. Client result caching is bounded to 12 entries and 30 seconds, with focus/visibility refresh and flash-boundary refresh. Browse availability can lag a stock change briefly; existing canonical cart and checkout validation remains authoritative.

Read-only `GET /api/products/search` serves both suggestions and listings, and returns 503 for catalog failures. It avoids an extra middleware authentication request. Existing unused listing clients were removed after their routes moved to the shared listing.

`storefront:discovery` DOM events and an optional existing `dataLayer` receive search, result, product, filter and login-continuation events. This does not create a reporting database or analytics destination. Any external analytics integration still requires the site's intended privacy/consent setup.

## Validation and rollout

- All 653 web tests pass, including catalog completeness/ranking/visibility/pricing, pagination failures, legacy storage, safe redirects, login continuation, keyboard suggestions, request races, filter drafts and recovery.
- The production web build and TypeScript pass. New modules lint clean; legacy touched modules have no added lint findings against HEAD. All 31 native URL/PKCE/startup checks also pass.
- The restored presentation passes production browser checks at 320, 390, 768, 1024, 1280, 1440 and 1920 pixels, without horizontal overflow or page errors. Desktop logo centering is measured against the header center, with navigation overlap checks. Mobile uses its dedicated search form; tablet has a compact page search and desktop uses the header search.
- Additional browser checks cover mixed history, valid product links, keyboard Escape/selection, service failure and Retry, multiword brand search and category expansion/scroll restoration. Guest routes and checkout login destination are checked separately.
- The built production app passes the search/filter/page-two/product/Back flow at 390 and 1280 pixels, restoring the actual saved click position exactly. Separate page checks confirm the restored search landing, Exclusive/Essentials directory, collection circles/bottom controls, New Arrivals typography, skincare hero/routine finder and Fun Size banner.
- Read-only catalog verification returned 839 visible products, 85 lipstick matches and 13 results for `rare beuty blush` at verification time. Warm local API requests were approximately 60–110 ms across development/production checks; cold requests and real device/network performance vary.

Deploy the web revision through the existing release process. This change introduces no SQL migration, dependency installation, native project/configuration change or app-store upload. Earlier pending feature migrations still follow their own documented rollout requirements. No production stock, orders, payments or policy content was written. Real provider sign-in and physical-device smoke checks remain part of deployment verification.

The layout follow-up was built in an isolated temporary copy so the existing development server remained available. The build's changed TypeScript source files match the workspace byte-for-byte.
