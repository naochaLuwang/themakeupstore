import type { BXGYDiscount } from '@/components/store/use-cart'
import { roundMoney } from '@/lib/promotion-engine'

export interface PriceGroup {
  quantity: number
  price: number
  discounts: BXGYDiscount[]
}
interface PricedLine { price: number; quantity: number; priceBreakdown?: PriceGroup[] }

export function priceGroups(item: PricedLine): PriceGroup[] {
  return item.priceBreakdown || [{ price: item.price, quantity: item.quantity, discounts: [] }]
}
export function lineSubtotal(item: PricedLine): number {
  return roundMoney(priceGroups(item).reduce((sum, group) => sum + roundMoney(group.price * group.quantity), 0))
}
export function linePriceLabel(item: PricedLine): string {
  const groups = priceGroups(item)
  return groups.length === 1 ? `₹${groups[0].price.toLocaleString('en-IN')}`
    : groups.map(g => `${g.quantity} × ₹${g.price.toLocaleString('en-IN')}`).join(' + ')
}
