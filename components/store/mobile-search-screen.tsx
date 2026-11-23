'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Clock, Search, X } from 'lucide-react'
import type { CatalogCategory } from '@/lib/storefront-catalog'
import type { readDiscoveryHistory } from '@/lib/storefront-history'

export function MobileSearchBar({ value, onChange, onSubmit, onClear }: {
  value: string; onChange: (value: string) => void; onSubmit: () => void; onClear: () => void
}) {
  return <form role="search" aria-label="Mobile product search" onSubmit={event => { event.preventDefault(); onSubmit() }} className="flex items-center gap-2 px-3 pb-1 pt-2 md:hidden">
    <div className="flex h-11 flex-1 items-center gap-2 rounded-full bg-gray-100 px-4">
      <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" />
      <label htmlFor="catalog-search" className="sr-only">Search products, brands and shades</label>
      <input id="catalog-search" type="search" enterKeyHint="search" autoComplete="off" maxLength={150} value={value} onChange={event => onChange(event.target.value)} placeholder="Search products, brands..." className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 [&::-webkit-search-cancel-button]:hidden" />
      {value && <button type="button" aria-label="Clear search" onClick={onClear} className="flex h-10 w-8 shrink-0 items-center justify-center"><X className="h-4 w-4 text-gray-400" /></button>}
      <button type="submit" className="sr-only">Search</button>
    </div>
  </form>
}

export function SearchLanding({ history, categories, onSearch, onClear }: {
  history: ReturnType<typeof readDiscoveryHistory>; categories: CatalogCategory[]; onSearch: (term: string) => void; onClear: () => void
}) {
  const exclusive = categories.find(category => category.slug === 'exclusive')
  const brands = categories.filter(category => category.parent_id === exclusive?.id)
  const midpoint = Math.ceil(brands.length / 2)
  return <div className="mx-auto max-w-3xl pb-8 md:pt-4">
    {history.searches.length > 0 && <div className="px-4 pt-3">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-light text-gray-700">Recent searches</h2><button className="min-h-10 text-xs text-gray-400 hover:text-gray-600" onClick={onClear}>Clear recent searches</button></div>
      <div className="flex flex-wrap gap-2">{history.searches.map(term => <button key={term} onClick={() => onSearch(term)} className="flex min-h-10 items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 transition-colors hover:border-gray-300"><Clock className="h-3 w-3 text-gray-400" /><span className="text-sm text-gray-600">{term}</span></button>)}</div>
    </div>}
    {brands.length > 0 && <div className="pt-4">
      <h2 className="mb-3 px-4 text-base font-light text-gray-700">ICONIC BEAUTY BRANDS</h2>
      {[brands.slice(0, midpoint), brands.slice(midpoint)].map((row, index) => <div key={index} className="mb-2 flex gap-2 overflow-x-auto px-4 last:mb-0 no-scrollbar">{row.map(brand => <Link key={brand.id} href={'/exclusive/' + brand.slug} aria-label={'Shop ' + brand.name} className="relative flex h-10 min-w-[100px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white px-3 shadow-sm">
        {brand.image_url ? <Image src={brand.image_url} alt={brand.name} fill sizes="120px" className="object-cover" /> : <span className="text-xs font-semibold text-gray-500">{brand.name}</span>}
      </Link>)}</div>)}
    </div>}
    {history.products.length > 0 && <div className="px-4 pt-6"><h2 className="mb-3 text-base font-light text-gray-700">Recently viewed</h2><div className="flex gap-3 overflow-x-auto no-scrollbar">{history.products.map(product => <Link key={product.id} href={'/products/' + product.id} className="flex w-28 shrink-0 flex-col gap-2 text-xs text-gray-600">
      {product.thumbnail_url && <Image src={product.thumbnail_url} alt="" width={112} height={112} className="aspect-square rounded-lg object-cover" />}<span>{product.name}</span>
    </Link>)}</div></div>}
    {!history.searches.length && !brands.length && !history.products.length && <div className="flex flex-col items-center px-4 pt-28"><Search aria-hidden="true" className="h-20 w-20 stroke-[1] text-gray-200" /><p className="mt-5 text-lg font-semibold text-gray-700">Search for products</p><p className="mt-1 text-sm text-gray-400">Try searching by name or brand</p></div>}
  </div>
}
