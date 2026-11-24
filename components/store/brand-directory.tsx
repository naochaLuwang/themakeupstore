'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Search, SearchX, X } from 'lucide-react'
import { normalizeSearch, type CatalogCategory } from '@/lib/storefront-catalog'

// Keep the original category-directory exclusions; product brand strings are not directory entries.
const BLACKLISTED_NAMES = new Set(["Foundation", "Concealer", "Face Primer", "Lipstick", "Lip Gloss", "Lip Liner", "Liquid Lipstick", "Blush", "Bronzer & Contour", "Highlighter & Illuminator", "Loose Powder", "Compact", "Eye Brow Enhancers", "Eyeliner", "Mascara", "Eye shadow", "Setting Spray", "Makeup Remover", "Skincare", "Fragrance", "Tools & Brushes", "Kajal", "Lip Balm", "Lip Tint", "Cleansers & Toners", "Moisturisers", "Serum", "Sunscreen", "False Eyelashes", "Makeup Brushes", "Makeup remover & wipes", "Face Mask", "Sponges & Applicators", "Lenses"].map(name => name.toLowerCase()))

export function BrandDirectory({ categories }: { categories: CatalogCategory[] }) {
  const params = useSearchParams()
  const query = params.get('q') || ''
  const byId = new Map(categories.map(category => [category.id, category]))
  const visible = categories.filter(category => {
    if (!category.parent_id || BLACKLISTED_NAMES.has(category.name.toLowerCase()) || !normalizeSearch(category.name).includes(normalizeSearch(query))) return false
    let node: CatalogCategory | undefined = category
    const seen = new Set<string>()
    while (node && !seen.has(node.id)) {
      if (!node.is_active) return false
      seen.add(node.id)
      if (!node.parent_id) return true
      node = byId.get(node.parent_id)
    }
    return false
  }).sort((a, b) => a.name.localeCompare(b.name))
  function change(value: string) {
    const next = new URLSearchParams()
    if (value) next.set('q', value.slice(0, 150))
    window.history.replaceState(null, '', '/brands' + (next.size ? '?' + next : ''))
  }
  const groups = [
    { label: 'EXCLUSIVE', brands: visible.filter(category => byId.get(category.parent_id!)?.slug.toLowerCase().includes('exclusive')) },
    { label: 'ESSENTIALS', brands: visible.filter(category => !byId.get(category.parent_id!)?.slug.toLowerCase().includes('exclusive')) },
  ]
  return <div className="mx-auto max-w-6xl px-5 pb-20 pt-2">
    <div className="mb-7"><h1 className="text-[28px] font-bold tracking-tight text-gray-900">BRANDS</h1><p role="status" className="mt-1 text-sm text-gray-400">{visible.length} brands on The Makeup Store</p></div>
    <label htmlFor="brand-search" className="sr-only">Find a brand</label>
    <div className="mb-7 flex h-11 items-center gap-2.5 rounded-lg border border-gray-100 bg-slate-100 px-3.5"><Search className="h-4 w-4 shrink-0 text-gray-400" /><input id="brand-search" type="search" autoComplete="off" placeholder="Search brands" value={query} maxLength={150} onChange={event => change(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 [&::-webkit-search-cancel-button]:hidden" />{query && <button aria-label="Clear brand search" className="flex h-10 w-10 items-center justify-center" onClick={() => change('')}><X className="h-4 w-4" /></button>}</div>
    {groups.map(group => group.brands.length > 0 && <section key={group.label} aria-label={group.label} className="mb-10">
      <div className="mb-6 flex items-center gap-3"><div className="h-px flex-1 bg-gray-200" /><h2 className={`text-xs font-bold tracking-widest ${group.label === 'EXCLUSIVE' ? 'text-[#fc2779]' : 'text-gray-800'}`}>{group.label}</h2><div className="h-px flex-1 bg-gray-200" /></div>
      <div className="grid grid-cols-3 gap-y-2">{group.brands.map(category => {
        const parent = byId.get(category.parent_id!)
        const section = parent && ['exclusive', 'essentials'].includes(parent.slug) ? parent.slug : 'categories'
        return <Link key={category.id} href={`/${section}/${category.slug}`} aria-label={category.name} className="relative mx-0.5 flex aspect-square items-center justify-center overflow-hidden rounded border border-gray-200 p-2 text-center transition-colors hover:border-gray-300 focus-visible:outline-pink-600">
          {category.image_url ? <Image src={category.image_url} alt="" width={240} height={180} className="h-4/5 w-4/5 object-contain" /> : <span aria-hidden="true" className="text-2xl font-light tracking-widest text-gray-400">{category.name.charAt(0)}</span>}
        </Link>
      })}</div>
    </section>)}
    {!visible.length && <div className="mt-[100px] flex flex-col items-center"><SearchX className="h-12 w-12 text-gray-300" /><p className="mt-4 text-base font-semibold text-gray-700">No brands found</p><p className="mt-1.5 text-sm text-gray-400">Try a different search term</p></div>}
  </div>
}
