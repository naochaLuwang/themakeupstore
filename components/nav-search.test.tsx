import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NavSearch } from './nav-search'
const mocks = vi.hoisted(() => ({ push: vi.fn(), fetch: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }), usePathname: () => '/', useSearchParams: () => new URLSearchParams() }))
vi.mock('next/image', () => ({ default: () => null }))
const id = '10000000-0000-4000-8000-000000000001'
const result = (name = 'Lipstick') => ({ products: [{ id, name, slug: 'lipstick', brand: 'Rare Beauty', thumbnail_url: null, created_at: '2026-01-01', has_variants: false, product_categories: [], product_variants: [{ id: 'v', price: 500, stock: 1, title: 'Default' }] }], suggestions: [], total: 1, sales: [] })
let root: Root, host: HTMLDivElement
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); localStorage.clear(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  mocks.fetch.mockResolvedValue({ ok: true, json: async () => result() }); vi.stubGlobal('fetch', mocks.fetch)
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); vi.useRealTimers() })
async function render() { await act(async () => root.render(<NavSearch />)) }
async function type(value: string) {
  const input = host.querySelector('input')!
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); input.focus() })
}
async function tick() { await act(async () => vi.advanceTimersByTimeAsync(300)) }
it('submits an exact full-results URL and saves only committed searches', async () => {
  await render(); await type('lipstick'); await tick()
  expect(localStorage.getItem('tms:searches:v1')).toBeNull()
  await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  expect(mocks.push).toHaveBeenCalledWith('/search?q=lipstick')
  expect(JSON.parse(localStorage.getItem('tms:searches:v1')!)).toEqual(['lipstick'])
})
it('supports arrow selection, Enter submission and Escape dismissal', async () => {
  await render(); await type('lipstick'); await tick()
  const input = host.querySelector('input')!
  await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })))
  expect(input.getAttribute('aria-activedescendant')).toBe(host.querySelector('[role="option"]')!.id)
  await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  expect(mocks.push).toHaveBeenCalledWith('/products/' + id)
  await act(async () => { input.blur(); input.focus() })
  await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
  expect(input).toHaveAttribute('aria-expanded', 'false')
})
it('aborts stale requests and cannot replace current suggestions with an old response', async () => {
  const pending: ((value: unknown) => void)[] = []
  mocks.fetch.mockImplementation(() => new Promise(resolve => pending.push(resolve)))
  await render(); await type('lipstick'); await tick()
  const signal = mocks.fetch.mock.calls[0][1].signal
  await type('foundation'); await tick()
  expect(signal.aborted).toBe(true)
  await act(async () => pending[1]({ ok: true, json: async () => result('Foundation') }))
  await act(async () => pending[0]({ ok: true, json: async () => result('Old lipstick') }))
  expect(host).toHaveTextContent('Foundation'); expect(host).not.toHaveTextContent('Old lipstick')
})
it('migrates legacy objects and strings without crashes or undefined product links', async () => {
  localStorage.setItem('recent_searches', JSON.stringify(['lipstick', { id, name: 'Previously viewed', thumbnail_url: null }, {}]))
  await render(); await act(async () => host.querySelector('input')!.focus())
  expect(host).toHaveTextContent('lipstick'); expect(host).toHaveTextContent('Previously viewed')
  expect(host.querySelector('a[href="/products/undefined"]')).toBeNull()
})
it('distinguishes a failed suggestion request from a successful empty search', async () => {
  mocks.fetch.mockResolvedValue({ ok: false })
  await render(); await type('lipstick'); await tick()
  expect(host).toHaveTextContent('Search could not load')
  expect(host).not.toHaveTextContent('No matches')
})
