'use client'

import Image from 'next/image'
import { toast } from 'sonner'
import { useCart, type CartItem } from '@/components/store/use-cart'
import type { EligibleProduct } from '@/lib/eligible-offer-products'

export type OfferVariant = EligibleProduct['variants'][number]
export const offerMoney = (n: number) => `₹${n.toLocaleString('en-IN')}`
export const offerPrice = (v: OfferVariant, replace: boolean) => replace ? v.mrp : v.price
export function shortProductName(product: EligibleProduct) {
  const prefix = `${product.brand} `
  return product.brand && product.name.toLocaleLowerCase().startsWith(prefix.toLocaleLowerCase()) ? product.name.slice(prefix.length) : product.name
}
export function offerStockLeft(v: OfferVariant, items: CartItem[] = useCart.getState().items) {
  const item = items.find(i => !i.is_gift && !i.is_bxgy_free && i.variantId === v.id)
  return Math.max(0, Math.min(v.stock, item?.stock ?? v.stock) - (item?.quantity || 0))
}
export function addOfferProduct(product: EligibleProduct, variant: OfferVariant) {
  if (offerStockLeft(variant) <= 0) { toast.info('That’s all we have in stock.'); return false }
  const result = useCart.getState().addItem({ id: product.id, productId: product.id, variantId: variant.id,
    name: product.name, variantTitle: variant.title, price: variant.price, regularPrice: variant.regularPrice,
    mrp: variant.mrp, originalPrice: variant.mrp, image: variant.image || product.image, quantity: 1, stock: variant.stock,
    brand: product.brand, categoryId: product.categoryIds[0] || '', categoryIds: product.categoryIds })
  if (result.capped) { toast.info('That’s all we have in stock.'); return false }
  toast.success(`${product.name} added to your bag`)
  return true
}

export function OfferProductCard({ product, replace, disabled, onChoose }: {
  product: EligibleProduct; replace: boolean; disabled: boolean; onChoose: (productId: string) => void
}) {
  const quantity = useCart(s => s.items.filter(i => !i.is_gift && !i.is_bxgy_free && product.variants.some(v => v.id === i.variantId)).reduce((n, i) => n + i.quantity, 0))
  const variant = [...product.variants].sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || offerPrice(a, replace) - offerPrice(b, replace) || a.id.localeCompare(b.id))[0]
  const soldOut = !product.variants.some(v => v.stock > 0)
  const full = useCart(s => !soldOut && product.variants.every(v => offerStockLeft(v, s.items) <= 0))
  const multiple = product.variants.length > 1
  const variablePrice = new Set(product.variants.filter(v => v.stock > 0).map(v => offerPrice(v, replace))).size > 1
  return <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white">
    <div className="relative aspect-[4/3] bg-slate-50">
      {(variant?.image || product.image) ? <Image src={variant?.image || product.image} alt={product.name} fill sizes="(min-width: 768px) 220px, 45vw" className="object-contain p-2" /> : <span className="flex h-full items-center justify-center font-daciana text-4xl text-slate-300">M</span>}
      {quantity > 0 && <span className="absolute bottom-1.5 left-1.5 rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{quantity} in bag</span>}
    </div>
    <div className="flex flex-1 flex-col p-2">
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">{product.brand}</p>
      <h3 className="mt-0.5 line-clamp-2 min-h-9 text-[13px] font-medium leading-[18px] text-slate-900" title={product.name}>{shortProductName(product)}</h3>
      {variant && <p className="mt-1 text-sm font-bold text-slate-900">{variablePrice && <span className="text-[10px] font-normal">From </span>}{offerMoney(offerPrice(variant, replace))}</p>}
      <p className="min-h-4 text-[11px] text-slate-500">{replace && variant && variant.price < variant.mrp ? `Usually ${offerMoney(variant.price)}` : '\u00a0'}</p>
      <button type="button" data-offer-product={product.id} onClick={() => multiple ? onChoose(product.id) : variant && addOfferProduct(product, variant)}
        disabled={disabled || soldOut || full} aria-label={`${multiple ? 'Choose shade' : 'Add'}: ${product.name}`}
        className={`mt-2 min-h-9 w-full rounded-lg border text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600 disabled:border-slate-100 disabled:bg-slate-100 disabled:text-slate-400 ${multiple ? 'border-pink-500 bg-white text-pink-700 hover:bg-pink-50' : 'border-pink-600 bg-pink-600 text-white hover:bg-pink-700'}`}>
        {soldOut ? 'Sold out' : full ? 'All in bag' : multiple ? 'Choose shade' : '+ Add'}
      </button>
    </div>
  </article>
}
