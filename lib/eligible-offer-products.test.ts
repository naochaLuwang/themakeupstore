// @vitest-environment node
import { expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { loadEligibleCatalog, eligibleProductsPage, type OfferCatalogProduct } from './eligible-offer-products'
import { calculateBXGY, type BXGYRule } from './promotion-engine'
import { loadPromotionDefinitions } from './promotion-data'
import { offerSelectionLabel } from './offer-display'
import { emptyFlashTargets, type FlashSaleRow } from './flash-sale-helper'

const rule = (patch: Partial<BXGYRule> = {}): BXGYRule => ({ id: 'r', is_active: true, buy_type: 'specific_brands',
  buy_quantity: 2, get_type: 'cheapest_free', get_discount_type: 'free', get_discount_value: 100,
  pricing_mode: 'replace_discounts', products: [], categories: [], brands: ['Milani', 'RELOVE'], ...patch })
const product = (id = 'p', patch: Partial<OfferCatalogProduct> = {}): OfferCatalogProduct => ({ id, name: `Lipstick ${id}`, brand: 'Milani',
  category_id: 'cat', thumbnail_url: '', status: 'active', discount_type: 'percentage', discount_value: 20,
  product_categories: [{ category_id: 'secondary' }], product_variants: [{ id: `v${id}`, title: 'Rose', price: 1000, stock: 4, image_url: '', discount_type: 'none', discount_value: 0 }], ...patch })
function db(tables: Record<string, unknown[]>): SupabaseClient {
  return { from(table: string) {
    let rows = (tables[table] || []) as Record<string, unknown>[]
    const q = { select: () => q, order: () => q,
      eq: (k: string, v: unknown) => { rows = rows.filter(r => r[k] === v); return q },
      in: (k: string, v: unknown[]) => { rows = rows.filter(r => v.includes(r[k])); return q },
      range: (from: number, to: number) => { rows = rows.slice(from, to + 1); return q },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve) }
    return q
  } } as unknown as SupabaseClient
}
const categories = [{ id: 'cat', name: 'Lipsticks' }, { id: 'secondary', name: 'Lip Liners' }]

it('loads exact pooled brands and rejects inactive products, using variant stock', async () => {
  const catalog = await loadEligibleCatalog(db({ products: [product(), product('2', { brand: 'RELOVE' }), product('x', { brand: 'Other' }), product('hidden', { status: 'draft' })], categories }), rule())
  expect(catalog.products.map(p => p.id)).toEqual(['p', '2'])
  expect(eligibleProductsPage(catalog, rule(), [], {}).products[0].variants[0].stock).toBe(4)
})
it('includes both primary and secondary category assignments once', async () => {
  const catalog = await loadEligibleCatalog(db({ products: [product(), product('2', { category_id: 'secondary' })], product_categories: [{ product_id: 'p', category_id: 'secondary' }], categories }), rule({ buy_type: 'specific_categories', categories: ['secondary'] }))
  expect(catalog.products.map(p => p.id).sort()).toEqual(['2', 'p'])
})
it('selected products never imply eligibility for every product of the same brand', async () => {
  const catalog = await loadEligibleCatalog(db({ products: [product(), product('excluded')], categories }), rule({ buy_type: 'specific_products', products: ['p'] }))
  expect(catalog.products.map(p => p.id)).toEqual(['p'])
  expect(offerSelectionLabel(rule({ buy_type: 'specific_products', targetNames: ['Milani'] }))).toBe('selected Milani products')
})
it('reads beyond the database row limit and paginates the complete matching set', async () => {
  const products = Array.from({ length: 1005 }, (_, i) => product(String(i).padStart(4, '0')))
  const catalog = await loadEligibleCatalog(db({ products, categories }), rule())
  const page = eligibleProductsPage(catalog, rule(), [], { page: 51 })
  expect(page.total).toBe(1005); expect(page.products).toHaveLength(5); expect(page.pages).toBe(51)
})
it('reads all product targets and their display brands beyond 1,000 junction rows', async () => {
  const targets = Array.from({ length: 1005 }, (_, i) => ({ bxgy_id: 'r', product_id: String(i), products: { brand: 'Milani' } }))
  const defs = await loadPromotionDefinitions(db({ buy_x_get_y: [rule({ buy_type: 'specific_products' })], bxgy_buy_products: targets }))
  expect(defs.bxgyRules[0].products).toHaveLength(1005); expect(defs.bxgyRules[0].targetNames).toEqual(['Milani'])
})
it('loads readable category names from campaign definitions', async () => {
  const defs = await loadPromotionDefinitions(db({ buy_x_get_y: [rule({ buy_type: 'specific_categories' })], bxgy_buy_categories: [{ bxgy_id: 'r', category_id: 'cat', categories: { name: 'Lipsticks' } }] }))
  expect(offerSelectionLabel(defs.bxgyRules[0])).toBe('Lipsticks')
})
it('filters product names, brands and shades, with stable counts and in-stock products first', () => {
  const stocked = product('stocked', { brand: 'RELOVE' }), sold = product('sold', { product_variants: [] })
  const catalog = { products: [sold, stocked], categories }
  expect(eligibleProductsPage(catalog, rule(), [], {}).products.map(p => p.id)).toEqual(['stocked', 'sold'])
  expect(eligibleProductsPage(catalog, rule(), [], { search: 'rose', brand: 'RELOVE', category: 'secondary' }).total).toBe(1)
  expect(eligibleProductsPage(catalog, rule(), [], { search: 'missing' }).products).toEqual([])
})
it('shows original offer prices and current normal prices including variant flash exclusions', () => {
  const p = product(), now = Date.parse('2026-11-02T12:00:00Z')
  const sale: FlashSaleRow = { id: 's', scope: 'brand', brand: 'Milani', product_id: null, category_id: null, discount_type: 'percentage', discount_value: 50, label: 'Sale', starts_at: '2026-11-02T11:00:00Z', ends_at: '2026-11-02T12:00:10Z', is_active: true }
  const page = eligibleProductsPage({ products: [p], categories }, rule(), [sale], {}, now)
  expect(page.products[0].variants[0]).toMatchObject({ mrp: 1000, price: 500, regularPrice: 800 })
  expect(page.expiresAt).toBe(now + 10000)
  sale.target_config = { ...emptyFlashTargets(), brands: ['Milani'], exclude_variant_ids: ['vp'] }
  expect(eligibleProductsPage({ products: [p], categories }, rule(), [sale], {}, now).products[0].variants[0].price).toBe(800)
  expect(eligibleProductsPage({ products: [p], categories }, rule(), [sale], {}, now + 10000).products[0].variants[0].price).toBe(800)
})
it('summarizes long brand selections without losing the full selection', () => {
  const r = rule({ brands: ['Milani', 'RELOVE', 'FOREVER52', 'Other'] })
  expect(offerSelectionLabel(r, true)).toBe('Milani + RELOVE +2 more')
  expect(offerSelectionLabel(r)).toBe('Milani + RELOVE + FOREVER52 + Other')
})
it.each([[2, 0, 2, 1], [3, 1, 0, 3], [5, 1, 2, 1], [6, 2, 0, 3], [9, 3, 0, 3]])('continues reward progress for %i units', (quantity, freeQtyApplied, setProgress, neededQty) => {
  const result = calculateBXGY([{ productId: 'p', variantId: 'v', name: 'P', price: 100, quantity, categoryIds: [], brand: 'Milani' }], [rule()])
  expect(result.progress[0]).toMatchObject({ freeQtyApplied, setProgress, neededQty, currentQty: quantity })
})
it('never counts another campaign’s allocated units as progress toward a second reward', () => {
  const result = calculateBXGY([{ productId: 'p', variantId: 'v', name: 'P', price: 100, quantity: 5, categoryIds: [], brand: 'Milani' }], [rule({ id: 'a' }), rule({ id: 'b' })])
  expect(result.progress).toMatchObject([{ ruleId: 'a', currentQty: 5, freeQtyApplied: 1, neededQty: 1 }, { ruleId: 'b', currentQty: 2, freeQtyApplied: 0, neededQty: 1 }])
})
