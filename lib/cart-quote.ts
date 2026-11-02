import type { SupabaseClient } from '@supabase/supabase-js'
import { variantFlashPricing, type FlashSaleRow } from '@/lib/flash-sale-helper'
import type { PriceGroup } from '@/lib/line-pricing'
import { loadPromotionDefinitions, loadPromotionSnapshot } from '@/lib/promotion-data'
import { evaluatePromotionSnapshot, type PromotionSnapshot } from '@/lib/promotion-preview'


export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export interface PricedItem {
  productId: string; variantId: string; name: string; variantTitle: string
  price: number; mrp: number; regularPrice?: number; quantity: number; stock: number; image: string
  categoryId: string; categoryIds: string[]; brand: string
  priceBreakdown?: PriceGroup[]
}
export interface FreeItem {
  productId: string | null; variantId: string | null; giftProductId: string | null
  ruleId: string; ruleName: string; quantity: number; name: string; mrp: number; image: string
}
export function positiveQuantity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > 1000) throw new Error('Invalid item quantity')
  return value
}
export function monetaryAmount(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) throw new Error('Invalid monetary amount')
  return n
}

// Fetch canonical merchandise once. Preview, payment creation and placement all use this function.
export async function merchandiseQuote(db: SupabaseClient, userId: string | null, rawItems: unknown) {
  if (!Array.isArray(rawItems) || !rawItems.length || rawItems.length > 100) throw new Error('Invalid cart')
  const paid = rawItems.filter(item => item && !item.is_gift && !item.is_bxgy_free)
  if (!paid.length) throw new Error('Your cart must contain a paid item')
  const ids = paid.map(item => {
    if (!uuidPattern.test(item.variantId)) throw new Error('Invalid product variant')
    positiveQuantity(item.quantity)
    return item.variantId as string
  })
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate product variant in cart')
  const [variantRes, definitions, flashRes] = await Promise.all([
    db.from('product_variants').select('id,product_id,title,price,stock,image_url,discount_type,discount_value,products(name,brand,thumbnail_url,category_id,discount_type,discount_value)').in('id', ids),
    loadPromotionDefinitions(db),
    db.from('flash_sales').select('*').eq('is_active', true).gte('ends_at', new Date().toISOString()),
  ])
  if ([variantRes, flashRes].some(r => r.error)) throw new Error('Could not check current prices and offers. Please try again.')
  const rows = variantRes.data || []
  const productIds = [...new Set(rows.map(r => r.product_id))]
  const [{ data: categories, error: categoryError }, snapshot] = await Promise.all([
    db.from('product_categories').select('product_id,category_id').in('product_id', productIds),
    loadPromotionSnapshot(db, userId, definitions),
  ])
  if (categoryError) throw new Error('Could not verify product categories')
  const items: PricedItem[] = paid.map(item => {
    const variant = rows.find(r => r.id === item.variantId)
    if (!variant) throw new Error('Product not found')
    const product = variant.products as unknown as { name: string; brand: string; thumbnail_url: string; category_id: string | null; discount_type: 'percentage' | 'amount' | 'none'; discount_value: number }
    if (!product) throw new Error('Product not found')
    if (variant.stock < item.quantity) throw new Error(`Not enough stock for ${product.name}. Please reduce the quantity.`)
    const categoryIds = [...new Set([product.category_id, ...(categories || []).filter(c => c.product_id === variant.product_id).map(c => c.category_id)].filter(Boolean))] as string[]
    const mrp = monetaryAmount(variant.price)
    const pricing = variantFlashPricing({ ...variant, price: mrp }, { ...product, id: variant.product_id, categoryIds }, (flashRes.data || []) as FlashSaleRow[])
    // The store displays and charges whole-rupee selling prices consistently.
    return { variantId: variant.id, productId: variant.product_id, name: product.name, variantTitle: variant.title || '',
      quantity: item.quantity, stock: variant.stock, image: variant.image_url || product.thumbnail_url || '',
      mrp, price: pricing.salePrice, regularPrice: pricing.regularPrice, categoryId: categoryIds[0] || '', categoryIds, brand: product.brand || '' }
  })
  snapshot.flashSales = (flashRes.data || []) as FlashSaleRow[]
  const flashDates = (flashRes.data || []).flatMap(f => [f.starts_at, f.ends_at])
    .filter((d): d is string => !!d && Date.parse(d) > Date.now()).map(d => Date.parse(d))
  snapshot.expiresAt = Math.min(snapshot.expiresAt, ...flashDates)
  const quote: ReturnType<typeof evaluatePromotionSnapshot> & { previewCatalog?: PromotionSnapshot } = evaluatePromotionSnapshot(items, snapshot)
  quote.previewCatalog = snapshot
  return quote
}
