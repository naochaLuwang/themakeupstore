# M Beauty Rewards — Complete System Guide

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [Server Actions](#3-server-actions)
4. [Customer-Facing Pages](#4-customer-facing-pages)
5. [Admin Pages](#5-admin-pages)
6. [Checkout Integration](#6-checkout-integration)
7. [Profile Integration](#7-profile-integration)
8. [Order Lifecycle](#8-order-lifecycle)
9. [Earn / Tier / Spend Formulas](#9-earn--tier--spend-formulas)
10. [File Map](#10-file-map)

---

## 1. Architecture Overview

The loyalty system is a **coin-based rewards program**. Customers earn M Coins on purchases, which they can redeem for free products or discount coupons. Three tiers (Bronze → Silver → Gold) gate access to certain rewards.

**Key mechanics:**
- 1 M Coin per ₹60 spent (flat rate, all tiers)
- Tiers determined by lifetime spend: Bronze (₹0–4,999), Silver (₹5,000–12,999), Gold (₹13,000+)
- Two reward types: **Product** (free physical item) and **Coupon** (generated discount code)
- Rewards can be tier-restricted (hidden/disabled if user's tier doesn't match)
- Points are `pending` on order → flip to `available` when order is marked delivered

---

## 2. Database Schema

### Tables

**`loyalty_points`** — one row per user
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | auto-generated |
| `user_id` | UUID FK → profiles | unique |
| `balance` | INTEGER ≥ 0 | current spendable coins |
| `lifetime_earned` | INTEGER | total coins ever earned |
| `tier` | TEXT | bronze / silver / gold |

**`loyalty_transactions`** — ledger of all coin movements
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → profiles | |
| `type` | TEXT | earn / spend / bonus / expired |
| `amount` | INTEGER > 0 | |
| `balance_before` / `balance_after` | INTEGER | auto-set by trigger |
| `reference_type` | TEXT | order / review / referral / signup / redemption / admin |
| `reference_id` | UUID | links to order, reward, etc. |
| `status` | TEXT | pending / available / cancelled |
| `note` | TEXT | human-readable description |

**`reward_products`** — the rewards catalog (admin-managed)
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `product_name` | TEXT | display name |
| `description` | TEXT | nullable |
| `thumbnail_url` | TEXT | image URL |
| `coins_required` | INTEGER > 0 | cost to redeem |
| `stock` | INTEGER ≥ 0 | quantity left (decremented on redeem) |
| `active` | BOOLEAN | toggle visibility |
| `reward_type` | TEXT | 'product' or 'coupon' |
| `discount_amount` | INTEGER | ₹ discount for coupon rewards |
| `min_order_value` | INTEGER | min cart total for coupon use |
| `tier_restriction` | TEXT | NULL = all tiers, or bronze/silver/gold |

**`reward_coupons`** — generated coupon codes from coupon-type rewards
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → auth.users | who redeemed it |
| `reward_id` | UUID FK → reward_products | which reward generated it |
| `code` | TEXT UNIQUE | MB-XXXXXX format |
| `discount_amount` | INTEGER | |
| `min_order_value` | INTEGER | |
| `used` | BOOLEAN | false by default |
| `used_at` | TIMESTAMPTZ | set when used at checkout |

### Triggers

- **`set_transaction_balance`** (BEFORE INSERT): auto-fills `balance_before` and `balance_after` on `loyalty_transactions`
- **`update_points_balance`** (AFTER INSERT): syncs `loyalty_points.balance` after transaction

### RLS Policies
- Users read their own `loyalty_points` and `loyalty_transactions`
- Anyone can read active `reward_products`
- Admin access via service_role key (bypassed in RLS)

---

## 3. Server Actions

All in `app/actions/loyalty.ts`:

| Function | Type | What it does |
|----------|------|-------------|
| `getLoyaltyData()` | Read | Fetches user's points, transactions, orders total, all active rewards (returns everything, client handles tier filtering) |
| `earnOrderPoints(userId, orderId, total)` | Write | Creates pending `loyalty_transactions` → debounced until delivery |
| `releasePendingPoints(orderId)` | Write | Flips points from pending → available, increments balance (called when order → delivered) |
| `redeemReward(rewardProductId)` | Write | Validates coins, tier, stock → deducts coins → creates coupon code or records product redemption |
| `getMyCoupons()` | Read | Returns user's unused `reward_coupons` with joined reward name |
| `applyRewardCoupon(code)` | Read | Validates a coupon code, returns discount info for checkout |
| `markCouponUsed(couponId)` | Write | Marks coupon as used after successful order placement |
| `listRewardProducts()` | Admin Read | All reward products (for admin table) |
| `createRewardProduct(formData)` | Admin Write | Creates product or coupon reward |
| `updateRewardProduct(id, formData)` | Admin Write | Updates with type-aware field handling |
| `toggleRewardProduct(id, currentActive)` | Admin Write | Toggles active state |
| `deleteRewardProduct(id)` | Admin Write | Deletes a reward |
| `getLoyaltyStats()` | Admin Read | Returns total coins in system, user count, coins redeemed, tier distribution |

---

## 4. Customer-Facing Pages

### `/rewards` — Dashboard
- Pink gradient balance card (`show balance`)
- Tier indicator (3 horizontal circles: Bronze/Silver/Gold, current one highlighted)
- Progress bar to next tier with "₹X to go"
- Hero link to `/rewards/catalog`
- "How It Works" section
- Recent transaction activity feed
- Link to T&C at `/legal/rewards-terms`

### `/rewards/catalog` — Shop-like rewards browsing
- Pink gradient balance banner
- Earned coupons strip (horizontal scroll of green chips)
- Coupon rewards row (horizontal scroll of redeemable coupon cards)
- Filter pills: All / Under 499 / 500 / Above 500
- 2-column product grid with image + coin badge + "Add to Bag" CTA
- Tier-blocked items shown at full opacity with `{tier} only` badge
- Disabled buttons show coin cost in black; enabled buttons show pink "Add to Bag"

### `/rewards/catalog` — Product Reward Card
| State | Button |
|-------|--------|
| Has enough coins | Pink `ADD TO BAG` (enabled) |
| Not enough coins | Black `🪙 {coins}` (disabled) |
| Out of stock | Black `UNAVAILABLE` (disabled) |
| Wrong tier | Black `{tier} TIER` (disabled) + overlay badge |

### `/rewards/catalog` — Coupon Reward Card
| State | Button |
|-------|--------|
| Can redeem | Green `ADD TO BAG` (enabled) |
| Wrong tier | Grey `{tier} TIER` (disabled) |
| Not enough coins | Grey `🪙 {coins}` (disabled) |

### `/legal/rewards-terms` — T&C page
Full legal document with 12 sections covering program overview, eligibility, earning rates, tier progression, redemption, coin expiry (365 days), etc.

---

## 5. Admin Pages

### `/admin/rewards` — Full CRUD
- Stats dashboard: total coins in system, active users, coins redeemed, tier distribution
- Rewards table: Name, Type (Coupon/Product badge), Tier (badge with color), Coins, Stock, Value (discount or "Product"), Status toggle, Actions (Edit / Delete)
- **Add Reward**: modal with type toggle (product/coupon), tier selector, product import from catalog, name, description, coins, stock, thumbnail, coupon fields (discount, min order)
- **Edit Dialog**: inline modal with all above fields + active toggle
- **Tier Selector**: dropdown with All / Bronze / Silver / Gold options
- **Product import**: search input that hits `/api/products/search` (ilike on name, returns id + name + thumbnail_url)

---

## 6. Checkout Integration

In `app/(store)/checkout/checkout-client.tsx`:

1. **Input field + Apply button** — user enters MB-XXXXXX code
2. **`applyRewardCoupon(code)`** — validates against DB (must belong to user, must be unused)
3. **Discount calculated** — `Math.min(coupon.discount_amount, order_total)` — capped at total
4. **Price breakdown** — "Reward Coupon" line shown when discount > 0 (emerald text)
5. **`placeOrder()` call** — passes `{ id, discount }` as 8th param
6. **`markCouponUsed()`** — called after order insert succeeds (non-blocking)
7. **`earnOrderPoints()`** — called after order insert (non-blocking, earns coins on final total after all discounts)

---

## 7. Profile Integration

### `/profile` page
- **M Beauty Rewards card**: shows tier badge, coin balance, total spend, progress bar to next tier → links to `/rewards`
- **Reward Coupons section**: lists all unused coupons with code, discount amount, min order, and the reward product name

### `/profile/orders/[id]` page
- Shows `+{X} M Coins` earned from that order
- Status: `earned` if delivered, `pending (available on delivery)` otherwise
- Queries `loyalty_transactions` by `reference_id = order.id`

---

## 8. Order Lifecycle

```
1. ORDER PLACED
   └─ earnOrderPoints() → loyalty_transactions (status: pending)
      └─ NO change to loyalty_points.balance yet

2. ORDER DELIVERED (admin marks as delivered)
   └─ updateOrderStatus() fires releasePendingPoints(orderId)
      └─ loyalty_transactions.status → available
      └─ loyalty_points.balance += amount
      └─ loyalty_points.lifetime_earned += amount

3. COUPON REDEEMED
   └─ redeemReward() → deducts coins
      └─ generateCouponCode() → MB-XXXXXX
      └─ reward_products.stock -= 1
      └─ reward_coupons inserted (used: false)

4. COUPON USED AT CHECKOUT
   └─ applyRewardCoupon() → validates
   └─ placeOrder() → markCouponUsed() → used: true

5. PRODUCT REDEEMED
   └─ redeemReward() → deducts coins
      └─ loyalty_transactions (type: spend)
      └─ reward_products.stock -= 1
      └─ Admin fulfills manually (no cart integration)
```

---

## 9. Earn / Tier / Spend Formulas

```
coins_per_order = Math.floor(order_total / 60)
  (flat rate, no tier multiplier)

tier = computeTier(lifetime_spend):
  lifetime_spend >= 13000  → gold
  lifetime_spend >= 5000   → silver
  otherwise                → bronze

next_tier:
  bronze → silver (₹5,000)
  silver → gold   (₹13,000)
  gold   → null (top tier)

coupon_redeem_discount = discount_amount || coins_required * 100
  (if discount_amount not set, defaults to ₹100 per coin)

coupon_min_order = min_order_value || 0

checkout_discount_cap = Math.min(coupon.discount_amount, order_total)
```

---

## 10. File Map

```
SERVER ACTIONS
  app/actions/loyalty.ts                    — All loyalty server actions (399 lines)
  app/actions/orders.ts                     — placeOrder() + updateOrderStatus() call loyalty

DATABASE
  supabase/migrations/20260706_create_loyalty_rewards.sql   — Base tables + triggers + RLS
  supabase/migrations/20260707_add_coupon_rewards.sql       — Coupon columns + reward_coupons table
  supabase/migrations/20260708_add_tier_restriction.sql     — tier_restriction column

STORE PAGES
  app/(store)/rewards/page.tsx              — Rewards dashboard
  app/(store)/rewards/reward-card.tsx        — RewardCard component (product + coupon)
  app/(store)/rewards/catalog/page.tsx       — Catalog server page
  app/(store)/rewards/catalog/client.tsx     — Catalog client (grid + filter + coupon sheet)
  app/(store)/legal/rewards-terms/page.tsx   — T&C
  app/(store)/profile/profile-data.tsx       — Profile data fetcher (calls loyalty)
  app/(store)/profile/profile-content.tsx    — Rewards card + coupons section
  app/(store)/profile/orders/[id]/page.tsx   — Order detail (earned coins per order)

CHECKOUT
  app/(store)/checkout/checkout-client.tsx   — Coupon input, apply, discount, placeOrder

ADMIN
  app/admin/rewards/page.tsx                — Admin server component
  app/admin/rewards/client.tsx               — Full CRUD UI (603 lines)
  config/admin.ts                           — Nav link (line 60)
```

---

## Known Issues & Migration Checklist

### Must run in Supabase SQL editor (3 files):
1. `20260706_create_loyalty_rewards.sql` — base tables + triggers + RLS
2. `20260707_add_coupon_rewards.sql` — coupon columns + reward_coupons
3. `20260708_add_tier_restriction.sql` — tier_restriction column

### Things fixed in this audit:
- ✅ Legal terms earn rates updated (old: tiered 5/8/10 per ₹100, new: flat 1 per ₹60)
- ✅ Legal terms tier thresholds updated (Gold was ₹15k, now ₹13k)
- ✅ `releasePendingPoints` now called automatically when order → delivered
- ✅ Order detail page now queries `loyalty_transactions` instead of legacy `reward_points`
- ✅ Server-side `getLoyaltyData` no longer filters by tier (client handles disabled display)

### Still needed:
- Run the 3 migrations in Supabase
- Re-save each BXGY/free gift rule so junction table inserts populate (old bug)
