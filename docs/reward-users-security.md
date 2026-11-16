# Reward users: security and accounting fixes

Completed locally on 2026-11-14. The matching web build and migration are pending deployment. No live profiles, roles, orders, balances, transactions, access rules or customer contact records were changed or exported during implementation.

## Access control

The prior review used HEAD-only production requests: loyalty balances and transactions denied anonymous access, while profile/contact and order/address queries permitted it. The profile query was also capped at 1,000 of 1,881 matching profiles. The connected project remains unchanged until the migration below is applied.

The migration normalizes RLS and grants on profiles, orders, order items, loyalty balances and loyalty transactions. Customers can read their own records; admins can read management data. Orders/items and loyalty mutations remain service-only. Public tracking continues through its existing server-side service client and exact order UUID.

Anonymous access to contact fields and orders is revoked. Three profile metadata columns (`id`, `is_admin`, `user_type`) retain column-level SELECT solely because existing public catalog policies reference them in admin predicates. **Profiles RLS returns zero rows to anonymous requests**, so this permits evaluating those catalog policies without exposing records. A regression test models the actual public catalog/admin-policy combination and denies anonymous contact/address queries.

A parameter-free, fixed-search-path definer in the non-exposed `app_security` schema checks the current authenticated user's protected profile role, avoiding recursive profile policies. It returns only a boolean. Authenticated users get usage of this schema, rather than broader access to the existing private reporting schema. The service-only private reporting helper reads Auth email for admin search/export without adding public contact fields or grants.

Profile column grants restrict self-service inserts/updates to ID/name/phone/address/push settings. The trigger also protects ID, administrator flags, account type, creation time and deletion marker if an old column grant is accidentally restored. It checks the underlying role context so a historical service-owned definer invoked by an ordinary customer cannot bypass it. Signup inserts always start as retail/non-admin, including inserts made by an Auth signup definer using editable metadata. Provision staff with a subsequent intentional trusted service-role/Postgres UPDATE, rather than privileged fields in a signup/profile upsert. Existing administrator flags and staff assignments are preserved. `requireAdmin()` also rejects deleted profiles.

Existing grants may already have allowed historical privilege abuse. Before rollout, review the current staff roster through a trusted administrative channel. This migration prevents future self-promotion; it does not guess which existing administrators should be removed.

## Crediting and ledger behavior

Manual credits now use `credit_reward_user`: one transaction validates an active customer and admin actor, locks the wallet, checks the reviewed balance, inserts the ledger transaction and writes an audit receipt. Credit amounts must be 1–100,000 whole coins, reasons must be 3–500 trimmed characters, and integer overflow is rejected. Deductions remain outside this credit form.

A stable request UUID makes retries return the original receipt. Reusing it for another customer, amount, reason, actor or reviewed balance is rejected. Two different credits reviewed against the same starting balance cannot silently apply over one another: the later request must reload and be reviewed again.

The original action's second lifetime-earned update is removed. The existing ledger trigger is repaired to use locked current balances. Available postings apply once; pending-to-available fulfillment releases apply once; available-to-available note edits do not replay credits. Multi-row inserts are handled by rebasing each final ledger row from the locked wallet after insert, rather than overwriting the wallet with provisional before-insert snapshots. Pending and cancelled snapshots are labelled as historical in the UI. Existing cancellation/refund functions retain their explicit reversal behavior.

Each new manual credit stores the actor, reason, request ID, ledger link and before/after balance. The customer history shows the recorded operator when available; historical transactions do not invent one. A late audit/ledger failure rolls back the credit. Existing account deletion removes the new request/reason audit records as well as reward data, including when credit and deletion overlap.

The adjacent backfill action now uses a locked, bounded database operation for delivered/picked-up orders, ensures the wallet exists and inserts the earning once. It neither adds to balance nor increments lifetime earnings a second time in application code. Each invocation processes up to 100 missing orders, reports the remaining count and records the operator. Existing earning entries, including cancelled ones, prevent automatic re-awarding.

**Historical balances, lifetime totals, tiers and past transactions are not recalculated.** Prior duplicates, opening balances or cancellations need a separately reviewed reconciliation. The UI distinguishes stored lifetime earnings from the sum of recorded available earning transactions so discrepancies remain visible.

## Reporting and UI

`/admin/rewards/users` searches full active-profile results by name, Auth email, phone or UUID. Tier, redemption and zero-balance filters combine in PostgreSQL before 25-row pagination; sorting supports balance, earned, spent, pending, name and latest activity. Summaries describe all matching users. Searching no longer disables the zero-balance filter.

The detail page has 25-row server pagination plus type/status/IST date filters. All-time available earnings, spent, pending and expired totals are computed separately from the visible page; they no longer stop at the latest 200 transactions. Missing customers get a real not-found state, and query failures show errors rather than invented zeros or empty lists. Stored tiers retain the existing business rules; no tier recalculation policy was changed.

The credit form first reviews the exact customer/ID, reason, amount and before/after balance. It catches rejected requests and always clears the busy state. Uncertain requests keep their UUID and reviewed payload locked for a safe retry. Known stale-balance failures refresh the account for another review. A successful receipt remains visible, and another credit requires reloading current account data.

Directory and history CSV exports use one complete filtered database snapshot up to 5,000 rows, escape quotes and neutralize spreadsheet formulas. Larger exports require narrower filters; they are not silently truncated. Mobile forms stack and tables scroll inside their cards without overflowing the page. Tailwind changes stay in the existing route modules; no shared admin component or dependency was introduced.

## Rollout

1. Use a checkout/rewards maintenance window. Stop old reward-admin credit/backfill tabs and mutation jobs so an old web action cannot perform its former second balance update after SQL changes.
2. Apply earlier pending financial, promotion, BXGY, order-amendment and directory migrations required by this web revision, along with the separately documented purchase/dashboard changes when deploying the whole workspace. Apply `supabase/migrations/20261113123408_rewards_users_security.sql` **last**, before the matching web build. Do not rerun older profile/order policy normalization scripts afterwards; reapply this final security migration if those scripts must run.
3. Deploy the matching web build with its existing server-only service-role environment. This change requires no native build, Edge Function or new secret.
4. Verify anonymous profile contact/order reads are denied, anonymous profile metadata queries return zero rows, and the storefront/catalog/tracking still load. Test customer own-profile edit/upsert and own-order reads, cross-customer denial, existing provider sign-in and admin navigation.
5. Verify a real admin can search beyond the former cap and view/export filtered history. For the next genuine credit, review its recipient/balance and confirm one receipt and one ledger entry; retry only the same request if its outcome is uncertain. No real test credit was issued by the agent.

No automatic production migration or deployment was performed. The live permission issues remain until SQL is applied. Do not roll back to the old reward-credit/backfill web actions after installing the new accounting rules; deploy a matching corrected build instead. Keep the existing privileged role assignments under review rather than reopening public grants.

## Validation

- All 528 tests across 55 files pass, including 38 new reward/admin authorization, validation, server-action and rendered-flow tests. TypeScript, changed-module lint and production build pass.
- `python3 supabase/tests/reward_users.py` accepts no remote database URL. It creates/removes a disposable local PostgreSQL cluster with synthetic data and real repository finance/loyalty triggers. It tests migration reapplication, exact-once credit/lifetime accounting, changed-request/stale-balance rejection, audit rollback, full search/exports over 1,205 users, 252-row history totals, date filters, account erasure, own/cross-user policies, public catalog dependencies, profile upsert, signup role normalization, definer bypass denial and trusted staff provisioning.
- The same runner executes the earlier financial checkout/release/refund assertions, promotion credit-funded cancellations/item refunds, the complete amended-order regression suite and its three concurrency scenarios, seven finance concurrency scenarios, and five new concurrent credit/retry/spend/deletion scenarios. No existing financial path under test regressed. The existing synthetic staff fixture now provisions its administrator through an explicit trusted UPDATE to match the protected signup contract.
- Browser checks at 320/390/1440px use real components and fictional data, mock every action, block external requests and remove their temporary preview sources. Email search, zero-filter combination, pagination, both CSV exports, credit review, committed-but-unconfirmed retry, stale balance handling, rejected-request recovery and audit history pass with no page overflow or JavaScript exception.
- Only generated `.next/cache/webpack` output was removed for local disk space. The production build downloaded the project's existing Google fonts; a transient font connection retry recovered. No user source, dependency or production file was removed.
