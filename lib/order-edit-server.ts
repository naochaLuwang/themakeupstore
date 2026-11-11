import 'server-only'
import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { variantFlashPricing, type FlashSaleRow } from '@/lib/flash-sale-helper'
import { loadPromotionDefinitions, loadPromotionSnapshot } from '@/lib/promotion-data'
import { activeOffer } from '@/lib/promotion-engine'
import { FREE_SHIPPING_PINCODES, FREE_SHIPPING_THRESHOLD } from '@/lib/cart-constants'
import {
  editBlockReason,
  priceOrderEdit,
  type CouponDefinition,
  type EditRequest,
  type OrderEditContext,
  type OrderEditQuote,
} from '@/lib/order-edit'
import { requestFingerprint, paymentClient, refundPaymentOnce } from '@/lib/verified-payment'
import type { PricedItem } from '@/lib/cart-quote'

export async function loadOrderEditContext(db: SupabaseClient, orderId: string): Promise<OrderEditContext> {
  const { data, error } = await db.rpc('get_order_edit_context', { p_order_id: orderId })
  if (error)
    throw new Error(
      error.code === 'PGRST202'
        ? 'Order editing needs its database migration before this build can be used.'
        : error.message
    )
  if (!data) throw new Error('Order not found')
  return data as OrderEditContext
}

export const orderEditReviewHash = (quote: OrderEditQuote) => {
  const { validUntil: _validUntil, ...financial } = quote
  void _validUntil
  return requestFingerprint(financial)
}

export async function calculateOrderEdit(db: SupabaseClient, input: EditRequest) {
  const context = await loadOrderEditContext(db, input.orderId)
  const { order } = context
  const blocked = editBlockReason(order, context.hasRefunds)
  if (blocked) throw new Error(blocked)
  if (context.settlements.some((s) => s.status === 'reserved'))
    throw new Error('Finish the pending payment or refund before editing.')
  if (context.revision !== input.revision) throw new Error('The order changed. Reload it before editing.')
  const ids = [
    ...new Set([
      ...input.items.map((i) => i.variantId),
      ...order.order_items.flatMap((i) => (i.product_variant_id ? [i.product_variant_id] : [])),
    ]),
  ].sort()
  const guard = await db.rpc('order_edit_catalog_revision', { p_variants: ids })
  if (guard.error) throw new Error(guard.error.message)
  const [{ data: variants, error: variantError }, definitions, flash, claims, wholesale] = await Promise.all([
    db
      .from('product_variants')
      .select(
        'id,product_id,title,price,stock,image_url,discount_type,discount_value,products(id,name,brand,thumbnail_url,category_id,discount_type,discount_value)'
      )
      .in('id', ids),
    loadPromotionDefinitions(db),
    db.from('flash_sales').select('*').eq('is_active', true).gte('ends_at', new Date().toISOString()),
    order.user_id
      ? db.from('checkout_promotion_uses').select('order_id,kind,promotion_id').eq('user_id', order.user_id)
      : Promise.resolve({ data: [], error: null }),
    order.payment_method === 'B2B_INVOICE'
      ? db.from('category_wholesale_rules').select('category_id,discount_percentage,is_active')
      : Promise.resolve({ data: [], error: null }),
  ])
  if (variantError || flash.error || claims.error || wholesale.error)
    throw new Error('Could not verify product prices, stock or offers.')
  const owned = claims.data?.filter((c) => c.order_id === order.id) || []
  const other = claims.data?.filter((c) => c.order_id !== order.id) || []
  const ownUse = (kind: string, id: string) =>
    owned.some((c) => c.kind === kind && c.promotion_id === id) ? 1 : 0
  const availableDefinitions = {
    bxgyRules:
      order.payment_method === 'B2B_INVOICE' || !order.user_id
        ? []
        : definitions.bxgyRules.map((r) => ({
            ...r,
            used_count: Math.max(0, Number(r.used_count || 0) - ownUse('bxgy', r.id)),
          })),
    giftRules:
      order.payment_method === 'B2B_INVOICE' || !order.user_id
        ? []
        : definitions.giftRules.map((r) => ({
            ...r,
            used_count: Math.max(0, Number(r.used_count || 0) - ownUse('gift', r.id)),
          })),
  }
  const historic = order.offer_snapshot?.edit_context || order.offer_snapshot?.pricing_context
  // Historical gift definitions may be paused or expired. Load their inventory as
  // well, but never make those rules eligible for today's repricing mode.
  const inventoryDefinitions =
    input.pricingMode === 'preserve' && historic
      ? { ...availableDefinitions, giftRules: historic.snapshot.giftRules }
      : availableDefinitions
  const [snapshot, categories, shippingResult, couponResult] = await Promise.all([
    loadPromotionSnapshot(db, order.user_id, inventoryDefinitions),
    db
      .from('product_categories')
      .select('product_id,category_id')
      .in('product_id', [...new Set((variants || []).map((v) => v.product_id))]),
    order.shipping_method_id
      ? db
          .from('shipping_methods')
          .select('price,is_active,zone_id')
          .eq('id', order.shipping_method_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    order.promo_code
      ? db
          .from('promo_codes')
          .select('*,promo_code_products(product_id),promo_code_categories(category_id)')
          .eq('code', order.promo_code)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])
  if (categories.error || shippingResult.error || couponResult.error)
    throw new Error('Could not verify delivery or discount rules.')
  snapshot.giftRules = availableDefinitions.giftRules
  snapshot.usedBXGY = other.filter((c) => c.kind === 'bxgy').map((c) => c.promotion_id)
  snapshot.usedGifts = other.filter((c) => c.kind === 'gift').map((c) => c.promotion_id)
  const ownedInventory = (variantId: string | null, giftId: string | null) =>
    order.order_items
      .filter((i) =>
        giftId ? i.gift_product_id === giftId : i.product_variant_id === variantId && !i.gift_product_id
      )
      .reduce((n, i) => n + i.quantity - Number(i.stock_restored_quantity || 0), 0)
  snapshot.giftOptions = snapshot.giftOptions.map((g) => ({
    ...g,
    stock: Number(g.stock) + ownedInventory(g.variantId, g.giftProductId),
  }))
  const items: PricedItem[] = (variants || []).map((v) => {
    const product = v.products as unknown as {
      id: string
      name: string
      brand: string
      thumbnail_url: string
      category_id: string | null
      discount_type: 'percentage' | 'amount' | 'none'
      discount_value: number
    }
    if (!product) throw new Error('A product in this order no longer exists.')
    const categoryIds = [
      ...new Set(
        [
          product.category_id,
          ...(categories.data || []).filter((c) => c.product_id === v.product_id).map((c) => c.category_id),
        ].filter((id): id is string => !!id)
      ),
    ]
    const price = variantFlashPricing(v, { ...product, categoryIds }, (flash.data as FlashSaleRow[]) || [])
    const wholesaleRule = wholesale.data?.find((r) => r.category_id === product.category_id && r.is_active)
    const sellingPrice =
      order.payment_method === 'B2B_INVOICE'
        ? Math.floor(Number(v.price) * (1 - Number(wholesaleRule?.discount_percentage || 0) / 100))
        : price.salePrice
    return {
      variantId: v.id,
      productId: v.product_id,
      name: product.name,
      variantTitle: v.title || '',
      price: sellingPrice,
      mrp: Number(v.price),
      quantity: 0,
      stock: Number(v.stock) + ownedInventory(v.id, null),
      image: v.image_url || product.thumbnail_url || '',
      categoryId: categoryIds[0] || '',
      categoryIds,
      brand: product.brand || '',
    }
  })
  let coupon: CouponDefinition | null = null
  if (couponResult.data) {
    const rule = couponResult.data
    const redemption = order.user_id
      ? await db
          .from('promo_redemptions')
          .select('order_id')
          .eq('promo_id', rule.id)
          .eq('user_id', order.user_id)
      : { data: [], error: null }
    if (redemption.error) throw new Error('Could not verify coupon usage.')
    const claimed = redemption.data?.some((r) => r.order_id === order.id) ? 1 : 0
    if (
      activeOffer(
        { ...rule, used_count: Math.max(0, Number(rule.used_count || 0) - claimed) },
        new Set(redemption.data?.some((r) => r.order_id !== order.id) ? [rule.id] : [])
      )
    )
      coupon = rule as CouponDefinition
  }
  const warnings: string[] = []
  if (order.payment_method === 'B2B_INVOICE')
    warnings.push(
      'Wholesale category rates apply to new quantities. Catalog search shows retail prices; this review shows the wholesale amounts.'
    )
  if (!order.user_id)
    warnings.push(
      'This guest order has no customer promotion account. Current selling prices apply without new customer campaign claims.'
    )
  let shippingMethod = shippingResult.data?.is_active ? shippingResult.data : null
  if (shippingMethod) {
    const zone = await db
      .from('shipping_zones')
      .select('pincode')
      .eq('id', shippingMethod.zone_id)
      .maybeSingle()
    if (zone.error) throw new Error('Could not verify the original delivery area.')
    if (String(zone.data?.pincode || '') !== String(order.shipping_address?.pincode || ''))
      shippingMethod = null
  }
  let shippingPrice = order.order_type === 'pickup' ? 0 : Number(order.shipping_price || 0)
  if (order.order_type !== 'pickup' && !shippingMethod)
    warnings.push(
      'The original delivery method is unavailable for this address. Its saved delivery charge has been retained.'
    )
  const flashDates = (flash.data || [])
    .flatMap((f) => [f.starts_at, f.ends_at])
    .filter((date): date is string => !!date && Date.parse(date) > Date.now())
    .map((date) => Date.parse(date))
  snapshot.expiresAt = Math.min(snapshot.expiresAt, ...flashDates)
  let quote = priceOrderEdit(order, input, { items, snapshot, coupon, shippingPrice, warnings })
  if (order.order_type !== 'pickup' && shippingMethod) {
    const pin = String(order.shipping_address?.pincode || '')
    shippingPrice =
      quote.subtotal >= FREE_SHIPPING_THRESHOLD && FREE_SHIPPING_PINCODES.includes(pin)
        ? 0
        : Number(shippingMethod.price)
    quote = priceOrderEdit(order, input, { items, snapshot, coupon, shippingPrice, warnings })
  }
  const guardAfter = await db.rpc('order_edit_catalog_revision', { p_variants: ids })
  if (guardAfter.error || guardAfter.data !== guard.data)
    throw new Error('The catalog changed while calculating. Review the total again.')
  return {
    quote,
    context,
    ids,
    catalogRevision: guard.data as string,
    reviewHash: orderEditReviewHash(quote),
  }
}

export async function finishEditSettlement(
  db: SupabaseClient,
  record: {
    id: string
    status: string
    method: string
    kind: string
    amount: number
    payment_id: string | null
    reference: string | null
  }
) {
  if (record.status === 'complete') return
  let reference = record.reference
  if (record.method === 'razorpay') {
    if (record.kind !== 'refund' || !record.payment_id)
      throw new Error('No original payment is available for this refund.')
    // The preflight runs before reservation. A reserved refund must always retry
    // the same provider key, including after a successful send with a lost reply.
    reference = await refundPaymentOnce(record.payment_id, Number(record.amount), record.id)
  }
  const { error } = await db.rpc('finish_order_edit_settlement', { p_id: record.id, p_reference: reference })
  if (error) throw new Error(error.message)
}

export async function cancelAmendedOrder(
  db: SupabaseClient,
  orderId: string,
  actorId: string,
  reason: string
) {
  const { error } = await db.rpc('cancel_amended_order', {
    p_order_id: orderId,
    p_actor: actorId,
    p_reason: reason || 'Order cancelled',
  })
  if (error) throw new Error(error.message)
  const context = await loadOrderEditContext(db, orderId)
  let warning = ''
  if (context.order.razorpay_payment_id && context.order.edit_refund_due > 0) {
    try {
      const pending = context.settlements.find((s) => s.status === 'reserved')
      if (pending)
        await finishEditSettlement(db, { ...pending, payment_id: context.order.razorpay_payment_id })
      else {
        const payment = await paymentClient().payments.fetch(context.order.razorpay_payment_id)
        const amount = Math.min(
          context.order.edit_refund_due,
          (Number(payment.amount) - Number(payment.amount_refunded || 0)) / 100
        )
        if (amount > 0) {
          const key = randomUUID()
          const reserved = await db.rpc('reserve_order_edit_settlement', {
            p_order_id: orderId,
            p_key: key,
            p_actor: actorId,
            p_kind: 'refund',
            p_method: 'razorpay',
            p_amount: amount,
            p_reason: 'Cancelled amended order',
            p_reference: null,
          })
          if (reserved.error) throw new Error(reserved.error.message)
          await finishEditSettlement(db, reserved.data)
        }
      }
    } catch (error) {
      warning = error instanceof Error ? error.message : 'Retry the pending refund in Edit order.'
    }
  }
  const updated = await loadOrderEditContext(db, orderId)
  return {
    success: true as const,
    message:
      updated.order.edit_refund_due > 0
        ? `Order cancelled and stock restored. Refund still due: ₹${updated.order.edit_refund_due}. ${warning}`.trim()
        : 'Order cancelled, stock restored and refund reconciled.',
  }
}
