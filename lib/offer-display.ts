import type { BXGYRule } from '@/lib/promotion-engine'

export function offerSelectionLabel(rule: BXGYRule, compact = false) {
  const names = [...new Set(rule.buy_type === 'specific_brands' ? rule.brands : rule.targetNames || [])]
  const joined = compact && names.length > 2 ? `${names.slice(0, 2).join(' + ')} +${names.length - 2} more` : names.join(' + ')
  if (rule.buy_type === 'specific_products') return joined ? `selected ${joined} products` : 'selected products'
  return joined || (rule.buy_type === 'specific_categories' ? 'selected categories' : 'eligible products')
}

export function offerTerms(replace: boolean) {
  return replace
    ? 'Cheapest item free for every 3. Participating items use original prices; extra items keep their usual discounts.'
    : 'Cheapest item free for every 3. Existing product discounts still apply.'
}
