'use client'

import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { offerTerms } from '@/lib/offer-display'

export function OfferTermsInfo({ replace, selection, compact = false }: { replace: boolean; selection?: string; compact?: boolean }) {
  return <Popover>
    <PopoverTrigger asChild>
      <button type="button" aria-label={compact ? 'Offer details' : undefined}
        className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 ${compact ? 'h-8 w-8' : 'min-h-7 text-xs'}`}>
        {!compact && (replace ? 'Original prices apply' : 'Product discounts apply')}
        <Info size={compact ? 14 : 13} />
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" className="max-h-[60dvh] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border-slate-200 text-xs leading-relaxed text-slate-600">
      {selection && <p className="mb-2 font-semibold text-slate-900">{selection}</p>}
      <p>{offerTerms(replace)}</p>
    </PopoverContent>
  </Popover>
}
