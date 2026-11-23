'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Search, SearchX, X } from 'lucide-react'
import { normalizeSearch, type CatalogCategory } from '@/lib/storefront-catalog'

export function BrandDirectory({ brands, categories }: { brands: string[]; categories: CatalogCategory[] }) {
  const params = useSearchParams()
  const query = params.get('q') || ''
  const visible = brands.filter(brand => normalizeSearch(brand).includes(normalizeSearch(query)))
  function change(value: string) {
    const next = new URLSearchParams()
    if (value) next.set('q', value.slice(0, 150))
    window.history.replaceState(null, '', '/brands' + (next.size ? '?' + next : ''))
  }
  const groups = [
    { label: 'EXCLUSIVE', brands: visible.filter(brand => {
      const category = categories.find(c => normalizeSearch(c.name) === normalizeSearch(brand))
      return categories.find(c => c.id === category?.parent_id)?.slug === 'exclusive'
    }) },
    { label: 'ESSENTIALS', brands: visible.filter(brand => {
      const category = categories.find(c => normalizeSearch(c.name) === normalizeSearch(brand))
      return categories.find(c => c.id === category?.parent_id)?.slug !== 'exclusive'
    }) },
  ]
  return <div className="mx-auto max-w-6xl px-5 pb-20 pt-2">
    <div className="mb-7"><h1 className="text-[28px] font-bold tracking-tight text-gray-900">BRANDS</h1><p role="status" className="mt-1 text-sm text-gray-400">{visible.length} brands on The Makeup Store</p></div>
    <label htmlFor="brand-search" className="sr-only">Find a brand</label>
    <div className="mb-7 flex h-11 items-center gap-2.5 rounded-lg border border-gray-100 bg-slate-100 px-3.5"><Search className="h-4 w-4 shrink-0 text-gray-400" /><input id="brand-search" type="search" autoComplete="off" placeholder="Search brands" value={query} maxLength={150} onChange={event => change(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 [&::-webkit-search-cancel-button]:hidden" />{query && <button aria-label="Clear brand search" className="flex h-10 w-10 items-center justify-center" onClick={() => change('')}><X className="h-4 w-4" /></button>}</div>
    {groups.map(group => group.brands.length > 0 && <section key={group.label} aria-label={group.label} className="mb-10">
      <div className="mb-6 flex items-center gap-3"><div className="h-px flex-1 bg-gray-200" /><h2 className={`text-xs font-bold tracking-widest ${group.label === 'EXCLUSIVE' ? 'text-[#fc2779]' : 'text-gray-800'}`}>{group.label}</h2><div className="h-px flex-1 bg-gray-200" /></div>
      <div className="grid grid-cols-3 gap-y-2">{group.brands.map(brand => {
        const category = categories.find(c => normalizeSearch(c.name) === normalizeSearch(brand))
        const parent = categories.find(c => c.id === category?.parent_id)
        const href = category && parent && ['exclusive', 'essentials'].includes(parent.slug) ? `/${parent.slug}/${category.slug}` : '/shop?' + new URLSearchParams({ brand })
        return <Link key={brand} href={href} className="relative mx-0.5 flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded border border-gray-200 p-2 text-center transition-colors hover:border-gray-300 focus-visible:outline-pink-600">
          {category?.image_url ? <Image src={category.image_url} alt="" width={240} height={180} className="h-3/4 w-4/5 object-contain" /> : <span aria-hidden="true" className="text-2xl font-light tracking-widest text-gray-400">{brand.charAt(0)}</span>}
          <span className="max-w-full text-[10px] font-medium text-gray-500 md:text-xs">{brand}</span>
        </Link>
      })}</div>
    </section>)}
    {!visible.length && <div className="mt-[100px] flex flex-col items-center"><SearchX className="h-12 w-12 text-gray-300" /><p className="mt-4 text-base font-semibold text-gray-700">No brands found</p><p className="mt-1.5 text-sm text-gray-400">Try a different search term</p></div>}
  </div>
}
