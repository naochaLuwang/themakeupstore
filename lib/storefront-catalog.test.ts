import { describe, expect, it } from 'vitest'
import { catalogParams, readCatalogState, queryCatalog, searchScore, type CatalogProduct, type CatalogCategory } from './storefront-catalog'
import type { FlashSaleRow } from './flash-sale-helper'
const categories: CatalogCategory[] = [
  { id: 'lips', name: 'Lips', slug: 'lips', parent_id: null, is_active: true },
  { id: 'lipstick', name: 'Lipstick', slug: 'lipstick', parent_id: 'lips', is_active: true },
  { id: 'hidden', name: 'Hidden', slug: 'hidden', parent_id: null, is_active: false },
  { id: 'hidden-child', name: 'Hidden child', slug: 'hidden-child', parent_id: 'hidden', is_active: true },
]
const product = (id: string, overrides: Partial<CatalogProduct> = {}): CatalogProduct => ({
  id, name: 'Matte Lipstick', slug: id, brand: 'Rare Beauty', description: 'A soft matte finish',
  thumbnail_url: null, created_at: '2026-01-01', has_variants: true, category_id: 'lipstick',
  product_categories: [], product_variants: [{ id: id + '-rose', price: 500, stock: 2, title: 'Rose' }], ...overrides,
})
const state = (query = '') => readCatalogState(new URLSearchParams(query), true)
describe('storefront catalog discovery', () => {
  it('round-trips query, multiple filters, sort through a shareable URL', () => {
    const input = state('q=rare+beauty&brand=Rare+Beauty&brand=Rare+Beauty&category=lips&stock=in&price=500-1000&sort=price_asc&page=3')
    expect(readCatalogState(catalogParams(input, true), true)).toEqual(input)
    expect(input.brands).toHaveLength(1)
    expect(catalogParams(input, true).has('page')).toBe(false)
    expect(state().sort).toBe('relevance')
    expect(readCatalogState(new URLSearchParams()).sort).toBe('newest')
    expect(state('page=Infinity&sort=bad&price=bad')).toMatchObject({ sort: 'relevance', price: '' })
  })
  it('ranks actual product-name matches above incidental description matches', () => {
    const exact = product('exact'), incidental = product('incidental', { name: 'Highlighter', description: 'Pair with a lipstick' })
    const result = queryCatalog([incidental, exact], categories, [], state('q=lipstick'))
    expect(result.products.map(p => p.id)).toEqual(['exact', 'incidental'])
  })
  it('supports prefixes, brand + product queries, shades, aliases and common typos', () => {
    const p = product('a')
    for (const query of ['lip', 'rare beuty lipstick', 'rare beauty rose', 'lip stick', 'lipsticks', 'lipstik', 'liptsick'])
      expect(searchScore(p, query, 'Lipstick')).toBeGreaterThan(0)
    expect(searchScore(p, 'rare eyeliner', 'Lipstick')).toBe(0)
  })
  it('shows the complete filtered and sorted catalog without pagination', () => {
    const all = Array.from({ length: 525 }, (_, i) => product(String(i), { product_variants: [{ id: 'v-' + i, price: 1000 - i, stock: 2, title: 'Rose' }] }))
    const result = queryCatalog(all, categories, [], state('q=lipstick&sort=price_asc'))
    expect(result.total).toBe(525)
    expect(result.products[0].id).toBe('524')
    expect(result.products).toHaveLength(525)
    expect(queryCatalog(all, categories, [], state('q=lipstick&sort=price_asc&page=2')).products).toEqual(result.products)
    expect(queryCatalog(all, categories, [], state('page=99999')).products).toHaveLength(525)
    const suggestions = queryCatalog(all, categories, [], state('q=lipstick'), {}, Date.now(), 5)
    expect(suggestions.products).toHaveLength(5)
    expect(suggestions.total).toBe(525)
  })
  it('matches punctuated brands, joined brand numbers and case variants consistently', () => {
    expect(searchScore(product('mac', { brand: 'M.A.C' }), 'mac lipstick', '')).toBeGreaterThan(0)
    expect(searchScore(product('forever', { brand: 'FOREVER52' }), 'forever 52 lipstick', '')).toBeGreaterThan(0)
    const result = queryCatalog([product('a', { brand: 'Rare Beauty' }), product('b', { brand: 'RARE BEAUTY' })], categories, [], state('brand=rare+beauty'))
    expect(result.total).toBe(2)
    expect(result.facets.brands).toHaveLength(1)
  })
  it('includes direct and junction assignments and descendant categories', () => {
    const direct = product('direct'), junction = product('junction', { category_id: null, product_categories: [{ category_id: 'lipstick' }] })
    const result = queryCatalog([direct, junction], categories, [], state(), { category: 'lips' })
    expect(result.total).toBe(2)
    expect(result.facets.categories.map(c => c.slug)).toContain('lips')
    expect(queryCatalog([direct, junction], categories, [], state('category=lips')).total).toBe(2)
  })
  it('excludes inactive ancestors, unknown assignments and shared inactive categories', () => {
    const items = [product('a', { category_id: 'hidden' }), product('b', { category_id: 'hidden-child' }), product('c', { category_id: 'missing' }), product('d', { product_categories: [{ category_id: 'hidden' }] }), product('ok')]
    expect(queryCatalog(items, categories, [], state()).products.map(p => p.id)).toEqual(['ok'])
  })
  it('uses variant stock, including a default variant, and filters the same complete set', () => {
    const out = product('out', { product_variants: [{ id: 'v', price: 400, stock: 0, title: 'Default' }] })
    expect(queryCatalog([out, product('in')], categories, [], state('stock=in')).products.map(p => p.id)).toEqual(['in'])
  })
  it.each(['relevance', 'newest', 'price_asc', 'price_desc', 'name'])(
    'puts sold-outs last for %s while retaining the sort in both groups', sort => {
      const items = [
        product('out-a', { name: 'Lipstick A', created_at: '2026-11-25', product_variants: [{ id: 'oa', title: 'Default', price: 50, stock: 0 }], has_variants: false }),
        product('in-a', { name: 'Lipstick C', created_at: '2026-11-23', product_variants: [{ id: 'ia', title: 'Rose', price: 200, stock: 1 }, { id: 'ib', title: 'Pink', price: 10, stock: -10 }] }),
        product('out-b', { name: 'Lipstick B', created_at: '2026-11-26', product_variants: [{ id: 'ob', title: 'Pink', price: 400, stock: -1 }] }),
        product('in-b', { name: 'Lipstick D', created_at: '2026-11-24', product_variants: [{ id: 'ic', title: 'Default', price: 300, stock: 2 }], has_variants: false }),
      ]
      const result = queryCatalog(items, categories, [], state('q=lipstick&sort=' + sort))
      const descending = ['newest', 'price_desc'].includes(sort)
      expect(result.products.map(p => p.id)).toEqual(descending
        ? ['in-b', 'in-a', 'out-b', 'out-a'] : ['in-a', 'in-b', 'out-a', 'out-b'])
      expect(result.total).toBe(4)
      expect(queryCatalog(items, categories, [], state('q=lipstick&sort=' + sort), {}, Date.now(), 2).products.map(p => p.id))
        .toEqual(result.products.slice(0, 2).map(p => p.id))
    })
  it('ranks an available search match before a sold-out exact match and keeps stock filtering', () => {
    const out = product('out', { product_variants: [{ id: 'v', title: 'Rose', price: 100, stock: 0 }] })
    const available = product('in', { name: 'Highlighter', description: 'Use with matte lipstick' })
    expect(queryCatalog([out, available], categories, [], state('q=matte+lipstick')).products.map(p => p.id)).toEqual(['in', 'out'])
    expect(queryCatalog([out, available], categories, [], state('q=matte+lipstick&stock=in')).products.map(p => p.id)).toEqual(['in'])
  })
  it('uses actual flash prices and expiry boundaries for price filters and sorting', () => {
    const now = Date.parse('2026-11-22T00:00:00Z')
    const sale: FlashSaleRow = { id: 'sale', scope: 'product', product_id: 'sale-product', category_id: null, brand: null, discount_type: 'percentage', discount_value: 80, label: 'Sale', starts_at: new Date(now - 1000).toISOString(), ends_at: new Date(now + 1000).toISOString(), is_active: true }
    const result = queryCatalog([product('regular'), product('sale-product')], categories, [sale], state('price=under-500&sort=price_asc'), {}, now)
    expect(result.products.map(p => p.id)).toEqual(['sale-product'])
    expect(result.validUntil).toBe(now + 1000)
    expect(queryCatalog([product('sale-product')], categories, [sale], state('price=under-500'), {}, now + 1000).total).toBe(0)
  })
  it('combines filters, scopes concerns and strips non-public product fields', () => {
    const p = product('a', { product_concerns: [{ concern_id: 'dry' }] })
    const result = queryCatalog([p, product('b')], categories, [], state('brand=Rare+Beauty&price=500-1000&stock=in'), { concern: 'dry-skin' }, Date.now(), 24, [{ id: 'dry', name: 'Dry skin', slug: 'dry-skin' }])
    expect(result.total).toBe(1)
    expect(result.products[0]).not.toHaveProperty('description')
    expect(result.products[0]).not.toHaveProperty('product_concerns')
    expect(queryCatalog([p], categories, [], state(), { category: 'unknown' }).total).toBe(0)
  })
})
