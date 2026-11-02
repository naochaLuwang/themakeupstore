import type { SupabaseClient } from '@supabase/supabase-js'
import type { BXGYRule } from '@/lib/promotion-engine'
import { matchesOffer } from '@/lib/promotion-engine'
import { variantFlashPricing, type FlashSaleRow } from '@/lib/flash-sale-helper'

interface Variant {
  id: string; title: string; price: number; stock: number; image_url: string | null
  discount_type: string; discount_value: number
}
export interface OfferCatalogProduct {
  id: string; name: string; brand: string; category_id: string | null; thumbnail_url: string | null
  discount_type: string; discount_value: number; status: string
  product_categories: { category_id: string }[]; product_variants: Variant[]
}
export interface OfferCatalog { products: OfferCatalogProduct[]; categories: { id: string; name: string }[] }
export interface EligibleProduct {
  id: string; name: string; brand: string; image: string; categoryIds: string[]
  variants: { id: string; title: string; stock: number; image: string; mrp: number; price: number; regularPrice: number }[]
}
export interface EligibleProductsPage {
  rule: BXGYRule; products: EligibleProduct[]; total: number; page: number; pages: number
  brands: string[]; categories: { id: string; name: string }[]; expiresAt: number
}
type ReadResult = PromiseLike<{ data: unknown[] | null; error: unknown }>
async function allRows<T>(read: (from: number, to: number) => ReadResult): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 500) {
    const result = await read(from, from + 499)
    if (result.error) throw new Error('Could not load eligible products')
    rows.push(...(result.data || []) as T[])
    if ((result.data || []).length < 500) return rows
  }
}
async function chunkRead<T>(values: string[], read: (values: string[], from: number, to: number) => ReadResult) {
  const rows: T[] = []
  // Bound query size and concurrency, including category/brand campaigns with >1,000 matches.
  for (let offset = 0; offset < values.length; offset += 100) {
    rows.push(...await allRows<T>((from, to) => read(values.slice(offset, offset + 100), from, to)))
  }
  return rows
}

export async function loadEligibleCatalog(db: SupabaseClient, rule: BXGYRule): Promise<OfferCatalog> {
  const fields = 'id,name,brand,category_id,thumbnail_url,discount_type,discount_value,status,product_categories(category_id),product_variants(id,title,price,stock,image_url,discount_type,discount_value)'
  const readProducts = (key: string, values: string[]) => chunkRead<OfferCatalogProduct>(values, (chunk, from, to) =>
    db.from('products').select(fields).eq('status', 'active').in(key, chunk).order('id').range(from, to))
  let products: OfferCatalogProduct[] = []
  if (rule.buy_type === 'specific_products') products = await readProducts('id', rule.products)
  if (rule.buy_type === 'specific_brands') products = await readProducts('brand', rule.brands)
  if (rule.buy_type === 'specific_categories') {
    const [direct, links] = await Promise.all([
      readProducts('category_id', rule.categories),
      chunkRead<{ product_id: string }>(rule.categories, (chunk, from, to) =>
        db.from('product_categories').select('product_id,category_id').in('category_id', chunk).order('product_id').order('category_id').range(from, to)),
    ])
    products = [...direct, ...await readProducts('id', [...new Set(links.map(l => l.product_id))])]
  }
  products = [...new Map(products.map(p => [p.id, p])).values()].filter(p => matchesOffer({ productId: p.id,
    variantId: '', name: p.name, price: 0, quantity: 0, categoryIds: productCategories(p), brand: p.brand || '' }, rule.buy_type, rule))
  const categoryIds = [...new Set(products.flatMap(productCategories))]
  const categories = await chunkRead<{ id: string; name: string }>(categoryIds, (chunk, from, to) =>
    db.from('categories').select('id,name').in('id', chunk).order('id').range(from, to))
  return { products, categories }
}
const productCategories = (p: OfferCatalogProduct) => [...new Set([p.category_id, ...(p.product_categories || []).map(c => c.category_id)].filter((id): id is string => !!id))]

export function eligibleProductsPage(catalog: OfferCatalog, rule: BXGYRule, sales: FlashSaleRow[],
  filters: { search?: string; brand?: string; category?: string; page?: number }, now = Date.now()): EligibleProductsPage {
  const search = (filters.search || '').trim().toLocaleLowerCase()
  const products = catalog.products.map(p => {
    const categoryIds = productCategories(p)
    return { id: p.id, name: p.name, brand: p.brand || '', image: p.thumbnail_url || '', categoryIds,
      variants: (p.product_variants || []).map(v => {
        const pricing = variantFlashPricing(v, { ...p, categoryIds }, sales, now)
        return { id: v.id, title: v.title || '', stock: Math.max(0, Number(v.stock) || 0), image: v.image_url || p.thumbnail_url || '',
          mrp: pricing.mrp, price: pricing.salePrice, regularPrice: pricing.regularPrice }
      }).sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id)) }
  }).filter(p => (!search || `${p.name} ${p.brand} ${p.variants.map(v => v.title).join(' ')}`.toLocaleLowerCase().includes(search)) &&
    (!filters.brand || p.brand === filters.brand) && (!filters.category || p.categoryIds.includes(filters.category)))
    .sort((a, b) => Number(b.variants.some(v => v.stock > 0)) - Number(a.variants.some(v => v.stock > 0)) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
  const pages = Math.max(1, Math.ceil(products.length / 20)), page = Math.min(Math.max(1, filters.page || 1), pages)
  const boundaries = [rule.expires_at, ...sales.flatMap(s => [s.starts_at, s.ends_at])].filter((d): d is string => !!d).map(Date.parse).filter(t => t > now)
  return { rule, products: products.slice((page - 1) * 20, page * 20), total: products.length, page, pages,
    brands: [...new Set(catalog.products.map(p => p.brand).filter(Boolean))].sort(), categories: catalog.categories,
    expiresAt: Math.min(now + 30_000, ...boundaries) }
}
