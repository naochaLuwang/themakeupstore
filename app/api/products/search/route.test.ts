// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { GET } from './route'
const mocks = vi.hoisted(() => ({ search: vi.fn() }))
vi.mock('@/lib/storefront-catalog-server', () => ({ searchStoreCatalog: mocks.search }))
beforeEach(() => { vi.clearAllMocks(); mocks.search.mockResolvedValue({ products: [], total: 0 }) })
it('passes parsed query, filter, scope and page intent to one catalog implementation', async () => {
  await GET(new Request('https://store.test/api/products/search?q=lipstick&brand=Rare&category=lips&stock=in&page=2&scope=face&suggest=1'))
  expect(mocks.search).toHaveBeenCalledWith(expect.objectContaining({ q: 'lipstick', brands: ['Rare'], categories: ['lips'], inStock: true, page: 2, sort: 'relevance' }), expect.objectContaining({ category: 'face' }), 5)
})
it('returns a retryable error instead of claiming a failed catalog has no matches', async () => {
  mocks.search.mockRejectedValue(new Error('Private database error'))
  const response = await GET(new Request('https://store.test/api/products/search?q=test'))
  expect(response.status).toBe(503); expect(response.headers.get('cache-control')).toBe('no-store')
  expect(await response.json()).toEqual({ error: 'Products could not be loaded. Please retry.' })
})
