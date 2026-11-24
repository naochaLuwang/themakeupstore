// @vitest-environment node
import { expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }))
import { createClient } from '@supabase/supabase-js'
import { readCatalogPages, readStoreCategories } from './storefront-catalog-server'
it('reads beyond database row caps using deterministic ranges', async () => {
  const all = Array.from({ length: 625 }, (_, i) => i)
  const read = vi.fn(async (from: number, to: number) => ({ data: all.slice(from, to + 1), error: null }))
  expect(await readCatalogPages(read)).toEqual(all)
  expect(read.mock.calls).toEqual([[0, 249], [250, 499], [500, 749]])
})
it('rejects failed later pages instead of serving a partial catalog as complete', async () => {
  await expect(readCatalogPages(async from => from ? { data: null, error: 'Network failure' } : { data: Array.from({ length: 250 }, () => 1), error: null })).rejects.toThrow('Catalog unavailable')
})
it('reads the brand directory from categories alone, without depending on product or promotion queries', async () => {
  const categories = Array.from({ length: 125 }, (_, id) => ({ id: String(id), name: 'Brand ' + id }))
  const range = vi.fn(async (from: number, to: number) => ({ data: categories.slice(from, to + 1), error: null }))
  const order = vi.fn(() => ({ range }))
  const select = vi.fn(() => ({ order }))
  const from = vi.fn(() => ({ select }))
  vi.mocked(createClient).mockReturnValueOnce({ from } as unknown as ReturnType<typeof createClient>)
  expect(await readStoreCategories()).toEqual(categories)
  expect(from.mock.calls).toEqual([['categories'], ['categories']])
  expect(range.mock.calls).toEqual([[0, 99], [100, 199]])
})
