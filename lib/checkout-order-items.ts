import type { BXGYDiscount } from '@/components/store/use-cart'
import type { PricedItem } from '@/lib/cart-quote'
import { priceGroups } from '@/lib/line-pricing'
import { allocateMoney } from '@/lib/order-amounts'
import { roundMoney } from '@/lib/promotion-engine'

// Separate original-price offer units and discounted extras so stored unit prices stay exact.
export function checkoutOrderItems(quote: {
  items: PricedItem[]; discounts?: BXGYDiscount[]; promoDiscount: number; promoEligibleVariantIds?: string[]
}) {
  const lines = quote.items.flatMap(item => priceGroups(item).map(group => ({ item, ...group,
    discounts: item.priceBreakdown ? group.discounts : (quote.discounts || []).filter(d => d.variant_id === item.variantId),
  })))
  const bxgy = lines.map(line => roundMoney(line.discounts.reduce((n, d) => n + d.discount_amount, 0)))
  const coupons = allocateMoney(quote.promoDiscount, lines.map((line, index) =>
    !quote.promoEligibleVariantIds || quote.promoEligibleVariantIds.includes(line.item.variantId)
      ? Math.max(0, line.price * line.quantity - bxgy[index]) : 0))
  return lines.map((line, index) => ({
    product_id: line.item.productId as string | null, product_variant_id: line.item.variantId as string | null,
    gift_product_id: null as string | null, product_name: line.item.name, variant_title: line.item.variantTitle,
    quantity: line.quantity, unit_price: line.price, mrp: line.item.mrp, is_gift: false,
    line_discount_amount: roundMoney(bxgy[index] + coupons[index]),
    promotion_allocations: line.discounts.map(d => ({ rule_id: d.rule_id, quantity: d.free_quantity, amount: d.discount_amount })),
  }))
}
