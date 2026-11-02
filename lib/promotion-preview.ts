import type { PricedItem, FreeItem } from '@/lib/cart-quote'
import { pickBestFlashSale, calculateDiscountedPrice, type FlashSaleRow } from '@/lib/flash-sale-helper'
import { lineSubtotal, type PriceGroup } from '@/lib/line-pricing'
import { calculateBXGY, evaluateGiftRules, roundMoney, type BXGYRule, type GiftRule, type PromotionUse } from '@/lib/promotion-engine'

export interface PromotionSnapshot {
  flashSales?: FlashSaleRow[]
  ownerId: string | null
  bxgyRules: BXGYRule[]
  giftRules: GiftRule[]
  giftOptions: (FreeItem & { stock: number })[]
  usedBXGY: string[]
  usedGifts: string[]
  expiresAt: number
}

// The browser preview and authoritative checkout use exactly the same pricing rules.
export function evaluatePromotionSnapshot(rawItems: PricedItem[], snapshot: PromotionSnapshot) {
  const items: PricedItem[] = rawItems.map(item => {
    const sale = snapshot.flashSales ? pickBestFlashSale(snapshot.flashSales, item.productId, item.categoryIds, item.brand, item.mrp, item.variantId) : null
    const price = snapshot.flashSales && item.regularPrice !== undefined
      ? Math.min(item.regularPrice, sale ? calculateDiscountedPrice(item.mrp, sale.discount_type, sale.discount_value) : Infinity) : item.price
    return { ...item, price, priceBreakdown: undefined }
  })
  const { bxgyRules, giftRules } = snapshot
  const bxgy = calculateBXGY(items, bxgyRules, new Set(snapshot.usedBXGY))
  const giftEvaluation = evaluateGiftRules(items, giftRules, new Set(snapshot.usedGifts))
  // Keep normal selling prices for gift qualification. Reprice only units consumed by BXGY.
  for (const item of items) {
    const groups = new Map<number, PriceGroup>()
    let remaining = item.quantity
    for (const allocation of bxgy.allocations.filter(a => a.variantId === item.variantId)) {
      const group = groups.get(allocation.unitPrice) || { price: allocation.unitPrice, quantity: 0, discounts: [] }
      group.quantity += allocation.quantity
      if (allocation.freeQuantity > 0) group.discounts.push({ rule_id: allocation.ruleId, rule_name: allocation.ruleName,
        variant_id: item.variantId, product_id: item.productId, product_name: item.name,
        discount_amount: roundMoney(allocation.unitPrice * allocation.freeQuantity), original_price: allocation.unitPrice, free_quantity: allocation.freeQuantity })
      groups.set(group.price, group)
      remaining -= allocation.quantity
    }
    if (remaining > 0) {
      const group = groups.get(item.price) || { price: item.price, quantity: 0, discounts: [] }
      group.quantity += remaining
      groups.set(item.price, group)
    }
    item.priceBreakdown = [...groups.values()]
  }
  const resolveGift = (rule: GiftRule): FreeItem | null => {
    const option = snapshot.giftOptions.find(g => g.ruleId === rule.id)
    if (!option || option.stock - (items.find(i => i.variantId === option.variantId)?.quantity || 0) < 1) return null
    return { productId:option.productId,variantId:option.variantId,giftProductId:option.giftProductId,ruleId:option.ruleId,ruleName:option.ruleName,quantity:1,name:option.name,mrp:option.mrp,image:option.image }
  }
  // One fixed gift globally. Prefer the highest-value available eligible gift, then stable rule ID.
  const gifts = giftEvaluation.qualifying.map(resolveGift).filter((g): g is FreeItem => !!g).sort((a,b) => b.mrp-a.mrp || a.ruleId.localeCompare(b.ruleId))
  const freeItems = gifts.slice(0,1)
  const giftProgress = giftEvaluation.progress.flatMap(p => {
    const rule = giftRules.find(r => r.id === p.ruleId)!
    const gift = resolveGift(rule)
    return gift ? [{...p,giftProductName:gift.name,giftProductImage:gift.image,qualifies:freeItems.some(g => g.ruleId === p.ruleId)}] : []
  })
  const promotions: PromotionUse[] = [...bxgy.promotions,...freeItems.map(g => ({id:g.ruleId,kind:'gift' as const}))]
  return { items, subtotal:roundMoney(items.reduce((sum,i)=>sum+lineSubtotal(i),0)), bxgyDiscount:bxgy.discount,
    qualifyingSubtotal:roundMoney(items.reduce((sum,i)=>sum+i.price*i.quantity,0)), bxgyAllocations:bxgy.allocations,
    discounts:bxgy.discounts, freeItems, promotions, giftProgress, bxgyProgress:bxgy.progress,
    hasAutomaticOffer:promotions.length>0, expiresAt:snapshot.expiresAt }
}
