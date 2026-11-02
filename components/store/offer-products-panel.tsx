'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Loader2, Search, SlidersHorizontal } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useCart } from '@/components/store/use-cart'
import { OfferTermsInfo } from '@/components/store/offer-terms-info'
import { OfferProductCard } from '@/components/store/offer-product-card'
import { OfferShadePicker } from '@/components/store/offer-shade-picker'
import { firstOfferProducts, fetchOfferProducts } from '@/lib/offer-products-client'
import { offerSelectionLabel } from '@/lib/offer-display'
import type { EligibleProductsPage } from '@/lib/eligible-offer-products'
import { activeOffer } from '@/lib/promotion-engine'

function PanelContent({ ruleId, onClose }: { ruleId: string; onClose: () => void }) {
  const ownerId = useCart(s => s.offerCatalog?.ownerId || null)
  const catalog = useCart(s => s.offerCatalog)
  const catalogRule = catalog?.bxgyRules.find(r => r.id === ruleId)
  const available = !!catalogRule && activeOffer(catalogRule, new Set(catalog?.usedBXGY))
  const progress = useCart(s => s.bxgyProgress.find(p => p.ruleId === ruleId))
  const bagCount = useCart(s => s.items.filter(i => !i.is_gift && !i.is_bxgy_free).reduce((n, i) => n + i.quantity, 0))
  const [search, setSearch] = useState(''), [brand, setBrand] = useState(''), [category, setCategory] = useState('')
  const [page, setPage] = useState(1), [revision, setRevision] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false), [choosing, setChoosing] = useState<string | null>(null)
  const [result, setResult] = useState<{ data?: EligibleProductsPage; loading: boolean; error: string }>({ loading: true, error: '' })
  const initial = useRef(true), scroll = useRef<HTMLDivElement>(null), searchInput = useRef<HTMLInputElement>(null), restoreProduct = useRef(''), gridScroll = useRef(0)
  const opener = useRef<HTMLElement | null>(typeof document === 'undefined' ? null : document.activeElement as HTMLElement)
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const delay = setTimeout(async () => {
      setResult(previous => ({ ...previous, loading: true, error: '' }))
      try {
        const data = initial.current && !search && !brand && !category && page === 1 && revision === 0
          ? await firstOfferProducts(ruleId, ownerId)
          : await fetchOfferProducts(ruleId, new URLSearchParams({ search, brand, category, page: String(page) }), controller.signal)
        if (active) {
          initial.current = false
          setResult({ data, loading: false, error: '' })
        }
      } catch (error) {
        if (active) setResult({ loading: false, error: error instanceof Error ? error.message : 'Could not load products' })
      }
    }, search ? 250 : 0)
    return () => { active = false; clearTimeout(delay); controller.abort() }
  }, [ruleId, ownerId, search, brand, category, page, revision])
  useEffect(() => {
    if (!result.data) return
    const timer = setTimeout(() => setRevision(n => n + 1), Math.max(0, result.data.expiresAt - Date.now()))
    return () => clearTimeout(timer)
  }, [result.data])
  useEffect(() => {
    if (!choosing && restoreProduct.current && scroll.current) {
      const button = scroll.current.querySelector<HTMLButtonElement>(`[data-offer-product="${restoreProduct.current}"]`)
      if (button && !button.disabled) button.focus({ preventScroll: true })
      else searchInput.current?.focus({ preventScroll: true })
      scroll.current.scrollTop = gridScroll.current
      restoreProduct.current = ''
    }
  }, [choosing])
  const rule = result.data?.rule || catalogRule
  const replace = rule?.pricing_mode === 'replace_discounts'
  const product = result.data?.products.find(p => p.id === choosing)
  const disabled = result.loading || !!result.error || !available
  const resetPage = (update: () => void) => {
    update(); setPage(1); setResult(p => ({ ...p, loading: true }))
    if (scroll.current) scroll.current.scrollTop = 0
  }
  const chooseProduct = (id: string) => {
    gridScroll.current = scroll.current?.scrollTop || 0
    restoreProduct.current = id
    setChoosing(id)
  }
  return <Sheet open onOpenChange={open => { if (!open) onClose() }}>
    <SheetContent side="bottom" onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus() }}
      className="h-[90dvh] gap-0 rounded-t-2xl p-0 md:inset-x-auto md:top-0 md:right-0 md:h-dvh md:w-[480px] md:rounded-none md:border-l motion-reduce:animate-none">
      <SheetHeader className={`shrink-0 gap-0 px-4 py-3 pr-10 ${choosing ? '' : 'pb-1'}`}>
        <SheetTitle className={choosing ? 'sr-only' : 'text-base font-bold'}>{choosing ? 'Choose shade' : 'Buy 2 Get 1 Free'}</SheetTitle>
        <SheetDescription className="sr-only">{rule ? offerSelectionLabel(rule) : 'Eligible products'}</SheetDescription>
        {choosing ? <button type="button" onClick={() => setChoosing(null)} className="flex min-h-9 w-fit items-center gap-1.5 rounded-lg text-sm font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-pink-600"><ArrowLeft size={17} />Products</button>
          : <div className="w-fit"><OfferTermsInfo replace={replace} selection={rule ? offerSelectionLabel(rule) : undefined} /></div>}
      </SheetHeader>
      {!choosing && <div className="shrink-0 border-b border-slate-100 px-4 pb-3">
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><span className="sr-only">Search eligible products</span>
            <input ref={searchInput} value={search} onChange={e => resetPage(() => setSearch(e.target.value))} placeholder="Search products" maxLength={200} className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm focus-visible:outline-pink-600" />
          </label>
          <button type="button" aria-label="Filters" aria-expanded={filtersOpen} aria-controls="offer-category-filter" onClick={() => setFiltersOpen(v => !v)}
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border focus-visible:outline-2 focus-visible:outline-pink-600 ${filtersOpen || category ? 'border-pink-300 bg-pink-50 text-pink-700' : 'border-slate-200 text-slate-600'}`}><SlidersHorizontal size={17} />{category && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-pink-600" />}</button>
        </div>
        {filtersOpen && <div id="offer-category-filter" className="pt-2">
          <select aria-label="Filter by category" value={category} onChange={e => resetPage(() => setCategory(e.target.value))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-sm"><option value="">All categories</option>{result.data?.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </div>}
        <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5" role="group" aria-label="Filter by brand">
          {['', ...(result.data?.brands || [])].map(b => <button key={b} type="button" aria-pressed={brand === b} onClick={() => resetPage(() => setBrand(b))}
            className={`min-h-8 shrink-0 rounded-full border px-3.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-pink-600 ${brand === b ? 'border-pink-600 bg-pink-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-pink-300'}`}>{b || 'All'}</button>)}
        </div>
      </div>}
      {result.error && <div role="alert" className="px-4 py-3 text-sm text-slate-600">{result.error}<button type="button" onClick={() => setRevision(n => n + 1)} className="ml-2 font-semibold text-pink-700">Try again</button></div>}
      {!available && <p role="status" className="px-4 py-3 text-sm text-slate-600">This offer is no longer available.</p>}
      {choosing && product ? <OfferShadePicker key={product.id} product={product} replace={replace} disabled={disabled} onAdded={() => setChoosing(null)} /> : <>
        <div ref={scroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3" aria-busy={result.loading}>
          {result.loading && <p role="status" className="flex items-center gap-2 pb-3 text-xs text-slate-500"><Loader2 className="animate-spin" size={14} /> Loading products…</p>}
          {choosing && !product && !result.loading && <p className="py-6 text-sm text-slate-500">This product is unavailable. Choose another product.</p>}
          {!choosing && result.data && <>
            {!result.data.total && <p className="py-8 text-center text-sm text-slate-500">No products match these filters.</p>}
            <div className="grid grid-cols-2 gap-2.5">
              {result.data.products.map(p => <OfferProductCard key={p.id} product={p} replace={replace} disabled={disabled} onChoose={chooseProduct} />)}
            </div>
            {result.data.pages > 1 && <nav aria-label="Eligible product pages" className="flex items-center justify-between pt-3 text-xs">
              <button type="button" disabled={result.data.page <= 1 || result.loading} onClick={() => resetPage(() => setPage(result.data!.page - 1))} className="min-h-10 px-2 font-semibold disabled:text-slate-300">Previous</button>
              <span className="text-slate-500">{result.data.page} / {result.data.pages}</span>
              <button type="button" disabled={result.data.page >= result.data.pages || result.loading} onClick={() => resetPage(() => setPage(result.data!.page + 1))} className="min-h-10 px-2 font-semibold disabled:text-slate-300">Next</button>
            </nav>}
          </>}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 bg-white px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <p className="text-xs font-semibold text-slate-900" role="status">
            {progress?.freeQtyApplied ? `${progress.freeQtyApplied} free ${progress.freeQtyApplied === 1 ? 'item' : 'items'} applied` : `${progress?.neededQty || 3} more for free`}
            {!!progress?.freeQtyApplied && progress.neededQty < 3 && <span className="block text-[10px] font-normal text-slate-500">Add {progress.neededQty} for next</span>}
          </p>
          <button type="button" onClick={onClose} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-pink-700 focus-visible:outline-2 focus-visible:outline-pink-600">View bag ({bagCount}) <ArrowRight size={14} /></button>
        </div>
      </>}
    </SheetContent>
  </Sheet>
}

export default function OfferProductsPanel(props: { ruleId: string; onClose: () => void }) {
  const ownerId = useCart(s => s.offerCatalog?.ownerId || null)
  return <PanelContent key={`${ownerId || 'guest'}:${props.ruleId}`} {...props} />
}
