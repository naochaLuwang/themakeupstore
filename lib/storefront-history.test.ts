import { beforeEach, expect, it, vi } from 'vitest'
import { clearDiscoveryHistory, readDiscoveryHistory, rememberSearch, rememberViewedProduct } from './storefront-history'
const p = { id: '10000000-0000-4000-8000-000000000001', name: 'Lipstick', thumbnail_url: null }
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks() })
it('migrates a mixed legacy array into separate validated histories', () => {
  localStorage.setItem('recent_searches', JSON.stringify(['lipstick', p, null, {}, 4, { id: 'undefined', name: 'Bad' }]))
  expect(readDiscoveryHistory()).toEqual({ searches: ['lipstick'], products: [p] })
  expect(localStorage.getItem('recent_searches')).toBeNull()
})
it('survives malformed JSON, wrong shapes and unavailable browser storage', () => {
  for (const data of ['{', '{}', 'null', '"text"']) { localStorage.setItem('recent_searches', data); expect(readDiscoveryHistory()).toEqual({ searches: [], products: [] }) }
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Denied') })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Denied') })
  expect(() => { rememberSearch('lipstick'); rememberViewedProduct(p); clearDiscoveryHistory('searches') }).not.toThrow()
})
it('deduplicates and bounds actual searches without mixing recently viewed products', () => {
  for (let i = 0; i < 15; i++) rememberSearch('Term ' + i)
  rememberSearch('TERM 14'); rememberViewedProduct(p)
  expect(readDiscoveryHistory().searches).toHaveLength(8)
  expect(readDiscoveryHistory().searches[0]).toBe('TERM 14')
  expect(readDiscoveryHistory().products).toEqual([p])
  clearDiscoveryHistory('searches')
  expect(readDiscoveryHistory()).toEqual({ searches: [], products: [p] })
})
