// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { fetchEssentialsProducts } from './essentials-actions'

const mocks = vi.hoisted(() => ({ client: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ createClient: mocks.client }))

function catalog(count: number, availableFrom: number) {
  return Array.from({ length: count }, (_, id) => ({ id: String(id), category_id: null,
    product_variants: [{ id: 'v-' + id, stock: id >= availableFrom ? 2 : 0 }] }))
}
function database(rows: ReturnType<typeof catalog>, failLater = false) {
  const query = { select: vi.fn(), in: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn() }
  for (const method of ['select', 'in', 'eq', 'order'] as const) query[method].mockReturnValue(query)
  query.range.mockImplementation(async (from: number, to: number) => failLater && from > 0
    ? { data: null, error: { code: 'offline' } } : { data: rows.slice(from, to + 1), error: null })
  mocks.client.mockResolvedValue({ from: vi.fn(() => query) })
  return query
}
const request = (page: number) => fetchEssentialsProducts({ page, categoryIds: ['essentials'], parentId: 'essentials' })
beforeEach(() => vi.clearAllMocks())

it('finds stock beyond the database range and orders the full collection before scroll batches', async () => {
  const query = database(catalog(275, 250))
  const first = await request(0), second = await request(1)
  expect(first.products.map(p => p.id)).toEqual(Array.from({ length: 20 }, (_, i) => String(250 + i)))
  expect(first.hasMore).toBe(true)
  expect(second.products.map(p => p.id)).toEqual(['270', '271', '272', '273', '274', ...Array.from({ length: 15 }, (_, i) => String(i))])
  expect(first.products.every(p => p.category_id === 'essentials')).toBe(true)
  expect(query.range.mock.calls.slice(0, 2)).toEqual([[0, 249], [250, 499]])
  expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false })
  expect(query.order).toHaveBeenCalledWith('id')
})

it('retains sold-out products, removes duplicates and stops at an exact final batch', async () => {
  const rows = catalog(40, 20)
  database([...rows, rows[0]])
  const first = await request(0), last = await request(1)
  expect(first.products.map(p => p.id)).toEqual(rows.slice(20).map(p => p.id))
  expect(last.products.map(p => p.id)).toEqual(rows.slice(0, 20).map(p => p.id))
  expect(last.hasMore).toBe(false)
})

it('rejects a failed later range instead of ordering an incomplete collection', async () => {
  database(catalog(275, 250), true)
  await expect(request(0)).rejects.toThrow('Catalog unavailable')
})
