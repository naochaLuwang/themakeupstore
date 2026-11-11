import type { PricedItem } from '@/lib/cart-quote'
import type { PromotionSnapshot } from '@/lib/promotion-preview'
import { evaluatePromotionSnapshot } from '@/lib/promotion-preview'
import { checkoutOrderItems } from '@/lib/checkout-order-items'
import { roundMoney } from '@/lib/promotion-engine'

export type EditPricingMode = 'preserve' | 'current'
export interface OrderEditItem {
  id: string
  product_id: string | null
  product_variant_id: string | null
  gift_product_id: string | null
  product_name: string
  variant_title: string
  quantity: number
  unit_price: number
  mrp: number
  is_gift: boolean
  line_discount_amount: number | null
  refunded_quantity: number
  stock_restored_quantity: number
  promotion_allocations: unknown[]
}
export interface CouponDefinition {
  id: string
  code: string
  apply_to: string
  discount_type: string
  discount_value: number
  min_order_amount: number
  max_discount_amount: number | null
  promo_code_products: { product_id: string }[]
  promo_code_categories: { category_id: string }[]
}
export interface EditPriceContext {
  snapshot: PromotionSnapshot
  coupon: CouponDefinition | null
  bases: Record<string, { price: number; mrp: number; categoryIds: string[]; brand: string }>
}
export interface EditableOrder {
  id: string
  user_id: string | null
  status: string
  order_type: string
  payment_method: string
  payment_status: string
  razorpay_payment_id: string | null
  total: number
  shipping_price: number
  shipping_method_id: string | null
  shipping_label: string | null
  shipping_address: { pincode?: string; full_name?: string } | null
  promo_code: string | null
  promo_discount_amount: number
  bxgy_discount_amount: number
  gift_card_discount: number
  coin_discount_amount: number
  additional_charges: number
  additional_charges_label: string | null
  checkout_key: string | null
  edit_version: number
  edit_paid_amount: number | null
  edit_balance_due: number
  edit_refund_due: number
  cancellation_started_at: string | null
  offer_snapshot: {
    edit_context?: EditPriceContext
    pricing_context?: EditPriceContext
    [key: string]: unknown
  } | null
  order_items: OrderEditItem[]
}
export interface EditRequest {
  orderId: string
  revision: string
  items: { variantId: string; quantity: number }[]
  pricingMode: EditPricingMode
}
export interface EditLine {
  source_item_id: string | null
  product_id: string | null
  product_variant_id: string | null
  gift_product_id: string | null
  product_name: string
  variant_title: string
  quantity: number
  unit_price: number
  mrp: number
  is_gift: boolean
  line_discount_amount: number
  promotion_allocations: unknown[]
}
export interface OrderEditQuote {
  lines: EditLine[]
  subtotal: number
  promoDiscount: number
  bxgyDiscount: number
  shippingPrice: number
  giftCardDiscount: number
  coinDiscount: number
  additionalCharges: number
  total: number
  cashReceived: number
  balanceDue: number
  refundDue: number
  giftCreditReturned: number
  coinsReturned: number
  warnings: string[]
  promotions: { id: string; kind: 'bxgy' | 'gift' }[]
  priceContext: EditPriceContext
  pricingMode: EditPricingMode
  validUntil: number
}
export interface EditHistory {
  id: string
  actor_id: string
  reason: string
  kind: string
  created_at: string
  before_state: EditableOrder
  after_state: EditableOrder
}
export interface EditSettlement {
  id: string
  request_key: string
  kind: 'payment' | 'refund'
  method: 'cash' | 'upi' | 'bank' | 'razorpay'
  amount: number
  status: 'reserved' | 'complete'
  reference: string | null
  reason: string
  created_at: string
}
export interface OrderEditContext {
  order: EditableOrder
  revision: string
  history: EditHistory[]
  settlements: EditSettlement[]
  hasRefunds: boolean
}

export const formatOrderMoney = (amount: number) =>
  `₹${(Number(amount) === 0 ? 0 : Number(amount)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
export function editBlockReason(order: EditableOrder, hasRefunds = false) {
  if (order.cancellation_started_at || order.status === 'cancelled')
    return 'This order is cancelled or its cancellation is in progress.'
  if (order.status === 'packed') return 'Reopen packing before changing this order.'
  if (!['pending', 'confirmed'].includes(order.status))
    return 'Items can be edited before packing. Use a return or exchange after dispatch or collection.'
  if (!['paid', 'unpaid'].includes(order.payment_status))
    return 'Resolve this order’s payment or refund status before editing its items.'
  if (
    hasRefunds ||
    order.order_items.some((i) => Number(i.refunded_quantity) > 0 || Number(i.stock_restored_quantity) > 0)
  )
    return 'This order already has a return or refund. Its item and payment history must be preserved.'
  return null
}

export function receivedCash(order: EditableOrder) {
  return roundMoney(
    order.edit_paid_amount == null
      ? order.payment_status === 'paid'
        ? Number(order.total)
        : 0
      : Number(order.edit_paid_amount)
  )
}

// Keep original campaigns alive for an existing contract; dates and global claim caps
// apply to new checkouts, not to re-evaluating a campaign already used by this order.
export function contractualSnapshot(snapshot: PromotionSnapshot): PromotionSnapshot {
  const held = <T extends PromotionSnapshot['bxgyRules'][number] | PromotionSnapshot['giftRules'][number]>(
    r: T
  ): T => ({
    ...r,
    is_active: true,
    starts_at: undefined,
    expires_at: null,
    usage_limit: null,
    once_per_user: false,
  })
  return {
    ...snapshot,
    flashSales: undefined,
    bxgyRules: snapshot.bxgyRules.map(held),
    giftRules: snapshot.giftRules.map(held),
    usedBXGY: [],
    usedGifts: [],
    expiresAt: Date.now() + 60_000,
  }
}

export function priceOrderEdit(
  order: EditableOrder,
  request: EditRequest,
  catalog: {
    items: PricedItem[]
    snapshot: PromotionSnapshot
    coupon: CouponDefinition | null
    shippingPrice: number
    warnings?: string[]
  }
): OrderEditQuote {
  const warnings = [...(catalog.warnings || [])]
  const context = order.offer_snapshot?.edit_context || order.offer_snapshot?.pricing_context
  const hasHistoricOffers =
    Number(order.bxgy_discount_amount) > 0 ||
    order.order_items.some((i) => i.is_gift || i.promotion_allocations?.length > 0) ||
    !!order.promo_code
  if (request.pricingMode === 'preserve' && hasHistoricOffers && !context) {
    throw new Error(
      'The original offer rules were not saved for this older order. Select “Use current prices and offers” and review the changes explicitly.'
    )
  }
  const snapshot =
    request.pricingMode === 'preserve'
      ? context
        ? contractualSnapshot(context.snapshot)
        : { ...catalog.snapshot, flashSales: undefined, bxgyRules: [], giftRules: [], giftOptions: [] }
      : { ...catalog.snapshot, flashSales: undefined }
  // Current stock is always authoritative, even for a historical gift contract.
  snapshot.giftOptions = snapshot.giftOptions.map((gift) => {
    const fresh = catalog.snapshot.giftOptions.find(
      (g) => g.variantId === gift.variantId && g.giftProductId === gift.giftProductId
    )
    return { ...gift, stock: fresh?.stock ?? 0 }
  })
  const coupon = request.pricingMode === 'preserve' && context ? context.coupon : catalog.coupon
  const lots: PricedItem[] = []
  const lotSources = new Map<string, { variantId: string; itemId: string | null }>()
  const bases: EditPriceContext['bases'] = {}
  for (const requested of request.items) {
    const fresh = catalog.items.find((i) => i.variantId === requested.variantId)
    if (!fresh) throw new Error('A selected product or shade is no longer available.')
    if (![fresh.price, fresh.mrp, fresh.stock].every((n) => Number.isFinite(n) && n >= 0))
      throw new Error(
        'A selected product has invalid price or stock data. Correct its catalog record before editing.'
      )
    let remaining = requested.quantity
    const existing = order.order_items.filter(
      (i) => !i.is_gift && i.product_variant_id === requested.variantId
    )
    if (request.pricingMode === 'preserve') {
      for (const item of existing) {
        const quantity = Math.min(remaining, item.quantity)
        if (!quantity) continue
        const key = `${item.product_variant_id}:${item.id}`
        const base = context?.bases[item.id] ||
          context?.bases[`variant:${requested.variantId}`] || {
            price: Number(item.unit_price),
            mrp: Math.max(Number(item.mrp), Number(item.unit_price)),
            categoryIds: fresh.categoryIds,
            brand: fresh.brand,
          }
        lots.push({ ...fresh, ...base, variantId: key, regularPrice: undefined, quantity })
        lotSources.set(key, { variantId: requested.variantId, itemId: item.id })
        bases[key] = base
        remaining -= quantity
      }
    }
    if (remaining) {
      const key = `${requested.variantId}:new`
      const base = { price: fresh.price, mrp: fresh.mrp, categoryIds: fresh.categoryIds, brand: fresh.brand }
      lots.push({ ...fresh, variantId: key, regularPrice: undefined, quantity: remaining })
      lotSources.set(key, { variantId: requested.variantId, itemId: null })
      bases[key] = base
    }
    if (fresh.stock < requested.quantity)
      throw new Error(`Only ${fresh.stock} available for ${fresh.name} (${fresh.variantTitle}).`)
  }
  if (!lots.length)
    throw new Error('Use Cancel order to remove every item and return its payments and credits.')
  // Lots have unique keys so old and newly added quantities can retain different prices.
  // Gift stock has already had the entire revised paid quantity subtracted here.
  snapshot.giftOptions = snapshot.giftOptions.map((g) => ({
    ...g,
    stock: g.stock - (request.items.find((i) => i.variantId === g.variantId)?.quantity || 0),
  }))
  const priced = evaluatePromotionSnapshot(lots, snapshot)
  let promoDiscount = 0
  let eligible: string[] | undefined
  if (coupon) {
    if (priced.hasAutomaticOffer)
      warnings.push('The coupon was removed because it cannot combine with an automatic offer.')
    else {
      const matching = priced.items.filter(
        (i) =>
          coupon.apply_to === 'all' ||
          (coupon.apply_to === 'specific_products' &&
            coupon.promo_code_products.some((p) => p.product_id === i.productId)) ||
          (coupon.apply_to === 'specific_categories' &&
            i.categoryIds.some((id) => coupon.promo_code_categories.some((c) => c.category_id === id)))
      )
      const amount = roundMoney(matching.reduce((n, i) => n + i.price * i.quantity, 0))
      if (matching.length && amount >= Number(coupon.min_order_amount || 0)) {
        eligible = matching.map((i) => i.variantId)
        promoDiscount = roundMoney(
          Math.min(
            amount,
            coupon.max_discount_amount ?? Infinity,
            coupon.discount_type === 'percentage'
              ? (amount * Number(coupon.discount_value)) / 100
              : Number(coupon.discount_value)
          )
        )
      } else warnings.push('The coupon was removed because the revised items no longer qualify.')
    }
  } else if (!order.promo_code && Number(order.promo_discount_amount) > 0) {
    promoDiscount = Math.min(
      Number(order.promo_discount_amount),
      Math.max(0, priced.subtotal - priced.bxgyDiscount)
    )
    warnings.push(
      'The existing manual order discount has been retained, capped at the revised merchandise amount.'
    )
  } else if (order.promo_code)
    warnings.push('The original coupon is no longer available for this pricing choice.')
  const usedSourceIds = new Set<string>()
  const nextBases: EditPriceContext['bases'] = {}
  const lines: EditLine[] = checkoutOrderItems({
    ...priced,
    promoDiscount,
    promoEligibleVariantIds: eligible,
  }).map((line, index) => {
    const key = line.product_variant_id!
    const source = lotSources.get(key)!
    const matched = order.order_items.find(
      (i) =>
        !i.is_gift &&
        i.product_variant_id === source.variantId &&
        !usedSourceIds.has(i.id) &&
        Number(i.unit_price) === line.unit_price
    )
    const itemId = source.itemId && !usedSourceIds.has(source.itemId) ? source.itemId : matched?.id || null
    if (itemId) usedSourceIds.add(itemId)
    // New IDs are assigned by the database. Index keys carry each lot's price basis.
    nextBases[String(index)] = bases[key]
    return {
      ...line,
      source_item_id: itemId,
      product_variant_id: source.variantId,
      promotion_allocations: line.promotion_allocations,
    }
  })
  for (const gift of priced.freeItems) {
    const prior = order.order_items.find(
      (i) => i.is_gift && i.product_variant_id === gift.variantId && i.gift_product_id === gift.giftProductId
    )
    lines.push({
      source_item_id: prior?.id || null,
      product_id: gift.productId,
      product_variant_id: gift.variantId,
      gift_product_id: gift.giftProductId,
      product_name: gift.name,
      variant_title: 'Free Gift',
      quantity: gift.quantity,
      unit_price: 0,
      mrp: gift.mrp,
      is_gift: true,
      line_discount_amount: 0,
      promotion_allocations: [{ rule_id: gift.ruleId, quantity: gift.quantity, amount: 0 }],
    })
  }
  const originalGifts = order.order_items.filter((i) => i.is_gift)
  if (
    originalGifts.some(
      (g) =>
        !lines.some(
          (i) =>
            i.is_gift &&
            i.product_variant_id === g.product_variant_id &&
            i.gift_product_id === g.gift_product_id
        )
    )
  ) {
    warnings.push('An original free gift has been removed. Remove it from the parcel as well.')
  }
  if (Number(order.bxgy_discount_amount) !== priced.bxgyDiscount)
    warnings.push('Buy 2 Get 1 savings changed with the revised quantities.')
  if (Number(order.shipping_price) !== catalog.shippingPrice)
    warnings.push(`Delivery charge changed from ₹${order.shipping_price} to ₹${catalog.shippingPrice}.`)
  const additionalCharges = Number(order.additional_charges || 0)
  if (
    ![additionalCharges, catalog.shippingPrice, receivedCash(order)].every(
      (n) => Number.isFinite(n) && n >= 0
    )
  )
    throw new Error('This order has invalid payment or charge data and needs review before editing.')
  const beforeCredits = roundMoney(
    Math.max(
      0,
      priced.subtotal - priced.bxgyDiscount - promoDiscount + catalog.shippingPrice + additionalCharges
    )
  )
  const giftCardDiscount = Math.min(Number(order.gift_card_discount || 0), beforeCredits)
  const coinDiscount = Math.min(
    Number(order.coin_discount_amount || 0),
    Math.floor(roundMoney(beforeCredits - giftCardDiscount))
  )
  const total = roundMoney(beforeCredits - giftCardDiscount - coinDiscount)
  const cashReceived = receivedCash(order)
  const giftCreditReturned = roundMoney(Number(order.gift_card_discount || 0) - giftCardDiscount)
  const coinsReturned = Number(order.coin_discount_amount || 0) - coinDiscount
  if (giftCreditReturned || coinsReturned)
    warnings.push('Unused gift-card credit and M Coins will be returned when changes are saved.')
  // A preserved contract can qualify again after a later edit. Today's repricing
  // starts a new contract containing only campaigns actually acquired in that review.
  const ruleIds = new Set(priced.promotions.map((p) => p.id))
  const savedSnapshot = {
    ...snapshot,
    bxgyRules: snapshot.bxgyRules.filter((r) => request.pricingMode === 'preserve' || ruleIds.has(r.id)),
    giftRules: snapshot.giftRules.filter((r) => request.pricingMode === 'preserve' || ruleIds.has(r.id)),
    giftOptions: snapshot.giftOptions.map((g) => ({ ...g, stock: 0 })),
    expiresAt: 0,
  }
  return {
    lines,
    subtotal: priced.subtotal,
    promoDiscount,
    bxgyDiscount: priced.bxgyDiscount,
    shippingPrice: catalog.shippingPrice,
    giftCardDiscount,
    coinDiscount,
    additionalCharges,
    total,
    cashReceived,
    balanceDue: roundMoney(Math.max(0, total - cashReceived)),
    refundDue: roundMoney(Math.max(0, cashReceived - total)),
    giftCreditReturned,
    coinsReturned,
    warnings,
    promotions: priced.promotions,
    priceContext: {
      snapshot: savedSnapshot,
      coupon: request.pricingMode === 'preserve' || (promoDiscount && eligible) ? coupon : null,
      bases: nextBases,
    },
    pricingMode: request.pricingMode,
    validUntil: Math.min(
      Date.now() + 60_000,
      request.pricingMode === 'current' ? catalog.snapshot.expiresAt : Infinity
    ),
  }
}
