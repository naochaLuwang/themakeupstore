# AGENTS.md

## Goal
- Corporate-style admin dashboard with compact, data-dense layout
- Interactive admin features (quick view, map radius delivery)
- Leaflet-based delivery radius config for shipping

## Constraints & Preferences
- Admin: clean bold headings (`text-2xl font-black tracking-tight`), no shared components, just standardize Tailwind classes directly
- List page pattern: `space-y-6` wrapper, `text-2xl font-black tracking-tight` title, `text-sm text-slate-500` subtitle, `rounded-2xl border bg-white overflow-hidden shadow-sm` tables, `py-4 px-6` cells, `rounded-lg h-9 w-9 border-slate-200` action buttons
- Form page pattern: same header + back button (`rounded-xl h-10 w-10 border-slate-200`) + form card (`rounded-2xl border bg-white p-6 md:p-8 shadow-sm`)
- Dashboard: same wrapper conventions, `QuickStat` uses `rounded-2xl border bg-white p-5 shadow-sm`
- OOS fix: stock lives in `product_variants` (default variant for non-variant products), never in `products.stock` column
- Sign-in: pill toggle (active = pink fill), clean form fields, brand header with logo
- Homepage: `/forever.png` image + row of FOREVER52 products under New Arrivals

## Progress
### Done
- Product detail skeleton: image placeholder now shows "M" in Anders font (`font-daciana text-[80px] text-[#CBD5E1]`)
- FOREVER52 section added to homepage: server query fetches up to 20 FOREVER52 products, `<img src="/forever.png">` rendered between New Arrivals and FOREVER52 product row
- Out of stock fix: `ProductCard` now checks `variants.length > 0` instead of `hasVariants` for OOS detection; same fix applied to product detail page and server-side `outOfStock` sorting; reverted useless `stock` addition to product selects since column is never written to
- Sign-in page (`app/login/page.tsx`): redesigned with full-height flex layout, pill segmented toggle, cleaner form fields (13px, pink focus ring), contextual submit button ("Log In" / "Create Account"), simpler divider, Google "Continue" button
- Admin list pages (8 files): products, categories, orders, hero-banners, promos, reviews, return-requests, wholesale — all standardized to consistent wrapper/header/table/action-button/empty-state patterns
- Admin form pages (8 files): products/add, products/edit, categories/add, categories/edit, promos/new, promos/edit, hero-banners/new, hero-banners/edit — all standardized with back button + header + form card pattern
- Admin dashboard (`app/admin/page.tsx`): rebuilt with corporate style — compact 6+5 stat grid, revenue/top-products/order-status/day-of-week charts, quick actions, recent orders with quick view sheet, top categories, payment methods, activity feed, low stock alerts, quick metrics panel
- Dashboard child components: `stats-cards.tsx`, `recent-orders-table.tsx`, `low-stock-list.tsx` — standardized container/typography; `recent-orders-table.tsx` now interactive with slide-out quick view sheet
- Misc admin pages: shipping, stock, inventory, messages, customers, settings/legal — wrapper/header standardized
- Internal admin components: `CustomerTable`, `CustomerFilters`, `stock-input.tsx`, `search-input.tsx`, `product-search.tsx`, `product-form.tsx`, `product-edit-form.tsx` — all shadcn utility classes (`text-muted-foreground`, `text-primary`, `border-primary`, `bg-primary`) replaced with explicit Tailwind values (`text-slate-400`, `text-rose-500`, `border-rose-400/20`, `bg-rose-500`)
- Unused imports cleaned up across admin pages
- Admin shipping page: added Leaflet-based map delivery radius config (toggle + draggable pin + radius circle, stored in `site_settings`)
- Admin dashboard features: Day-of-week mini chart, conversion rate, refund rate, visitor count, new/returning customers, payment method breakdown, top products with category labels

### In Progress
- (none)

### Blocked
- (none)

## Abandoned Cart Recovery
- Two Edge Functions exist:
  - `send-abandoned-cart` — on-demand, called by admin "Send Recovery Emails" button
  - `scheduled-abandoned-cart` — runs every 2h via pg_cron, protected by `CRON_SECRET` env var
- Migration `20260708_abandoned_cart_cron.sql` sets up pg_cron + pg_net schedule
- `app.actions.cart.sendRecoveryEmails()` now checks `resp.ok` before marking carts as sent

## Key Decisions
- Stock for all products (including non-variant) lives in `product_variants` via a default variant with `is_default: true` — never check `products.stock` column
- Admin layout already provides `bg-slate-50/50` background and `max-w-7xl mx-auto` wrapper — individual pages should NOT add their own bg/wrapper, just use `space-y-6`
- Back button pattern: plain `<Link>` with `rounded-xl h-10 w-10 border border-slate-200` instead of `Button` component for consistency
- No shared admin components — all consistency is enforced via Tailwind classes directly on each page
- Shadcn color utility classes (`text-muted-foreground`, `text-primary`, `border-primary`, `bg-primary`) replaced with explicit Tailwind values across all admin-scoped code; shadcn UI library files left untouched

## Next Steps
- (none — admin section fully standardized and enhanced)

## Critical Context
- `products.stock` is `integer NOT NULL DEFAULT 0` in schema but is NEVER written to by the admin forms — stock always goes to `product_variants`
- Admin layout (`app/admin/layout.tsx`) wraps all pages in `max-w-7xl mx-auto` with `p-6` and `bg-slate-50/50` — pages rely on this and use `space-y-6` only
- Anders font available via `font-daciana` CSS class
- FOREVER52 products fetched server-side in `GatewayPage` batched in `Promise.all`

## Relevant Files
- `app/(store)/page.tsx`: homepage; FOREVER52 query + prop, OOS fix for server-side sorting
- `app/(store)/home-mobile.tsx`: forever image + product row section, accepts `forever52Products` prop
- `components/store/product-card.tsx:379`: OOS check uses `variants.length > 0` instead of `hasVariants`
- `app/(store)/products/[id]/page.tsx:299`: OOS check uses `product?.product_variants?.length > 0` instead of `hasVariants`
- `app/login/page.tsx`: redesigned sign-in page with pill toggle, cleaner form, brand header
- `app/admin/layout.tsx`: provides `max-w-7xl mx-auto p-6 bg-slate-50/50` wrapper
- `app/admin/page.tsx`: dashboard standardized
- `app/admin/products/page.tsx`: products list standardized
- `app/admin/categories/page.tsx`: categories list standardized
- `app/admin/orders/page.tsx`: orders list standardized
- `app/admin/hero-banners/page.tsx`: hero banners standardized
- `app/admin/promos/page.tsx`: promos standardized
- `app/admin/reviews/page.tsx`: reviews standardized
- `app/admin/return-requests/page.tsx`: return requests standardized
- `app/admin/wholesale/page.tsx`: wholesale standardized
- `app/admin/products/add/page.tsx`: product add form standardized
- `app/admin/products/edit/[id]/page.tsx`: product edit form standardized
- `app/admin/categories/add/page.tsx`: category add standardized
- `app/admin/categories/edit/[id]/page.tsx`: category edit standardized
- `app/admin/promos/new/page.tsx`: promo new standardized
- `app/admin/promos/edit/[id]/page.tsx`: promo edit standardized
- `app/admin/hero-banners/new/page.tsx`: banner new standardized
- `app/admin/hero-banners/edit/[id]/page.tsx`: banner edit standardized
- `app/admin/stock/page.tsx`: stock page standardized
- `app/admin/inventory/page.tsx`: inventory page standardized
- `app/admin/messages/page.tsx`: messages page standardized
- `app/admin/messages/message-item.tsx`: message component standardized
- `app/admin/customers/page.tsx`: customers page standardized
- `app/admin/settings/legal/page.tsx`: legal page standardized
- `app/admin/shipping/page.tsx`: shipping page standardized
- `components/admin/stats-cards.tsx`: standardized stat cards
- `components/admin/recent-orders-table.tsx`: standardized recent orders
- `components/admin/low-stock-list.tsx`: standardized low stock list
- `components/admin/customers/customer-table.tsx`: standardized customer table
- `components/admin/customers/customer-filters.tsx`: standardized search input
- `components/admin/stock-input.tsx`: replaced `text-muted-foreground` with `text-slate-400`
- `components/admin/search-input.tsx`: replaced `text-muted-foreground` with `text-slate-400`
- `components/admin/product-search.tsx`: replaced `text-muted-foreground` with `text-slate-400`
- `components/admin/product-form.tsx`: replaced `text-muted-foreground` with `text-slate-400`
- `components/admin/product-edit-form.tsx`: replaced `text-muted-foreground` with `text-slate-400`
