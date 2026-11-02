import type { BXGYDiscount, BXGYProgress, GiftProgress } from '@/components/store/use-cart'

export interface PromotionItem {
  productId: string; variantId: string; name: string; price: number; quantity: number
  categoryIds: string[]; brand: string; mrp?: number
}
export interface ActiveOffer {
  id: string; name?: string; is_active: boolean; starts_at?: string; expires_at?: string | null
  usage_limit?: number | null; used_count?: number; once_per_user?: boolean
}
export interface BXGYRule extends ActiveOffer {
  pricing_mode?: 'replace_discounts' | 'combine_discounts'
  buy_type: string; buy_quantity: number; get_type: string
  get_product_id?: string | null; get_variant_id?: string | null
  get_discount_type: string; get_discount_value: number; max_per_order?: number | null
  products: string[]; categories: string[]; brands: string[]
}
export interface GiftRule extends ActiveOffer {
  trigger_type: string; trigger_threshold: number; min_cart_amount?: number | null
  gift_product_id: string | null; gift_product_ref_id: string | null; gift_variant_id: string | null
  gift_quantity: number; products: string[]; categories: string[]; brands: string[]
}
export interface PromotionUse { id: string; kind: 'bxgy' | 'gift' }
export interface BXGYAllocation {
  ruleId: string; ruleName: string; variantId: string; quantity: number
  freeQuantity: number; unitPrice: number; pricingMode: 'replace_discounts' | 'combine_discounts'
}
export const roundMoney = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
export const couponOfferMessage = 'Coupons cannot be combined with Buy 2 Get 1 or a free-gift offer.'
export function activeOffer(rule: ActiveOffer, used = new Set<string>(), now = Date.now()) {
  return rule.is_active && (!rule.starts_at || Date.parse(rule.starts_at) <= now) &&
    (!rule.expires_at || Date.parse(rule.expires_at) > now) &&
    (rule.usage_limit == null || Number(rule.used_count || 0) < rule.usage_limit) &&
    !(rule.once_per_user && used.has(rule.id))
}
export function supportsBXGY(rule: BXGYRule) {
  return rule.buy_quantity === 2 && rule.get_type === 'cheapest_free' &&
    (rule.get_discount_type === 'free' || (rule.get_discount_type === 'percentage' && Number(rule.get_discount_value) === 100))
}
export function matchesOffer(item: PromotionItem, type: string, rule: { products: string[]; categories: string[]; brands: string[] }) {
  return type === 'specific_products' ? rule.products.includes(item.productId)
    : type === 'specific_categories' ? item.categoryIds.some(id => rule.categories.includes(id))
    : type === 'specific_brands' && rule.brands.includes(item.brand)
}

// A unit can qualify for only one BXGY campaign. Disjoint campaigns can both run.
// Prefer the largest available saving; stable rule/variant IDs break equal-price ties.
export function calculateBXGY(items: PromotionItem[], rules: BXGYRule[], used = new Set<string>()) {
  const eligibleRules = rules.filter(r => activeOffer(r, used) && supportsBXGY(r))
  const available = new Map(items.map(i => [i.variantId, i.quantity]))
  const discounts: BXGYDiscount[] = []
  const allocations: BXGYAllocation[] = []
  const promotions: PromotionUse[] = []
  while (true) {
    const candidates = eligibleRules.map(rule => {
      const qualifying = items.filter(i => matchesOffer(i, rule.buy_type, rule) && (available.get(i.variantId) || 0) > 0)
      const sets = Math.floor(qualifying.reduce((n, i) => n + (available.get(i.variantId) || 0), 0) / 3)
      const pricingMode = rule.pricing_mode || 'combine_discounts'
      const unitPrice = (item: PromotionItem) => pricingMode === 'replace_discounts' ? (item.mrp ?? item.price) : item.price
      const remaining = new Map(qualifying.map(i => [i.variantId, available.get(i.variantId) || 0]))
      const units = new Map<string, { quantity: number; freeQuantity: number }>()
      let left = sets
      const lines: BXGYDiscount[] = []
      for (const item of [...qualifying].sort((a, b) => unitPrice(a) - unitPrice(b) || a.variantId.localeCompare(b.variantId))) {
        const quantity = Math.min(left, remaining.get(item.variantId) || 0)
        if (quantity > 0) lines.push({ rule_id: rule.id, rule_name: rule.name || 'Buy 2 Get 1 Free',
          variant_id: item.variantId, product_id: item.productId, product_name: item.name,
          discount_amount: roundMoney(unitPrice(item) * quantity), original_price: unitPrice(item), free_quantity: quantity })
        if (quantity > 0) units.set(item.variantId, { quantity, freeQuantity: quantity })
        remaining.set(item.variantId, (remaining.get(item.variantId) || 0) - quantity)
        left -= quantity
        if (!left) break
      }
      let paidUnits = sets * 2
      for (const item of [...qualifying].sort((a, b) => unitPrice(b) - unitPrice(a) || a.variantId.localeCompare(b.variantId))) {
        const quantity = Math.min(paidUnits, remaining.get(item.variantId) || 0)
        if (quantity > 0) {
          const prior = units.get(item.variantId) || { quantity: 0, freeQuantity: 0 }
          units.set(item.variantId, { ...prior, quantity: prior.quantity + quantity })
        }
        paidUnits -= quantity
        if (!paidUnits) break
      }
      const assigned: BXGYAllocation[] = qualifying.flatMap(item => {
        const unit = units.get(item.variantId)
        return unit ? [{ ...unit, variantId: item.variantId, ruleId: rule.id,
          ruleName: rule.name || 'Buy 2 Get 1 Free', unitPrice: unitPrice(item), pricingMode }] : []
      })
      const repricing = assigned.reduce((n, a) => n + (a.unitPrice - qualifying.find(i => i.variantId === a.variantId)!.price) * a.quantity, 0)
      return { rule, sets, lines, assigned, saving: roundMoney(lines.reduce((n, l) => n + l.discount_amount, 0) - repricing) }
    }).filter(c => c.sets > 0).sort((a, b) => b.saving - a.saving || a.rule.id.localeCompare(b.rule.id))
    const selected = candidates[0]
    if (!selected) break
    discounts.push(...selected.lines)
    allocations.push(...selected.assigned)
    if (!promotions.some(p => p.id === selected.rule.id)) promotions.push({ id: selected.rule.id, kind: 'bxgy' })
    for (const allocation of selected.assigned) available.set(allocation.variantId, (available.get(allocation.variantId) || 0) - allocation.quantity)
  }
  const progress: BXGYProgress[] = eligibleRules.map(rule => {
    const matching = items.filter(i => matchesOffer(i, rule.buy_type, rule))
    const currentQty = matching.reduce((n, i) => n + i.quantity, 0)
    return { ruleId: rule.id, ruleName: rule.name || 'Buy 2 Get 1 Free', qualifies: promotions.some(p => p.id === rule.id),
      qualifyingVariantIds: matching.map(i => i.variantId), qualifyingLabel: rule.buy_type === 'specific_brands' ? rule.brands.join(', ') : 'eligible products',
      getLabel: rule.pricing_mode === 'replace_discounts' ? 'Cheapest original-price item FREE for every 3; participating items use original prices' : 'Cheapest eligible item FREE for every 3 items', getImage: '', currentQty, neededQty: Math.max(0, 3 - currentQty), buyQuantity: 2, getType: 'cheapest_free' }
  })
  return { discount: roundMoney(discounts.reduce((n, l) => n + l.discount_amount, 0)), discounts, allocations, promotions, progress, rewards: [] }
}

export function evaluateGiftRules(items: PromotionItem[], rules: GiftRule[], used = new Set<string>()) {
  const qualifying: GiftRule[] = []
  const progress: GiftProgress[] = []
  for (const rule of rules.filter(r => activeOffer(r, used))) {
    const matching = rule.trigger_type === 'cart_total' ? items : items.filter(i => matchesOffer(i, rule.trigger_type, rule))
    const subtotal = roundMoney(matching.reduce((n, i) => n + i.price * i.quantity, 0))
    const qty = matching.reduce((n, i) => n + i.quantity, 0)
    const neededQty = rule.trigger_type === 'cart_total' ? 0 : Math.max(0, Number(rule.trigger_threshold) - qty)
    const threshold = Math.max(rule.trigger_type === 'cart_total' ? Number(rule.trigger_threshold) : 0, Number(rule.min_cart_amount || 0))
    const neededAmount = Math.max(0, threshold - subtotal)
    const qualifies = matching.length > 0 && neededQty === 0 && neededAmount === 0
    if (qualifies) qualifying.push(rule)
    progress.push({ ruleId: rule.id, ruleName: rule.name || 'Free Gift', giftProductName: 'Free Gift', giftProductImage: '', qualifies,
      qualifyingVariantIds: matching.map(i => i.variantId), qualifyingLabel: rule.trigger_type === 'cart_total' ? 'your cart' : 'eligible products',
      currentQty: qty, neededQty, currentSubtotal: subtotal, neededAmount, triggerType: rule.trigger_type })
  }
  return { qualifying, progress }
}
