import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { queryCatalog, type CatalogCategory, type CatalogConcern, type CatalogProduct, type CatalogScope, type CatalogState } from './storefront-catalog'
import type { FlashSaleRow } from './flash-sale-helper'

export async function readCatalogPages<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, size = 250) {
  const rows: T[] = []
  for (let from = 0; ; from += size) {
    const result = await read(from, from + size - 1)
    if (result.error || !result.data) throw new Error('Catalog unavailable')
    rows.push(...result.data)
    if (result.data.length < size) return rows
  }
}
// Anonymous catalog-only reads. Cache each small database page independently:
// the complete catalog can exceed Next's 2 MB limit for one cache entry.
function catalogReader() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(20_000), cache: 'no-store' }) } })
  async function page<T>(table: string, from: number, to: number, select: string, active = false) {
    const data = await unstable_cache(async () => {
      let query = db.from(table).select(select).order('id').range(from, to)
      if (active) query = table === 'products' ? query.eq('status', 'active') : query.eq('is_active', true)
      const result = await query
      if (result.error || !result.data) throw new Error('Catalog unavailable')
      return result.data as unknown as T[]
    }, ['storefront-discovery-v2', table, select, String(from), String(to), String(active)], { revalidate: 30, tags: ['storefront-discovery-catalog'] })()
    return { data, error: null }
  }
  return page
}
export async function readStoreCategories() {
  const page = catalogReader()
  return readCatalogPages<CatalogCategory>((from, to) => page('categories', from, to, 'id,name,slug,parent_id,is_active,image_url'), 100)
}
async function loadCatalog() {
  const page = catalogReader()
  const [products, categories, flash, concerns] = await Promise.all([
    readCatalogPages<CatalogProduct>((from, to) => page('products', from, to,
      'id,name,slug,description,brand,category_id,base_price,thumbnail_url,created_at,has_variants,tag,discount_type,discount_value,product_categories(category_id),product_concerns(concern_id),product_variants(id,title,price,stock,image_url,hex_code,discount_type,discount_value)', true), 100),
    readStoreCategories(),
    readCatalogPages<FlashSaleRow>((from, to) => page('flash_sales', from, to, 'id,name,product_id,category_id,brand,scope,discount_type,discount_value,label,starts_at,ends_at,is_active,lifecycle,target_config', true), 100),
    readCatalogPages<CatalogConcern>((from, to) => page('concerns', from, to, 'id,name,slug'), 100),
  ])
  return { products, categories, flash, concerns }
}
export async function searchStoreCatalog(state: CatalogState, scope: CatalogScope = {}, limit?: number) {
  const { products, categories, flash, concerns } = await loadCatalog()
  return queryCatalog(products, categories, flash, state, scope, Date.now(), limit, concerns)
}
