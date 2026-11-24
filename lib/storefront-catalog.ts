import { productFlashPricing, type FlashSaleRow, type CatalogPricingProduct } from '@/lib/flash-sale-helper'

export type CatalogSort = 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'name'
export interface CatalogCategory { id: string; name: string; slug: string; parent_id: string | null; is_active: boolean; image_url?: string | null }
export interface CatalogConcern { id: string; name: string; slug: string }
export interface CatalogProduct extends CatalogPricingProduct {
  id: string; name: string; slug: string; description?: string | null; brand: string | null
  thumbnail_url: string | null; created_at: string; has_variants: boolean; tag?: string | null
  product_variants: { id: string; price: number; stock: number; title: string; image_url?: string | null; hex_code?: string | null; discount_type?: string | null; discount_value?: number | null }[]
  product_categories: { category_id: string }[]
  product_concerns?: { concern_id: string }[]
}
export interface CatalogState { q: string; categories: string[]; brands: string[]; price: string; inStock: boolean; sort: CatalogSort }
export interface CatalogScope { category?: string; extraCategories?: string[]; concern?: string }
export interface CatalogResult {
  products: CatalogProduct[]; total: number
  facets: { brands: string[]; categories: CatalogCategory[] }
  suggestions: { name: string; slug: string }[]; sales: FlashSaleRow[]; validUntil: number
}
export const CATALOG_PRICES = [
  { value: 'under-500', label: 'Under ₹500', min: 0, max: 500 },
  { value: '500-1000', label: '₹500–₹1,000', min: 500, max: 1000 },
  { value: '1000-2000', label: '₹1,000–₹2,000', min: 1000, max: 2000 },
  { value: 'above-2000', label: '₹2,000 and above', min: 2000, max: Infinity },
]
export const CATALOG_SORTS: { value: CatalogSort; label: string }[] = [
  { value: 'relevance', label: 'Relevance' }, { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' }, { value: 'price_desc', label: 'Price: high to low' }, { value: 'name', label: 'Name: A–Z' },
]
const list = (values: string[]) => [...new Set(values.map(v => v.trim()).filter(Boolean))].slice(0, 30).sort()
export function readCatalogState(params: URLSearchParams, search = false): CatalogState {
  const rawSort = params.get('sort')
  return { q: (params.get('q') || params.get('search') || '').trim().slice(0, 150),
    categories: list(params.getAll('category')), brands: list(params.getAll('brand')),
    price: CATALOG_PRICES.some(p => p.value === params.get('price')) ? params.get('price')! : '',
    inStock: params.get('stock') === 'in',
    sort: CATALOG_SORTS.some(s => s.value === rawSort) ? rawSort as CatalogSort : search ? 'relevance' : 'newest',
  }
}
export function catalogParams(state: CatalogState, search = false) {
  const params = new URLSearchParams()
  if (state.q) params.set('q', state.q)
  for (const value of list(state.categories)) params.append('category', value)
  for (const value of list(state.brands)) params.append('brand', value)
  if (state.price) params.set('price', state.price)
  if (state.inStock) params.set('stock', 'in')
  if (state.sort !== (search ? 'relevance' : 'newest')) params.set('sort', state.sort)
  return params
}
export const normalizeSearch = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\b(?:[a-z]\.){2,}[a-z]?\.?/gi, acronym => acronym.replace(/\./g, ''))
  .replace(/(\p{L})(\p{N})/gu, '$1 $2').replace(/(\p{N})(\p{L})/gu, '$1 $2')
  .toLowerCase().replace(/<[^>]*>/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const aliases: Record<string, string> = { moisturiser: 'moisturizer', moisturisers: 'moisturizer', lipsticks: 'lipstick' }
const words = (value: string) => normalizeSearch(value).replace(/lip sticks?/g, 'lipstick').replace(/make up/g, 'makeup')
  .split(/\s+/).filter(Boolean).map(w => aliases[w] || w)
function nearWord(a: string, b: string) {
  if (a.length < 4 || Math.abs(a.length - b.length) > 1) return false
  let i = 0, j = 0, edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++edits > 1) return false
    if (a[i] === b[j + 1] && a[i + 1] === b[j]) { i += 2; j += 2 }
    else if (a.length > b.length) i++
    else if (b.length > a.length) j++
    else { i++; j++ }
  }
  return edits + (i < a.length || j < b.length ? 1 : 0) <= 1
}
export function searchScore(product: CatalogProduct, query: string, categoryNames: string) {
  const terms = words(query)
  if (!terms.length) return 1
  const fields = ([[product.name, 100], [product.brand || '', 85],
    [product.product_variants.map(v => v.title).join(' '), 75], [categoryNames, 55], [product.description || '', 5]] as const)
    .map(([text, weight]) => ({ tokens: words(text), weight }))
  let score = 0
  for (const term of terms) {
    let best = 0
    for (const { tokens, weight } of fields) {
      if (tokens.includes(term)) best = Math.max(best, weight)
      else if (tokens.some(t => t.startsWith(term))) best = Math.max(best, weight * .8)
      else if (tokens.some(t => nearWord(term, t))) best = Math.max(best, weight * .45)
    }
    if (!best) return 0
    score += best
  }
  const phrase = terms.join(' ')
  if (words(product.name).join(' ') === phrase) score += 500
  else if (words(product.name).join(' ').startsWith(phrase)) score += 180
  if (words(product.brand || '').join(' ') === phrase) score += 250
  return score
}
export const catalogInStock = (p: CatalogProduct) => p.product_variants.some(v => Number(v.stock) > 0)
export function browseCategoryFacets(categories: CatalogCategory[]) {
  const byId = new Map(categories.map(c => [c.id, c]))
  return categories.filter(category => {
    let node: CatalogCategory | undefined = category
    const seen = new Set<string>()
    while (node && !seen.has(node.id)) {
      if (['exclusive', 'essentials', 'new-arrivals'].includes(node.slug)) return false
      seen.add(node.id); node = node.parent_id ? byId.get(node.parent_id) : undefined
    }
    return true
  })
}
export function categoryDescendants(categories: CatalogCategory[], slugs: string[]) {
  const ids = new Set(categories.filter(c => slugs.includes(c.slug)).map(c => c.id))
  let previous = -1
  while (previous !== ids.size) {
    previous = ids.size
    for (const category of categories) if (category.parent_id && ids.has(category.parent_id)) ids.add(category.id)
  }
  return ids
}
export function queryCatalog(products: CatalogProduct[], categories: CatalogCategory[], sales: FlashSaleRow[], state: CatalogState,
  scope: CatalogScope = {}, now = Date.now(), limit?: number, concerns: CatalogConcern[] = []): CatalogResult {
  const byId = new Map(categories.map(c => [c.id, c]))
  const visible = (id: string) => {
    const seen = new Set<string>()
    let category = byId.get(id)
    while (category) {
      if (!category.is_active || seen.has(category.id)) return false
      seen.add(category.id)
      if (!category.parent_id) return true
      category = byId.get(category.parent_id)
    }
    return false
  }
  const assigned = (p: CatalogProduct) => [...new Set([p.category_id, ...p.product_categories.map(c => c.category_id)].filter((id): id is string => !!id))]
  const scopeIds = scope.category ? categoryDescendants(categories, [scope.category, ...(scope.extraCategories || [])]) : null
  const selectedIds = categoryDescendants(categories, state.categories)
  const concernId = scope.concern ? concerns.find(c => c.slug === scope.concern)?.id : null
  const rows = products.flatMap(product => {
    const ids = assigned(product)
    if (scope.concern && (!concernId || !product.product_concerns?.some(c => c.concern_id === concernId))) return []
    if (ids.some(id => !visible(id)) || (scopeIds && !ids.some(id => scopeIds.has(id)))) return []
    const ancestors = new Set(ids)
    for (const id of ids) {
      let parent = byId.get(id)?.parent_id
      while (parent && !ancestors.has(parent)) { ancestors.add(parent); parent = byId.get(parent)?.parent_id }
    }
    const score = searchScore(product, state.q, [...ancestors].map(id => byId.get(id)?.name || '').join(' '))
    if (!score) return []
    return [{ product, score, price: productFlashPricing(product, sales, now).salePrice, stock: catalogInStock(product), ids, ancestors }]
  })
  const range = CATALOG_PRICES.find(p => p.value === state.price)
  const brands = new Set(state.brands.map(normalizeSearch))
  const filtered = rows.filter(row => (!state.categories.length || row.ids.some(id => selectedIds.has(id))) &&
    (!state.brands.length || brands.has(normalizeSearch(row.product.brand || ''))) && (!state.inStock || row.stock) &&
    (!range || (row.price >= range.min && row.price < range.max)))
  filtered.sort((a, b) => {
    if (state.sort === 'relevance') return b.score - a.score || Number(b.stock) - Number(a.stock) || a.product.id.localeCompare(b.product.id)
    if (state.sort === 'price_asc') return a.price - b.price || a.product.id.localeCompare(b.product.id)
    if (state.sort === 'price_desc') return b.price - a.price || a.product.id.localeCompare(b.product.id)
    if (state.sort === 'name') return a.product.name.localeCompare(b.product.name) || a.product.id.localeCompare(b.product.id)
    return Date.parse(b.product.created_at) - Date.parse(a.product.created_at) || a.product.id.localeCompare(b.product.id)
  })
  const times = sales.flatMap(s => [Date.parse(s.starts_at), Date.parse(s.ends_at)]).filter(t => t > now)
  return { products: filtered.slice(0, limit).map(({ product: p }) => ({
    id: p.id, name: p.name, slug: p.slug, brand: p.brand, thumbnail_url: p.thumbnail_url,
    created_at: p.created_at, has_variants: p.has_variants, tag: p.tag, category_id: p.category_id,
    base_price: p.base_price, discount_type: p.discount_type, discount_value: p.discount_value,
    product_categories: p.product_categories, product_variants: p.product_variants,
  })), total: filtered.length,
    facets: { brands: [...new Map(rows.map(r => r.product.brand).filter((b): b is string => !!b).map(b => [normalizeSearch(b), b])).values()].sort(),
      categories: categories.filter(c => visible(c.id) && rows.some(r => r.ancestors.has(c.id))).sort((a, b) => a.name.localeCompare(b.name)) },
    suggestions: state.q.length >= 2 ? categories.filter(c => visible(c.id) && normalizeSearch(c.name).includes(normalizeSearch(state.q)))
      .slice(0, 4).map(c => ({ name: c.name, slug: c.slug })) : [], sales,
    validUntil: Math.min(now + 60_000, ...times),
  }
}
