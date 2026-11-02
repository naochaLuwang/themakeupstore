'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Check } from 'lucide-react'
import { useCart } from '@/components/store/use-cart'
import { OfferTermsInfo } from '@/components/store/offer-terms-info'
import { addOfferProduct, offerMoney, offerPrice, offerStockLeft, shortProductName } from '@/components/store/offer-product-card'
import type { EligibleProduct } from '@/lib/eligible-offer-products'

export function OfferShadePicker({ product, replace, disabled, onAdded }: {
  product: EligibleProduct; replace: boolean; disabled: boolean; onAdded: () => void
}) {
  const [variantId, setVariantId] = useState('')
  const items = useCart(s => s.items)
  const title = useRef<HTMLHeadingElement>(null)
  useEffect(() => { title.current?.focus({ preventScroll: true }) }, [])
  const selected = product.variants.find(v => v.id === variantId)
  const display = selected || [...product.variants].sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || offerPrice(a, replace) - offerPrice(b, replace))[0]
  return <>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5">
      <div className="relative mx-auto mt-1 h-32 w-36">
        {(display?.image || product.image) ? <Image src={display?.image || product.image} alt={product.name} fill sizes="144px" className="object-contain" /> : <span className="flex h-full items-center justify-center font-daciana text-6xl text-slate-300">M</span>}
      </div>
      <div className="mt-2 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{product.brand}</p>
        <h3 ref={title} tabIndex={-1} className="mt-1 text-base font-semibold text-slate-900 outline-none">{shortProductName(product)}</h3>
        {display && <p className="mt-1 text-base font-bold text-slate-900">{!selected && new Set(product.variants.map(v => offerPrice(v, replace))).size > 1 ? 'From ' : ''}{offerMoney(offerPrice(display, replace))}</p>}
        {replace && display && display.price < display.mrp && <p className="text-xs text-slate-500">Usually {offerMoney(display.price)}</p>}
        <OfferTermsInfo replace={replace} />
      </div>
      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-semibold text-slate-900">Choose shade</legend>
        <div className="grid grid-cols-2 gap-2">
          {product.variants.map(v => {
            const soldOut = v.stock <= 0, full = !soldOut && offerStockLeft(v, items) <= 0
            const hasVariantImage = !!v.image && v.image !== product.image
            return <label key={v.id} className="relative min-w-0">
              <input className="peer sr-only" type="radio" aria-label={v.title || 'Default'} name={`shade-${product.id}`} value={v.id} checked={variantId === v.id} disabled={disabled || soldOut || full} onChange={() => setVariantId(v.id)} />
              <span className={`flex h-full min-h-12 flex-col items-center overflow-hidden rounded-xl border bg-white text-center peer-checked:border-pink-500 peer-checked:bg-pink-50/30 peer-focus-visible:ring-2 peer-focus-visible:ring-pink-500 peer-focus-visible:ring-offset-2 peer-disabled:bg-slate-50 peer-disabled:text-slate-400 ${variantId === v.id ? 'border-pink-500' : 'border-slate-200'}`}>
                {hasVariantImage && <span className={`relative block h-20 w-full bg-slate-50 ${soldOut || full ? 'opacity-40' : ''}`}><Image src={v.image} alt="" fill sizes="200px" className="object-contain p-1" /></span>}
                <span className="w-full px-3 py-2 text-xs font-medium leading-relaxed">{v.title || 'Default'}
                  <span className="block text-[10px] text-slate-500">{soldOut ? 'Sold out' : full ? 'All in bag' : offerMoney(offerPrice(v, replace))}</span>
                </span>
              </span>
              {variantId === v.id && <Check size={16} aria-hidden="true" className="absolute right-1.5 top-1.5 rounded-full bg-pink-600 p-0.5 text-white" />}
            </label>
          })}
        </div>
      </fieldset>
    </div>
    <div className="shrink-0 border-t border-slate-100 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <button type="button" disabled={disabled || !selected || offerStockLeft(selected, items) <= 0} onClick={() => { if (selected && !disabled && addOfferProduct(product, selected)) onAdded() }}
        className="h-11 w-full rounded-xl bg-pink-600 text-sm font-semibold text-white hover:bg-pink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:bg-slate-100 disabled:text-slate-400">
        Add to bag{selected ? ` · ${offerMoney(offerPrice(selected, replace))}` : ''}
      </button>
    </div>
  </>
}
