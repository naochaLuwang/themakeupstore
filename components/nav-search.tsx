'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Search, X, Loader2 } from 'lucide-react'
import { catalogInStock, type CatalogResult, type CatalogProduct } from '@/lib/storefront-catalog'
import { productFlashPricing } from '@/lib/flash-sale-helper'
import { readDiscoveryHistory, rememberSearch, rememberViewedProduct, clearDiscoveryHistory, type ViewedProduct } from '@/lib/storefront-history'
import { discoveryEvent } from '@/lib/storefront-events'
import { rememberBrowseOrigin } from '@/lib/storefront-navigation'

type History = ReturnType<typeof readDiscoveryHistory>
type Suggestion = { href: string; label: string; product: ViewedProduct | null; catalog?: CatalogProduct }
export function NavSearch() {
  const router = useRouter(), pathname = usePathname(), params = useSearchParams(), id = useId()
  const urlQuery = pathname === '/search' ? params.get('q') || '' : ''
  const [query, setQuery] = useState(''), [open, setOpen] = useState(false), [active, setActive] = useState(-1)
  const [result, setResult] = useState<CatalogResult | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState('')
  const [history, setHistory] = useState<History>({ searches: [], products: [] })
  const root = useRef<HTMLDivElement>(null), field = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const update = () => setHistory(readDiscoveryHistory())
    update(); window.addEventListener('storefront:history', update)
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => { window.removeEventListener('storefront:history', update); document.removeEventListener('pointerdown', close) }
  }, [])
  useEffect(() => { setOpen(false); setActive(-1); setQuery(urlQuery) }, [pathname, urlQuery])
  useEffect(() => {
    const controller = new AbortController()
    let current = true
    setResult(null); setError(''); setActive(-1)
    if (!open || query.trim().length < 2) { setLoading(false); return () => controller.abort() }
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/products/search?' + new URLSearchParams({ q: query.trim(), suggest: '1' }), { signal: controller.signal })
        if (!response.ok) throw new Error('Search unavailable')
        const next: CatalogResult = await response.json()
        if (current) setResult(next)
      } catch {
        if (current && !controller.signal.aborted) setError('Search could not load. View all results to retry.')
      } finally { if (current) setLoading(false) }
    }, 250)
    return () => { current = false; clearTimeout(timer); controller.abort() }
  }, [query, open])
  const searching = query.trim().length >= 2
  const suggestions: Suggestion[] = searching ? [
    ...(result?.suggestions || []).map(c => ({ href: '/categories/' + c.slug, label: `Shop ${c.name}`, product: null })),
    ...(result?.products || []).map(p => ({ href: '/products/' + p.id, label: p.name, product: p, catalog: p })),
  ] : [
    ...history.searches.map(term => ({ href: '/search?' + new URLSearchParams({ q: term }), label: term, product: null })),
    ...history.products.map(p => ({ href: '/products/' + p.id, label: p.name, product: p })),
  ]
  function navigate(href: string) {
    if (query.trim().length >= 2) { rememberSearch(query); discoveryEvent('search', { query: query.trim(), source: 'header' }) }
    const product = suggestions.find(s => s.href === href)?.product
    if (product) {
      rememberViewedProduct(product)
      rememberBrowseOrigin(pathname === '/search' ? 'search results' : pathname === '/' ? 'home' : 'shopping')
    }
    setOpen(false); setActive(-1); router.push(href)
  }
  const allHref = query.trim().length >= 2 ? '/search?' + new URLSearchParams({ q: query.trim() }) : '/search'
  return <div ref={root} className="relative w-full" onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false) }}>
    <form role="search" onSubmit={event => { event.preventDefault(); navigate(active >= 0 && suggestions[active] ? suggestions[active].href : allHref) }}>
      <div className="flex h-11 items-center gap-2 rounded-full border border-pink-50/50 bg-slate-100/40 px-4 backdrop-blur-sm transition-all focus-within:bg-white focus-within:border-[#fc2779]/30 focus-within:ring-2 focus-within:ring-pink-100">
        <Search className="h-4 w-4 shrink-0 text-pink-600" aria-hidden="true" />
        <input ref={field} role="combobox" aria-label="Search products, brands and shades" aria-autocomplete="list"
          aria-expanded={open} aria-controls={id + '-options'} aria-activedescendant={open && active >= 0 ? id + '-' + active : undefined}
          value={query} placeholder="SHOP BY BRAND OR PRODUCT" type="search" enterKeyHint="search" autoComplete="off" maxLength={150}
          onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true); setActive(-1) }}
          onKeyDown={event => {
            if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); setActive(-1) }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault(); setOpen(true)
              setActive(index => !suggestions.length ? -1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length)
            }
          }} className="min-w-0 flex-1 bg-transparent text-[11px] font-bold uppercase tracking-wider text-slate-900 outline-none placeholder:text-slate-400 [&::-webkit-search-cancel-button]:hidden" />
        {loading ? <Loader2 aria-label="Searching" className="h-4 w-4 animate-spin text-pink-600" /> : query &&
          <button aria-label="Clear search" type="button" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-200" onClick={() => { setQuery(''); setActive(-1); field.current?.focus() }}><X className="h-4 w-4" /></button>}
      </div>
    </form>
    {open && <div className="absolute left-0 right-0 top-full z-[450] mt-2 max-h-[calc(100dvh-12rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between px-4 pt-3 text-xs font-semibold text-slate-500">
        <span>{searching ? 'Suggestions' : 'Recent searches and products'}</span>
        {!searching && suggestions.length > 0 && <button className="min-h-8 text-pink-700" onClick={() => { clearDiscoveryHistory('searches'); clearDiscoveryHistory('products') }}>Clear</button>}
      </div>
      <div role="status" className="px-4 text-sm text-slate-500">
        {error || (loading ? 'Searching…' : searching && result?.total === 0 ? 'No matches. Try a brand, product or shade.' : !searching && !suggestions.length ? 'Search by product, brand or shade.' : '')}
      </div>
      <ul id={id + '-options'} role="listbox" aria-label="Search suggestions" className="py-2">
        {suggestions.map((item, index) => <li key={item.href} role="presentation">
          <Link role="option" id={id + '-' + index} aria-selected={index === active} tabIndex={-1} href={item.href}
            onMouseEnter={() => setActive(index)} onClick={event => { event.preventDefault(); navigate(item.href) }}
            className={`flex min-h-12 items-center gap-3 px-4 py-3 text-sm ${index === active ? 'bg-pink-50' : 'hover:bg-slate-50'}`}>
            {item.product?.thumbnail_url && <Image src={item.product.thumbnail_url} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded object-cover" />}
            <div className="min-w-0"><span className="block font-medium text-slate-900">{item.label}</span>
              {item.catalog && <span className="block text-xs text-slate-600">
                ₹{productFlashPricing(item.catalog, result?.sales || []).salePrice.toLocaleString('en-IN')} · {catalogInStock(item.catalog) ? 'In stock' : 'Out of stock'}
              </span>}
            </div>
          </Link>
        </li>)}
      </ul>
      <button className="min-h-12 w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-pink-700 hover:bg-pink-50" onClick={() => navigate(allHref)}>
        {searching ? `View all results for “${query.trim()}”` : 'Open search'}
      </button>
    </div>}
  </div>
}
