import type { SupabaseClient } from '@supabase/supabase-js'
import type { FlashProduct, FlashCategory } from '@/lib/flash-sale-admin'
import type { FlashSaleRow } from '@/lib/flash-sale-helper'
import { loadPromotionDefinitions } from '@/lib/promotion-data'
async function allRows<T>(read: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 500) {
    const result = await read(from, from + 499)
    if (result.error) throw new Error(result.error.message)
    rows.push(...(result.data || []) as T[])
    if ((result.data || []).length < 500) return rows
  }
}
export async function flashEditorData(db: SupabaseClient) {
  const [products, categories, sales, definitions] = await Promise.all([
    allRows<FlashProduct>((from,to) => db.from('products').select('id,name,brand,category_id,discount_type,discount_value,thumbnail_url,status,product_categories(category_id),product_variants(id,title,price,stock,discount_type,discount_value)').order('id').range(from,to)),
    allRows<FlashCategory>((from,to) => db.from('categories').select('id,name').order('name').order('id').range(from,to)),
    allRows<FlashSaleRow & { updated_at: string }>((from,to) => db.from('flash_sales').select('*').eq('is_active',true).gt('ends_at',new Date().toISOString()).order('id').range(from,to)),
    loadPromotionDefinitions(db),
  ])
  return { products, categories, sales, bxgyRules: definitions.bxgyRules }
}
export type FlashEditorData = Awaited<ReturnType<typeof flashEditorData>>

// Keep multi-target requests below URL limits and avoid silently truncating brand matches.
export async function flashReadIds(db: SupabaseClient, table: string, fields: string, key: string, values: string[]) {
  const chunks: string[][] = []
  for (let i=0;i<values.length;i+=100) chunks.push(values.slice(i,i+100))
  const results = await Promise.all(chunks.map(chunk => allRows<Record<string,string>>((from,to) =>
    db.from(table).select(fields).in(key,chunk).order('id').range(from,to))))
  return { data: results.flat(), error: null }
}
