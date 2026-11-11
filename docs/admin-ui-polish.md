# Admin UI polish — 11 November 2026

This pass covers the entire admin area: 77 page modules and their existing navigation, tables, forms, reports, dialogs and supporting components. It changes presentation only. The existing order-edit implementation remains intact.

## Direction

- **Product:** the daily catalog, sales and fulfillment workspace for The Makeup Store.
- **Character:** orderly, practical, precise.
- **World:** a store desk, with white surfaces, slate text and the store's pink used sparingly.
- **Moments:** the revenue chart and readable operational figures carry the emphasis.
- **Signature:** a thin pink selection marker in navigation and a flat shopping-bag store mark.

The audit found tiny tracked uppercase text, scattered decorative colors, a gradient sparkle mark, oversized rounded form sections, inconsistent card spacing, a chart nested inside another card, and mobile overflow in the customer filters and product form.

## Presentation changes

- Consistent spacing, white/slate surfaces, restrained borders and shadows, and the requested bold `text-2xl font-black tracking-tight` page headings.
- Readable labels, quieter supporting text and aligned numerical columns. Existing content and number/date formatting are retained.
- Flat navigation branding, clearer active states, a consistent search field and the same menu order/destinations.
- A single pink revenue series, neutral supporting bars, and a weekday chart that fits its card. All buckets, formulas, data keys, date selection and tooltip formatting are unchanged.
- Consistent form fields and card proportions; product fields and variant controls reflow on narrow screens.
- Customer date filters stack on phones and wide data tables scroll inside their cards.
- Quick view fits the viewport and shows one visible close control through styling; its existing close handlers and Escape behavior are retained.
- Decorative hover movement, excessive radii, colored shadows and non-loading pulse effects are removed. Loading indicators and interaction states remain.

All styling is applied directly to the existing components. No new shared component system, global storefront theme, dependency, database migration, environment variable or native change is introduced by this UI pass.

## Behavior preservation

A source snapshot was saved before editing. The comparison checks all 131 changed TSX files after normalizing presentation attributes, chart paint and the sidebar's decorative icon import. Every other TypeScript/JSX syntax node matches the snapshot, including data queries, mutations, calculations, validation, routes, handlers and render conditions. Conditions inside class expressions are compared separately and are unchanged.

The two printed label components are byte-for-byte unchanged. The invoice, purchase document and batch-label print subtrees are also byte-for-byte unchanged. Existing print CSS and generated receipt HTML remain intact.

The earlier pending financial/order-edit migrations still belong to their respective feature deployments; this UI pass does not alter those requirements or their implementation.

## Verification

- All 356 tests, TypeScript and the production build pass after regenerating route types with the temporary preview removed.
- Synthetic local browser previews cover the dashboard, products, categories, customers, product creation, inventory and orders at 320, 390 and 1440 pixels, with no page overflow or JavaScript exceptions.
- Browser interaction checks cover navigation search/destinations, the mobile drawer, both calendar months, order quick view, form values, shade additions and closing the quick view. Writes and external requests are intercepted; no production rows or payments are changed.
- All 131 changed files are compared against their pre-pass lint baseline; no new lint findings are introduced. Existing unrelated lint debt remains.
- Temporary preview routes and mirrored source files are removed before final type/build verification.

Design guidance: [unslop by Damir Sokolovsky (@heydamir)](https://heydamir.design/unslop), CC BY 4.0.
