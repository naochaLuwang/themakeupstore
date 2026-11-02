'use client'

import { ArrowRight } from 'lucide-react'
import { useEffect } from 'react'
import { useCart } from '@/components/store/use-cart'
import { OfferTermsInfo } from '@/components/store/offer-terms-info'
import { offerSelectionLabel } from '@/lib/offer-display'
import { firstOfferProducts } from '@/lib/offer-products-client'

export function CartOfferCards({ onShop, className = '' }: { onShop: (ruleId: string) => void; className?: string }) {
  const progress = useCart(s => s.bxgyProgress)
  const catalog = useCart(s => s.offerCatalog)
  const visible = progress.filter(p => p.currentQty > 0)
  const firstRuleId = visible[0]?.ruleId
  const ownerId = catalog?.ownerId || null
  useEffect(() => {
    if (!firstRuleId) return
    const timer = setTimeout(() => { void firstOfferProducts(firstRuleId, ownerId).catch(() => {}) }, 800)
    return () => clearTimeout(timer)
  }, [firstRuleId, ownerId])
  if (!visible.length) return null
  return <div className={`space-y-2 ${className}`}>
    {visible.map(p => {
      const rule = catalog?.bxgyRules.find(r => r.id === p.ruleId)
      const label = rule ? offerSelectionLabel(rule, true) : p.qualifyingLabel
      const free = p.freeQtyApplied || 0
      const prefetch = () => {
        void import('./offer-products-panel').catch(() => {})
        void firstOfferProducts(p.ruleId, ownerId).catch(() => {})
      }
      return <section key={p.ruleId} aria-label={p.ruleName} className="flex min-h-16 items-center justify-between gap-2 rounded-xl bg-pink-50 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex h-7 items-center gap-0.5">
            <h2 className="truncate text-[13px] font-bold text-slate-900">Buy 2 Get 1 Free</h2>
            <OfferTermsInfo compact replace={p.pricingMode === 'replace_discounts'} selection={rule ? offerSelectionLabel(rule) : label} />
          </div>
          <p className="flex min-w-0 items-center gap-1 text-xs text-slate-600" role="status">
            <span className="truncate" title={label}>{label}</span><span aria-hidden="true">·</span>
            <span className="shrink-0">{free ? `${free} free applied` : `Add ${p.neededQty} more`}</span>
          </p>
        </div>
        <button type="button" aria-label={`Shop eligible products: ${label}`} onPointerEnter={prefetch} onPointerDown={prefetch} onFocus={prefetch} onClick={() => onShop(p.ruleId)}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-bold text-pink-700 hover:text-pink-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600">
          Shop <ArrowRight size={15} />
        </button>
      </section>
    })}
  </div>
}
