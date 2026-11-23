'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { Search, SlidersHorizontal, X, Loader2, ArrowLeft, ArrowRight } from 'lucide-react'
import { ProductCard } from './product-card'
import { CATALOG_PRICES, CATALOG_SORTS, browseCategoryFacets, catalogParams, readCatalogState, type CatalogResult, type CatalogScope, type CatalogState } from '@/lib/storefront-catalog'
import { clearDiscoveryHistory, readDiscoveryHistory, rememberSearch, rememberViewedProduct } from '@/lib/storefront-history'
import { rememberBrowseOrigin, restoreBrowseScroll } from '@/lib/storefront-navigation'
import { discoveryEvent } from '@/lib/storefront-events'
import { MobileSearchBar, SearchLanding } from './mobile-search-screen'

const cache = new Map<string, { data: CatalogResult; expires: number }>()
const clearFilters = (state: CatalogState): CatalogState => ({ ...state, categories: [], brands: [], price: '', inStock: false, page: 1 })
export function CatalogBrowser({ search = false, scope = {}, title = 'Shop all products', presentation = 'shop', initialResult }: { search?: boolean; scope?: CatalogScope; title?: string; presentation?: 'shop' | 'collection' | 'editorial' | 'fun-size'; initialResult?: CatalogResult }) {
  const pathname = usePathname(), params = useSearchParams()
  const state = readCatalogState(new URLSearchParams(params.toString()), search)
  const stateJson = JSON.stringify(state), scopeJson = JSON.stringify(scope)
  const key = pathname + '?' + catalogParams(state, search) + ':' + scopeJson
  const [text, setText] = useState(state.q)
  const initialKey = useRef(key)
  const [result, setResult] = useState<CatalogResult | null>(() => cache.get(key)?.data || initialResult || null)
  const [loading, setLoading] = useState(!initialResult && !cache.get(key)), [error, setError] = useState(''), [reload, setReload] = useState(0)
  const [filterOpen, setFilterOpen] = useState(false), [draft, setDraft] = useState(state), [brandSearch, setBrandSearch] = useState('')
  const [history, setHistory] = useState<ReturnType<typeof readDiscoveryHistory>>({ searches: [], products: [] })
  const restore = useRef(true), root = useRef<HTMLDivElement>(null)
  const count = state.categories.length + state.brands.length + Number(!!state.price) + Number(state.inStock)
  const idle = search && text.trim().length < 2 && !count
  const pendingText = text.trim() !== state.q
  const collection = !search && presentation === 'collection'
  function navigate(next: CatalogState, replace = false) {
    try { sessionStorage.setItem('tms:scroll:' + location.pathname + location.search, String(document.getElementById('app-scroller')?.scrollTop || 0)) } catch { /* Optional scroll restoration. */ }
    const query = catalogParams(next, search).toString()
    const href = pathname + (query ? '?' + query : '')
    restore.current = false
    if (href !== location.pathname + location.search) window.history[replace ? 'replaceState' : 'pushState'](null, '', href)
    if (!replace) root.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
  useEffect(() => { setText(readCatalogState(new URLSearchParams(params.toString()), search).q) }, [params, search])
  useEffect(() => {
    if (text.trim() === state.q) return
    const timer = setTimeout(() => navigate({ ...state, q: text.trim().slice(0, 150), page: 1 }, true), 300)
    return () => clearTimeout(timer)
    // URL state is captured by the timer; an external navigation cancels it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, stateJson, pathname])
  useEffect(() => {
    const update = () => setHistory(readDiscoveryHistory())
    const back = () => { restore.current = true }
    const refresh = () => { if (document.visibilityState === 'visible') setReload(n => n + 1) }
    update(); window.addEventListener('storefront:history', update); window.addEventListener('popstate', back)
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh)
    return () => { window.removeEventListener('storefront:history', update); window.removeEventListener('popstate', back); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    let current = true, timer: ReturnType<typeof setTimeout> | undefined
    const currentState = JSON.parse(stateJson) as CatalogState
    const currentScope = JSON.parse(scopeJson) as CatalogScope
    setError('')
    const restorePosition = () => {
      if (restore.current) requestAnimationFrame(() => { if (current) restoreBrowseScroll(pathname + location.search) })
    }
    const cached = cache.get(key) || (key === initialKey.current && initialResult ? { data: initialResult, expires: Math.min(initialResult.validUntil, Date.now() + 30_000) } : undefined)
    setResult(cached?.data || null)
    setLoading(true)
    async function load() {
      try {
        const requestParams = catalogParams(currentState, search)
        requestParams.set('mode', search ? 'search' : 'browse')
        if (currentScope.category) requestParams.set('scope', currentScope.category)
        if (currentScope.concern) requestParams.set('concern', currentScope.concern)
        for (const extra of currentScope.extraCategories || []) requestParams.append('extra', extra)
        const response = await fetch('/api/products/search?' + requestParams, { signal: controller.signal })
        if (!response.ok) throw new Error('Products could not be loaded. Please retry.')
        const data: CatalogResult = await response.json()
        if (!current) return
        if (cache.size >= 12) cache.delete(cache.keys().next().value!)
        cache.set(key, { data, expires: Math.min(Date.now() + 30_000, data.validUntil) })
        setResult(data); setLoading(false); restorePosition()
        if (data.page !== currentState.page) {
          const canonical = catalogParams({ ...currentState, page: data.page }, search).toString()
          window.history.replaceState(null, '', pathname + (canonical ? '?' + canonical : ''))
        }
        discoveryEvent('results', { query: currentState.q, total: data.total, page: data.page })
        timer = setTimeout(() => { if (document.visibilityState === 'visible') setReload(n => n + 1) }, Math.max(1000, data.validUntil - Date.now()))
      } catch {
        if (!current || controller.signal.aborted) return
        setResult(null); setLoading(false); setError('Products could not be loaded. Check your connection and retry.')
      }
    }
    if (cached && cached.expires > Date.now() && reload === 0) {
      cache.set(key, cached)
      setLoading(false); restorePosition()
      timer = setTimeout(() => setReload(n => n + 1), Math.max(1000, cached.expires - Date.now()))
    } else void load()
    return () => { current = false; controller.abort(); if (timer) clearTimeout(timer) }
  }, [key, stateJson, scopeJson, search, pathname, reload, initialResult])
  const updateFilter = (name: 'brands' | 'categories', value: string) => setDraft(previous => ({ ...previous,
    [name]: previous[name].includes(value) ? previous[name].filter(v => v !== value) : [...previous[name], value] }))
  function submit() {
    if (text.trim().length >= 2) { rememberSearch(text); discoveryEvent('search', { query: text.trim(), source: 'results' }) }
    navigate({ ...state, q: text.trim().slice(0, 150), page: 1 })
  }
  return <section ref={root} className={collection ? "scroll-mt-24 pb-24" : "scroll-mt-24 pb-8"} aria-label={title}>
    {search && <><MobileSearchBar value={text} onChange={setText} onSubmit={submit} onClear={() => { setText(''); navigate({ ...state, q: '', page: 1 }, true) }} /><form role="search" aria-label="Tablet product search" onSubmit={event => { event.preventDefault(); submit() }} className="mx-auto hidden max-w-3xl px-4 pb-1 pt-2 md:block xl:hidden">
      <label htmlFor="catalog-desktop-search" className="sr-only">Search products, brands and shades</label>
      <div className="flex h-11 items-center gap-2 rounded-full bg-gray-100 px-4">
        <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        <input id="catalog-desktop-search" type="search" enterKeyHint="search" autoComplete="off" maxLength={150} placeholder="Try lipstick, Rare Beauty or a shade"
          value={text} onChange={event => setText(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none [&::-webkit-search-cancel-button]:hidden" />
        {text && <button type="button" aria-label="Clear search" className="flex h-10 w-8 items-center justify-center text-gray-400" onClick={() => { setText(''); navigate({ ...state, q: '', page: 1 }, true) }}><X className="h-4 w-4" /></button>}
        <button type="submit" className="sr-only">Search</button>
      </div>
    </form></>}
    <div className={search ? "border-b border-gray-100 bg-white px-4 py-1" : collection ? "bg-white px-4 pb-3 pt-4" : "sticky top-16 z-30 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-sm md:top-24"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" aria-live="polite" className={search ? "text-[13px] font-medium text-gray-500" : "text-xs font-semibold text-slate-500"}>{error ? 'Results unavailable' : loading || pendingText ? 'Loading products…' : idle ? '' : `${result?.total || 0} ${search ? 'results' : 'products'}`}</p>
        {collection && <button type="button" aria-pressed={state.inStock} onClick={() => navigate({ ...state, inStock: !state.inStock, page: 1 })} className={`flex min-h-10 items-center gap-2 rounded-full border px-3 text-[10px] font-semibold ${state.inStock ? 'border-rose-400/25 bg-rose-50 text-rose-500' : 'border-slate-200 bg-slate-50 text-slate-500'}`}><span aria-hidden="true" className={`h-3.5 w-3.5 rounded-sm border ${state.inStock ? 'border-rose-500 bg-rose-500' : 'border-slate-300'}`} />In Stock Only</button>}
        <div className={collection ? "fixed bottom-0 left-0 right-0 z-[410] flex items-center border-t border-slate-100 bg-white pb-[env(safe-area-inset-bottom)]" : "flex items-center gap-2"}>
          <label className="sr-only" htmlFor="catalog-sort">Sort products</label>
          <select id="catalog-sort" value={state.sort} onChange={event => navigate({ ...state, sort: event.target.value as CatalogState['sort'], page: 1 })} className={collection ? "order-2 min-h-14 w-1/2 border-0 border-l border-slate-100 bg-white px-6 text-xs font-semibold text-slate-800" : search ? "min-h-11 max-w-40 border-0 bg-white px-1 text-[13px] text-gray-600" : "min-h-11 max-w-44 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700"}>
            {CATALOG_SORTS.filter(option => search || option.value !== 'relevance').map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <Dialog.Root open={filterOpen} onOpenChange={open => { if (open) { setDraft(state); setBrandSearch('') }; setFilterOpen(open) }}>
            <Dialog.Trigger className={collection ? "order-1 flex min-h-14 w-1/2 items-center justify-center gap-2 text-xs font-semibold text-slate-800 hover:bg-slate-50" : search ? "flex min-h-11 items-center gap-1.5 px-1 text-[13px] font-medium text-gray-600" : "flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700"}><SlidersHorizontal className="h-4 w-4" />Filters{count ? ` (${count})` : ''}</Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-[600] bg-black/40" />
              <Dialog.Content className="fixed bottom-0 left-0 right-0 z-[610] flex max-h-[85dvh] flex-col rounded-t-[2rem] bg-white shadow-xl sm:left-auto sm:top-0 sm:w-[420px] sm:max-h-none sm:rounded-none">
                <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><Dialog.Title className="text-lg font-bold text-slate-900">Filter products</Dialog.Title><Dialog.Description className="text-sm text-slate-500">Choose filters, then show results.</Dialog.Description></div><Dialog.Close aria-label="Close filters" className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-100"><X className="h-5 w-5" /></Dialog.Close></div>
                <div className="flex-1 space-y-6 overflow-y-auto p-5">
                  <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={draft.inStock} onChange={event => setDraft({ ...draft, inStock: event.target.checked })} className="h-5 w-5 accent-pink-600" />In stock only</label>
                  <fieldset><legend className="mb-2 text-sm font-semibold">Price</legend>
                    {[{ value: '', label: 'All prices' }, ...CATALOG_PRICES].map(price => <label key={price.value} className="flex min-h-11 items-center gap-3 text-sm"><input type="radio" name="catalog-price" value={price.value} checked={draft.price === price.value} onChange={() => setDraft({ ...draft, price: price.value })} className="h-5 w-5 accent-pink-600" />{price.label}</label>)}
                  </fieldset>
                  <fieldset><legend className="mb-2 text-sm font-semibold">Brands</legend>
                    <input aria-label="Find a brand in filters" type="search" placeholder="Find a brand" value={brandSearch} onChange={event => setBrandSearch(event.target.value)} className="mb-2 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-base" />
                    {(result?.facets.brands || []).filter(brand => brand.toLowerCase().includes(brandSearch.toLowerCase())).map(brand => <label key={brand} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={draft.brands.includes(brand)} onChange={() => updateFilter('brands', brand)} className="h-5 w-5 shrink-0 accent-pink-600" />{brand}</label>)}
                  </fieldset>
                  <fieldset><legend className="mb-2 text-sm font-semibold">Categories</legend>
                    {browseCategoryFacets(result?.facets.categories || []).map(category => <label key={category.id} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={draft.categories.includes(category.slug)} onChange={() => updateFilter('categories', category.slug)} className="h-5 w-5 shrink-0 accent-pink-600" />{category.name}</label>)}
                  </fieldset>
                </div>
                <div className="flex gap-3 border-t border-slate-100 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"><button className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold" onClick={() => setDraft(clearFilters(draft))}>Reset</button><button className="min-h-11 flex-1 rounded-xl bg-[#fc2779] px-4 text-sm font-semibold text-white" onClick={() => { navigate({ ...draft, page: 1 }); setFilterOpen(false); discoveryEvent('filter', { query: draft.q, count: draft.categories.length + draft.brands.length + Number(!!draft.price) + Number(draft.inStock) }) }}>Show results</button></div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </div>
    {count > 0 && <div className="flex flex-wrap gap-2 px-4 py-2" aria-label="Applied filters">
      {state.brands.map(brand => <button key={brand} className="min-h-9 rounded-full border border-[#fc2779]/30 bg-[#fc2779]/10 px-3 text-[11px] font-medium text-[#fc2779]" aria-label={'Remove brand ' + brand} onClick={() => navigate({ ...state, brands: state.brands.filter(b => b !== brand), page: 1 })}>{brand} ×</button>)}
      {state.categories.map(slug => <button key={slug} className="min-h-9 rounded-full border border-[#fc2779]/30 bg-[#fc2779]/10 px-3 text-[11px] font-medium text-[#fc2779]" aria-label={'Remove category ' + slug} onClick={() => navigate({ ...state, categories: state.categories.filter(c => c !== slug), page: 1 })}>{result?.facets.categories.find(c => c.slug === slug)?.name || slug} ×</button>)}
      {state.price && <button className="min-h-9 rounded-full border border-[#fc2779]/30 bg-[#fc2779]/10 px-3 text-[11px] font-medium text-[#fc2779]" aria-label="Remove price filter" onClick={() => navigate({ ...state, price: '', page: 1 })}>{CATALOG_PRICES.find(p => p.value === state.price)?.label} ×</button>}
      {state.inStock && <button className="min-h-9 rounded-full border border-[#fc2779]/30 bg-[#fc2779]/10 px-3 text-[11px] font-medium text-[#fc2779]" aria-label="Remove stock filter" onClick={() => navigate({ ...state, inStock: false, page: 1 })}>In stock ×</button>}
      <button className="min-h-9 px-3 text-sm font-semibold text-slate-600 underline" onClick={() => navigate(clearFilters(state))}>Clear all</button>
    </div>}
    {error ? <div role="alert" className="mx-auto max-w-xl px-4 py-12 text-center"><p className="text-slate-700">{error}</p><button className="mt-4 min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold" onClick={() => setReload(n => n + 1)}>Retry</button></div>
      : idle ? <>
        {text.length === 1 && <p role="status" className="px-4 pt-3 text-sm text-gray-400">Keep typing. Enter at least two characters.</p>}
        <SearchLanding history={history} categories={result?.facets.categories || []} onClear={() => clearDiscoveryHistory('searches')} onSearch={term => { setText(term); rememberSearch(term); navigate({ ...state, q: term, page: 1 }) }} />
      </> : loading || pendingText ? <div role="status" className="flex items-center justify-center gap-2 px-4 py-16 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Loading products…</div>
      : result?.total === 0 ? <div className="px-4 py-16 text-center"><h2 className="text-lg font-semibold">No matches found</h2><p className="mt-2 text-sm text-slate-600">Try a product name, brand or shade, or remove a filter.</p>{count > 0 && <button className="mt-4 min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold" onClick={() => navigate(clearFilters(state))}>Clear filters</button>}</div>
      : <div className={search || collection ? "w-full py-0" : presentation === 'editorial' ? "py-4" : "container mx-auto px-4 py-8"} onClickCapture={event => {
        const anchor = (event.target as HTMLElement).closest('a[href^="/products/"]')
        if (!anchor) return
        const product = result?.products.find(p => '/products/' + p.id === anchor.getAttribute('href'))
        rememberBrowseOrigin(search ? 'search results' : title)
        if (state.q) rememberSearch(state.q)
        if (product) { rememberViewedProduct(product); discoveryEvent('product', { query: state.q, product_id: product.id, page: state.page }) }
      }}>
        <div className={`grid grid-cols-2 ${presentation === 'fun-size' ? 'gap-0' : 'md:grid-cols-3 lg:grid-cols-4'} ${search || collection ? 'gap-0' : presentation === 'editorial' ? 'gap-x-6 gap-y-12' : presentation === 'fun-size' ? '' : 'gap-4 md:gap-8'}`}>{result?.products.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 4} catalogSales={result.sales} />)}</div>
        {!!result?.total && <nav aria-label="Product pages" className="flex flex-wrap items-center justify-center gap-4 px-4 py-6">
          <button disabled={result.page <= 1} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm disabled:opacity-40" onClick={() => navigate({ ...state, page: result.page - 1 })}><ArrowLeft className="h-4 w-4" />Previous</button>
          <span className={search ? "text-[13px] font-medium text-gray-500" : "text-xs font-semibold text-slate-500"}>Page {result.page} of {Math.ceil(result.total / result.pageSize)}</span>
          <button disabled={!result.hasMore} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm disabled:opacity-40" onClick={() => navigate({ ...state, page: result.page + 1 })}>Next<ArrowRight className="h-4 w-4" /></button>
        </nav>}
      </div>}
  </section>
}
