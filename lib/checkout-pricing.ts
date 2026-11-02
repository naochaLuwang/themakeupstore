import type { SupabaseClient } from '@supabase/supabase-js'
import { FREE_SHIPPING_PINCODES, FREE_SHIPPING_THRESHOLD } from '@/lib/cart-constants'
import { merchandiseQuote, monetaryAmount, uuidPattern } from '@/lib/cart-quote'
import { activeOffer, couponOfferMessage, roundMoney } from '@/lib/promotion-engine'
export { calculateBXGY } from '@/lib/promotion-engine'
export type { BXGYRule, PromotionUse } from '@/lib/promotion-engine'
export { positiveQuantity, uuidPattern } from '@/lib/cart-quote'
export type { PricedItem, FreeItem } from '@/lib/cart-quote'
export interface PricingInput {
  shippingMethodId: string; pincode: string; promoCode?: string
  giftCardCode?: string; coinAmount?: number
}
export async function checkoutQuote(db: SupabaseClient, userId: string, rawItems: unknown, input: PricingInput) {
  const merchandise = await merchandiseQuote(db,userId,rawItems)
  const { items, subtotal } = merchandise
  let promoEligibleVariantIds:string[]=[]
  let promoDiscount = 0
  let promoId: string | null = null
  if (input.promoCode && merchandise.hasAutomaticOffer) throw new Error(couponOfferMessage)
  if (input.promoCode) {
    const { data: promo, error: promoError } = await db.from('promo_codes').select('*,promo_code_products(product_id),promo_code_categories(category_id)').eq('code', input.promoCode.toUpperCase()).single()
    if (promoError || !promo || !activeOffer(promo)) throw new Error('Promo code is no longer applicable')
    const eligible = items.filter(item => promo.apply_to === 'all' || (promo.apply_to === 'specific_products' && promo.promo_code_products.some((p: { product_id: string }) => p.product_id === item.productId)) ||
      (promo.apply_to === 'specific_categories' && promo.promo_code_categories.some((c: { category_id: string }) => item.categoryIds.includes(c.category_id))))
    promoEligibleVariantIds=eligible.map(i=>i.variantId)
    const eligibleTotal = eligible.reduce((sum, item) => sum + item.price * item.quantity, 0)
    if (!eligible.length || eligibleTotal < Number(promo.min_order_amount || 0)) throw new Error('Promo code is no longer applicable')
    promoDiscount = promo.discount_type === 'percentage' ? roundMoney(eligibleTotal * monetaryAmount(promo.discount_value) / 100) : monetaryAmount(promo.discount_value)
    promoDiscount = roundMoney(Math.min(promoDiscount, eligibleTotal, promo.max_discount_amount == null ? Infinity : Number(promo.max_discount_amount)))
    promoId = promo.id
  }
  if (!uuidPattern.test(input.shippingMethodId)) throw new Error('Please select a valid shipping option')
  const { data: shipping, error: shippingError } = await db.from('shipping_methods').select('id,zone_id,price,name,delivery_time_label,is_active').eq('id', input.shippingMethodId).single()
  if (shippingError || !shipping || !shipping.is_active) throw new Error('Shipping option is no longer available')
  const { data: zone, error: zoneError } = await db.from('shipping_zones').select('pincode').eq('id', shipping.zone_id).single()
  if (zoneError || !zone || String(zone.pincode) !== String(input.pincode)) throw new Error('Shipping option does not match your delivery address')
  const shippingPrice = subtotal >= FREE_SHIPPING_THRESHOLD && FREE_SHIPPING_PINCODES.includes(input.pincode) ? 0 : monetaryAmount(shipping.price)
  const beforeBalances = Math.max(0, roundMoney(subtotal - promoDiscount - merchandise.bxgyDiscount + shippingPrice))
  let giftCardDiscount = 0
  if (input.giftCardCode) {
    const { data: card, error: cardError } = await db.from('gift_cards').select('status,remaining_balance,expires_at').eq('code', input.giftCardCode.toUpperCase()).single()
    if (cardError || !card || card.status !== 'active' || (card.expires_at && new Date(card.expires_at) <= new Date())) throw new Error('Gift card is no longer available')
    giftCardDiscount = Math.min(monetaryAmount(card.remaining_balance), beforeBalances)
  }
  const requestedCoins = input.coinAmount || 0
  if (!Number.isSafeInteger(requestedCoins) || requestedCoins < 0) throw new Error('Invalid M Coin amount')
  let coinDiscount = 0
  if (requestedCoins) {
    const { data: points, error: pointsError } = await db.from('loyalty_points').select('balance').eq('user_id', userId).maybeSingle()
    if (pointsError) throw new Error('Could not verify M Coins')
    coinDiscount = Math.min(requestedCoins, Math.floor(Math.max(0, beforeBalances - giftCardDiscount)))
    if (coinDiscount > Number(points?.balance || 0)) throw new Error('Insufficient M Coins')
  }
  return { ...merchandise, promoDiscount, promoId,promoEligibleVariantIds,
    shippingBasePrice:Number(shipping.price), shippingPrice, shippingLabel: shipping.name, deliveryTimeLabel: shipping.delivery_time_label,
    giftCardDiscount, coinDiscount, total: Math.max(0, roundMoney(beforeBalances - giftCardDiscount - coinDiscount)) }
}
