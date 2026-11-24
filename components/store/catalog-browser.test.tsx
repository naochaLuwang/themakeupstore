import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { CatalogBrowser } from './catalog-browser'
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock('next/navigation', async () => {
  const { useMemo, useSyncExternalStore } = await import('react')
  const subscribe = (callback: () => void) => { window.addEventListener('test:navigation', callback); return () => window.removeEventListener('test:navigation', callback) }
  return { usePathname: () => location.pathname, useSearchParams: () => {
    const value = useSyncExternalStore(subscribe, () => location.search, () => '')
    return useMemo(() => new URLSearchParams(value), [value])
  } }
})
vi.mock('./product-card', () => ({ ProductCard: ({ product }: { product: { id: string; name: string } }) => <a href={'/products/' + product.id}>{product.name}</a> }))
const product = { id: '10000000-0000-4000-8000-000000000001', name: 'Lipstick' }
const data = (_url = '/api/products/search', name = 'Lipstick') => {
  return { products: Array.from({ length: 50 }, (_, index) => ({ ...product, id: product.id + index, name })), total: 50, sales: [], validUntil: Date.now() + 60000,
    facets: { brands: ['Rare Beauty'], categories: [{ id: 'lips', name: 'Lips', slug: 'lips', is_active: true, parent_id: null }] }, suggestions: [] }
}
let host: HTMLDivElement, root: Root, clock = 0
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(1800000000000 + clock++ * 600000)
  localStorage.clear(); sessionStorage.clear(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('fetch', mocks.fetch); Object.defineProperty(Element.prototype, 'scrollIntoView', { value: vi.fn(), configurable: true, writable: true })
  window.history.replaceState(null, '', '/search?q=lipstick')
  const push = window.history.pushState.bind(window.history), replace = window.history.replaceState.bind(window.history)
  vi.spyOn(window.history, 'pushState').mockImplementation((...args) => { push(...args); window.dispatchEvent(new Event('test:navigation')) })
  vi.spyOn(window.history, 'replaceState').mockImplementation((...args) => { replace(...args); window.dispatchEvent(new Event('test:navigation')) })
  mocks.fetch.mockImplementation(async (url: string) => ({ ok: true, json: async () => data(url) }))
  host = document.createElement('div'); host.id = 'app-scroller'; document.body.append(host); root = createRoot(host)
})
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); Reflect.deleteProperty(Element.prototype, 'scrollIntoView'); window.history.replaceState(null, '', '/') })
async function render() { await act(async () => root.render(<CatalogBrowser search title="Search products" />)) }
function button(text: string, scope: ParentNode = document.body) {
  const node = [...scope.querySelectorAll('button')].find(b => b.textContent === text || b.getAttribute('aria-label') === text)
  if (!node) throw new Error('Missing button: ' + text)
  return node
}
async function click(text: string, scope?: ParentNode) { await act(async () => button(text, scope).click()) }
async function type(value: string) {
  const input = host.querySelector<HTMLInputElement>('#catalog-search')!
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })) })
}
it('hydrates URL query, filters and sort and displays all results without pagination', async () => {
  window.history.replaceState(null, '', '/search?q=lipstick&brand=Rare+Beauty&sort=price_asc&page=2')
  await render()
  expect(host.querySelector('#catalog-search')).toHaveValue('lipstick')
  expect(host.querySelector('#catalog-sort')).toHaveValue('price_asc')
  expect(host).toHaveTextContent('50 results')
  expect(host.querySelectorAll('a[href^="/products/"]')).toHaveLength(50)
  expect(host.querySelector('nav[aria-label="Product pages"]')).toBeNull()
  expect(host).not.toHaveTextContent('Previous'); expect(host).not.toHaveTextContent('Next')
  const request = new URL(mocks.fetch.mock.calls[0][0], 'http://localhost')
  expect(request.searchParams.has('page')).toBe(false); expect(request.searchParams.get('brand')).toBe('Rare Beauty')
})
it('keeps filter drafts private until Show results and discards them when dismissed', async () => {
  await render(); await click('Filters')
  let dialog = document.querySelector('[role="dialog"]')!
  const input = dialog.querySelector<HTMLInputElement>('input[type="checkbox"]')!
  await act(async () => input.click())
  await click('Close filters', dialog)
  expect(location.search).not.toContain('stock=')
  await click('Filters'); dialog = document.querySelector('[role="dialog"]')!
  expect(dialog.querySelector('input[type="checkbox"]')).not.toBeChecked()
  await act(async () => dialog.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click())
  await click('Show results', dialog)
  expect(location.search).toContain('stock=in'); expect(host).toHaveTextContent('In stock ×')
})
it('shows a retryable error, preserves the query and recovers without a fake zero state', async () => {
  mocks.fetch.mockResolvedValueOnce({ ok: false })
  await render(); expect(host).toHaveTextContent('Products could not be loaded')
  expect(host).not.toHaveTextContent('No matches found')
  expect(host.querySelector('#catalog-search')).toHaveValue('lipstick')
  await click('Retry'); expect(host).toHaveTextContent('50 results')
})
it('rejects an older response after a new query and records searches only on commitment', async () => {
  const pending: ((value: unknown) => void)[] = []
  mocks.fetch.mockImplementation(() => new Promise(resolve => pending.push(resolve)))
  await render(); const firstSignal = mocks.fetch.mock.calls[0][1].signal
  await type('foundation'); await act(async () => vi.advanceTimersByTimeAsync(350))
  expect(firstSignal.aborted).toBe(true)
  await act(async () => pending[1]({ ok: true, json: async () => data(undefined, 'Foundation') }))
  await act(async () => pending[0]({ ok: true, json: async () => data(undefined, 'Old lipstick') }))
  expect(host).toHaveTextContent('Foundation'); expect(host).not.toHaveTextContent('Old lipstick')
  expect(localStorage.getItem('tms:searches:v1')).toBeNull()
})
it('renders legacy search/product history safely on an empty search page', async () => {
  window.history.replaceState(null, '', '/search')
  localStorage.setItem('recent_searches', JSON.stringify(['lipstick', { ...product, thumbnail_url: null }, {}]))
  await render()
  expect(host).toHaveTextContent('Recent searches'); expect(host).toHaveTextContent('Recently viewed')
  expect(host.querySelector('a[href="/products/undefined"]')).toBeNull()
})
