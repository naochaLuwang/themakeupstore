# Inventory filtering and stock edits

Implemented on 2026-11-12 for `/admin/inventory`; pending web deployment.

The inventory registry now filters individual variants, including the default variant of products without shade options. A sold-out shade remains discoverable when its sibling shades have stock. Out of Stock includes quantities at or below zero, Low Stock includes 1–10, and In Stock includes every positive quantity. Search matches product/brand names or the individual variant's shade/SKU, combined with category and stock filters. Products with no matching variants are omitted.

The result count, product-group totals, displayed prices and rows describe only the matching variants. Group headers show how many of the product's variants are visible, such as “1 of 4 variants.” Clear filters restores the full loaded registry.

Bulk selection applies only to visible variants. The header checkbox distinguishes partial and full selection; clicking a partial selection selects all visible rows. Changing search, category or stock filters clears the selection. If refreshed stock hides a selected variant, it is excluded from the bulk operation.

Stock adjustments accept whole numbers, `+N` and `-N`. Invalid text, decimals and values above the database integer range are rejected instead of silently becoming zero or being truncated. Subtraction floors at zero. Bulk Set To accepts zero; bulk Add and Subtract require a positive quantity.

Individual failed saves preserve the entered adjustment. Bulk saves check each server-action result, retain only unsuccessful or unconfirmed rows for review/retry, and report the actual confirmed-success count. Controls and dialog dismissal are disabled during bulk saves. A connection failure is described as unconfirmed, with guidance to check current stock before retrying.

## Validation

- 23 rendered regression tests cover mixed-stock shades, default variants, zero/negative stock, low-stock boundaries, search/category combinations, selection changes, refreshed stock, exact bulk targets, zero stock, partial/rejected saves, pending-save controls and input validation.
- TypeScript and production build pass. Inventory lint has no errors; its existing image-optimization warning remains.
- Mocked browser checks at 320, 390 and 1440px confirm no page overflow or JavaScript exceptions, shade/SKU filtering, selection reset, filtered bulk targets and dialog bounds. Table columns retain the existing horizontal scrolling on small screens.

This changes only the inventory registry client and its tests. The existing admin-authorized action continues to write `product_variants.stock`; no backend, migration, native or production-data changes were made. Browser save actions were mocked. Existing stock-write concurrency behavior and catalog loading limits are outside this change.
