# Purchase management

Implemented locally on 2026-11-13. Web deployment and the new procurement migration are pending. No production order, supplier, stock, ledger, payment or access-rule changes were made by the agent.

## Workflow

`/admin/purchase` creates a draft with supplier details, exact product shades, supplier costs, reference, expected delivery and notes. Product search runs against the complete database by product name, shade, SKU or brand; it returns up to 30 matching variants. Inactive products remain searchable and show their status so they can be procured without making them live automatically. Supplier search returns up to 25 matching names and keeps the selected supplier visible.

Costs default to the last recorded accepted purchase cost when available, never the storefront selling price. A new shade requires an explicit cost, including an explicit zero for free supplier stock. Quantities must be positive whole numbers; costs must be finite, non-negative and have at most two decimals. New saves snapshot product/shade/SKU details and calculate the total in PostgreSQL.

Saving opens `/admin/purchase/[id]`. Drafts support adding/removing shades, quantities, costs, notes, reference and expected-date edits. Mark ordered and cancellation require explicit confirmation. Ordered quantities/costs are locked for receiving. Cancellation preserves the document and audit trail instead of deleting records; it is allowed only before any delivery was recorded.

Deliveries are recorded by line with accepted and damaged quantities, delivery date in IST and notes. A review step lists exactly what will enter stock. Accepted and damaged quantities consume the remaining ordered quantity; **only accepted units increase `product_variants.stock`**. Damaged units require a note. Once every ordered unit is accounted for, the order is received; replacements for damaged items need a new purchase. A partially accounted order stays `ordered` in the original table and appears as **Partially received** in the UI and filters. This preserves the existing status constraint and historical documents.

Each receipt and change records an actor ID and timestamp. Receipts list their dates, notes and accepted/damaged quantities on the detail page. Actor IDs and full draft snapshots are retained in private audit rows; the activity UI shows the action/time. Purchase costs are not supplier payment balances or accounting profit. No tax, freight allocation, supplier payment or automated return workflow was added.

## History, exports and print

`/admin/purchase/list` applies reference/supplier, status and inclusive IST date filters in PostgreSQL before 25-row pagination. Counts and summaries describe all matching purchases, with stable created-at/ID ordering. Purchase value explicitly includes cancelled documents. Accepted/damaged counts include the baseline of historical received orders.

Filtered CSV is one database snapshot, includes full matching results up to 5,000 purchases, escapes quotes and neutralizes spreadsheet formulas. Larger results require narrower filters rather than exporting an incomplete file. The detail page prints the purchase document alone on A4; admin navigation and delivery controls are excluded. Mobile forms stack naturally, while long read-only tables scroll within their own cards.

## Transactions and retries

All mutation actions call `requireAdmin()` and use server-only database functions. Functions run with invoker permissions and an empty search path; execution is granted only to `service_role`. Client-submitted product IDs, prices and totals cannot select stock targets: the save function resolves each variant's real product, validates quantities/costs and computes the total itself.

Create and edit write the entire header, lines and audit entry in one transaction. An expected version rejects stale changes. A stable UUID and exact stored request make a creation retry return its original document. A repeated draft save or status change returns its result when the expected preceding version and exact request still match. Otherwise, a newer change requires reloading.

Receiving locks the purchase and its variants in deterministic order, validates remaining quantities, atomically increments current stock, and writes the stock ledger, line counters, receipt, status and audit record together. A stable receipt UUID prevents a committed delivery from adding stock again after a lost response. A different stale receipt fails, rather than silently applying a second delivery. New ledger entries use the receipt UUID as `reference_id`, allowing exact receipt tracing; historical entries are retained as stored.

Uncertain create/edit/receipt results preserve the request and lock editing until the same request is retried or the saved state is reloaded. Network errors never claim a successful stock receipt. Reload explicitly retrieves the current version. The original browser-only multi-request stock updates and hard deletes were removed.

## Access rules and legacy handling

Read-only checks before implementation confirmed anonymous row visibility in `suppliers`, `purchase_orders`, `purchase_order_items` and `stock_ledger`. The migration enables RLS on those tables plus the new receipt/event tables, removes accumulated permissive policies, revokes anonymous privileges and permits reads only to admin profiles. Procurement writes are service-only. The existing POS admin-cookie stock-ledger insert remains permitted through an explicit admin policy; customer writes are denied.

The migration baselines existing `received` purchases once by setting their accepted quantity equal to the saved ordered quantity. It **does not increment stock, create replacement ledger entries, or claim to repair historical receipt failures**. These purchases show an explicit historical-receipt notice, and no new receiving controls. Existing supplier/order/item IDs, totals, references and ledger rows are preserved. Item display snapshots are backfilled when catalog records are available. Previously missing purchase headers/lines or incorrect historical stock need separate reconciliation; the migration does not guess at them.

## Deployment

1. Pause procurement changes, including old browser tabs, and confirm the earlier repository migrations required by the current web revision have been applied.
2. Review and run `supabase/migrations/20261113111400_purchase_management_controls.sql` in Supabase SQL Editor **before deploying the matching web build**. It is transactional and safe to reapply. This changes live access rules, so the old browser-write purchase screens must not remain in use between SQL and web rollout.
3. Deploy the web build with its existing server service-role environment. No native rebuild or Edge Function deployment is required for this purchase change.
4. Verify admin supplier/catalog reads, history/detail/print, and a normal customer's denied procurement reads. Recheck anonymous access against all six tables.
5. With a genuine incoming delivery, verify the reviewed accepted quantity, receipt and ledger after saving. No real test receipt was created by the agent.

The migration is prepared and tested locally; anonymous access remains unchanged in production until it is applied. Rolling back only the web to the old browser-write purchase UI is not supported after this access-rule change. Keep the migration and deploy a matching corrected web build instead of reopening public privileges.

## Validation

- All 490 tests across 51 files pass, including 33 new purchase action, validation and rendered-flow tests. TypeScript, touched-module lint and the production build pass.
- `python3 supabase/tests/purchases.py` creates and removes a disposable local PostgreSQL cluster, accepts no remote database URL and uses synthetic records. It tests migration reapplication, legacy baseline without replay, create/edit retry identity, stale edits, partial/damaged receipts, over-receipt rejection, exact SKU/brand search, history filters/page clamping and full exports over 1,005 records, exact IST date boundaries, fixed function search paths, display snapshots, late item-write rollback, ledger-failure rollback and access rules. It also runs concurrent duplicate creates, conflicting receipts, identical receipt retries and atomic sale/receipt stock updates.
- Mocked browser tests at 320/390/1440px exercise actual purchase components, supplier creation, exact SKU search, last cost, invalid quantity blocking, uncertain-save and receipt retries, draft edits, ordered confirmation, partial delivery, damaged-unit exclusion, completion, filtered CSV and print isolation. No page overflow or JavaScript exception was observed. The A4 purchase PDF has one page for the tested document. Temporary preview source files were removed.
- Only generated `.next/cache/webpack` output was cleared for local build space. The build downloaded the project's existing Google fonts. No dependency, production-data or native change was made.
